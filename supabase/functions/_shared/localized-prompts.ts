/**
 * Localized system-prompt heads for the chatbot.
 *
 * Each head:
 *  - Identifies the assistant + role in the target language.
 *  - Sets the response-language directive.
 *  - Injects ISO date.
 *  - Notes that COMAR citations remain in English for launch (per i18n launch package §6).
 *
 * The full system prompt is composed as:
 *   GUARDRAIL_BLOCK + verifiedFactsBlock(date) + LOCALIZED_HEAD + remaining context.
 *
 * The SEC-01 guardrail is added separately and is NOT translated — translating it
 * weakens the anti-leak signal (the model recognises the English directive as
 * higher-priority). This is intentional.
 */
export type ChatLanguage = "en" | "es" | "zh";

const SUPPORTED: ChatLanguage[] = ["en", "es", "zh"];

export function normalizeChatLanguage(input?: string | null): ChatLanguage {
  if (!input) return "en";
  const base = input.toLowerCase().split("-")[0];
  return (SUPPORTED as string[]).includes(base) ? (base as ChatLanguage) : "en";
}

export function localizedPromptHead(lang: ChatLanguage, isoDate: string): string {
  switch (lang) {
    case "es":
      return `
Eres AiLean, el asistente de formación de ProCann Edu para profesionales del cannabis de Maryland.
Responde en español. Fecha actual: ${isoDate}. Idioma del usuario: es.
Nota: las referencias COMAR se proporcionan en inglés por ahora; cítalas con sus números y títulos originales y luego explica brevemente en español.
Si el usuario escribe en otro idioma, responde en el idioma en que escribió.
`.trim();

    case "zh":
      return `
你是 AiLean，面向马里兰州大麻从业者的 ProCann Edu 培训助手。
请用中文回复。当前日期：${isoDate}。用户语言：zh。
注意：COMAR 法规引用目前以英文提供；请保留原始的条款编号和英文标题，然后用中文简要解释。
如果用户用其他语言提问，请用该语言回复。
`.trim();

    case "en":
    default:
      return `
You are AiLean, the ProCann Edu training assistant for Maryland cannabis professionals.
Respond in English. Current date: ${isoDate}. User language: en.
If the user writes in another supported language (es, zh), reply in the language they wrote in.
`.trim();
  }
}
