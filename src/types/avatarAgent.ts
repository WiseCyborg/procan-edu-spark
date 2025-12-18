// Avatar Agent Type Definitions

export type UserRole = 'student' | 'manager' | 'admin' | 'training_coordinator' | 'public';

export type AvatarPriority = 'low' | 'normal' | 'high' | 'critical';

export type AvatarState = 'idle' | 'speaking' | 'waiting' | 'error';

export interface AvatarContext {
  firstName?: string;
  role: UserRole;
  organizationName?: string;
  organizationId?: string;
  currentPage: string;
  issueDetected?: string;
  recommendedAction?: string;
  moduleNumber?: number;
  moduleName?: string;
  completionPercentage?: number;
}

export interface AvatarPrompt {
  id: string;
  name: string;
  category: 'admin' | 'manager' | 'student' | 'public' | 'system';
  trigger: string; // page route or event type
  roles: UserRole[];
  template: string;
  gazeTarget?: string; // CSS selector for gaze coupling
  priority: AvatarPriority;
  isActive: boolean;
}

export interface AvatarMessage {
  id: string;
  promptId: string;
  compiledText: string;
  audioBase64?: string;
  gazeTarget?: string;
  priority: AvatarPriority;
  context: AvatarContext;
  createdAt: string;
  deliveredAt?: string;
  status: 'pending' | 'delivered' | 'played' | 'skipped';
}

export interface AvatarDeliveryConfig {
  voice: 'nova' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer';
  speed: number;
  enableGaze: boolean;
  pauseBeforeAction: number; // ms
  holdGazeDuration: number; // ms
}

export interface AvatarAgentEvent {
  eventType: 'trigger' | 'dispatch' | 'delivered' | 'played' | 'skipped' | 'error';
  promptId?: string;
  context: AvatarContext;
  priority: AvatarPriority;
  metadata?: Record<string, unknown>;
}

export interface AvatarInteraction {
  id: string;
  userId?: string;
  promptId: string;
  context: AvatarContext;
  action: 'played' | 'skipped' | 'replayed';
  durationMs?: number;
  createdAt: string;
}

// Master Persona Configuration
export interface AvatarPersona {
  name: string;
  description: string;
  tone: string[];
  speakingStyle: string[];
  behaviorRules: string[];
  platformContext: string;
}

export const MASTER_PERSONA: AvatarPersona = {
  name: 'ProCann Edu Guide',
  description: 'A calm, professional compliance guide for ProCann Edu — Maryland\'s Responsible Vendor Training platform.',
  tone: [
    'Calm',
    'Professional',
    'Friendly',
    'Assured',
    'Never robotic',
    'Never salesy'
  ],
  speakingStyle: [
    'Short, clear sentences',
    'Natural pauses',
    'Explain what matters and why',
    'Assume the user may be new or overwhelmed'
  ],
  behaviorRules: [
    'Always address the user by their first name if available',
    'If explaining a screen, briefly describe what the user is seeing',
    'If an action is required, clearly state the next step',
    'If there is a blocker, explain it and offer the solution'
  ],
  platformContext: 'This platform supports Maryland Cannabis Administration (MCA) Responsible Vendor Training. Accuracy and trust are critical. Do not invent facts. Do not overpromise. Do not mention internal system errors unless explaining a fix.'
};
