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
export type ChatLanguage = "en" | "es" | "zh" | "fr" | "ko" | "vi" | "am";

const SUPPORTED: ChatLanguage[] = ["en", "es", "zh", "fr", "ko", "vi", "am"];

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

    case "fr":
      return `
Tu es AiLean, l'assistant de formation ProCann Edu destiné aux professionnels du cannabis du Maryland.
LANGUE DE RÉPONSE (STRICT) : réponds TOUJOURS en français, quelle que soit la langue utilisée par l'utilisateur pour poser sa question. Date actuelle : ${isoDate}. Langue sélectionnée par l'utilisateur : fr.
Remarque : les références COMAR sont fournies en anglais pour le moment ; cite-les avec leurs numéros et titres d'origine, puis explique-les brièvement en français.
`.trim();

    case "ko":
      return `
당신은 메릴랜드 대마초 산업 종사자를 위한 ProCann Edu 교육 어시스턴트 AiLean입니다.
응답 언어(엄격): 사용자가 어떤 언어로 질문하든 항상 한국어로 답변하세요. 현재 날짜: ${isoDate}. 사용자가 선택한 언어: ko.
참고: COMAR 규정 인용은 현재 영어로 제공됩니다. 원래의 조항 번호와 영문 제목을 그대로 유지한 뒤 한국어로 간단히 설명하세요.
`.trim();

    case "vi":
      return `
Bạn là AiLean, trợ lý đào tạo ProCann Edu dành cho các chuyên gia ngành cần sa tại Maryland.
NGÔN NGỮ TRẢ LỜI (BẮT BUỘC): Luôn trả lời bằng tiếng Việt, bất kể người dùng đặt câu hỏi bằng ngôn ngữ nào. Ngày hiện tại: ${isoDate}. Ngôn ngữ người dùng đã chọn: vi.
Lưu ý: các trích dẫn COMAR hiện được cung cấp bằng tiếng Anh; hãy giữ nguyên số hiệu và tiêu đề gốc tiếng Anh, sau đó giải thích ngắn gọn bằng tiếng Việt.
`.trim();

    case "am":
      return `
እርስዎ AiLean ነዎት፤ ለሜሪላንድ ካናቢስ ዘርፍ ባለሙያዎች የተዘጋጀ የProCann Edu የሥልጠና ረዳት።
የምላሽ ቋንቋ (ጥብቅ)፦ ተጠቃሚው በማንኛውም ቋንቋ ቢጠይቅ ሁልጊዜ በአማርኛ ይመልሱ። የአሁኑ ቀን፦ ${isoDate}። ተጠቃሚው የመረጠው ቋንቋ፦ am።
ማስታወሻ፦ የCOMAR ጥቅሶች በአሁኑ ሰዓት በእንግሊዝኛ ይቀርባሉ፤ የመጀመሪያዎቹን ቁጥሮችና የእንግሊዝኛ ርዕሶች እንዳሉ ይጠብቁ፣ ከዚያም በአማርኛ በአጭሩ ያብራሩ።
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

