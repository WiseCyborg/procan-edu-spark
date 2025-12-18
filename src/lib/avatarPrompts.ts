// Avatar Prompt Library
import { AvatarPrompt, AvatarContext, MASTER_PERSONA } from '@/types/avatarAgent';

// Compile a prompt template with context variables
export function compilePrompt(template: string, context: AvatarContext): string {
  let compiled = template;
  
  // Replace all context variables
  compiled = compiled.replace(/\{\{first_name\}\}/g, context.firstName || 'there');
  compiled = compiled.replace(/\{\{role\}\}/g, context.role || 'user');
  compiled = compiled.replace(/\{\{organization_name\}\}/g, context.organizationName || 'your organization');
  compiled = compiled.replace(/\{\{current_page\}\}/g, context.currentPage || 'this page');
  compiled = compiled.replace(/\{\{issue_detected\}\}/g, context.issueDetected || '');
  compiled = compiled.replace(/\{\{recommended_action\}\}/g, context.recommendedAction || '');
  compiled = compiled.replace(/\{\{module_number\}\}/g, String(context.moduleNumber || ''));
  compiled = compiled.replace(/\{\{module_name\}\}/g, context.moduleName || 'this module');
  compiled = compiled.replace(/\{\{completion_percentage\}\}/g, String(context.completionPercentage || 0));
  
  return compiled;
}

// Build the full system prompt for TTS/Avatar
export function buildSystemPrompt(): string {
  return `You are a ${MASTER_PERSONA.name}.

${MASTER_PERSONA.description}

Tone:
${MASTER_PERSONA.tone.map(t => `- ${t}`).join('\n')}

Speaking style:
${MASTER_PERSONA.speakingStyle.map(s => `- ${s}`).join('\n')}

Behavior rules:
${MASTER_PERSONA.behaviorRules.map(r => `- ${r}`).join('\n')}

Context:
${MASTER_PERSONA.platformContext}`;
}

// Master Prompt Library
export const AVATAR_PROMPTS: AvatarPrompt[] = [
  // ===== ADMIN PROMPTS =====
  {
    id: 'admin-pipeline-health-alert',
    name: 'Pipeline Health Alert',
    category: 'admin',
    trigger: '/admin',
    roles: ['admin'],
    template: `Hi {{first_name}}.

I'm noticing that {{organization_name}} has a manager who hasn't completed registration yet.
This is preventing seats from being activated.

You can resolve this by sending a reminder from the Actions menu.

Once the manager completes registration, the pipeline will automatically update.`,
    gazeTarget: '#org-actions-menu',
    priority: 'high',
    isActive: true
  },
  {
    id: 'admin-system-health-degraded',
    name: 'System Health Degraded',
    category: 'admin',
    trigger: 'system_health_degraded',
    roles: ['admin'],
    template: `{{first_name}}, I've detected some system issues that need attention.

{{issue_detected}}

{{recommended_action}}

I'll keep monitoring and let you know once things are back to normal.`,
    gazeTarget: '#health-feed',
    priority: 'high',
    isActive: true
  },
  {
    id: 'admin-pending-applications',
    name: 'Pending Applications Alert',
    category: 'admin',
    trigger: 'pending_applications',
    roles: ['admin'],
    template: `Hi {{first_name}}.

There are dispensary applications waiting for review.
Some have been pending for more than 48 hours.

You can review them in the Dispensary Management section.
Each application needs approval before managers can register.`,
    gazeTarget: '#pending-applications',
    priority: 'normal',
    isActive: true
  },

  // ===== MANAGER PROMPTS =====
  {
    id: 'manager-onboarding-welcome',
    name: 'Onboarding Welcome',
    category: 'manager',
    trigger: '/manager-onboarding',
    roles: ['manager'],
    template: `Welcome, {{first_name}}.

You're currently on the manager onboarding screen.
This is where you confirm your organization details and invite employees.

Once all four steps are complete, your team will be able to begin training immediately.

If you'd like, I can walk you through each step.`,
    gazeTarget: '#onboarding-steps',
    priority: 'normal',
    isActive: true
  },
  {
    id: 'manager-invite-employees',
    name: 'Invite Employees Guidance',
    category: 'manager',
    trigger: '/manager-onboarding?step=4',
    roles: ['manager'],
    template: `This is the final step, {{first_name}}.

Here you can invite your employees to start their training.
Enter their email address and select their role.

They'll receive an invitation with a link to register and begin immediately.
You can track their progress from your dashboard once they start.`,
    gazeTarget: '#invite-form',
    priority: 'normal',
    isActive: true
  },
  {
    id: 'manager-seat-management',
    name: 'Seat Management Help',
    category: 'manager',
    trigger: '/manager-dashboard',
    roles: ['manager', 'training_coordinator'],
    template: `Hi {{first_name}}.

I see you're viewing your team's seat allocation.
{{organization_name}} currently has seats available for training.

You can assign seats to new employees or request additional seats if needed.
Remember, each employee needs an assigned seat before they can begin training.`,
    gazeTarget: '#seat-overview',
    priority: 'low',
    isActive: true
  },

  // ===== STUDENT PROMPTS =====
  {
    id: 'student-module-locked',
    name: 'Training Lock Explanation',
    category: 'student',
    trigger: 'module_locked',
    roles: ['student'],
    template: `Hi {{first_name}}.

It looks like this module is locked because the overview hasn't been marked complete yet.
That's required before moving forward.

Once you mark the overview as complete, the next module will unlock automatically.`,
    gazeTarget: '#mark-complete-button',
    priority: 'high',
    isActive: true
  },
  {
    id: 'student-training-welcome',
    name: 'Training Welcome',
    category: 'student',
    trigger: '/course',
    roles: ['student'],
    template: `Welcome to your training, {{first_name}}.

You're starting the Responsible Vendor Training course.
There are 23 modules to complete, each covering important compliance topics.

Take your time with each section.
Your progress saves automatically, so you can return anytime.`,
    gazeTarget: '#module-list',
    priority: 'normal',
    isActive: true
  },
  {
    id: 'student-progress-milestone',
    name: 'Progress Milestone',
    category: 'student',
    trigger: 'progress_milestone',
    roles: ['student'],
    template: `Great work, {{first_name}}!

You've completed {{completion_percentage}} percent of your training.
You're making excellent progress.

Keep going — you're on track to earn your certificate.`,
    priority: 'normal',
    isActive: true
  },
  {
    id: 'student-exam-ready',
    name: 'Exam Ready',
    category: 'student',
    trigger: '/course/final-exam',
    roles: ['student'],
    template: `Congratulations, {{first_name}}.

You've completed all 23 training modules.
You're now ready to take the final certification exam.

You'll need to score 80 percent or higher to pass.
Take your time and read each question carefully.

Good luck — I know you're prepared.`,
    gazeTarget: '#start-exam-button',
    priority: 'high',
    isActive: true
  },

  // ===== PUBLIC PROMPTS =====
  {
    id: 'public-certificate-verification',
    name: 'Certificate Verification',
    category: 'public',
    trigger: '/verify-certificate',
    roles: ['public'],
    template: `You're on the ProCann Edu certificate verification page.

This tool confirms whether a certificate is valid and active.
Enter the certificate number to check its status.

If the certificate is valid, you'll see the holder's name and expiration date.`,
    gazeTarget: '#certificate-input',
    priority: 'normal',
    isActive: true
  },
  {
    id: 'public-roi-calculator',
    name: 'ROI Calculator Explainer',
    category: 'public',
    trigger: '/roi-calculator',
    roles: ['public', 'admin', 'manager'],
    template: `This calculator estimates how ProCann Edu impacts training cost and efficiency.

On the left, you'll enter your dispensary details.
On the right, you'll see projected savings based on reduced retakes and time efficiency.

These numbers update in real time as you adjust the inputs.`,
    gazeTarget: '#calculator-inputs',
    priority: 'low',
    isActive: true
  },

  // ===== SYSTEM PROMPTS =====
  {
    id: 'system-error-recovery',
    name: 'Error Recovery',
    category: 'system',
    trigger: 'system_error',
    roles: ['student', 'manager', 'admin', 'training_coordinator'],
    template: `I noticed something didn't work as expected, {{first_name}}.

Don't worry — your progress has been saved.

{{recommended_action}}

If the issue continues, you can contact support for help.`,
    priority: 'normal',
    isActive: true
  },
  {
    id: 'system-session-timeout',
    name: 'Session Timeout Warning',
    category: 'system',
    trigger: 'session_timeout_warning',
    roles: ['student', 'manager', 'admin', 'training_coordinator'],
    template: `Just a heads up, {{first_name}}.

Your session will expire in a few minutes due to inactivity.
Any unsaved work will be preserved.

Click anywhere on the page to stay logged in.`,
    priority: 'high',
    isActive: true
  }
];

// Get prompts by trigger (page route or event)
export function getPromptsByTrigger(trigger: string): AvatarPrompt[] {
  return AVATAR_PROMPTS.filter(p => p.isActive && p.trigger === trigger);
}

// Get prompts by role
export function getPromptsByRole(role: string): AvatarPrompt[] {
  return AVATAR_PROMPTS.filter(p => p.isActive && p.roles.includes(role as any));
}

// Get prompt by ID
export function getPromptById(id: string): AvatarPrompt | undefined {
  return AVATAR_PROMPTS.find(p => p.id === id);
}

// Find best matching prompt for context
export function findMatchingPrompt(
  trigger: string,
  role: string
): AvatarPrompt | undefined {
  const prompts = AVATAR_PROMPTS.filter(p => 
    p.isActive && 
    p.trigger === trigger && 
    p.roles.includes(role as any)
  );
  
  // Return highest priority match
  const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
  return prompts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])[0];
}
