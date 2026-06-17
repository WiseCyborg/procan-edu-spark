/**
 * Syncs authenticated user's `profiles.preferred_language` with the i18n runtime.
 *
 * Resolution rules:
 * - On login: profile value wins, overwrites localStorage.
 * - On manual switch (LanguageSwitcher): localStorage updates immediately AND the profile is
 *   patched in the background (no UI block).
 * - On logout: leave the last-used language in localStorage so anon UX stays consistent.
 */
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  setLanguage,
  type SupportedLanguage,
} from "@/i18n";

export function usePreferredLanguage() {
  const { user } = useAuth();
  const { i18n } = useTranslation();

  // On auth: pull profile.preferred_language and apply it.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || error || !data?.preferred_language) return;
      if (isSupportedLanguage(data.preferred_language)) {
        setLanguage(data.preferred_language);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Manual changer: updates runtime + localStorage immediately, persists to profile in background.
  const changeLanguage = async (lng: SupportedLanguage) => {
    if (!isSupportedLanguage(lng)) return;
    setLanguage(lng);
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_language: lng })
      .eq("id", user.id);
    if (error) {
      console.warn("[usePreferredLanguage] Failed to persist language to profile:", error.message);
    }
  };

  return {
    language: (i18n.resolvedLanguage ?? i18n.language ?? "en").split("-")[0] as SupportedLanguage,
    changeLanguage,
    storageKey: LANGUAGE_STORAGE_KEY,
  };
}
