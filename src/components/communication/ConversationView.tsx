import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MoreHorizontal, Paperclip, Download, FileText, Image as ImageIcon, Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRealTimeMessaging } from '@/hooks/useRealTimeMessaging';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoCallButton } from './VideoCallButton';
import { TypingIndicator } from './TypingIndicator';
import { MessageReactions } from './MessageReactions';
import { ActiveCallBanner } from '../video/ActiveCallBanner';
import { useActiveCall } from '@/hooks/useActiveCall';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { MentionPopover } from './MentionPopover';
import { useMentions } from '@/hooks/useMentions';
import { useConversationParticipants } from '@/hooks/useConversationParticipants';
import { ScheduleCallDialog } from './ScheduleCallDialog';
import { UpcomingCallsList } from './UpcomingCallsList';
import { useScheduledCalls } from '@/hooks/useScheduledCalls';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { InviteProCannSupport } from './InviteProCannSupport';
import { useUserRole } from '@/hooks/useUserRole';

interface ConversationViewProps {
  conversationId: string;
  conversationTitle?: string;
  conversationType?: string;
}

export const ConversationView = ({ 
  conversationId,
  conversationTitle = 'Team Chat',
  conversationType = 'group'
}: ConversationViewProps) => {
  const { user } = useAuth();
  const { roles } = useUserRole();
  const { messages, sendMessage, fetchMessages } = useRealTimeMessaging();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showUpcomingCalls, setShowUpcomingCalls] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversationMessages = messages[conversationId] || [];
  const { activeCall, callDuration } = useActiveCall(conversationId);
  const { participants } = useConversationParticipants(conversationId);
  const { calls, scheduleCall, cancelCall, respondToInvite } = useScheduledCalls(conversationId);
  
  // Track typing indicator
  useTypingIndicator(conversationId, isTyping);

  // @Mentions functionality
  const {
    showPopover,
    cursorPosition,
    filteredParticipants,
    handleInputChange: handleMentionInputChange,
    insertMention,
    closePopover
  } = useMentions(participants);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    }
  }, [conversationId, fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    setIsTyping(false);
    try {
      await sendMessage(conversationId, newMessage);
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  const handleMessageChange = (value: string) => {
    setNewMessage(value);
    setIsTyping(value.length > 0);
    
    // Handle @mentions
    if (inputRef.current) {
      handleMentionInputChange(value, inputRef.current);
    }
  };

  const handleMentionSelect = (participant: any) => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const result = insertMention(participant, newMessage, cursorPos);
    setNewMessage(result.newText);
    
    // Set cursor position after mention
    setTimeout(() => {
      if (inputRef.current && result.newCursorPos) {
        inputRef.current.selectionStart = result.newCursorPos;
        inputRef.current.selectionEnd = result.newCursorPos;
        inputRef.current.focus();
      }
    }, 0);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 168) { // 7 days
      return format(date, 'EEE HH:mm');
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${conversationId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('conversation-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('conversation-files')
        .getPublicUrl(filePath);

      await sendMessage(conversationId, file.name, 'file', {
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderFileAttachment = (message: any) => {
    const { fileUrl, fileName, fileType } = message.metadata || {};
    if (!fileUrl) return null;

    const isImage = fileType?.startsWith('image/');

    return (
      <div className="mt-2 p-3 border rounded-lg bg-background/50">
        <div className="flex items-center gap-3">
          {isImage ? (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{fileName}</p>
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName}
          >
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
        {isImage && (
          <img
            src={fileUrl}
            alt={fileName}
            className="mt-2 max-w-full h-auto rounded max-h-64 object-contain"
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-foreground">{conversationTitle}</h2>
          <Badge variant="outline" className="text-xs">
            {conversationMessages.length} messages
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={showUpcomingCalls} onOpenChange={setShowUpcomingCalls}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {calls.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {calls.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Upcoming Calls</h4>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowUpcomingCalls(false);
                      setShowScheduleDialog(true);
                    }}
                  >
                    Schedule
                  </Button>
                </div>
                <UpcomingCallsList
                  calls={calls}
                  onCancel={cancelCall}
                  onRespond={respondToInvite}
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <VideoCallButton 
            conversationId={conversationId}
            conversationTitle={conversationTitle}
            conversationType={conversationType}
          />
          
          {(roles.includes('dispensary_manager') || roles.includes('training_coordinator')) && (
            <InviteProCannSupport 
              conversationId={conversationId}
              conversationTitle={conversationTitle}
            />
          )}
          
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Call Banner */}
      {activeCall && (
        <ActiveCallBanner
          participantCount={activeCall.participant_count}
          callDuration={callDuration}
          onJoinCall={() => {
            // Join call logic handled by VideoCallButton
            toast.info('Click the video button to join the call');
          }}
          onDismiss={() => {
            // Dismiss banner (could be stored in local state)
          }}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationMessages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          conversationMessages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const showAvatar = index === 0 || 
              conversationMessages[index - 1].sender_id !== message.sender_id;
            
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {showAvatar ? (
                    <Avatar className="h-8 w-8">
                      {message.sender?.profile_photo_url && (
                        <AvatarImage 
                          src={message.sender.profile_photo_url} 
                          alt={`${message.sender.first_name} ${message.sender.last_name}`}
                        />
                      )}
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(message.sender?.first_name, message.sender?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8" />
                  )}
                </div>

                {/* Message */}
                <div className={`flex-1 max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                  {showAvatar && !isOwn && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {message.sender?.first_name} {message.sender?.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  )}
                  
                  <div
                    className={`inline-block px-4 py-2 rounded-lg max-w-full break-words ${
                      isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {message.message_type === 'system' ? (
                      <div className="text-xs italic opacity-75">
                        {message.content}
                      </div>
                    ) : (
                      <>
                        <div className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </div>
                        {message.message_type === 'file' && renderFileAttachment(message)}
                      </>
                    )}
                    
                         {isOwn && (
                      <div className="text-xs opacity-75 mt-1">
                        {formatMessageTime(message.created_at)}
                      </div>
                     )}
                   </div>
                   
                   {/* Message Reactions */}
                   <MessageReactions
                     messageId={message.id}
                     reactions={message.reactions || []}
                     onReactionChange={() => fetchMessages(conversationId)}
                   />
                 </div>
               </div>
             );
           })
         )}
         
         {/* Typing Indicator */}
         {user && (
           <TypingIndicator
             conversationId={conversationId}
             currentUserId={user.id}
           />
         )}
         
         <div ref={messagesEndRef} />
       </div>

       {/* @Mention Popover */}
       {showPopover && (
         <MentionPopover
           participants={filteredParticipants}
           position={cursorPosition}
           onSelect={handleMentionSelect}
           onClose={closePopover}
         />
       )}

      {/* Message Input */}
      <div className="p-4 border-t bg-card/50">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="px-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder={uploading ? "Uploading file..." : "Type @ to mention someone..."}
            disabled={sending || uploading}
            className="flex-1"
            autoComplete="off"
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() || sending || uploading}
            size="sm"
            className="px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Schedule Call Dialog */}
      <ScheduleCallDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onSchedule={async (data) => {
          await scheduleCall(data);
        }}
        participantIds={participants.map(p => p.user_id)}
      />
    </div>
  );
};