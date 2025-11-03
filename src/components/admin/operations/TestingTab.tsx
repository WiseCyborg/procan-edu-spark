import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FastTrackTestPanel } from '@/components/admin/FastTrackTestPanel';
import { TestEmailSender } from '@/components/admin/TestEmailSender';
import TestAccountCreator from '@/components/admin/TestAccountCreator';
import { PayPalModeToggle } from '@/components/admin/PayPalModeToggle';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { useState } from 'react';

export function TestingTab() {
  const [isRetrying, setIsRetrying] = useState(false);

  const testCertificateRetry = async () => {
    setIsRetrying(true);
    try {
      // This would typically be called with a real exam_attempt_id
      const { data, error } = await supabase.functions.invoke('generate-certificate-retry', {
        body: {
          exam_attempt_id: 'test-id' // In production, this would be a real UUID
        }
      });

      if (error) throw error;
      toast.success('Certificate retry mechanism working');
      console.log('Retry test result:', data);
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      {/* PayPal Mode Toggle - Critical for safe testing */}
      <PayPalModeToggle />
      
      <FastTrackTestPanel />
      
      <Card>
        <CardHeader>
          <CardTitle>Phase 2 Gate Testing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Gate 10: Certificate Retry</h3>
            <Button 
              onClick={testCertificateRetry} 
              disabled={isRetrying}
              variant="outline"
            >
              {isRetrying ? 'Testing...' : 'Test Certificate Retry Function'}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Tests the generate-certificate-retry edge function for failed certificate generation
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Email Sender</CardTitle>
        </CardHeader>
        <CardContent>
          <TestEmailSender />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Test Account Creator</CardTitle>
        </CardHeader>
        <CardContent>
          <TestAccountCreator />
        </CardContent>
      </Card>
    </div>
  );
}
