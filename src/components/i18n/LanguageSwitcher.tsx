import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import { usePreferredLanguage } from "@/hooks/usePreferredLanguage";

interface LanguageSwitcherProps {
  /** When true, render only the language code (no globe icon). Used in tight nav slots. */
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { language, changeLanguage } = usePreferredLanguage();
  const current = LANGUAGE_LABELS[language];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-1.5"
          aria-label={t("language.changeLanguage")}
        >
          {!compact && <Globe className="h-4 w-4" aria-hidden="true" />}
          <span className="text-xs font-semibold tracking-wide">{current.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {SUPPORTED_LANGUAGES.map((lng) => {
          const label = LANGUAGE_LABELS[lng];
          const isActive = lng === language;
          return (
            <DropdownMenuItem
              key={lng}
              onClick={() => changeLanguage(lng as SupportedLanguage)}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs font-semibold w-7 text-muted-foreground">
                  {label.code}
                </span>
                <span>{label.native}</span>
              </span>
              {isActive && <Check className="h-4 w-4" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
