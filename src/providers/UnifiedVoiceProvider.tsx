import React, { createContext, useContext, useCallback, useState, useRef } from 'react';
import { getStoredLanguage } from '@/components/chat/LanguageSwitcher';

interface VoiceSettings {
  enabled: boolean;
  gender: 'female' | 'male' | 'neutral';
  rate: number;
  pitch: number;
  volume: number;
  voice: string | null;
}

interface UnifiedVoiceContextType {
  settings: VoiceSettings;
  updateSettings: (newSettings: Partial<VoiceSettings>) => void;
  speak: (text: string, options?: { priority?: 'low' | 'high' }) => void;
  stop: () => void;
  isSupported: boolean;
  isSpeaking: boolean;
  availableVoices: SpeechSynthesisVoice[];
}

const UnifiedVoiceContext = createContext<UnifiedVoiceContextType | undefined>(undefined);

export const UnifiedVoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<VoiceSettings>({
    enabled: true,
    gender: 'female',
    rate: 1,
    pitch: 1,
    volume: 0.8,
    voice: null
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speechQueue = useRef<string[]>([]);
  const lastSpokenText = useRef<string>('');
  const debounceTimeout = useRef<NodeJS.Timeout>();

  const isSupported = 'speechSynthesis' in window;

  // Load voices when available
  React.useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Auto-select appropriate voice based on gender preference
      if (!settings.voice && voices.length > 0) {
        const preferredVoice = selectVoice(voices, settings.gender);
        if (preferredVoice) {
          setSettings(prev => ({ ...prev, voice: preferredVoice.name }));
        }
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, [settings.gender, settings.voice, isSupported]);

  const selectVoice = (voices: SpeechSynthesisVoice[], gender: string, langCode?: string): SpeechSynthesisVoice | null => {
    const targetLang = langCode || getStoredLanguage();
    const langPrefixMap: Record<string, string> = {
      en: 'en', es: 'es', zh: 'zh', fr: 'fr', vi: 'vi', am: 'am',
    };
    const prefix = langPrefixMap[targetLang] || 'en';

    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(prefix));

    if (langVoices.length > 0) {
      const genderedMatch = langVoices.find(v => {
        const n = v.name.toLowerCase();
        if (gender === 'female') return n.includes('female') || n.includes('woman') || n.includes('samantha') || n.includes('serena') || n.includes('zira');
        if (gender === 'male') return n.includes('male') || n.includes('man') || n.includes('david') || n.includes('mark');
        return false;
      });
      return genderedMatch || langVoices[0];
    }

    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    if (gender === 'female') {
      return englishVoices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('female') || n.includes('samantha') || n.includes('serena') || n.includes('zira');
      }) || englishVoices[0] || null;
    }
    if (gender === 'male') {
      return englishVoices.find(v => {
        const n = v.name.toLowerCase();
        return n.includes('male') || n.includes('david') || n.includes('mark');
      }) || englishVoices[1] || englishVoices[0] || null;
    }
    return englishVoices[0] || voices[0] || null;
  };

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // If gender changed, auto-select new voice
      if (newSettings.gender && newSettings.gender !== prev.gender) {
        const newVoice = selectVoice(availableVoices, newSettings.gender);
        if (newVoice) {
          updated.voice = newVoice.name;
        }
      }
      
      return updated;
    });
  }, [availableVoices]);

  const speak = useCallback((text: string, options: { priority?: 'low' | 'high' } = {}) => {
    if (!isSupported || !settings.enabled || !text.trim()) return;

    // Debounce repeated identical text
    if (text === lastSpokenText.current) {
      return;
    }

    // Clear previous debounce
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      // Stop current speech if high priority
      if (options.priority === 'high') {
        speechSynthesis.cancel();
        speechQueue.current = [];
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings
      if (settings.voice) {
        const selectedVoice = availableVoices.find(voice => voice.name === settings.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.volume = settings.volume;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        speechQueue.current = speechQueue.current.slice(1);
        if (speechQueue.current.length > 0) {
          speak(speechQueue.current[0]);
        }
      };
      utterance.onerror = () => setIsSpeaking(false);

      // Add to queue or speak immediately
      if (isSpeaking && options.priority !== 'high') {
        speechQueue.current.push(text);
      } else {
        speechSynthesis.speak(utterance);
        lastSpokenText.current = text;
      }
    }, 150); // 150ms debounce
  }, [isSupported, settings, availableVoices, isSpeaking]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      speechQueue.current = [];
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const value: UnifiedVoiceContextType = {
    settings,
    updateSettings,
    speak,
    stop,
    isSupported,
    isSpeaking,
    availableVoices
  };

  return (
    <UnifiedVoiceContext.Provider value={value}>
      {children}
    </UnifiedVoiceContext.Provider>
  );
};

export const useUnifiedVoice = () => {
  const context = useContext(UnifiedVoiceContext);
  if (!context) {
    throw new Error('useUnifiedVoice must be used within UnifiedVoiceProvider');
  }
  return context;
};