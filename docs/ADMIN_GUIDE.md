# Administrator Guide

## 🎯 Overview

This comprehensive guide covers all administrative functions for the Cannabis Education Platform. As a system administrator, you have full access to manage users, organizations, courses, and system security.

## 🔐 Admin Access

### Initial Setup
- **Admin Email**: `admin@procannedu.com`
- **Access URL**: `/admin` (requires admin role)
- **Multi-Factor Authentication**: Highly recommended for admin accounts

### Security Best Practices
- Enable MFA on admin accounts
- Use strong, unique passwords
- Regular security audits and reviews
- Monitor admin activity logs

## 📊 Admin Dashboard Overview

The admin dashboard provides centralized access to all system management functions:

### Main Dashboard Sections
1. **System Overview**: Key metrics and system health
2. **User Management**: Manage all user accounts and roles
3. **Organization Management**: Dispensary applications and organizations
4. **Course Management**: Training content and progress monitoring
5. **Security & Compliance**: Audit logs and security monitoring
6. **Reports & Analytics**: Compliance reports and system analytics

## 👥 User Management

### Managing User Roles

#### Adding Admin Role
```
1. Navigate to Admin Dashboard → User Management
2. Search for the target user
3. Click "Manage Roles" 
4. Select "Add Role" → "admin"
5. Confirm the role assignment
```

#### Available Roles
- **admin**: Full system access
- **dispensary_manager**: Organization management capabilities
- **student**: Course access and completion

#### Role Management Functions
- **View All Users**: Complete user listing with roles
- **Bulk Operations**: Mass role assignments and updates
- **User Search**: Advanced filtering by role, organization, completion status
- **Account Deactivation**: Temporarily disable user accounts

### User Profile Management
- **Profile Verification**: Manually verify user profiles
- **Data Correction**: Edit user information when needed
- **Password Reset**: Force password resets for security
- **Account Merger**: Combine duplicate accounts

## 🏢 Organization Management

### Dispensary Application Review

#### Application Workflow
1. **Pending Applications**: Review submitted applications
2. **Application Details**: Verify organization information
3. **Background Checks**: Validate license numbers and credentials
4. **Approval Decision**: Approve or reject with detailed notes

#### Approving Applications
```
1. Go to Admin Dashboard → Dispensary Applications
2. Click "Review" on pending application
3. Verify all submitted information:
   - Organization name and contact details
   - License number verification
   - Address and compliance status
4. Set training credits (default: 10)
5. Click "Approve Application"
6. System automatically:
   - Creates organization record
   - Generates unique access key
   - Sends approval notification
```

#### Rejecting Applications
```
1. Select application to review
2. Click "Reject Application"
3. Provide detailed rejection reason
4. System automatically:
   - Updates application status
   - Sends rejection notification
   - Logs admin decision
```

### Organization Management

#### Active Organizations
- **Organization List**: View all approved organizations
- **Details Management**: Edit organization information
- **Credit Management**: Add/remove training credits
- **Staff Overview**: Monitor employee training progress
- **Compliance Status**: Real-time compliance scoring

#### Manager Setup
```
1. Navigate to Admin Dashboard → Manager Setup
2. Select target organization
3. Fill in manager details:
   - Full name and email
   - Temporary password
   - Contact information
4. Click "Create Manager Account"
5. System automatically:
   - Creates user account
   - Assigns dispensary_manager role
   - Links to organization
   - Sends welcome email
```

### Test Organization Creation

#### For Development/Demo Purposes
```
1. Go to Admin Dashboard → Test Organizations
2. Fill in organization details:
   - Organization name
   - Contact email
   - Training credits
3. Click "Create Test Organization"
4. Use generated access key for testing
```

## 📚 Course & Content Management

### Course Overview
- **18-Module Training Program**: Maryland RVT compliance training
- **Passing Score**: 80% minimum on final exam
- **Certificate Generation**: Automatic upon successful completion

### Module Management
- **Content Review**: Verify module content accuracy
- **Quiz Management**: Update quiz questions and scoring
- **Video Content**: Manage training video URLs
- **Progress Monitoring**: Track completion rates across modules

### Certificate Management
- **Certificate Generation**: Manual certificate creation if needed
- **Certificate Verification**: Verify certificate authenticity
- **Revocation Process**: Revoke certificates when necessary
- **Expiration Management**: Track and manage certificate renewals

## 🔒 Security & Compliance

### Security Monitoring Dashboard

#### Real-Time Monitoring
- **Login Attempts**: Monitor failed login attempts
- **Suspicious Activity**: Unusual access patterns
- **Rate Limiting**: Track API rate limit violations
- **Data Access**: Audit sensitive data access

#### Security Event Types
- **Authentication Events**: Login failures, MFA challenges
- **Data Modification**: Profile changes, role assignments
- **System Access**: Admin dashboard access, API usage
- **Compliance Events**: Certificate generation, audit reports

### Security Response Procedures

#### Incident Response
1. **Detection**: Automated alerts and manual monitoring
2. **Assessment**: Determine severity and impact
3. **Containment**: Implement immediate security measures
4. **Investigation**: Review audit logs and system access
5. **Resolution**: Apply fixes and security patches
6. **Documentation**: Log incident details and response

#### Common Security Actions
- **Account Lockout**: Temporarily disable compromised accounts
- **Password Reset**: Force password changes for affected users
- **Role Revocation**: Remove elevated permissions
- **Audit Review**: Comprehensive security audit procedures

### Compliance Management

#### Compliance Reporting
```
1. Navigate to Admin Dashboard → Compliance Reports
2. Select reporting parameters:
   - Date range
   - Organization(s)
   - Report type
3. Generate report
4. Export for regulatory submission
```

#### Key Compliance Metrics
- **Training Completion Rates**: Percentage of staff trained
- **Certificate Status**: Active vs. expired certificates
- **Compliance Score**: Organization-level compliance rating
- **Risk Assessment**: Identification of compliance risks

## 📊 Analytics & Reporting

### System Analytics

#### User Engagement Metrics
- **Active Users**: Daily/weekly/monthly active users
- **Course Completion**: Module and course completion rates
- **Time to Completion**: Average training duration
- **Performance Metrics**: Quiz scores and exam pass rates

#### Organization Performance
- **Organization Rankings**: Compliance score leaderboard
- **Training Velocity**: Speed of staff training completion
- **Certificate Issuance**: Certificate generation rates
- **Compliance Trends**: Historical compliance tracking

### Custom Reports

#### Report Generation
1. **Data Selection**: Choose metrics and dimensions
2. **Filter Application**: Apply date ranges and filters
3. **Format Selection**: PDF, CSV, or dashboard view
4. **Scheduling**: Set up automated report delivery

#### Available Reports
- **User Activity Reports**: Detailed user engagement data
- **Compliance Reports**: Regulatory compliance documentation
- **Financial Reports**: Payment and organization revenue
- **Security Reports**: Security event and audit summaries

## 🛠 System Maintenance

### Database Management

#### Regular Maintenance Tasks
- **Performance Monitoring**: Database query performance
- **Backup Verification**: Ensure backup integrity
- **Data Cleanup**: Remove expired or unnecessary data
- **Index Optimization**: Maintain database performance

#### Migration Management
- **Schema Updates**: Apply database schema changes
- **Data Migration**: Transfer data between environments
- **Rollback Procedures**: Revert problematic changes

### System Health Monitoring

#### Health Check Procedures
1. **Database Connectivity**: Verify database connections
2. **API Functionality**: Test all critical API endpoints
3. **External Services**: Validate PayPal, email, SMS services
4. **Performance Metrics**: Monitor response times and errors

#### Automated Monitoring
- **Uptime Monitoring**: 24/7 system availability tracking
- **Performance Alerts**: Automatic alerts for performance issues
- **Error Tracking**: Comprehensive error logging and reporting
- **Capacity Planning**: Resource usage monitoring and forecasting

## 🚨 Emergency Procedures

### System Outage Response
1. **Issue Identification**: Determine the nature and scope of outage
2. **Communication**: Notify stakeholders and users
3. **Resolution**: Implement fixes or failover procedures
4. **Verification**: Confirm system restoration
5. **Post-Mortem**: Conduct incident analysis and prevention planning

### Data Breach Response
1. **Immediate Containment**: Isolate affected systems
2. **Assessment**: Determine data exposure and user impact
3. **Notification**: Inform affected users and regulatory bodies
4. **Remediation**: Implement security fixes and monitoring
5. **Documentation**: Complete incident documentation and reporting

### Contact Information
- **Technical Support**: Available 24/7 for critical issues
- **Security Team**: Immediate response for security incidents
- **Compliance Officer**: Regulatory and compliance questions

Remember: All administrative actions are logged and audited. Maintain detailed documentation of any system changes or security incidents.