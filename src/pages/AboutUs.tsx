import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">About ProCann Edu</h1>
          <p className="text-muted-foreground">Maryland's Leading Cannabis Training Platform</p>
        </div>
      </div>

      <Card>
        <CardContent className="prose dark:prose-invert max-w-none pt-6">
          <h2>Our Mission</h2>
          <p>
            ProCann Edu is dedicated to providing Maryland cannabis professionals with the highest quality 
            Responsible Vendor Training (RVT) that exceeds Maryland Cannabis Administration (MCA) requirements. 
            We combine cutting-edge technology with deep regulatory expertise to ensure every dispensary employee 
            receives training that is compliant, engaging, and effective.
          </p>

          <h2>Who We Are</h2>
          <p>
            Founded by cannabis industry professionals and compliance experts, ProCann Edu understands the unique 
            challenges facing Maryland dispensaries. Our team includes:
          </p>
          <ul>
            <li>Former MCA regulatory advisors</li>
            <li>Certified cannabis educators</li>
            <li>Technology and learning experience specialists</li>
            <li>Legal compliance professionals</li>
          </ul>

          <h2>What Makes Us Different</h2>
          <h3>1. MCA-Aligned Content</h3>
          <p>
            Our training modules are directly aligned with COMAR 14.17.15.05 requirements and updated in real-time 
            as regulations change. We don't just teach compliance—we embed it into every lesson.
          </p>

          <h3>2. AI-Powered Learning</h3>
          <p>
            Using advanced AI technology, we personalize the learning experience for each student, identify 
            knowledge gaps, and provide targeted support to ensure mastery.
          </p>

          <h3>3. Mobile-First Design</h3>
          <p>
            Recognizing that dispensary employees are busy, our platform is fully optimized for mobile devices. 
            Employees can complete training on their smartphones during breaks or between shifts.
          </p>

          <h3>4. Real Certification</h3>
          <p>
            Upon successful completion, students receive official RVT certificates recognized by the MCA and 
            all Maryland dispensaries. Certificates are tamper-proof and instantly verifiable.
          </p>

          <h2>Our Commitment to Quality</h2>
          <p>
            We maintain the highest standards for:
          </p>
          <ul>
            <li><strong>Content Accuracy:</strong> All training materials are reviewed quarterly by legal and regulatory experts</li>
            <li><strong>Student Success:</strong> Comprehensive support throughout the learning journey with AI-powered study assistance</li>
            <li><strong>Data Security:</strong> Bank-level encryption and FERPA compliance to protect student information</li>
            <li><strong>Accessibility:</strong> WCAG 2.1 AA compliant platform accessible to all learners</li>
          </ul>

          <h2>Our Growing Community</h2>
          <p>
            ProCann Edu serves:
          </p>
          <ul>
            <li>Maryland dispensaries across all 24 counties</li>
            <li>Cannabis professionals seeking RVT certification</li>
            <li>Organizations committed to compliance excellence</li>
            <li>Industry partners and advocacy groups</li>
          </ul>

          <h2>Our Values</h2>
          <ul>
            <li><strong>Compliance First:</strong> We prioritize regulatory adherence in everything we do</li>
            <li><strong>Student Success:</strong> We're not satisfied until every student achieves certification</li>
            <li><strong>Continuous Improvement:</strong> We update our platform daily based on user feedback</li>
            <li><strong>Transparency:</strong> We openly share our pass rates, certification data, and compliance metrics</li>
            <li><strong>Community:</strong> We're committed to building a network of responsible cannabis professionals</li>
          </ul>

          <h2>Looking Forward</h2>
          <p>
            As Maryland's cannabis industry evolves, ProCann Edu remains committed to being the most trusted, 
            effective, and innovative training platform in the state. We're constantly developing new features, 
            updating content, and improving the learning experience to serve Maryland's cannabis community.
          </p>

          <h2>Contact Us</h2>
          <p>
            <strong>ProCann Edu</strong><br />
            Email: info@procannedu.com<br />
            Support: support@procannedu.com<br />
            Phone: (555) 123-4567<br />
            Address: [Company Address]<br />
            Hours: Monday-Friday, 9 AM - 6 PM EST
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
