import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, ArrowRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileChange {
  changed_at: string;
  changed_by: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
}

interface ProfileChangeHistoryViewerProps {
  userId: string;
  showAsUser?: boolean;
}

export function ProfileChangeHistoryViewer({ userId, showAsUser = false }: ProfileChangeHistoryViewerProps) {
  const [history, setHistory] = useState<ProfileChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    fieldName: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, [userId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_profile_change_history', {
        _user_id: userId,
        _limit: 100,
      });

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error('Error fetching profile history:', error);
      toast({
        title: "Error",
        description: "Failed to load profile change history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(change => {
    const changeDate = new Date(change.changed_at);
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

    if (fromDate && changeDate < fromDate) return false;
    if (toDate && changeDate > toDate) return false;
    if (filters.fieldName && change.field_name !== filters.fieldName) return false;

    return true;
  });

  const exportToCSV = () => {
    const headers = ['Date/Time', 'Field', 'Old Value', 'New Value'];
    const rows = filteredHistory.map(change => [
      format(new Date(change.changed_at), 'yyyy-MM-dd HH:mm:ss'),
      change.field_name.replace(/_/g, ' ').toUpperCase(),
      change.old_value || '(empty)',
      change.new_value || '(empty)',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-history-${userId}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Change history exported to CSV",
    });
  };

  const fieldDisplayName = (fieldName: string) => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getBadgeVariant = (fieldName: string) => {
    const criticalFields = ['phone', 'address', 'emergency_contact_phone', 'emergency_contact_name'];
    return criticalFields.includes(fieldName) ? 'destructive' : 'secondary';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{showAsUser ? 'My Profile Change History' : 'Profile Change History'}</CardTitle>
        <CardDescription>
          {showAsUser 
            ? 'View all changes made to your profile'
            : 'View all changes made to this user\'s profile'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-2 block">From Date</label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">To Date</label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Field</label>
            <Select
              value={filters.fieldName}
              onValueChange={val => setFilters(prev => ({ ...prev, fieldName: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Fields" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Fields</SelectItem>
                <SelectItem value="first_name">First Name</SelectItem>
                <SelectItem value="last_name">Last Name</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="address">Address</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="state">State</SelectItem>
                <SelectItem value="zip">ZIP Code</SelectItem>
                <SelectItem value="emergency_contact_name">Emergency Contact Name</SelectItem>
                <SelectItem value="emergency_contact_phone">Emergency Contact Phone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Change Timeline */}
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No profile changes found
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {filteredHistory.map((change, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <Badge variant={getBadgeVariant(change.field_name)}>
                        {fieldDisplayName(change.field_name)}
                      </Badge>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(change.changed_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="text-muted-foreground line-through break-all">
                        {change.old_value || '(empty)'}
                      </span>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-foreground break-all">
                        {change.new_value || '(empty)'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {filteredHistory.length} change{filteredHistory.length !== 1 ? 's' : ''}
              </div>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
