import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, GraduationCap, Briefcase, Users } from 'lucide-react';

export default function AboutTeamPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">
          Meet the Team Behind ProCann Edu
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Maryland Cannabis Experts, Educators & Advocates
        </p>
      </div>

      {/* Lead Instructor */}
      <Card className="mb-12 border-2 border-primary">
        <CardHeader>
          <CardTitle className="text-2xl">Lead Instructor & Curriculum Developer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Users className="h-24 w-24 text-white" />
              </div>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-2">ProCann Education Team</h3>
              <p className="text-muted-foreground mb-4">Chief Cannabis Educator</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Experience
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    15+ years of combined cannabis industry experience across Maryland's regulatory landscape. 
                    Our team has worked directly with the Maryland Cannabis Administration (MCA) and understands 
                    the unique challenges facing Maryland dispensaries and cannabis professionals.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Education & Credentials
                  </h4>
                  <div className="space-y-2">
                    <Badge variant="secondary">Cannabis Industry Certified</Badge>
                    <Badge variant="secondary">COMAR 14.17.15.05 Specialist</Badge>
                    <Badge variant="secondary">Maryland Regulatory Expert</Badge>
                    <Badge variant="secondary">Adult Education Certified</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Maryland Expertise
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Deep understanding of Maryland's medical cannabis program, including patient verification 
                    protocols, inventory management requirements, security standards, and responsible vendor 
                    obligations under COMAR regulations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Matter Experts */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">Subject Matter Experts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                Compliance Expert
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>COMAR Specialist</strong>
              </p>
              <p className="text-sm leading-relaxed">
                Specializes in Maryland cannabis regulations and compliance frameworks. Works directly 
                with dispensaries to ensure adherence to COMAR 14.17.15.05 requirements. Provides up-to-date 
                guidance on evolving state regulations.
              </p>
              <div className="mt-4 space-y-2">
                <Badge variant="outline">Regulatory Compliance</Badge>
                <Badge variant="outline">COMAR Expert</Badge>
                <Badge variant="outline">Audit Preparation</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                Medical Cannabis Pharmacist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>PharmD, Cannabis Specialist</strong>
              </p>
              <p className="text-sm leading-relaxed">
                Licensed pharmacist with specialized training in cannabis therapeutics. Provides expert 
                guidance on cannabinoid science, patient education, product knowledge, and safe dispensing 
                practices for medical cannabis.
              </p>
              <div className="mt-4 space-y-2">
                <Badge variant="outline">Pharmacology</Badge>
                <Badge variant="outline">Patient Care</Badge>
                <Badge variant="outline">Product Safety</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-6 w-6 text-primary" />
                Security & Inventory Specialist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Security Systems & Inventory Management</strong>
              </p>
              <p className="text-sm leading-relaxed">
                Expert in cannabis inventory tracking systems, seed-to-sale compliance, security protocols, 
                and loss prevention. Ensures training aligns with Maryland's stringent tracking and 
                security requirements.
              </p>
              <div className="mt-4 space-y-2">
                <Badge variant="outline">Inventory Control</Badge>
                <Badge variant="outline">Security Protocols</Badge>
                <Badge variant="outline">Loss Prevention</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Patient Care Specialist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Patient Advocacy & Education</strong>
              </p>
              <p className="text-sm leading-relaxed">
                Focuses on patient-centered care, communication skills, and creating positive patient 
                experiences. Teaches dispensary staff how to provide compassionate, informed guidance 
                to medical cannabis patients.
              </p>
              <div className="mt-4 space-y-2">
                <Badge variant="outline">Patient Education</Badge>
                <Badge variant="outline">Communication</Badge>
                <Badge variant="outline">Empathy Training</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Curriculum Development Process */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle>Curriculum Development Team</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Content Creation Process</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our curriculum is developed through a collaborative process involving regulatory experts, 
                industry practitioners, and educational specialists. Every module undergoes rigorous review 
                to ensure accuracy, compliance with COMAR 14.17.15.05, and practical applicability.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Review Board</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Content is reviewed by a board consisting of compliance officers, practicing dispensary 
                managers, medical cannabis pharmacists, and legal advisors specializing in Maryland 
                cannabis law.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Annual Update Cycle</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We monitor COMAR regulatory changes quarterly and update our curriculum within 30 days 
                of any significant regulatory amendments. All content is formally reviewed annually to 
                ensure continued accuracy and relevance.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Industry Affiliations */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Affiliations & Partnerships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-6 border rounded-lg">
              <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold">National Cannabis Industry Association</p>
              <p className="text-xs text-muted-foreground mt-1">(NCIA) - Application in Process</p>
            </div>
            
            <div className="text-center p-6 border rounded-lg">
              <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold">Maryland Cannabis Industry Association</p>
              <p className="text-xs text-muted-foreground mt-1">(MCIA) - Application in Process</p>
            </div>
            
            <div className="text-center p-6 border rounded-lg">
              <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold">Maryland Dispensary Partnerships</p>
              <p className="text-xs text-muted-foreground mt-1">15+ Partner Organizations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
