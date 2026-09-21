import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Mail, BookOpen } from 'lucide-react';
import { Seo } from '@/components/Seo';

/**
 * Parked public collect path while apply → payment is leftover.
 * Re-enable the live form by flipping PUBLIC_SELF_SERVE_CHECKOUT_ENABLED
 * after /org/apply → /payment works. Do not invent checkout here.
 */
const RequestAccess = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 py-12 px-4">
      <Seo
        title="Request Access — ProCann Edu"
        description="Request ProCann Edu workforce education access, or sign in with a join code from your employer. Public checkout is not available."
        path="/apply"
      />
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Request access
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            ProCann Edu workforce training is invite-based. Self-serve purchase and
            start-training checkout are not available on this site.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Have a join code?</CardTitle>
              <CardDescription>
                If your employer already uses ProCann Edu, register with the organization join code they gave you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/auth?role=student&register=true">Register with a join code</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Need access for a team?</CardTitle>
              <CardDescription>
                Contact us about workforce education for your dispensary. We will not take payment on this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <a href="mailto:info@procannedu.com">Contact info@procannedu.com</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/40">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p>
                Optional Maryland cannabis workforce education is still available to explore.
                Public Learning does not require a join code.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button asChild variant="ghost">
                <Link to="/learn">Public Learning</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/">Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequestAccess;
