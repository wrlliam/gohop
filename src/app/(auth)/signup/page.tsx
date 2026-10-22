import { AuthShell } from "~/components/Auth/shell";
import { SignupForm } from "~/components/Auth/signup";

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
