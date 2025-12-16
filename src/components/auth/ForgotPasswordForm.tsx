import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { invokePublicFunction } from "@/lib/publicEdgeFunctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft, AlertCircle, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [noAccountFound, setNoAccountFound] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async (email: string) => {
      console.log('[ForgotPasswordForm] Sending password reset request for:', email);
      const { data, error } = await invokePublicFunction('send-password-reset', {
        email
      });
      console.log('[ForgotPasswordForm] Response:', { data, error });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Check if account exists
      if (data?.email_exists === false) {
        setNoAccountFound(true);
        toast({
          title: "No Account Found",
          description: "No account exists with this email. Did you mean to register?",
          variant: "destructive",
        });
      } else {
        setSubmitted(true);
        toast({
          title: "Check your email",
          description: "We've sent password reset instructions to your email.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Mail className="h-6 w-6 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Check Your Email</h2>
        <p className="text-muted-foreground">
          We've sent password reset instructions to <strong>{email}</strong>.
        </p>
        <Alert className="text-left">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Open the link only once. If you're on iOS, tap the link directly instead of letting Mail preview it.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Didn't receive the email? Check your spam folder or try again in a few minutes.
        </p>
        <Link to="/auth">
          <Button variant="outline" className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </Link>
      </div>
    );
  }

  if (noAccountFound) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">No Account Found</h2>
        <p className="text-muted-foreground">
          We couldn't find an account with <strong>{email}</strong>.
        </p>
        
        <Alert className="text-left border-amber-200 bg-amber-50">
          <UserPlus className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Are you a new manager?</strong> Check your email for a registration link from your organization, or contact your administrator.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              setNoAccountFound(false);
              setEmail("");
            }}
          >
            Try a Different Email
          </Button>
          <Link to="/auth">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        resetMutation.mutate(email);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Reset Your Password</h2>
        <p className="text-muted-foreground">
          Enter the email address you used to create your account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={resetMutation.isPending}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={resetMutation.isPending || !email}
      >
        {resetMutation.isPending && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        Send Reset Instructions
      </Button>

      <Link to="/auth">
        <Button variant="ghost" className="w-full">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Login
        </Button>
      </Link>
    </form>
  );
}
