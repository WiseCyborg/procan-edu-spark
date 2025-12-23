import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Copy, 
  Check, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  ShoppingCart,
  Building2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

interface TestCredential {
  cardType: string;
  cardNumber: string;
  cvv: string;
  expiry: string;
}

const TEST_CARDS: TestCredential[] = [
  { cardType: 'Visa', cardNumber: '4012888888881881', cvv: '123', expiry: '12/2028' },
  { cardType: 'Mastercard', cardNumber: '5555555555554444', cvv: '123', expiry: '12/2028' },
  { cardType: 'American Express', cardNumber: '378282246310005', cvv: '1234', expiry: '12/2028' },
  { cardType: 'Discover', cardNumber: '6011111111111117', cvv: '123', expiry: '12/2028' }
];

const SANDBOX_BUYER_ACCOUNT = {
  email: 'sb-buyer@personal.example.com',
  note: 'Create test buyer account in PayPal Developer Dashboard'
};

export const PaymentTestingGuide: React.FC = () => {
  const { toast } = useToast();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    credentials: true,
    courseFlow: false,
    dispensaryFlow: false,
    verification: false
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(label);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`
      });
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-lg">PayPal Sandbox Payment Testing Guide</CardTitle>
              <CardDescription>Test credentials and step-by-step instructions</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Sandbox Mode
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Credentials Section */}
        <Collapsible open={openSections.credentials} onOpenChange={() => toggleSection('credentials')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-background/50">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="font-medium">Test Credit Cards</span>
              </div>
              {openSections.credentials ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="rounded-lg border bg-background p-4 space-y-3">
              <p className="text-sm text-muted-foreground mb-3">
                Use these test cards in PayPal sandbox checkout. No real charges will occur.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Card Type</th>
                      <th className="text-left py-2 font-medium">Number</th>
                      <th className="text-left py-2 font-medium">CVV</th>
                      <th className="text-left py-2 font-medium">Expiry</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {TEST_CARDS.map((card) => (
                      <tr key={card.cardType} className="border-b last:border-0">
                        <td className="py-2 font-medium">{card.cardType}</td>
                        <td className="py-2 font-mono text-xs">{card.cardNumber}</td>
                        <td className="py-2">{card.cvv}</td>
                        <td className="py-2">{card.expiry}</td>
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => copyToClipboard(card.cardNumber, card.cardType)}
                          >
                            {copiedItem === card.cardType ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 rounded-md bg-muted/50">
                <p className="text-sm font-medium mb-1">PayPal Sandbox Buyer Account</p>
                <p className="text-xs text-muted-foreground mb-2">{SANDBOX_BUYER_ACCOUNT.note}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-2 py-1 rounded">{SANDBOX_BUYER_ACCOUNT.email}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => copyToClipboard(SANDBOX_BUYER_ACCOUNT.email, 'Email')}
                  >
                    {copiedItem === 'Email' ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Course Payment Flow */}
        <Collapsible open={openSections.courseFlow} onOpenChange={() => toggleSection('courseFlow')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-background/50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-medium">Course Payment Flow</span>
              </div>
              {openSections.courseFlow ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="rounded-lg border bg-background p-4 space-y-3">
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">1</span>
                  <div>
                    <p className="font-medium">Navigate to Course Listing</p>
                    <p className="text-muted-foreground text-xs">Go to the public courses page or consumer course catalog</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">2</span>
                  <div>
                    <p className="font-medium">Click "Purchase" on a Course</p>
                    <p className="text-muted-foreground text-xs">Select a paid course to initiate checkout</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">3</span>
                  <div>
                    <p className="font-medium">Verify Redirect to PayPal Sandbox</p>
                    <p className="text-muted-foreground text-xs">URL should contain "sandbox.paypal.com"</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">4</span>
                  <div>
                    <p className="font-medium">Complete Payment with Test Credentials</p>
                    <p className="text-muted-foreground text-xs">Use sandbox buyer account or test credit card</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">5</span>
                  <div>
                    <p className="font-medium">Verify Return to Success Page</p>
                    <p className="text-muted-foreground text-xs">Should redirect back with confirmation message</p>
                  </div>
                </li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Dispensary Seat Purchase Flow */}
        <Collapsible open={openSections.dispensaryFlow} onOpenChange={() => toggleSection('dispensaryFlow')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-background/50">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Dispensary Seat Purchase Flow</span>
              </div>
              {openSections.dispensaryFlow ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="rounded-lg border bg-background p-4 space-y-3">
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">1</span>
                  <div>
                    <p className="font-medium">Navigate to Seat Purchase Page</p>
                    <p className="text-muted-foreground text-xs">Access via dispensary manager dashboard or direct link</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">2</span>
                  <div>
                    <p className="font-medium">Enter Seat Quantity</p>
                    <p className="text-muted-foreground text-xs">Specify number of training seats to purchase</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">3</span>
                  <div>
                    <p className="font-medium">Click "Pay with PayPal"</p>
                    <p className="text-muted-foreground text-xs">Initiates PayPal sandbox checkout</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">4</span>
                  <div>
                    <p className="font-medium">Complete Sandbox Checkout</p>
                    <p className="text-muted-foreground text-xs">Use test credentials to complete payment</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">5</span>
                  <div>
                    <p className="font-medium">Verify Seats Allocated</p>
                    <p className="text-muted-foreground text-xs">Check that seat credits appear in organization dashboard</p>
                  </div>
                </li>
              </ol>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Verification Steps */}
        <Collapsible open={openSections.verification} onOpenChange={() => toggleSection('verification')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-background/50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Database Verification Steps</span>
              </div>
              {openSections.verification ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="rounded-lg border bg-background p-4 space-y-3">
              <p className="text-sm text-muted-foreground mb-3">
                After completing test payments, verify the following in the database:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><code className="text-xs bg-muted px-1 rounded">orders</code> table contains new order record</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><code className="text-xs bg-muted px-1 rounded">rvt_purchases</code> table shows seat purchase</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Organization <code className="text-xs bg-muted px-1 rounded">available_credits</code> updated</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>PayPal transaction ID stored in payment record</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>No production PayPal API calls (check edge function logs)</span>
                </li>
              </ul>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Warning Banner */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700">Sandbox Mode Only</p>
            <p className="text-amber-600/80 text-xs mt-1">
              These credentials only work in PayPal sandbox environment. Verify the payment mode toggle shows "Sandbox" 
              before testing. No real charges will be made.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentTestingGuide;
