import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Trash2, Clock, User, Activity, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';

interface RateLimit {
  id: string;
  user_id: string;
  user_email: string;
  action_type: string;
  request_count: number;
  window_start: string;
  window_minutes: number;
  time_remaining_minutes: number;
  created_at: string;
}

export function RateLimitManager() {
  const { user } = useAuth();
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clearing, setClearing] = useState<string | null>(null);

  const fetchRateLimits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_active_rate_limits');
      
      if (error) throw error;
      
      setRateLimits(data || []);
    } catch (error) {
      console.error('Failed to fetch rate limits:', error);
      toast.error('Failed to load rate limits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRateLimits();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRateLimits, 30000);
    return () => clearInterval(interval);
  }, []);

  const clearRateLimit = async (userId: string, actionType: string) => {
    try {
      setClearing(`${userId}-${actionType}`);
      
      const { data, error } = await supabase.rpc('clear_user_rate_limits', {
        _user_id: userId,
        _action_type: actionType
      });
      
      if (error) throw error;
      
      toast.success(`Cleared ${data} rate limit(s)`);
      await fetchRateLimits();
    } catch (error) {
      console.error('Failed to clear rate limit:', error);
      toast.error('Failed to clear rate limit');
    } finally {
      setClearing(null);
    }
  };

  const clearMyRateLimits = async () => {
    if (!user) return;
    
    try {
      setClearing('mine');
      
      const { data, error } = await supabase.rpc('clear_user_rate_limits', {
        _user_id: user.id,
        _action_type: null
      });
      
      if (error) throw error;
      
      toast.success(`Cleared ${data} of your rate limit(s)`);
      await fetchRateLimits();
    } catch (error) {
      console.error('Failed to clear my rate limits:', error);
      toast.error('Failed to clear your rate limits');
    } finally {
      setClearing(null);
    }
  };

  const clearAllRateLimits = async () => {
    try {
      setClearing('all');
      
      const { data, error } = await supabase.rpc('clear_user_rate_limits', {
        _user_id: null,
        _action_type: null
      });
      
      if (error) throw error;
      
      toast.success(`Cleared all ${data} rate limit(s)`);
      await fetchRateLimits();
    } catch (error) {
      console.error('Failed to clear all rate limits:', error);
      toast.error('Failed to clear all rate limits');
    } finally {
      setClearing(null);
    }
  };

  const filteredLimits = rateLimits.filter(limit => 
    limit.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    limit.action_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const myRateLimits = rateLimits.filter(limit => limit.user_id === user?.id);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Rate Limit Manager
              </CardTitle>
              <CardDescription>
                Monitor and manage rate limits to prevent abuse and unblock testing
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRateLimits}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {myRateLimits.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearMyRateLimits}
                  disabled={clearing === 'mine'}
                >
                  Clear My Rate Limits ({myRateLimits.length})
                </Button>
              )}
              {rateLimits.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={clearing === 'all'}
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Rate Limits?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will clear all {rateLimits.length} active rate limits for all users. 
                        This action is logged but cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllRateLimits}>
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {rateLimits.length > 0 && (
            <Input
              placeholder="Search by email or action type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          )}

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading rate limits...
            </div>
          ) : filteredLimits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No matching rate limits found' : 'No active rate limits'}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action Type</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Time Remaining</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLimits.map((limit) => {
                    const isMyLimit = limit.user_id === user?.id;
                    const isClearingThis = clearing === `${limit.user_id}-${limit.action_type}`;
                    
                    return (
                      <TableRow key={limit.id} className={isMyLimit ? 'bg-muted/50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">
                              {limit.user_email || 'Unknown'}
                            </span>
                            {isMyLimit && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {limit.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span>{limit.request_count} requests</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {limit.time_remaining_minutes > 0 
                                ? `${limit.time_remaining_minutes} min`
                                : 'Expired'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(limit.window_start).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isClearingThis}
                              >
                                <Trash2 className="h-4 w-4" />
                                Clear
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Clear Rate Limit?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will clear the rate limit for {limit.user_email} on action "{limit.action_type}". 
                                  They will be able to perform this action again immediately.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => clearRateLimit(limit.user_id, limit.action_type)}
                                >
                                  Clear
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Rate Limit Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Rate limits protect against abuse and prevent system overload</p>
          <p>• Different actions have different limits (e.g., 5 approvals per 10 minutes)</p>
          <p>• Clearing a rate limit is logged for audit purposes</p>
          <p>• Limits automatically expire after the time window passes</p>
          <p>• Use "Clear My Rate Limits" for quick self-service during testing</p>
        </CardContent>
      </Card>
    </div>
  );
}
