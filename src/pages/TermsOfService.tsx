import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: November 15, 2024</p>
        </div>
      </div>

      <Card>
        <CardContent className="prose dark:prose-invert max-w-none pt-6">
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using ProCann Edu's Maryland Responsible Vendor Training platform, you agree to be bound by these 
            Terms of Service. If you do not agree to these terms, you may not use our services.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old and employed by a Maryland-licensed cannabis dispensary to use this platform. 
            By registering, you represent that you meet these eligibility requirements.
          </p>

          <h2>3. Account Registration</h2>
          <ul>
            <li>You must provide accurate and complete information during registration</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials</li>
            <li>You agree to notify us immediately of any unauthorized access to your account</li>
            <li>One account per individual - account sharing is prohibited</li>
          </ul>

          <h2>4. Course Enrollment and Completion</h2>
          <h3>4.1 Training Requirements</h3>
          <p>
            All Maryland cannabis dispensary employees must complete the RVT training as required by COMAR 14.17.05. 
            Completion includes:
          </p>
          <ul>
            <li>Viewing all required training modules</li>
            <li>Passing the final examination with a minimum score of 80%</li>
            <li>Completing all identity verification requirements</li>
          </ul>

          <h3>4.2 Exam Policy</h3>
          <ul>
            <li>You have unlimited exam attempts</li>
            <li>A 24-hour waiting period applies after failed attempts</li>
            <li>Cheating, plagiarism, or academic dishonesty may result in account termination</li>
            <li>Exam content is confidential and may not be shared</li>
          </ul>

          <h2>5. Certification</h2>
          <p>
            Upon successful completion, you will receive an official RVT certificate valid for [X years]. This certificate:
          </p>
          <ul>
            <li>Is issued in accordance with MCA requirements</li>
            <li>Must be renewed before expiration</li>
            <li>Can be revoked for violations of these terms or Maryland law</li>
            <li>Is non-transferable</li>
          </ul>

          <h2>6. Payment Terms</h2>
          <h3>6.1 Pricing</h3>
          <p>
            Pricing is set by your employer (dispensary) and may vary. Individual student pricing is available for self-enrollment.
          </p>

          <h3>6.2 Refund Policy</h3>
          <ul>
            <li>Refunds may be requested within 7 days of payment</li>
            <li>No refunds after course completion or certificate issuance</li>
            <li>Employer-sponsored enrollments follow the employer's refund policy</li>
          </ul>

          <h2>7. User Conduct</h2>
          <p>You agree NOT to:</p>
          <ul>
            <li>Use the platform for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to any part of the platform</li>
            <li>Interfere with or disrupt the platform's operation</li>
            <li>Share your account credentials with others</li>
            <li>Copy, reproduce, or distribute course materials without permission</li>
            <li>Use bots, scrapers, or automated tools to access the platform</li>
            <li>Impersonate another person or misrepresent your identity</li>
          </ul>

          <h2>8. Intellectual Property</h2>
          <p>
            All content on this platform, including text, graphics, logos, videos, and software, is the property of ProCann Edu 
            or its licensors and is protected by copyright and trademark laws.
          </p>

          <h2>9. Privacy</h2>
          <p>
            Your use of the platform is subject to our Privacy Policy. We may share your training data with the Maryland Cannabis 
            Administration and your employer as required by law.
          </p>

          <h2>10. Disclaimer of Warranties</h2>
          <p>
            THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE:
          </p>
          <ul>
            <li>Uninterrupted or error-free operation</li>
            <li>That your certification will guarantee employment</li>
            <li>That the content is always accurate or up-to-date</li>
            <li>Compatibility with all devices and browsers</li>
          </ul>

          <h2>11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROCANNEDU SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
            CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold ProCann Edu harmless from any claims, damages, or expenses arising from your 
            violation of these terms or misuse of the platform.
          </p>

          <h2>13. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time for:
          </p>
          <ul>
            <li>Violation of these Terms of Service</li>
            <li>Fraudulent or suspicious activity</li>
            <li>Non-payment of fees</li>
            <li>Request by your employer</li>
            <li>Violation of Maryland cannabis laws</li>
          </ul>

          <h2>14. Changes to Terms</h2>
          <p>
            We may modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the 
            new terms. Material changes will be communicated via email.
          </p>

          <h2>15. Governing Law</h2>
          <p>
            These terms are governed by the laws of the State of Maryland. Any disputes shall be resolved in Maryland courts.
          </p>

          <h2>16. MCA Compliance</h2>
          <p>
            This training program is designed to comply with Maryland Cannabis Administration (MCA) requirements under COMAR 14.17.05. 
            However, compliance requirements may change, and it is your responsibility to stay informed of current regulations.
          </p>

          <h2>17. Accessibility</h2>
          <p>
            We strive to make our platform accessible to users with disabilities in accordance with WCAG 2.1 AA standards. 
            If you experience accessibility issues, please contact support@procannedu.com.
          </p>

          <h2>18. Contact Information</h2>
          <p>
            For questions about these Terms of Service, contact us at:
          </p>
          <p>
            <strong>ProCann Edu</strong><br />
            Email: legal@procannedu.com<br />
            Phone: (555) 123-4567<br />
            Address: [Company Address]
          </p>

          <h2>19. Severability</h2>
          <p>
            If any provision of these terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.
          </p>

          <h2>20. Entire Agreement</h2>
          <p>
            These Terms of Service, together with our Privacy Policy, constitute the entire agreement between you and ProCann Edu 
            regarding use of the platform.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
