export const DOMAINS = {
  PRODUCTION: 'https://www.procannedu.com',
  SUPABASE: 'https://zhmpwczrvitomsxjwpzc.supabase.co',
  
  // Helper functions
  getRegistrationUrl: (token: string) => 
    `${DOMAINS.PRODUCTION}/register/manager?token=${token}`,
    
  getCertificateUrl: (certificateNumber: string) =>
    `${DOMAINS.PRODUCTION}/verify-certificate?number=${certificateNumber}`,
    
  getAdminUrl: (path: string) =>
    `${DOMAINS.PRODUCTION}/admin${path}`,

  getManagerDashboardUrl: (params?: string) =>
    `${DOMAINS.PRODUCTION}/dispensary-manager-dashboard${params ? `?${params}` : ''}`,

  getApprovalUrl: (requestId: string) =>
    `${DOMAINS.PRODUCTION}/dispensary-manager-dashboard?tab=seat-requests&request=${requestId}`
};
