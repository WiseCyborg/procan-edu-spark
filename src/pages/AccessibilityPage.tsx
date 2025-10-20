import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Eye, Keyboard, Volume2, Accessibility, Mail, Phone } from 'lucide-react';

export default function AccessibilityPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <Badge className="mb-4 text-lg px-4 py-2">
          <Accessibility className="h-5 w-5 mr-2" />
          Accessibility Statement
        </Badge>
        <h1 className="text-4xl font-bold mb-4">Accessibility Statement</h1>
        <p className="text-xl text-muted-foreground">
          Our Commitment to Digital Accessibility
        </p>
      </div>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Our Commitment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg leading-relaxed">
              ProCann Edu is committed to ensuring digital accessibility for people with disabilities. 
              We are continually improving the user experience for everyone and applying the relevant 
              accessibility standards to make our training platform accessible to all Maryland cannabis 
              professionals.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>WCAG 2.1 AA Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed mb-4">
              Our website strives to conform to Level AA of the Web Content Accessibility Guidelines 
              (WCAG) 2.1. These guidelines explain how to make web content more accessible for people 
              with disabilities and are recognized as the international standard for web accessibility.
            </p>
            <ul className="space-y-2 list-none">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span><strong>Perceivable:</strong> Information and interface components are presented in ways users can perceive</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span><strong>Operable:</strong> Interface components and navigation are operable by all users</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span><strong>Understandable:</strong> Information and operation of user interface are understandable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span><strong>Robust:</strong> Content works with current and future assistive technologies</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              Assistive Technology Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed mb-4">
              Our platform is designed to work with the following assistive technologies:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                Screen readers (JAWS, NVDA, VoiceOver)
              </li>
              <li className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Screen magnification software
              </li>
              <li className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-primary" />
                Speech recognition software
              </li>
              <li className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-primary" />
                Keyboard-only navigation
              </li>
              <li className="flex items-center gap-2">
                <Accessibility className="h-4 w-4 text-primary" />
                Alternative input devices
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Accessibility Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Font size controls (accessible via toolbar on every page)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>High contrast mode for improved visibility</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Full keyboard navigation throughout the site</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Descriptive alternative text for all informational images</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Closed captions for video content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Transcripts for audio content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Consistent navigation structure across all pages</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Clear headings and semantic HTML structure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Focus indicators for keyboard navigation</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Testing & Continuous Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed mb-4">
              We regularly test our website using:
            </p>
            <ul className="space-y-2 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Automated accessibility scanning tools</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Manual testing with screen readers and keyboard navigation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>User testing with people with disabilities</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Regular audits by accessibility experts</span>
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              <strong>Testing Schedule:</strong> Quarterly comprehensive reviews (every 90 days)
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Known Limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed mb-4">
              Despite our best efforts, there may be some limitations. We are actively working to address:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Third-party embedded content (e.g., Vimeo videos) - we work with providers that support accessibility features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>PDF documents - we are working to ensure all PDFs are properly tagged and accessible</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Feedback & Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed mb-4">
              We welcome your feedback on the accessibility of ProCann Edu. If you encounter any 
              accessibility barriers or have suggestions for improvement, please contact us:
            </p>
            <div className="bg-muted p-6 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <a href="mailto:accessibility@procannedu.com" className="text-primary hover:underline font-medium">
                  accessibility@procannedu.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span className="font-medium">Available upon request</span>
              </div>
              <p className="text-sm text-muted-foreground pt-2">
                <strong>Response Time:</strong> We aim to respond to all accessibility inquiries within 2 business days
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                This accessibility statement was last reviewed and approved on:
              </p>
              <p className="font-semibold">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                ProCann Edu | Maryland Cannabis Training | Committed to Accessibility
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
