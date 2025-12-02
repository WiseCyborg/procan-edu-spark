import { supabase } from '@/integrations/supabase/client';

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export const pushNotificationService = {
  /**
   * Send a push notification for a new message in a conversation
   */
  async notifyNewMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    messagePreview: string;
    conversationTitle: string;
  }) {
    try {
      const { data, error } = await supabase.functions.invoke('send-message-notification', {
        body: {
          conversationId: params.conversationId,
          senderId: params.senderId,
          senderName: params.senderName,
          messagePreview: params.messagePreview,
          conversationTitle: params.conversationTitle,
        }
      });

      if (error) {
        console.error('[Push] Error sending message notification:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('[Push] Exception sending message notification:', error);
      return { success: false, error };
    }
  },

  /**
   * Send a push notification for an @mention
   */
  async notifyMention(params: {
    mentionedUserIds: string[];
    senderName: string;
    messagePreview: string;
    conversationTitle: string;
    conversationId: string;
  }) {
    try {
      // Send notification to each mentioned user
      const promises = params.mentionedUserIds.map(userId =>
        supabase.functions.invoke('send-push-notification', {
          body: {
            userId,
            title: `${params.senderName} mentioned you`,
            body: `In ${params.conversationTitle}: ${params.messagePreview}`,
            url: `/messages?conversation=${params.conversationId}`,
            tag: `mention-${params.conversationId}`,
          }
        })
      );

      await Promise.allSettled(promises);
      return { success: true };
    } catch (error) {
      console.error('[Push] Exception sending mention notifications:', error);
      return { success: false, error };
    }
  },

  /**
   * Send a push notification when a video call starts
   */
  async notifyVideoCallStart(params: {
    conversationId: string;
    conversationTitle: string;
    startedBy: string;
    participantIds: string[];
  }) {
    try {
      // Send notification to all participants except the one who started the call
      const promises = params.participantIds
        .filter(id => id !== params.startedBy)
        .map(userId =>
          supabase.functions.invoke('send-push-notification', {
            body: {
              userId,
              title: 'Video call started',
              body: `Join the call in ${params.conversationTitle}`,
              url: `/messages?conversation=${params.conversationId}`,
              tag: `video-call-${params.conversationId}`,
            }
          })
        );

      await Promise.allSettled(promises);
      return { success: true };
    } catch (error) {
      console.error('[Push] Exception sending video call notifications:', error);
      return { success: false, error };
    }
  },

  /**
   * Send a test push notification to the current user
   */
  async sendTestNotification(userId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId,
          title: 'Test Notification',
          body: 'Your push notifications are working! 🎉',
          url: '/',
          tag: 'test',
        }
      });

      if (error) {
        console.error('[Push] Error sending test notification:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      console.error('[Push] Exception sending test notification:', error);
      return { success: false, error };
    }
  }
};
