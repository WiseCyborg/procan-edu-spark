/**
 * Maryland RVT duty — Louis Hendricks III (Director of Compliance), Aug 16 2026.
 * William F. Cunningham Jr. authorized applying this language on 2026-08-23.
 * Discard any earlier two-year / HB 622 "every 2 years" hypothesis.
 * MCA and COMAR still name this Responsible Vendor Training (RVT).
 * This platform is independent workforce education and does not satisfy that duty.
 */
export const MARYLAND_RVT_DUTY = {
  name: 'Responsible Vendor Training (RVT)',
  comar: 'COMAR 14.17.15.05(C)',
  quote:
    'C. Within 90 days of employment start date and annually thereafter, a registered agent employed by a cannabis licensee shall complete a responsible vendor training program that:',
  cadence: 'Within 90 days of employment start date, and annually thereafter',
  firstYearRule:
    'If an agent starts after July 1, 2026 they must complete their annual training within 90 days of employment, then every year afterwards.',
  notTwoYear: true,
} as const;

export const BUSINESS_RULES = {
  // Course
  TOTAL_MODULES: 24,
  PASSING_SCORE_PERCENTAGE: 80,
  
  // Seat Pricing - Maryland Regulatory Compliance
  SEAT_PRICE_USD: 49.99,
  MAX_ALLOWED_PRICE_MARYLAND: 50.00,
  CURRENCY: 'USD',
  
  // Maryland Pricing Regulation
  PRICING_REGULATION: {
    state: 'Maryland',
    max_charge_per_employee: 50.00,
    reference: 'ProCann Edu internal pricing policy',
    last_verified: '2025-03-01',
    compliance_notes: 'ProCann Edu charges $49.99 per employee under an internal price cap of $49.99'
  },
  
  // Enrollment
  DEFAULT_ENROLLMENT_DEADLINE_DAYS: 30,
  LOW_SEAT_THRESHOLD: 5,
  
  // Notifications
  PROGRESS_REMINDER_THRESHOLD_PERCENTAGE: 50,
  REMINDER_DAYS_BEFORE_DEADLINE: 7,
  
  // Profile Completion
  PROFILE_REQUIRED_FOR_COURSE: true,
  
  // Tier System (boundaries adjusted for 24-module course)
  TIERS: {
    GREEN: { modules_required: 0, color: '#22c55e', name: 'Green Tier' },
    YELLOW: { modules_required: 8, color: '#eab308', name: 'Yellow Tier' },
    RED: { modules_required: 16, color: '#ef4444', name: 'Red Tier' },
  }
} as const;

export type TierName = keyof typeof BUSINESS_RULES.TIERS;