import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentLanguage } from '@/i18n';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIFAQChat = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Reset greeting whenever language changes (or on first mount).
  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: t('chatbot.greeting', {
          defaultValue:
            "Hi! I'm AiLean, your ProCann training assistant. Ask me anything about Maryland RVT certification, COMAR compliance, or our training programs!",
        }),
      },
    ]);
  }, [i18n.language, t]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const language = getCurrentLanguage();
    const languageName =
      language === 'es' ? 'Spanish (Español)' : language === 'zh' ? 'Simplified Chinese (中文)' : 'English';

    try {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: {
          message: userMessage,
          user_language: language,
          context: {
            page: 'homepage',
            type: 'faq',
            systemPrompt: `You are AiLean, ProCann's AI training assistant specializing in Maryland RVT (Responsible Vendor Training) certification and compliance.

RESPONSE LANGUAGE (STRICT): Always respond in ${languageName}. This is the user's selected UI language. Reply in ${languageName} regardless of what language the user typed their question in. Keep proper nouns (ProCann, COMAR, Maryland, RVT) and regulatory citation numbers in their original form.

Key Facts:
- ProCann offers $49.99 certification (Maryland max is $50.00 per COMAR 14.17.07.06)
- Available in all 24 Maryland counties
- 4-6 hour self-paced online certification
- 24 COMAR-aligned training modules
- AI-powered learning assistance with instant feedback
- 24/7 access from any device
- Secure QR-verified certificates

Answer questions about:
- Maryland COMAR 14.17 compliance requirements
- RVT certification process
- Pricing and features
- Training content and delivery
- State regulations and updates

Be helpful, concise, and professional. Do not make up statistics or claims. If you don't know something, suggest contacting support@procannedu.com.`,
          },
        },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            data?.response ||
            data?.reply ||
            t('chatbot.error.generic', { defaultValue: 'Something went wrong. Please try again.' }),
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('chatbot.error.generic', { defaultValue: 'Something went wrong. Please try again.' }),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
        size="icon"
        aria-label={t('chatbot.title', { defaultValue: 'Ask AiLean' })}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] h-[500px] bg-background border rounded-lg shadow-2xl flex flex-col z-50 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">{t('chatbot.title', { defaultValue: 'Ask AiLean' })}</h3>
                <p className="text-xs opacity-90">
                  {t('chatbot.subtitle', { defaultValue: 'Ask about RVT certification' })}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              aria-label={t('common.cancel', { defaultValue: 'Cancel' })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('chatbot.placeholder', { defaultValue: 'Ask a question...' })}
                disabled={isLoading}
                lang={i18n.language}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                aria-label={t('chatbot.send', { defaultValue: 'Send' })}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
