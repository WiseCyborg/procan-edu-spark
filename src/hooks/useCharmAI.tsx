import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface ConversationState {
  intent: 'help' | 'training' | 'compliance' | 'general' | 'urgent';
  urgency: 'low' | 'medium' | 'high';
  topic: string;
  userContext: Record<string, any>;
}

export interface UserProfile {
  userId: string;
  roles: string[];
  organizationId?: string;
  trainingProgress?: number;
  lastActivity?: Date;
  preferences: {
    voiceGender: 'female' | 'male' | 'neutral';
    responseStyle: 'professional' | 'casual' | 'detailed';
    localContext: boolean;
  };
}

export const useCharmAI = () => {
  const { user } = useAuth();
  const { roles } = useUserRole();
  const location = useLocation();
  
  const [conversationState, setConversationState] = useState<ConversationState>({
    intent: 'general',
    urgency: 'low',
    topic: '',
    userContext: {}
  });
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);

  // Initialize user profile with context awareness
  useEffect(() => {
    if (!user) return;
    
    const initializeProfile = async () => {
      try {
        // Fetch user data and training progress
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const { data: progress } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id);

        const trainingProgress = progress ? 
          Math.round((progress.filter((p: any) => p.is_completed).length / 18) * 100) : 0;

        setUserProfile({
          userId: user.id,
          roles,
          organizationId: profile?.organization_id,
          trainingProgress,
          lastActivity: new Date(),
          preferences: {
            voiceGender: 'female',
            responseStyle: 'professional',
            localContext: true
          }
        });
      } catch (error) {
        console.error('Error initializing user profile:', error);
      }
    };

    initializeProfile();
  }, [user, roles]);

  // Analyze conversation intent and urgency
  const analyzeMessage = useCallback((message: string): ConversationState => {
    const urgentKeywords = ['urgent', 'emergency', 'help', 'stuck', 'error', 'broken'];
    const helpKeywords = ['how', 'what', 'where', 'why', 'explain', 'help'];
    const trainingKeywords = ['course', 'training', 'module', 'certificate', 'exam'];
    const complianceKeywords = ['compliance', 'regulation', 'legal', 'requirement'];

    const lowercaseMessage = message.toLowerCase();
    
    let intent: ConversationState['intent'] = 'general';
    let urgency: ConversationState['urgency'] = 'low';

    // Determine intent
    if (trainingKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'training';
    } else if (complianceKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'compliance';
    } else if (helpKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      intent = 'help';
    }

    // Determine urgency
    if (urgentKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      urgency = 'high';
    } else if (intent === 'help' || intent === 'compliance') {
      urgency = 'medium';
    }

    return {
      intent,
      urgency,
      topic: extractTopic(message),
      userContext: {
        currentRoute: location.pathname,
        userRole: roles[0] || 'student',
        organizationId: userProfile?.organizationId
      }
    };
  }, [location.pathname, roles, userProfile]);

  const extractTopic = (message: string): string => {
    // Simple topic extraction - can be enhanced with NLP
    const words = message.toLowerCase().split(' ');
    const importantWords = words.filter(word => 
      word.length > 3 && !['what', 'where', 'when', 'how', 'why'].includes(word)
    );
    return importantWords.slice(0, 3).join(' ');
  };

  // Generate dynamic links based on user context
  const generateContextualLinks = useCallback((intent: string, userRole: string) => {
    const links: Array<{ text: string; url: string; description: string }> = [];

    if (intent === 'training') {
      links.push({
        text: 'Continue Training',
        url: '/dashboard',
        description: 'Return to your training dashboard'
      });
      
      if (userRole === 'dispensary_manager') {
        links.push({
          text: 'Employee Progress',
          url: '/dispensary-portal',
          description: 'View your team\'s training progress'
        });
      }
    }

    if (intent === 'compliance' && userRole !== 'student') {
      links.push({
        text: 'Compliance Reports',
        url: '/admin-dashboard',
        description: 'Access compliance analytics'
      });
    }

    return links;
  }, []);

  // Enhanced message sending with context
  const sendEnhancedMessage = useCallback(async (message: string) => {
    if (!userProfile) return null;

    const analyzedState = analyzeMessage(message);
    setConversationState(analyzedState);

    // Add to conversation history for context
    setConversationHistory(prev => [...prev.slice(-9), message]);

    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          message,
          context: {
            ...analyzedState,
            conversationHistory: conversationHistory.slice(-3), // Last 3 messages for context
            userProfile,
            suggestedLinks: generateContextualLinks(analyzedState.intent, roles[0] || 'student')
          },
          user_id: user?.id,
          user_roles: roles
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error sending enhanced message:', error);
      return null;
    }
  }, [userProfile, analyzeMessage, conversationHistory, generateContextualLinks, roles, user?.id]);

  // Handle help tooltip integration
  const handleTooltipHelp = useCallback(async (helpKey: string, content: string) => {
    const enhancedMessage = `Help needed with: ${helpKey}. Context: ${content}`;
    return await sendEnhancedMessage(enhancedMessage);
  }, [sendEnhancedMessage]);

  return {
    conversationState,
    userProfile,
    sendEnhancedMessage,
    handleTooltipHelp,
    analyzeMessage,
    generateContextualLinks
  };
};