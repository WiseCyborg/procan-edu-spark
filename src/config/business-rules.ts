export const BUSINESS_RULES = {
  // Course
  TOTAL_MODULES: 18,
  PASSING_SCORE_PERCENTAGE: 80,
  
  // Seat Pricing
  SEAT_PRICE_USD: 49.99,
  CURRENCY: 'USD',
  
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