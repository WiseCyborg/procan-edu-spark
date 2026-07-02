This is an investigation report, not an implementation plan. No files will be changed.

## Files

- Widget: `src/components/chat/DraggableVoiceAssistant.tsx` (934 lines)
- Message card: `src/components/chat/DraggableMessage.tsx`
- Scroll wrapper: `src/components/chat/EnhancedScrollArea.tsx`
- Global mount: `src/App.tsx:190` — rendered on every route except `/auth`, `/forgot-password`, `/accept-invitation`, `/manager-registration`, and `?mode=reset`.
- Separate avatar surface (not the same component): `src/components/ailean/AiLeanCoach.tsx`, persona in `src/types/avatarAgent.ts` (`MASTER_PERSONA` = "ProCann Edu Guide").

## Likely UX issues found

1. Drag capture is too broad. `onMouseDown={handleToggleMouseDown}` is on the whole floating launcher button (`DraggableVoiceAssistant.tsx:716`). `handleMouseDown` (line 275) calls `preventDefault` + `stopPropagation` on every mousedown and sets `isDragging=true`; the click handler at line 710 then suppresses the open/close toggle whenever `isDragging` is true. A tiny cursor jitter turns "open chat" into a reposition. The header `<Move />` icon at line 741 is decorative — it has no listener, so the panel itself is not draggable even though the icon implies it is.

2. No per-message playback control. `DraggableMessage.tsx` renders only Copy / Pin / Unpin. TTS auto-fires from `DraggableVoiceAssistant.tsx:600` (`speak(data.response)` when `voiceSettings.enabled && voiceSettings.volume > 0`). The header `<Volume2 />` at line 750 is a passive pulse indicator, not a button. There is no visible play, pause, replay, or stop control anywhere in the widget; `stop()` is only invoked on language change (line 204).

3. Scroll container is not directly intercepted by drag, but is cramped. Messages live in `<EnhancedScrollArea className="flex-1 pr-3 max-h-60">` at line 825 inside a panel capped at `maxHeight: '70vh'`. Drag listeners are on the launcher, not the panel, so wheel/touch scroll works — but the 240px cap makes multi-turn conversations feel broken.

## Persona / greeting source

Both the "AiLean" name and the "Beautiful day in Maryland! I'm AiLean…" greeting are hardcoded inside `DraggableVoiceAssistant.tsx`:

- Name appears in five `systemPrompt` strings inside `getContextInfo()` at lines 79, 94, 119, 134, 148.
- Greeting is assembled inline in the welcome `useEffect` at lines 472–485 via `getWeatherContext()` + a template literal.

There is no shared persona module. `AiLeanCoach` / `MASTER_PERSONA` in `src/types/avatarAgent.ts` is a separate config still named "ProCann Edu Guide" — the two surfaces have drifted.

## Exam vs training visibility

The widget is mounted on exam pages, not unmounted. `getContextInfo()` (lines 98–107) only checks `pathname.includes('final-exam')`. When matched:

- `isChatDisabled = true` (line 224).
- The launcher is not rendered; a "Chat Unavailable" card renders instead (lines 638–671) with a dismiss X.

The gate is substring-only. Section quizzes, module quizzes, and any other assessment routes that do not contain the literal `final-exam` get the full chat + auto-TTS widget.

## Suggested follow-up scopes (for later, not now)

- Move drag listener onto a dedicated drag handle on the panel header (or the `Move` icon) and drop it from the launcher button; keep the launcher a pure click target.
- Add a per-assistant-message speaker button in `DraggableMessage.tsx` that calls `speak(message.content)` / `stop()` from `useUnifiedVoice`; add a stop control in the header while `isSpeaking`.
- Extract the "AiLean" persona name and greeting into a shared persona module used by both the widget and `AiLeanCoach`.
- Broaden the exam gate beyond the `final-exam` substring if the product wants the widget hidden during all graded assessments.
