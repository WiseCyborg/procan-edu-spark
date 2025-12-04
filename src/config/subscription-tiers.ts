export interface SubscriptionTier {
  id: string;
  tierName: string;
  displayName: string;
  maxActiveSeats: number;
  rotationalBuffer: number;
  annualPriceCents: number;
  monthlyEquivalentCents: number;
  pricePerSeatCents: number;
  displayOrder: number;
  features: string[];
  isPopular?: boolean;
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'starter',
    tierName: 'starter',
    displayName: 'Starter',
    maxActiveSeats: 35,
    rotationalBuffer: 15,
    annualPriceCents: 350000,
    monthlyEquivalentCents: 29167,
    pricePerSeatCents: 10000,
    displayOrder: 1,
    features: [
      'Up to 35 active learners',
      '+15 rotational buffer',
      'Basic reporting & analytics',
      'Email support',
      'Standard SLA (24hr response)',
      'Certificate generation',
      'Join code management',
    ],
  },
  {
    id: 'professional',
    tierName: 'professional',
    displayName: 'Professional',
    maxActiveSeats: 60,
    rotationalBuffer: 25,
    annualPriceCents: 550000,
    monthlyEquivalentCents: 45833,
    pricePerSeatCents: 9167,
    displayOrder: 2,
    isPopular: true,
    features: [
      'Up to 60 active learners',
      '+25 rotational buffer',
      'Advanced analytics dashboard',
      'Priority support (4hr response)',
      'Custom branding options',
      'Compliance reporting',
      'Bulk employee import',
      'Manager training module',
    ],
  },
  {
    id: 'enterprise',
    tierName: 'enterprise',
    displayName: 'Enterprise',
    maxActiveSeats: 100,
    rotationalBuffer: 40,
    annualPriceCents: 850000,
    monthlyEquivalentCents: 70833,
    pricePerSeatCents: 8500,
    displayOrder: 3,
    features: [
      'Up to 100 active learners',
      '+40 rotational buffer',
      'Dedicated success manager',
      'API access',
      'Custom integrations',
      'White-label certificates',
      'Priority phone support',
      'Custom reporting',
      'SSO integration',
    ],
  },
  {
    id: 'unlimited',
    tierName: 'unlimited',
    displayName: 'Unlimited',
    maxActiveSeats: 999999,
    rotationalBuffer: 999999,
    annualPriceCents: 1200000,
    monthlyEquivalentCents: 100000,
    pricePerSeatCents: 0,
    displayOrder: 4,
    features: [
      'Unlimited active learners',
      'Unlimited rotation',
      'Everything in Enterprise',
      'Custom SLA',
      'On-site training options',
      'Multi-location management',
      'Dedicated infrastructure',
      'Custom development support',
    ],
  },
];

export const SPECIAL_PRICING = {
  nonprofit: {
    discountPercent: 20,
    label: 'Nonprofit Discount',
    description: 'Valid 501(c)(3) organizations receive 20% off',
  },
  government: {
    discountPercent: 0,
    label: 'Government Pricing',
    description: 'Custom rates for government agencies',
  },
  multiYear2: {
    discountPercent: 10,
    label: '2-Year Commitment',
    description: 'Save 10% with a 2-year subscription',
  },
  multiYear3: {
    discountPercent: 15,
    label: '3-Year Commitment',
    description: 'Save 15% with a 3-year subscription',
  },
};

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function getTierByName(tierName: string): SubscriptionTier | undefined {
  return SUBSCRIPTION_TIERS.find(t => t.tierName === tierName);
}

export function getNextTier(currentTier: string): SubscriptionTier | undefined {
  const current = SUBSCRIPTION_TIERS.find(t => t.tierName === currentTier);
  if (!current) return SUBSCRIPTION_TIERS[0];
  return SUBSCRIPTION_TIERS.find(t => t.displayOrder === current.displayOrder + 1);
}

export function calculateProration(
  currentTierCents: number,
  newTierCents: number,
  daysRemaining: number
): number {
  const dailyDifference = (newTierCents - currentTierCents) / 365;
  return Math.round(dailyDifference * daysRemaining);
}
