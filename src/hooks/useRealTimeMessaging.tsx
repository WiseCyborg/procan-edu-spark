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
  const [activeConversation, setActiveConversationState] = useState<string | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          conversation_participants!inner(user_id, last_read_at),
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

      // Compute unread counts in parallel per conversation
      const unreadPromises = (data || []).map(async (conv: any) => {
        const myParticipant = (conv.conversation_participants || []).find(
          (p: any) => p.user_id === user.id
        );
        const lastReadAt: string | null = myParticipant?.last_read_at ?? null;

        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id);
        if (lastReadAt) {
          query = query.gt('created_at', lastReadAt);
        }
        const { count } = await query;
        return { convId: conv.id, count: count || 0 };
      });
      const unreadResults = await Promise.all(unreadPromises);
      const unreadMap = new Map(unreadResults.map(r => [r.convId, r.count]));

      // Resolve direct conversation titles to the other participant's name
      const directConvIds = (data || [])
        .filter((c: any) => c.conversation_type === 'direct')
        .map((c: any) => c.id);

      const directTitleMap = new Map<string, string>();
      if (directConvIds.length > 0) {
        const { data: participantsData } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .in('conversation_id', directConvIds);
        const otherIds = Array.from(
          new Set((participantsData || [])
            .filter((p: any) => p.user_id !== user.id)
            .map((p: any) => p.user_id))
        );
        if (otherIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', otherIds);
          const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
          const byConv = new Map<string, string[]>();
          (participantsData || []).forEach((p: any) => {
            if (p.user_id === user.id) return;
            const list = byConv.get(p.conversation_id) || [];
            const prof: any = profileMap.get(p.user_id);
            if (prof) {
              const name = `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Unknown';
              list.push(name);
            }
            byConv.set(p.conversation_id, list);
          });
          byConv.forEach((names, convId) => {
            directTitleMap.set(convId, names.join(', ') || 'Direct message');
          });
        }
      }

      const formattedConversations: Conversation[] = data?.map(conv => {
        const isDirect = conv.conversation_type === 'direct';
        const resolvedTitle = isDirect
          ? (directTitleMap.get(conv.id) || conv.title || 'Direct message')
          : conv.title;
        return {
          id: conv.id,
          organization_id: conv.organization_id,
          title: resolvedTitle,
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
          unread_count: unreadMap.get(conv.id) || 0,
        };
      }) || [];

      setConversations(formattedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    }
  }, [user]);

  // Mark a conversation as read (updates last_read_at to now)
  const markConversationRead = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
      setConversations(prev =>
        prev.map(c => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error('Error marking conversation read:', err);
    }
  }, [user]);

  const setActiveConversation = useCallback((conversationId: string | null) => {
    setActiveConversationState(conversationId);
    if (conversationId) {
      markConversationRead(conversationId);
    }
  }, [markConversationRead]);

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

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const senderName = senderProfile 
        ? `${senderProfile.first_name} ${senderProfile.last_name}`.trim() || user.email || 'Someone'
        : user.email || 'Someone';

      const { data: conversation } = await supabase
        .from('conversations')
        .select('title, conversation_type')
        .eq('id', conversationId)
        .single();

      const conversationTitle = conversation?.title || 'a conversation';

      pushNotificationService.notifyNewMessage({
        conversationId,
        senderId: user.id,
        senderName,
        messagePreview: content.trim().substring(0, 100),
        conversationTitle,
      }).catch(err => {
        console.error('[Push] Failed to send message notification:', err);
      });

      const mentionPattern = /@([A-Za-z]+\s+[A-Za-z]+)/g;
      const mentions = [...content.matchAll(mentionPattern)];

      if (mentions.length > 0 && message) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, profiles:user_id(first_name, last_name)')
          .eq('conversation_id', conversationId);

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

  // Create a 1:1 direct conversation with another same-org user.
  // If one already exists, return its id.
  const createDirectConversation = useCallback(async (otherUserId: string) => {
    if (!user || otherUserId === user.id) return null;
    try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', otherUserId)
        .single();
      if (!myProfile?.organization_id || myProfile.organization_id !== otherProfile?.organization_id) {
        toast.error('Direct messages are limited to your organization');
        return null;
      }

      // Look for existing 1:1 direct conversation between the two
      const { data: existingConvs } = await supabase
        .from('conversations')
        .select('id, conversation_participants!inner(user_id)')
        .eq('conversation_type', 'direct')
        .eq('organization_id', myProfile.organization_id)
        .eq('conversation_participants.user_id', user.id);

      if (existingConvs && existingConvs.length > 0) {
        const ids = existingConvs.map((c: any) => c.id);
        const { data: allParts } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .in('conversation_id', ids);
        const byConv = new Map<string, Set<string>>();
        (allParts || []).forEach((p: any) => {
          const s = byConv.get(p.conversation_id) || new Set<string>();
          s.add(p.user_id);
          byConv.set(p.conversation_id, s);
        });
        for (const [cid, members] of byConv.entries()) {
          if (members.size === 2 && members.has(user.id) && members.has(otherUserId)) {
            return cid;
          }
        }
      }

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title: null,
          conversation_type: 'direct',
          created_by: user.id,
          organization_id: myProfile.organization_id,
        })
        .select()
        .single();
      if (convError) throw convError;

      const { error: partErr } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversation.id, user_id: user.id, role: 'member' },
          { conversation_id: conversation.id, user_id: otherUserId, role: 'member' },
        ]);
      if (partErr) throw partErr;

      await fetchConversations();
      return conversation.id;
    } catch (error) {
      console.error('Error creating direct conversation:', error);
      toast.error('Failed to start direct message');
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

          setConversations(prev => 
            prev.map(conv => {
              if (conv.id !== newMessage.conversation_id) return conv;
              const isActive = activeConversation === newMessage.conversation_id;
              const isMine = newMessage.sender_id === user.id;
              const nextUnread = isActive || isMine
                ? (conv.unread_count || 0)
                : (conv.unread_count || 0) + 1;
              return {
                ...conv,
                updated_at: new Date().toISOString(),
                last_message: newMessage,
                unread_count: nextUnread,
              };
            }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          );

          if (newMessage.sender_id !== user.id && activeConversation !== newMessage.conversation_id) {
            toast.info('New message received');
          } else if (activeConversation === newMessage.conversation_id) {
            // Auto-mark as read while viewing
            markConversationRead(newMessage.conversation_id);
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
  }, [user, activeConversation, fetchConversations, markConversationRead]);

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
    createDirectConversation,
    fetchMessages,
    markConversationRead,
    refreshConversations: fetchConversations
  };
};
