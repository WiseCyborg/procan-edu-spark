import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCurrentLanguage } from '@/i18n';

interface ListenButtonProps {
  /** Ref to the element whose textContent should be read aloud. */
  targetRef?: React.RefObject<HTMLElement>;
  /** Explicit text to read (overrides targetRef). */
  text?: string;
  className?: string;
  size?: 'sm' | 'default';
  variant?: 'outline' | 'ghost' | 'default' | 'secondary';
}

const LANG_MAP: Record<string, string> = {
  en: 'en-US',
  es: 'es-ES',
  zh: 'zh-CN',
};

function pickVoice(voices: SpeechSynthesisVoice[], bcp47: string): SpeechSynthesisVoice | undefined {
  const exact = voices.find((v) => v.lang.toLowerCase() === bcp47.toLowerCase());
  if (exact) return exact;
  const base = bcp47.split('-')[0].toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(base));
}

export const ListenButton: React.FC<ListenButtonProps> = ({
  targetRef,
  text,
  className,
  size = 'sm',
  variant = 'outline',
}) => {
  const { t, i18n } = useTranslation();
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    // Preload voices (some browsers need this).
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!supported) return null;

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const play = () => {
    const content = (text ?? targetRef?.current?.innerText ?? '').trim();
    if (!content) return;
    window.speechSynthesis.cancel();

    const lang = getCurrentLanguage();
    const bcp47 = LANG_MAP[lang] ?? 'en-US';
    const utter = new SpeechSynthesisUtterance(content);
    utter.lang = bcp47;
    const voice = pickVoice(window.speechSynthesis.getVoices(), bcp47);
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utteranceRef.current = utter;
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  };

  const listenLabel = t('listen.play', { defaultValue: 'Listen' });
  const stopLabel = t('listen.stop', { defaultValue: 'Stop' });

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={speaking ? stop : play}
      className={className}
      aria-label={speaking ? stopLabel : listenLabel}
      lang={i18n.language}
    >
      {speaking ? (
        <>
          <Square className="h-4 w-4 mr-2" />
          {stopLabel}
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4 mr-2" />
          {listenLabel}
        </>
      )}
    </Button>
  );
};

export default ListenButton;
