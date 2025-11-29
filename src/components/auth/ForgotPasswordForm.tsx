import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { invokePublicFunction } from "@/lib/publicEdgeFunctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async (email: string) => {
      console.log('[ForgotPasswordForm] Sending password reset request for:', email);
      const { data, error } = await invokePublicFunction('send-password-reset', {
        email
      });
      console.log('[ForgotPasswordForm] Response:', { data, error });

      if (error) throw error;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Check your email",
        description: "If an account exists, we've sent password reset instructions.",
      });
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
          We've sent password reset instructions to <strong>{email}</strong> if an account exists.
        </p>
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
          Enter your email address and we'll send you instructions to reset your password.
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
