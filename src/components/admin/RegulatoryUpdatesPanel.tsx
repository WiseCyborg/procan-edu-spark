import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Plus, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RegulatoryUpdatesPanel() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    comar_reference: "",
    effective_date: "",
    summary: "",
    pdf_url: ""
  });

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from("regulatory_updates" as any)
        .select("*")
        .order("effective_date", { ascending: false });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error("Error fetching updates:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("regulatory_updates" as any)
        .insert({
          ...formData,
          created_by: user?.id
        } as any);

      if (error) throw error;

      toast.success("Regulatory update added successfully");
      setShowForm(false);
      setFormData({
        comar_reference: "",
        effective_date: "",
        summary: "",
        pdf_url: ""
      });
      fetchUpdates();
    } catch (error: any) {
      console.error("Error adding update:", error);
      toast.error(error.message || "Failed to add update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Regulatory Updates (COMAR)
              </CardTitle>
              <CardDescription>
                Manage Maryland Cannabis Administration (MCA) regulatory updates
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Update
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="comar_reference">COMAR Reference</Label>
                <Input
                  id="comar_reference"
                  placeholder="e.g., Title 14, Subtitle 17, 07.11"
                  value={formData.comar_reference}
                  onChange={(e) => setFormData({ ...formData, comar_reference: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective Date</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  placeholder="Describe the regulatory changes..."
                  rows={4}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdf_url">PDF URL (optional)</Label>
                <Input
                  id="pdf_url"
                  type="url"
                  placeholder="https://example.com/document.pdf"
                  value={formData.pdf_url}
                  onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Update"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {updates.map((update) => (
              <div key={update.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{update.comar_reference}</h4>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(update.effective_date).toLocaleDateString()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{update.summary}</p>
                {update.pdf_url && (
                  <a
                    href={update.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    View PDF Document
                  </a>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
