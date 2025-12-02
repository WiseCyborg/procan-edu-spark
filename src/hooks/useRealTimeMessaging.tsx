import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { pushNotificationService } from '@/services/pushNotificationService';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'system' | 'announcement';
  metadata: any;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  reactions?: Array<{
    emoji: string;
    count: number;
    userReacted: boolean;
  }>;
  sender?: {
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
}

export interface Conversation {
  id: string;
  organization_id?: string;
  title?: string;
  conversation_type: 'direct' | 'group' | 'announcement';
  created_by: string;
  is_active: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message?: Message;
}

export const useRealTimeMessaging = () => {
  const { user } = useAuth();
  const { roles } = useUserRole();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(user_id),
          messages(
            id,
            content,
            message_type,
            created_at,
            sender_id
          )
        `)
        .eq('conversation_participants.user_id', user.id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const formattedConversations: Conversation[] = data?.map(conv => ({
        id: conv.id,
        organization_id: conv.organization_id,
        title: conv.title,
        conversation_type: conv.conversation_type as 'direct' | 'group' | 'announcement',
        created_by: conv.created_by,
        is_active: conv.is_active,
        metadata: conv.metadata || {},
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        last_message: conv.messages?.[conv.messages.length - 1] ? {
          id: conv.messages[conv.messages.length - 1].id,
          conversation_id: conv.id,
          sender_id: conv.messages[conv.messages.length - 1].sender_id,
          content: conv.messages[conv.messages.length - 1].content,
          message_type: conv.messages[conv.messages.length - 1].message_type as 'text' | 'file' | 'system' | 'announcement',
          metadata: {},
          is_edited: false,
          created_at: conv.messages[conv.messages.length - 1].created_at
        } : undefined,
        unread_count: 0 // TODO: Calculate based on last_read_at
      })) || [];

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    }
  }, [user]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          message_type,
          metadata,
          is_edited,
          edited_at,
          created_at
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles separately
      const senderIds = [...new Set(data?.map(msg => msg.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, profile_photo_url')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const formattedMessages: Message[] = data?.map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        message_type: msg.message_type as 'text' | 'file' | 'system' | 'announcement',
        metadata: msg.metadata || {},
        is_edited: msg.is_edited,
        edited_at: msg.edited_at,
        created_at: msg.created_at,
        sender: profileMap.get(msg.sender_id) ? {
          first_name: profileMap.get(msg.sender_id)!.first_name || '',
          last_name: profileMap.get(msg.sender_id)!.last_name || '',
          profile_photo_url: profileMap.get(msg.sender_id)!.profile_photo_url
        } : undefined
      })) || [];

      setMessages(prev => ({
        ...prev,
        [conversationId]: formattedMessages
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (
    conversationId: string, 
    content: string, 
    messageType: Message['message_type'] = 'text',
    metadata?: any
  ) => {
    if (!user || !content.trim()) return;

    try {
      // Insert message
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) throw error;

      // Get user profile for sender name
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const senderName = senderProfile 
        ? `${senderProfile.first_name} ${senderProfile.last_name}`.trim() || user.email || 'Someone'
        : user.email || 'Someone';

      // Get conversation details for notification
      const { data: conversation } = await supabase
        .from('conversations')
        .select('title, conversation_type')
        .eq('id', conversationId)
        .single();

      const conversationTitle = conversation?.title || 'a conversation';

      // Send push notification to other participants
      pushNotificationService.notifyNewMessage({
        conversationId,
        senderId: user.id,
        senderName,
        messagePreview: content.trim().substring(0, 100),
        conversationTitle,
      }).catch(err => {
        console.error('[Push] Failed to send message notification:', err);
      });

      // Parse @mentions from content
      const mentionPattern = /@([A-Za-z]+\s+[A-Za-z]+)/g;
      const mentions = [...content.matchAll(mentionPattern)];

      if (mentions.length > 0 && message) {
        // Get conversation participants to match names
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, profiles:user_id(first_name, last_name)')
          .eq('conversation_id', conversationId);

        // Insert mentions
        const mentionInserts = [];
        for (const match of mentions) {
          const [firstName, lastName] = match[1].split(/\s+/);
          const participant = participants?.find(p => {
            const profile = p.profiles as any;
            return profile?.first_name === firstName && profile?.last_name === lastName;
          });

          if (participant) {
            mentionInserts.push({
              message_id: message.id,
              mentioned_user_id: participant.user_id
            });
          }
        }

        if (mentionInserts.length > 0) {
          await supabase.from('message_mentions').insert(mentionInserts);
          
          // Send push notifications to mentioned users
          const mentionedUserIds = mentionInserts.map(m => m.mentioned_user_id);
          pushNotificationService.notifyMention({
            mentionedUserIds,
            senderName,
            messagePreview: content.trim().substring(0, 100),
            conversationTitle,
            conversationId,
          }).catch(err => {
            console.error('[Push] Failed to send mention notifications:', err);
          });
        }
      }

      // Update conversation updated_at
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  }, [user]);

  // Create a conversation
  const createConversation = useCallback(async (
    title: string,
    conversationType: Conversation['conversation_type'],
    organizationId?: string,
    participants: string[] = []
  ) => {
    if (!user) return null;

    try {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title,
          conversation_type: conversationType,
          created_by: user.id,
          organization_id: organizationId
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const participantInserts = [
        { conversation_id: conversation.id, user_id: user.id, role: 'admin' },
        ...participants.map(userId => ({
          conversation_id: conversation.id,
          user_id: userId,
          role: 'member'
        }))
      ];

      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert(participantInserts);

      if (participantError) throw participantError;

      await fetchConversations();
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }
  }, [user, fetchConversations]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messaging_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => ({
            ...prev,
            [newMessage.conversation_id]: [
              ...(prev[newMessage.conversation_id] || []),
              newMessage
            ]
          }));

          // Update conversation list
          setConversations(prev => 
            prev.map(conv => 
              conv.id === newMessage.conversation_id 
                ? { ...conv, updated_at: new Date().toISOString(), last_message: newMessage }
                : conv
            ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          );

          // Show notification if not active conversation
          if (newMessage.sender_id !== user.id && activeConversation !== newMessage.conversation_id) {
            toast.info('New message received');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConversation, fetchConversations]);

  // Initial load
  useEffect(() => {
    if (user) {
      fetchConversations().finally(() => setLoading(false));
    }
  }, [user, fetchConversations]);

  return {
    conversations,
    messages,
    loading,
    activeConversation,
    setActiveConversation,
    sendMessage,
    createConversation,
    fetchMessages,
    refreshConversations: fetchConversations
  };
};