import { LoginForm } from "~/components/Auth/login";
import { AuthShell } from "~/components/Auth/shell";

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
