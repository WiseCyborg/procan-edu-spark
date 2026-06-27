import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
  ttsLang: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'en', label: 'English',    nativeLabel: 'English',      flag: '🇺🇸', ttsLang: 'en-US' },
  { code: 'es', label: 'Spanish',    nativeLabel: 'Español',      flag: '🇪🇸', ttsLang: 'es-US' },
  { code: 'fr', label: 'French',     nativeLabel: 'Français',     flag: '🇫🇷', ttsLang: 'fr-FR' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt',  flag: '🇻🇳', ttsLang: 'vi-VN' },
  { code: 'zh', label: 'Chinese',    nativeLabel: '中文',          flag: '🇨🇳', ttsLang: 'zh-CN' },
  { code: 'am', label: 'Amharic',    nativeLabel: 'አማርኛ',         flag: '🇪🇹', ttsLang: 'am-ET' },
];

export const LANGUAGE_STORAGE_KEY = 'procann_language';

export function getStoredLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en';
}

export function setStoredLanguage(code: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
}

interface LanguageSwitcherProps {
  compact?: boolean;
  onLanguageChange?: (lang: LanguageOption) => void;
}

export function LanguageSwitcher({ compact = true, onLanguageChange }: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<LanguageOption>(() => {
    const stored = getStoredLanguage();
    return LANGUAGE_OPTIONS.find(l => l.code === stored) || LANGUAGE_OPTIONS[0];
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (lang: LanguageOption) => {
    setCurrent(lang);
    setStoredLanguage(lang.code);
    setIsOpen(false);
    onLanguageChange?.(lang);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-1 h-7 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(v => !v)}
        aria-label={`Language: ${current.label}`}
        title={`Language: ${current.label}`}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="text-sm">{current.flag}</span>
        {!compact && <span className="text-xs">{current.nativeLabel}</span>}
      </Button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 min-w-[160px] overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-150">
          {LANGUAGE_OPTIONS.map(lang => (
            <button
              key={lang.code}
              onClick={() => select(lang)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-accent ${
                current.code === lang.code ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.nativeLabel}</span>
              {current.code === lang.code && <span className="ml-auto text-primary text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
