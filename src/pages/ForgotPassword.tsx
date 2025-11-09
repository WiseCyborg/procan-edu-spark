import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPassword() {
  return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-8">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-lg shadow-lg p-4 md:p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
