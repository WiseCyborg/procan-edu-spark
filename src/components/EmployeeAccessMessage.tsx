import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Key, Mail, Phone } from 'lucide-react';

export const EmployeeAccessMessage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-amber-500" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Dispensary Access Key Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-accent/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Please Contact Your Dispensary Training Coordinator
            </h3>
            <p className="text-muted-foreground mb-4">
              To access this training course, you need a unique dispensary access key 
              from your employer. This key is provided when your dispensary purchases 
              training licenses for their staff.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground flex items-center">
              <Key className="h-5 w-5 mr-2" />
              How to Get Your Access Key:
            </h4>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start">
                <span className="font-semibold mr-2 text-foreground">1.</span>
                <div>
                  <strong className="text-foreground">Contact Your Manager</strong>
                  <p>Speak with your dispensary manager or training coordinator</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2 text-foreground">2.</span>
                <div>
                  <strong className="text-foreground">Request Your Access Key</strong>
                  <p>Ask for your unique access key (format: DISP-YYYY-XXXXXXXX)</p>
                </div>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2 text-foreground">3.</span>
                <div>
                  <strong className="text-foreground">Register with Key</strong>
                  <p>Use this key during registration to gain immediate access</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Already Have an Access Key?
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              If you received your access key but haven't registered yet, 
              you can create your account now.
            </p>
            {/* Use real link for iOS Safari reliability */}
            <Button asChild variant="default" className="w-full">
              <Link to="/auth?tab=accesskey">
                Register with Access Key
              </Link>
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-foreground mb-2 flex items-center">
              <Phone className="h-5 w-5 mr-2" />
              Need Additional Help?
            </h4>
            <p className="text-sm text-muted-foreground">
              If you're unable to reach your training coordinator, please contact 
              your dispensary's main office for assistance with obtaining your access key.
            </p>
          </div>

          <div className="text-center text-xs text-muted-foreground border-t pt-4">
            <p>
              <strong>Note:</strong> Individual course purchases ($49.99) are available 
              for those not affiliated with a licensed dispensary.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
