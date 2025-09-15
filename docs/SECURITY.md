# Security & Compliance Guide

## 🔒 Overview

This guide outlines the comprehensive security measures, compliance requirements, and best practices implemented in the Cannabis Education Platform to ensure data protection, regulatory compliance, and system integrity.

## 🛡 Security Architecture

### Multi-Layer Security Model

#### 1. Application Layer Security
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **Session Management**: Secure session handling with automatic expiration
- **Input Validation**: Comprehensive sanitization and validation
- **Output Encoding**: XSS prevention through proper encoding

#### 2. Database Layer Security
- **Row-Level Security (RLS)**: Granular data access control
- **Encryption at Rest**: PostgreSQL encryption + Supabase managed encryption
- **Encryption in Transit**: TLS 1.3 for all communications
- **Database Isolation**: Logical separation by organization
- **Audit Logging**: Comprehensive activity logging

#### 3. Infrastructure Security
- **Network Security**: VPC isolation and firewall rules
- **API Gateway**: Rate limiting and DDoS protection
- **CDN Security**: Cloudflare protection for static assets
- **Monitoring**: Real-time security event detection
- **Backup Security**: Encrypted backups with secure retention

### Authentication & Authorization

#### Multi-Factor Authentication (MFA)
```typescript
// MFA Options Available
const mfaOptions = {
  email: "Email verification codes",
  sms: "SMS verification via Vonage",
  voice: "Voice call verification",
  backup: "Backup email verification"
};

// MFA Enforcement Levels
const enforcementLevels = {
  optional: "User choice (default)",
  required_admin: "Required for admin accounts",
  required_managers: "Required for dispensary managers",
  required_all: "Required for all users"
};
```

#### Role-Based Access Control (RBAC)
```sql
-- Role Hierarchy (least to most privileged)
'student'           -- Basic training access
'dispensary_manager' -- Organization management
'admin'             -- Full system access

-- Permission Matrix
CREATE VIEW permission_matrix AS
SELECT 
  role,
  can_view_own_data,
  can_manage_organization,
  can_access_admin_functions,
  can_modify_system_settings
FROM role_permissions;
```

### Data Protection Measures

#### Personal Identifiable Information (PII)
- **Data Classification**: Automatic PII detection and classification
- **Field-Level Encryption**: Additional encryption for sensitive fields
- **Access Logging**: All PII access logged and monitored
- **Data Minimization**: Collect only necessary information
- **Retention Policies**: Automatic deletion of expired data

#### Payment Card Industry (PCI) Compliance
- **No Card Storage**: No payment card data stored in system
- **Tokenization**: Payment tokens only, no sensitive payment data
- **Secure Transmission**: PCI-compliant payment gateway integration
- **Regular Audits**: Quarterly PCI compliance verification

## 🔍 Security Monitoring

### Real-Time Security Monitoring

#### Security Event Detection
```typescript
// Monitored Security Events
const securityEvents = {
  authentication: [
    'login_failed',
    'mfa_failed', 
    'password_reset_requested',
    'account_locked'
  ],
  authorization: [
    'privilege_escalation_attempt',
    'unauthorized_access_attempt',
    'role_modification'
  ],
  data_access: [
    'bulk_data_export',
    'sensitive_data_access',
    'unusual_access_pattern'
  ],
  system: [
    'api_rate_limit_exceeded',
    'suspicious_ip_activity',
    'system_configuration_change'
  ]
};
```

#### Automated Response System
```typescript
// Threat Response Automation
const responseActions = {
  low_severity: {
    action: 'log_and_monitor',
    notification: 'security_team_alert'
  },
  medium_severity: {
    action: 'rate_limit_user',
    notification: 'immediate_alert',
    escalation: 'security_manager'
  },
  high_severity: {
    action: 'lock_account',
    notification: 'emergency_alert',
    escalation: 'incident_response_team'
  },
  critical: {
    action: 'system_lockdown',
    notification: 'all_hands_alert',
    escalation: 'executive_team'
  }
};
```

### Security Metrics and KPIs

#### Key Security Indicators
- **Failed Login Attempts**: Threshold monitoring and alerting
- **MFA Adoption Rate**: Track and encourage MFA usage
- **Suspicious Activity Score**: AI-powered threat detection
- **Data Access Patterns**: Anomaly detection for unusual access
- **Compliance Score**: Real-time compliance monitoring

#### Security Dashboard Metrics
```sql
-- Security Metrics Query Examples
-- Failed login attempts in last 24 hours
SELECT COUNT(*) FROM security_events 
WHERE event_type = 'login_failed' 
AND created_at > now() - interval '24 hours';

-- MFA adoption rate by organization
SELECT 
  o.name,
  COUNT(CASE WHEN uvp.preferred_method != 'email' THEN 1 END) * 100.0 / COUNT(*) as mfa_adoption_rate
FROM organizations o
JOIN profiles p ON p.organization_id = o.id
LEFT JOIN user_verification_preferences uvp ON uvp.user_id = p.user_id
GROUP BY o.id, o.name;

-- Security events by severity
SELECT severity, COUNT(*) 
FROM security_events 
WHERE created_at > now() - interval '7 days'
GROUP BY severity;
```

## 📋 Compliance Framework

### Regulatory Compliance Requirements

#### Cannabis Industry Compliance
- **State Regulations**: Maryland Medical Cannabis Commission (MMCC) requirements
- **Training Documentation**: Comprehensive training record keeping
- **Certificate Tracking**: Valid certificate maintenance and verification
- **Audit Readiness**: Rapid compliance report generation
- **Regulatory Updates**: Automatic incorporation of regulation changes

#### Data Privacy Compliance

##### GDPR Compliance (if applicable)
```typescript
// GDPR Rights Implementation
const gdprRights = {
  right_to_access: {
    endpoint: '/api/gdpr/data-export',
    timeframe: '30 days',
    format: 'JSON/PDF'
  },
  right_to_rectification: {
    endpoint: '/api/gdpr/data-correction',
    process: 'user_initiated_updates'
  },
  right_to_erasure: {
    endpoint: '/api/gdpr/data-deletion',
    retention_override: 'legal_holds_respected'
  },
  right_to_portability: {
    endpoint: '/api/gdpr/data-export',
    format: 'machine_readable'
  }
};
```

##### CCPA Compliance (California residents)
- **Data Disclosure**: Clear privacy policy and data usage disclosure
- **Opt-Out Rights**: Ability to opt-out of data sale (not applicable)
- **Data Deletion**: Right to delete personal information
- **Non-Discrimination**: No penalty for exercising privacy rights

### Compliance Monitoring and Reporting

#### Automated Compliance Checks
```sql
-- Compliance Monitoring Functions
CREATE OR REPLACE FUNCTION daily_compliance_check()
RETURNS TABLE(
  check_name text,
  status text,
  issues_found integer,
  recommendations text
) AS $$
BEGIN
  -- Check certificate expiration compliance
  RETURN QUERY
  SELECT 
    'certificate_expiration'::text,
    CASE WHEN expired_count > 0 THEN 'WARNING' ELSE 'PASS' END::text,
    expired_count::integer,
    'Review expired certificates and schedule renewal training'::text
  FROM (
    SELECT COUNT(*) as expired_count
    FROM certificates 
    WHERE expiry_date < now() + interval '30 days'
    AND is_revoked = false
  ) e;

  -- Check training completion compliance
  RETURN QUERY
  SELECT 
    'training_completion'::text,
    CASE WHEN incomplete_count > 0 THEN 'ACTION_REQUIRED' ELSE 'PASS' END::text,
    incomplete_count::integer,
    'Follow up with employees who have not completed training'::text
  FROM (
    SELECT COUNT(DISTINCT p.user_id) as incomplete_count
    FROM profiles p
    JOIN organizations o ON o.id = p.organization_id
    LEFT JOIN certificates c ON c.user_id = p.user_id
    WHERE o.admin_approved = true
    AND c.id IS NULL
    AND p.created_at < now() - interval '30 days'
  ) t;
END;
$$ LANGUAGE plpgsql;
```

#### Compliance Reporting
```typescript
// Compliance Report Generation
interface ComplianceReport {
  organization_id: string;
  report_period: {
    start_date: string;
    end_date: string;
  };
  metrics: {
    total_employees: number;
    trained_employees: number;
    completion_rate: number;
    active_certificates: number;
    expired_certificates: number;
    compliance_score: number;
  };
  risk_assessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    recommendations: string[];
  };
  audit_trail: {
    training_events: TrainingEvent[];
    certificate_events: CertificateEvent[];
    compliance_actions: ComplianceAction[];
  };
}
```

## 🚨 Incident Response

### Incident Classification

#### Severity Levels
```typescript
const incidentSeverity = {
  P1_Critical: {
    description: "Data breach, system compromise, or complete service outage",
    response_time: "15 minutes",
    escalation: "immediate",
    stakeholders: ["CISO", "CEO", "Legal", "Compliance"]
  },
  P2_High: {
    description: "Significant security event or major service degradation",
    response_time: "1 hour",
    escalation: "security_manager",
    stakeholders: ["Security Team", "Engineering", "Compliance"]
  },
  P3_Medium: {
    description: "Minor security event or service impact",
    response_time: "4 hours",
    escalation: "security_analyst",
    stakeholders: ["Security Team", "Engineering"]
  },
  P4_Low: {
    description: "Security monitoring alert or minor issue",
    response_time: "24 hours",
    escalation: "standard_queue",
    stakeholders: ["Security Team"]
  }
};
```

### Incident Response Procedures

#### Immediate Response (0-15 minutes)
1. **Incident Detection**: Automated monitoring or manual reporting
2. **Initial Assessment**: Determine severity and scope
3. **Containment**: Implement immediate containment measures
4. **Notification**: Alert appropriate stakeholders
5. **Documentation**: Begin incident logging

#### Investigation Phase (15 minutes - 4 hours)
1. **Evidence Collection**: Preserve logs and system state
2. **Root Cause Analysis**: Identify attack vectors and vulnerabilities
3. **Impact Assessment**: Determine data and system impact
4. **Stakeholder Updates**: Regular communication with leadership
5. **Legal Assessment**: Determine regulatory notification requirements

#### Resolution Phase (Variable timeline)
1. **Remediation**: Implement fixes and security improvements
2. **System Restoration**: Restore normal operations
3. **Validation**: Verify security and functionality
4. **Communication**: Update all stakeholders on resolution
5. **Documentation**: Complete incident documentation

#### Post-Incident Phase (24-72 hours)
1. **Post-Mortem**: Comprehensive incident review
2. **Lessons Learned**: Identify improvement opportunities
3. **Security Enhancements**: Implement additional protections
4. **Process Updates**: Update procedures based on learnings
5. **Training**: Update team training and awareness

### Data Breach Response

#### Breach Notification Requirements
```typescript
const breachNotificationTimelines = {
  internal_notification: "1 hour",
  legal_assessment: "4 hours",
  regulatory_notification: {
    MMCC: "24 hours (if cannabis-related data)",
    state_AG: "As required by state law",
    affected_users: "72 hours maximum"
  },
  law_enforcement: "If criminal activity suspected",
  insurance: "Within policy requirements",
  media: "If public disclosure required"
};
```

#### Breach Response Checklist
- [ ] Immediate containment of breach
- [ ] Preserve evidence and logs
- [ ] Assess scope and type of data involved
- [ ] Determine notification requirements
- [ ] Notify regulatory bodies as required
- [ ] Prepare user notifications
- [ ] Coordinate with legal counsel
- [ ] Document all response actions
- [ ] Conduct post-breach security review
- [ ] Implement additional security measures

## 🔧 Security Best Practices

### Development Security

#### Secure Coding Practices
- **Input Validation**: Comprehensive validation on all user inputs
- **SQL Injection Prevention**: Parameterized queries and ORM usage
- **XSS Prevention**: Proper output encoding and CSP headers
- **Authentication**: Secure password handling and session management
- **Authorization**: Principle of least privilege implementation

#### Code Review and Testing
- **Security Code Review**: Manual review of security-critical code
- **Automated Security Testing**: SAST/DAST integration in CI/CD
- **Penetration Testing**: Regular third-party security assessments
- **Vulnerability Scanning**: Automated dependency vulnerability checks
- **Compliance Testing**: Automated compliance validation

### Operational Security

#### Access Management
- **Privileged Access**: Just-in-time access for administrative functions
- **Service Accounts**: Dedicated accounts with minimal permissions
- **API Key Management**: Secure generation, rotation, and storage
- **Secret Management**: Encrypted storage and automatic rotation
- **Access Reviews**: Regular review and cleanup of user access

#### System Hardening
- **OS Hardening**: Security baseline configuration
- **Network Segmentation**: Logical separation of system components
- **Firewall Rules**: Restrictive inbound/outbound traffic rules
- **Monitoring**: Comprehensive logging and real-time alerting
- **Backup Security**: Encrypted backups with secure storage

### User Security Education

#### Security Awareness Training
- **Phishing Awareness**: Recognition and reporting procedures
- **Password Security**: Strong password requirements and management
- **Social Engineering**: Awareness of manipulation techniques
- **Incident Reporting**: Clear procedures for reporting security issues
- **Data Handling**: Proper handling of sensitive information

#### Regular Security Communications
- **Security Updates**: Regular communication of new threats
- **Policy Changes**: Notification of security policy updates
- **Best Practices**: Ongoing education on security best practices
- **Incident Lessons**: Sharing relevant lessons from security incidents

## 📞 Security Contacts

### Emergency Response Team
- **Security Operations Center (SOC)**: 24/7 monitoring and response
- **Incident Response Team**: Coordinated incident management
- **Legal Counsel**: Privacy and regulatory compliance support
- **Compliance Officer**: Regulatory requirement guidance

### Escalation Procedures
1. **Level 1**: Security Analyst (15 minutes response)
2. **Level 2**: Security Manager (1 hour response)
3. **Level 3**: CISO (4 hours response)
4. **Level 4**: Executive Team (immediate for critical incidents)

This security framework ensures robust protection of the Cannabis Education Platform while maintaining compliance with industry regulations and best practices.