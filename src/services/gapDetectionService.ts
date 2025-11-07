import { supabase } from '@/integrations/supabase/client';

export type GapCategory = 'compliance' | 'training' | 'system' | 'engagement' | 'data' | 'payment';
export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface Gap {
  id: string;
  category: GapCategory;
  severity: GapSeverity;
  title: string;
  description: string;
  affected_entity: string;
  affected_entity_id?: string;
  auto_fixable: boolean;
  suggested_action: string;
  detected_at: Date;
  metadata?: Record<string, any>;
}

export interface GapSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byCategory: Record<GapCategory, number>;
  score: number;
}

const severityWeight: Record<GapSeverity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

export const calculateGapScore = (gaps: Gap[]): number => {
  const totalWeight = gaps.reduce((sum, gap) => sum + severityWeight[gap.severity], 0);
  return Math.max(0, Math.min(100, 100 - totalWeight));
};

export const detectComplianceGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  
  try {
    // Check for modules without COMAR references
    const { data: modules } = await supabase
      .from('course_modules')
      .select('module_number, title, comar_reference, updated_at, description')
      .is('comar_reference', null);
    
    if (modules) {
      modules.forEach(module => {
        gaps.push({
          id: `compliance-missing-comar-${module.module_number}`,
          category: 'compliance',
          severity: 'high',
          title: `Missing COMAR Reference - Module ${module.module_number}`,
          description: `Module "${module.title}" lacks proper COMAR regulatory mapping`,
          affected_entity: `Module ${module.module_number}`,
          affected_entity_id: module.module_number.toString(),
          auto_fixable: false,
          suggested_action: 'Map to appropriate COMAR section',
          detected_at: new Date(),
        });
      });
    }

    // Check for outdated modules (not updated in 6+ months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: outdatedModules } = await supabase
      .from('course_modules')
      .select('module_number, title, updated_at')
      .lt('updated_at', sixMonthsAgo.toISOString());
    
    if (outdatedModules) {
      outdatedModules.forEach(module => {
        const monthsOld = Math.floor((new Date().getTime() - new Date(module.updated_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
        gaps.push({
          id: `compliance-outdated-${module.module_number}`,
          category: 'compliance',
          severity: monthsOld > 12 ? 'critical' : 'medium',
          title: `Outdated Content - Module ${module.module_number}`,
          description: `Module not reviewed in ${monthsOld} months`,
          affected_entity: `Module ${module.module_number}`,
          affected_entity_id: module.module_number.toString(),
          auto_fixable: false,
          suggested_action: 'Schedule compliance review',
          detected_at: new Date(),
          metadata: { months_old: monthsOld },
        });
      });
    }

    // Check for modules with missing descriptions
    const { data: incompleteModules } = await supabase
      .from('course_modules')
      .select('module_number, title')
      .or('description.is.null,description.eq.');
    
    if (incompleteModules) {
      incompleteModules.forEach(module => {
        gaps.push({
          id: `compliance-incomplete-${module.module_number}`,
          category: 'compliance',
          severity: 'low',
          title: `Incomplete Documentation - Module ${module.module_number}`,
          description: 'Missing module description or details',
          affected_entity: `Module ${module.module_number}`,
          affected_entity_id: module.module_number.toString(),
          auto_fixable: false,
          suggested_action: 'Add complete module documentation',
          detected_at: new Date(),
        });
      });
    }
  } catch (error) {
    console.error('Error detecting compliance gaps:', error);
  }
  
  return gaps;
};

export const detectTrainingGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  
  try {
    // Check for expired certificates
    const { data: expiredCerts } = await supabase
      .from('certificates')
      .select('id, user_id, expiry_date, certification_level')
      .lt('expiry_date', new Date().toISOString())
      .eq('is_revoked', false);
    
    if (expiredCerts) {
      expiredCerts.forEach(cert => {
        gaps.push({
          id: `training-expired-${cert.id}`,
          category: 'training',
          severity: 'critical',
          title: 'Expired Certificate',
          description: `${cert.certification_level} certificate expired`,
          affected_entity: 'User Certificate',
          affected_entity_id: cert.user_id,
          auto_fixable: false,
          suggested_action: 'Contact user for recertification',
          detected_at: new Date(),
        });
      });
    }

    // Check for organizations with low completion rates
    const { data: orgs } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        profiles(count),
        certificates:certificates(count)
      `)
      .eq('is_active', true);
    
    if (orgs) {
      orgs.forEach((org: any) => {
        const userCount = org.profiles?.[0]?.count || 0;
        const certCount = org.certificates?.[0]?.count || 0;
        const completionRate = userCount > 0 ? (certCount / userCount) * 100 : 0;
        
        if (userCount > 0 && completionRate < 80) {
          gaps.push({
            id: `training-low-completion-${org.id}`,
            category: 'training',
            severity: completionRate < 50 ? 'high' : 'medium',
            title: 'Low Training Completion',
            description: `Only ${completionRate.toFixed(0)}% of staff certified`,
            affected_entity: org.name,
            affected_entity_id: org.id,
            auto_fixable: false,
            suggested_action: 'Send training reminders to organization',
            detected_at: new Date(),
            metadata: { completion_rate: completionRate, user_count: userCount },
          });
        }
      });
    }
  } catch (error) {
    console.error('Error detecting training gaps:', error);
  }
  
  return gaps;
};

export const detectEngagementGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  
  try {
    // Check for managers with low AiLean usage
    const { data: sessions } = await supabase
      .from('ailean_sessions')
      .select('user_id, messages, created_at');
    
    if (sessions) {
      const userSessions = sessions.reduce((acc, session) => {
        if (!acc[session.user_id]) {
          acc[session.user_id] = { count: 0, totalMessages: 0, lastSession: session.created_at };
        }
        acc[session.user_id].count++;
        // Count messages from JSON array
        const messageCount = Array.isArray(session.messages) ? session.messages.length : 0;
        acc[session.user_id].totalMessages += messageCount;
        if (new Date(session.created_at) > new Date(acc[session.user_id].lastSession)) {
          acc[session.user_id].lastSession = session.created_at;
        }
        return acc;
      }, {} as Record<string, any>);
      
      Object.entries(userSessions).forEach(([userId, data]: [string, any]) => {
        // Abandoned sessions (only 1 session with few messages)
        if (data.count === 1 && data.totalMessages < 5) {
          gaps.push({
            id: `engagement-abandoned-${userId}`,
            category: 'engagement',
            severity: 'medium',
            title: 'Abandoned AiLean Session',
            description: 'Manager started but never completed coaching',
            affected_entity: 'Manager',
            affected_entity_id: userId,
            auto_fixable: false,
            suggested_action: 'Send follow-up engagement email',
            detected_at: new Date(),
          });
        }
        
        // Inactive managers (no session in 30+ days)
        const daysSinceLastSession = Math.floor((new Date().getTime() - new Date(data.lastSession).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastSession > 30) {
          gaps.push({
            id: `engagement-inactive-${userId}`,
            category: 'engagement',
            severity: 'low',
            title: 'Inactive Manager',
            description: `No AiLean usage in ${daysSinceLastSession} days`,
            affected_entity: 'Manager',
            affected_entity_id: userId,
            auto_fixable: false,
            suggested_action: 'Re-engagement campaign',
            detected_at: new Date(),
            metadata: { days_inactive: daysSinceLastSession },
          });
        }
      });
    }
  } catch (error) {
    console.error('Error detecting engagement gaps:', error);
  }
  
  return gaps;
};

export const detectDataQualityGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  
  try {
    // Check for incomplete user profiles
    const { data: incompleteProfiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, organization_id')
      .or('first_name.is.null,last_name.is.null,organization_id.is.null');
    
    if (incompleteProfiles) {
      incompleteProfiles.forEach(profile => {
        const missingFields = [];
        if (!profile.first_name) missingFields.push('first name');
        if (!profile.last_name) missingFields.push('last name');
        if (!profile.organization_id) missingFields.push('organization');
        
        gaps.push({
          id: `data-incomplete-profile-${profile.user_id}`,
          category: 'data',
          severity: 'medium',
          title: 'Incomplete User Profile',
          description: `Missing: ${missingFields.join(', ')}`,
          affected_entity: 'User Profile',
          affected_entity_id: profile.user_id,
          auto_fixable: false,
          suggested_action: 'Request user to complete profile',
          detected_at: new Date(),
        });
      });
    }

    // Check for organizations without contact info
    const { data: incompleteOrgs } = await supabase
      .from('organizations')
      .select('id, name, contact_email, contact_phone')
      .or('contact_email.is.null,contact_phone.is.null');
    
    if (incompleteOrgs) {
      incompleteOrgs.forEach(org => {
        gaps.push({
          id: `data-incomplete-org-${org.id}`,
          category: 'data',
          severity: 'medium',
          title: 'Incomplete Organization Data',
          description: `${org.name} missing contact information`,
          affected_entity: org.name,
          affected_entity_id: org.id,
          auto_fixable: false,
          suggested_action: 'Contact organization for missing details',
          detected_at: new Date(),
        });
      });
    }
  } catch (error) {
    console.error('Error detecting data quality gaps:', error);
  }
  
  return gaps;
};

export const detectPaymentGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  
  try {
    // Check for expiring organization licenses
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const { data: expiringOrgs } = await supabase
      .from('organizations')
      .select('id, name, expires_at')
      .not('expires_at', 'is', null)
      .lt('expires_at', thirtyDaysFromNow.toISOString())
      .gt('expires_at', new Date().toISOString());
    
    if (expiringOrgs) {
      expiringOrgs.forEach(org => {
        const daysUntilExpiry = Math.floor((new Date(org.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        gaps.push({
          id: `payment-expiring-${org.id}`,
          category: 'payment',
          severity: daysUntilExpiry < 7 ? 'critical' : 'high',
          title: 'License Expiring Soon',
          description: `${org.name} license expires in ${daysUntilExpiry} days`,
          affected_entity: org.name,
          affected_entity_id: org.id,
          auto_fixable: false,
          suggested_action: 'Send renewal reminder',
          detected_at: new Date(),
          metadata: { days_until_expiry: daysUntilExpiry },
        });
      });
    }

    // Check for failed payments
    const { data: failedPayments } = await supabase
      .from('payments')
      .select('id, organization_id, amount, created_at')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    
    if (failedPayments && failedPayments.length > 0) {
      failedPayments.forEach(payment => {
        gaps.push({
          id: `payment-failed-${payment.id}`,
          category: 'payment',
          severity: 'high',
          title: 'Failed Payment',
          description: `Payment of $${payment.amount} failed`,
          affected_entity: 'Payment',
          affected_entity_id: payment.organization_id || payment.id,
          auto_fixable: false,
          suggested_action: 'Contact customer for payment retry',
          detected_at: new Date(),
        });
      });
    }

    // Check for organizations with low/no seats
    const { data: seats } = await supabase
      .from('rvt_seats')
      .select('purchase_id, status')
      .eq('status', 'available');
    
    const seatsByPurchase = seats?.reduce((acc, seat) => {
      acc[seat.purchase_id] = (acc[seat.purchase_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    Object.entries(seatsByPurchase).forEach(([purchaseId, availableSeats]) => {
      if (availableSeats === 0) {
        gaps.push({
          id: `payment-no-seats-${purchaseId}`,
          category: 'payment',
          severity: 'medium',
          title: 'No Available Seats',
          description: 'Organization has exhausted training seats',
          affected_entity: 'Organization',
          affected_entity_id: purchaseId,
          auto_fixable: false,
          suggested_action: 'Offer additional seat purchase',
          detected_at: new Date(),
        });
      }
    });
  } catch (error) {
    console.error('Error detecting payment gaps:', error);
  }
  
  return gaps;
};

export const detectSystemGaps = async (): Promise<Gap[]> => {
  const gaps: Gap[] = [];
  
  try {
    // Fetch existing system integrity checks
    const { data: systemChecks } = await supabase
      .from('system_integrity_checks')
      .select('*')
      .eq('status', 'detected')
      .order('detected_at', { ascending: false });
    
    if (systemChecks) {
      systemChecks.forEach(check => {
        gaps.push({
          id: `system-${check.id}`,
          category: 'system',
          severity: check.severity as GapSeverity,
          title: check.issue_description,
          description: check.suggested_fix || 'System integrity issue detected',
          affected_entity: check.affected_entity_type,
          affected_entity_id: check.affected_entity_id || undefined,
          auto_fixable: check.auto_fixable,
          suggested_action: check.suggested_fix || 'Review system logs',
          detected_at: new Date(check.detected_at),
        });
      });
    }
  } catch (error) {
    console.error('Error detecting system gaps:', error);
  }
  
  return gaps;
};

export const detectAllGaps = async (): Promise<Gap[]> => {
  const [
    complianceGaps,
    trainingGaps,
    engagementGaps,
    dataQualityGaps,
    paymentGaps,
    systemGaps,
  ] = await Promise.all([
    detectComplianceGaps(),
    detectTrainingGaps(),
    detectEngagementGaps(),
    detectDataQualityGaps(),
    detectPaymentGaps(),
    detectSystemGaps(),
  ]);
  
  const allGaps = [
    ...complianceGaps,
    ...trainingGaps,
    ...engagementGaps,
    ...dataQualityGaps,
    ...paymentGaps,
    ...systemGaps,
  ];
  
  // Sort by severity
  return allGaps.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
};

export const getGapSummary = (gaps: Gap[]): GapSummary => {
  const summary: GapSummary = {
    total: gaps.length,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    byCategory: {
      compliance: 0,
      training: 0,
      system: 0,
      engagement: 0,
      data: 0,
      payment: 0,
    },
    score: calculateGapScore(gaps),
  };
  
  gaps.forEach(gap => {
    summary[gap.severity]++;
    summary.byCategory[gap.category]++;
  });
  
  return summary;
};
