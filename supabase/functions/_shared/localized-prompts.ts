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
IDIOMA DE RESPUESTA (ESTRICTO): responde SIEMPRE en español, independientemente del idioma en que el usuario escriba su pregunta. Fecha actual: ${isoDate}. Idioma seleccionado del usuario: es.
Nota: las referencias COMAR se proporcionan en inglés por ahora; cítalas con sus números y títulos originales y luego explica brevemente en español.
`.trim();

    case "zh":
      return `
你是 AiLean，面向马里兰州大麻从业者的 ProCann Edu 培训助手。
回复语言（严格要求）：无论用户使用何种语言提问，一律使用中文回复。当前日期：${isoDate}。用户选择的语言：zh。
注意：COMAR 法规引用目前以英文提供；请保留原始的条款编号和英文标题，然后用中文简要解释。
`.trim();

    case "en":
    default:
      return `
You are AiLean, the ProCann Edu training assistant for Maryland cannabis professionals.
RESPONSE LANGUAGE (STRICT): Always respond in English regardless of what language the user typed their question in. Current date: ${isoDate}. User selected language: en.
`.trim();
  }
}

