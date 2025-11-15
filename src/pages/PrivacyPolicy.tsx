import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: November 15, 2024</p>
        </div>
      </div>

      <Card>
        <CardContent className="prose dark:prose-invert max-w-none pt-6">
          <h2>Introduction</h2>
          <p>
            ProCann Edu ("we," "our," or "us") is committed to protecting the privacy and security of your personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
            Maryland Responsible Vendor Training (RVT) platform.
          </p>

          <h2>Information We Collect</h2>
          <h3>Personal Information</h3>
          <ul>
            <li>Name, email address, phone number</li>
            <li>Employer information and job title</li>
            <li>Government-issued identification (for verification purposes)</li>
            <li>Training progress and exam results</li>
            <li>Certificate issuance and expiration dates</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <ul>
            <li>IP address and device information</li>
            <li>Browser type and operating system</li>
            <li>Pages visited and time spent on platform</li>
            <li>Referring website addresses</li>
          </ul>

          <h2>How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our training platform</li>
            <li>Process certification and issue official certificates</li>
            <li>Communicate with you about your training progress</li>
            <li>Comply with Maryland Cannabis Administration (MCA) reporting requirements</li>
            <li>Verify identity and prevent fraud</li>
            <li>Analyze platform usage and improve user experience</li>
          </ul>

          <h2>Information Sharing and Disclosure</h2>
          <p>We may share your information with:</p>
          <ul>
            <li><strong>Maryland Cannabis Administration (MCA):</strong> We are required to report certification data to the MCA for regulatory compliance</li>
            <li><strong>Your Employer:</strong> Training progress and certification status are shared with your registered dispensary</li>
            <li><strong>Service Providers:</strong> Third-party vendors who assist with platform operations (e.g., email delivery, payment processing)</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
          </ul>

          <h2>Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information, including:
          </p>
          <ul>
            <li>Encrypted data transmission (SSL/TLS)</li>
            <li>Secure database storage with access controls</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Employee training on data privacy and security</li>
          </ul>

          <h2>Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data (subject to legal retention requirements)</li>
            <li>Opt-out of marketing communications</li>
            <li>Export your training records</li>
          </ul>

          <h2>Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to:
          </p>
          <ul>
            <li>Provide our services and maintain your account</li>
            <li>Comply with MCA recordkeeping requirements (minimum 3 years)</li>
            <li>Resolve disputes and enforce our agreements</li>
            <li>Meet legal obligations</li>
          </ul>

          <h2>Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar technologies to enhance your experience, analyze usage patterns, and remember your preferences. 
            You can control cookie settings through your browser preferences.
          </p>

          <h2>Children's Privacy</h2>
          <p>
            Our platform is not intended for individuals under the age of 18. We do not knowingly collect information from minors.
          </p>

          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new 
            policy on this page and updating the "Last updated" date.
          </p>

          <h2>Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us at:
          </p>
          <p>
            <strong>ProCann Edu</strong><br />
            Email: privacy@procannedu.com<br />
            Phone: (555) 123-4567<br />
            Address: [Company Address]
          </p>

          <h2>FERPA Compliance</h2>
          <p>
            For students enrolled through educational institutions, we comply with the Family Educational Rights and Privacy Act (FERPA) 
            regarding the privacy of student education records.
          </p>

          <h2>GDPR & CCPA Notice</h2>
          <p>
            While primarily serving Maryland-based users, we respect the privacy rights of all individuals. If you are a resident of 
            the EU or California, you may have additional rights under GDPR or CCPA. Please contact us to exercise these rights.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
