import { useNavigate } from 'react-router-dom';
import { Building2, KeyRound, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AccessParkedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl md:text-3xl">Request access to ProCann Edu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            Public checkout is not open right now. If your organization already has a join code, use it to register.
            Otherwise, email us and we’ll help you get set up.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={() => navigate('/auth?role=student&register=true')} size="lg" className="w-full">
              <KeyRound className="me-2 h-5 w-5" />
              Have a join code?
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href="mailto:info@procannedu.com">
                <Mail className="me-2 h-5 w-5" />
                Email info@procannedu.com
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessParkedPage;