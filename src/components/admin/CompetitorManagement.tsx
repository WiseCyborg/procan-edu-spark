import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Competitor {
  id: string;
  competitor_name: string;
  website_url: string | null;
  pricing_model: string | null;
  price_per_student: number | null;
  features_detected: string[] | null;
  market_position: string | null;
  notes: string | null;
  snapshot_date: string;
  updated_at: string;
}

export function CompetitorManagement() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    website: "",
    pricingModel: "per_student",
    price: "",
    features: "",
    position: "mid-market",
    notes: ""
  });

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['competitor-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_snapshots')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as Competitor[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (competitor: typeof formData & { id?: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-competitor', {
        body: {
          action: competitor.id ? 'update' : 'create',
          competitor: {
            ...competitor,
            features: competitor.features ? competitor.features.split(',').map(f => f.trim()) : []
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-snapshots'] });
      toast.success(editingCompetitor ? 'Competitor updated' : 'Competitor added');
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('manage-competitor', {
        body: { action: 'delete', competitor: { id } }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitor-snapshots'] });
      toast.success('Competitor deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCompetitor(null);
    setFormData({
      name: "",
      website: "",
      pricingModel: "per_student",
      price: "",
      features: "",
      position: "mid-market",
      notes: ""
    });
  };

  const handleEdit = (competitor: Competitor) => {
    setEditingCompetitor(competitor);
    setFormData({
      name: competitor.competitor_name,
      website: competitor.website_url || "",
      pricingModel: competitor.pricing_model || "per_student",
      price: competitor.price_per_student?.toString() || "",
      features: competitor.features_detected?.join(', ') || "",
      position: competitor.market_position || "mid-market",
      notes: competitor.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(editingCompetitor ? { ...formData, id: editingCompetitor.id } : formData);
  };

  const getPositionBadge = (position: string | null) => {
    const colors: Record<string, string> = {
      budget: 'bg-green-500/10 text-green-500',
      'mid-market': 'bg-blue-500/10 text-blue-500',
      premium: 'bg-purple-500/10 text-purple-500',
      enterprise: 'bg-orange-500/10 text-orange-500'
    };
    return colors[position || 'mid-market'] || colors['mid-market'];
  };

  if (isLoading) return <div>Loading competitors...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Competitor Management</CardTitle>
            <CardDescription>Track and analyze competing cannabis training providers</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCompetitor(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Competitor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingCompetitor ? 'Edit' : 'Add'} Competitor</DialogTitle>
                <DialogDescription>Enter competitor details for market analysis</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Competitor Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website URL</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pricingModel">Pricing Model</Label>
                    <Select value={formData.pricingModel} onValueChange={(v) => setFormData({ ...formData, pricingModel: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="per_student">Per Student</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                        <SelectItem value="freemium">Freemium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Market Position</Label>
                  <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget</SelectItem>
                      <SelectItem value="mid-market">Mid-Market</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="features">Features (comma-separated)</Label>
                  <Input
                    id="features"
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    placeholder="on-demand-modules, live-sessions, certificates"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving...' : 'Save Competitor'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competitor</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead>Features</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.map((competitor) => (
              <TableRow key={competitor.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{competitor.competitor_name}</span>
                    {competitor.website_url && (
                      <a href={competitor.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                        {new URL(competitor.website_url).hostname}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPositionBadge(competitor.market_position)}>
                    {competitor.market_position || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {competitor.price_per_student ? `$${competitor.price_per_student}` : '—'}
                  <span className="text-xs text-muted-foreground block">
                    {competitor.pricing_model || 'Unknown'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {competitor.features_detected?.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {(competitor.features_detected?.length || 0) > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{(competitor.features_detected?.length || 0) - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(competitor.updated_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(competitor)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this competitor?')) {
                          deleteMutation.mutate(competitor.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
