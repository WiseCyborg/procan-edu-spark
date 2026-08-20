import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, FileText, Shield, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useLastComarReview } from '@/hooks/useLastComarReview';

export default function ComplianceContentReviewPage() {
  const { lastReviewed, isLoading: reviewLoading } = useLastComarReview();
  const { data: regulatoryUpdates } = useQuery({
    queryKey: ['regulatory-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulatory_updates')
        .select('*')
        .order('detected_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: modules } = useQuery({
    queryKey: ['module-freshness'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('id, title, module_number, updated_at')
        .order('module_number');
      
      if (error) throw error;
      return data;
    }
  });

  const getModuleFreshnessStatus = (updatedAt: string) => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate < 90) return { status: 'current', color: 'text-green-600', label: 'Current' };
    if (daysSinceUpdate < 180) return { status: 'review-soon', color: 'text-yellow-600', label: 'Review Soon' };
    return { status: 'needs-review', color: 'text-red-600', label: 'Needs Review' };
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      {/* Hero */}
      <div className="text-center mb-12">
        <Badge className="mb-4 text-lg px-4 py-2">
          <Shield className="h-5 w-5 me-2" />
          Content Compliance
        </Badge>
        <h1 className="text-4xl font-bold mb-4">
          Annual Content Review & Regulatory Updates
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Internal tracking of curriculum currency against COMAR changes
        </p>
      </div>

      {/* Annual Review Schedule */}
      <Card className="mb-8 border-2 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Annual Review Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Next Scheduled Review</p>
              <p className="text-2xl font-bold">
                {new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Review Frequency</p>
              <p className="text-2xl font-bold">Quarterly</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Last Completed Automated Scan</p>
              <p className="text-2xl font-bold">
                {reviewLoading
                  ? 'Checking…'
                  : lastReviewed
                    ? lastReviewed.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Never'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Internal Review Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Internal Review Status
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Evidence of internal curriculum review. This page does not, on its own, certify compliance.
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-6 rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="font-semibold">Awaiting named human sign-off</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Automated COMAR monitoring and module freshness tracking run continuously, and their
              results are shown below. A review is only marked complete once a named reviewer records
              a dated sign-off. Until then this status stays open.
            </p>
            <div className="border-t pt-4 grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reviewer</span>
                <span className="font-medium">Not recorded</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sign-off date</span>
                <span className="font-medium">Not recorded</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last automated scan</span>
                <span className="font-medium">
                  {reviewLoading ? 'Checking…' : lastReviewed ? lastReviewed.toLocaleDateString('en-US') : 'Never'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Change Log */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            Regulatory Change Log
          </CardTitle>
          <p className="text-sm text-muted-foreground">Recent COMAR updates and implementation status</p>
        </CardHeader>
        <CardContent>
          {regulatoryUpdates && regulatoryUpdates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-start py-3 px-4">Date Detected</th>
                    <th className="text-start py-3 px-4">COMAR Section</th>
                    <th className="text-start py-3 px-4">Change Type</th>
                    <th className="text-start py-3 px-4">Affected Modules</th>
                    <th className="text-center py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {regulatoryUpdates.map((update) => (
                    <tr key={update.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm">
                        {new Date(update.detected_at).toLocaleDateString('en-US')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{update.section_number}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{update.change_type}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {update.affected_modules?.join(', ') || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge 
                          variant={update.review_status === 'implemented' ? 'default' : 'secondary'}
                        >
                          {update.review_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent regulatory changes detected</p>
              <p className="text-sm">Continuous monitoring in place</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Update Process */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Content Update Process Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { step: 1, title: "Monitor COMAR Changes", description: "Weekly monitoring of Maryland Cannabis Administration updates", timeline: "Ongoing" },
              { step: 2, title: "Assess Impact on Curriculum", description: "Evaluate which modules require updates based on regulatory changes", timeline: "Within 48 hours" },
              { step: 3, title: "Update Affected Modules", description: "Revise content, quizzes, and materials to reflect new requirements", timeline: "Within 7 days" },
              { step: 4, title: "Notify Enrolled Students", description: "Send notifications about curriculum updates and changes", timeline: "Immediate" },
              { step: 5, title: "Document Change in Audit Log", description: "Record all changes in regulatory updates table", timeline: "Same day" }
            ].map((process) => (
              <div key={process.step} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {process.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{process.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{process.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Timeline: {process.timeline}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Module Freshness Tracker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Module Freshness Tracker
          </CardTitle>
          <p className="text-sm text-muted-foreground">Current status of all training modules</p>
        </CardHeader>
        <CardContent>
          {modules && modules.length > 0 ? (
            <div className="space-y-2">
              {modules.map((module) => {
                const freshness = getModuleFreshnessStatus(module.updated_at);
                const daysSinceUpdate = Math.floor((Date.now() - new Date(module.updated_at).getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={module.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-sm w-8">{module.module_number}</span>
                      <span className="text-sm">{module.title}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        Updated {daysSinceUpdate} days ago
                      </span>
                      <Badge className={freshness.color} variant="outline">
                        {freshness.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">Loading modules...</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
