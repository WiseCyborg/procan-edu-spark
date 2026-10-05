import { useSearchParams } from "react-router-dom";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { PasswordReset } from "@/components/auth/PasswordReset";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const mode = searchParams.get("mode");

  if (mode === "reset" || token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-3 md:p-8">
        <PasswordReset />
      </div>
    );
  }

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
