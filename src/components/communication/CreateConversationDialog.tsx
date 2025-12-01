import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Users, Bell, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';

interface CreateConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConversation: (
    title: string,
    type: 'direct' | 'group' | 'announcement',
    organizationId?: string,
    participants?: string[]
  ) => Promise<string | null>;
}

interface TeamMember {
  user_id: string;
  first_name: string;
  last_name: string;
  organization_id?: string;
}

export const CreateConversationDialog = ({
  open,
  onOpenChange,
  onCreateConversation
}: CreateConversationDialogProps) => {
  const { user } = useAuth();
  const { isAdmin, isDispensaryManager } = useUserRole();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [conversationType, setConversationType] = useState<'direct' | 'group' | 'announcement'>('group');
  const [channelCategory, setChannelCategory] = useState<string>('general');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(false);

  // Fetch team members
  useEffect(() => {
    if (open && (isAdmin || isDispensaryManager)) {
      fetchTeamMembers();
    }
  }, [open, isAdmin, isDispensaryManager]);

  const fetchTeamMembers = async () => {
    if (!user) return;

    setFetchingMembers(true);
    try {
      let query = supabase
        .from('profiles')
        .select('user_id, first_name, last_name, organization_id');

      if (isDispensaryManager && !isAdmin) {
        // Get dispensary manager's organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        if (profile?.organization_id) {
          query = query.eq('organization_id', profile.organization_id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out current user
      const members = data?.filter(member => member.user_id !== user.id) || [];
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setFetchingMembers(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!title.trim()) {
      toast.error('Please enter a conversation title');
      return;
    }

    if (conversationType !== 'announcement' && selectedParticipants.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    setLoading(true);
    try {
      const organizationId = isDispensaryManager && !isAdmin 
        ? teamMembers[0]?.organization_id 
        : undefined;

      const conversationId = await onCreateConversation(
        title,
        conversationType,
        organizationId,
        selectedParticipants
      );

      if (conversationId) {
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedParticipants([]);
        setConversationType('group');
        onOpenChange(false);
        toast.success('Conversation created successfully');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement':
        return <Bell className="h-4 w-4" />;
      case 'group':
        return <Users className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Create New Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conversation Type */}
          <div className="space-y-2">
            <Label>Conversation Type</Label>
            <Select
              value={conversationType}
              onValueChange={(value: 'direct' | 'group' | 'announcement') => 
                setConversationType(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">
                  <div className="flex items-center gap-2">
                    {getTypeIcon('group')}
                    <span>Group Chat</span>
                  </div>
                </SelectItem>
                <SelectItem value="direct">
                  <div className="flex items-center gap-2">
                    {getTypeIcon('direct')}
                    <span>Direct Message</span>
                  </div>
                </SelectItem>
                {(isAdmin || isDispensaryManager) && (
                  <SelectItem value="announcement">
                    <div className="flex items-center gap-2">
                      {getTypeIcon('announcement')}
                      <span>Announcement</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Channel Category for Group Chats */}
          {conversationType === 'group' && (
            <div className="space-y-2">
              <Label>Channel Category</Label>
              <Select
                value={channelCategory}
                onValueChange={setChannelCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Discussion</SelectItem>
                  <SelectItem value="orientation">New Employee Orientation</SelectItem>
                  <SelectItem value="study_help">Study Help</SelectItem>
                  {(isAdmin || isDispensaryManager) && (
                    <SelectItem value="uat">UAT Testing Feedback</SelectItem>
                  )}
                  <SelectItem value="live_training">Live Training Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {conversationType === 'announcement' ? 'Announcement Title' : 'Conversation Title'}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                conversationType === 'announcement' 
                  ? 'e.g., Training Schedule Update'
                  : 'e.g., Team Discussion'
              }
            />
          </div>

          {/* Description for announcements */}
          {conversationType === 'announcement' && (
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional details about this announcement..."
                rows={3}
              />
            </div>
          )}

          {/* Participants */}
          {conversationType !== 'announcement' && (
            <div className="space-y-2">
              <Label>Select Participants</Label>
              
              {fetchingMembers ? (
                <div className="text-sm text-muted-foreground">Loading team members...</div>
              ) : teamMembers.length === 0 ? (
                <div className="text-sm text-muted-foreground">No team members found</div>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                  {teamMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={member.user_id}
                        checked={selectedParticipants.includes(member.user_id)}
                        onCheckedChange={() => toggleParticipant(member.user_id)}
                      />
                      <Label 
                        htmlFor={member.user_id} 
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {member.first_name} {member.last_name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected participants */}
              {selectedParticipants.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedParticipants.map((userId) => {
                    const member = teamMembers.find(m => m.user_id === userId);
                    return (
                      <Badge key={userId} variant="secondary" className="text-xs">
                        {member?.first_name} {member?.last_name}
                        <button
                          onClick={() => toggleParticipant(userId)}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConversation}
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};