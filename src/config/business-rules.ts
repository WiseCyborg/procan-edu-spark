export const BUSINESS_RULES = {
  // Course
  TOTAL_MODULES: 18,
  PASSING_SCORE_PERCENTAGE: 80,
  
  // Seat Pricing - Maryland Regulatory Compliance
  SEAT_PRICE_USD: 49.99,
  MAX_ALLOWED_PRICE_MARYLAND: 50.00,
  CURRENCY: 'USD',
  
  // Maryland Pricing Regulation
  PRICING_REGULATION: {
    state: 'Maryland',
    max_charge_per_employee: 50.00,
    reference: 'Maryland Cannabis Administration RVT Standards',
    last_verified: '2025-03-01',
    compliance_notes: 'ProCann Edu charges $49.99 per employee, maintaining compliance with state maximum of $50.00'
  },
  
  // Enrollment
  DEFAULT_ENROLLMENT_DEADLINE_DAYS: 30,
  LOW_SEAT_THRESHOLD: 5,
  
  // Notifications
  PROGRESS_REMINDER_THRESHOLD_PERCENTAGE: 50,
  REMINDER_DAYS_BEFORE_DEADLINE: 7,
  
  // Profile Completion
  PROFILE_REQUIRED_FOR_COURSE: true,
  
  // Tier System
  TIERS: {
    GREEN: { modules_required: 0, color: '#22c55e', name: 'Green Tier' },
    YELLOW: { modules_required: 6, color: '#eab308', name: 'Yellow Tier' },
    RED: { modules_required: 12, color: '#ef4444', name: 'Red Tier' },
  }
} as const;

export type TierName = keyof typeof BUSINESS_RULES.TIERS;