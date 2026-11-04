import { notFound } from "next/navigation";

import { LoginForm } from "@/app/login/login-form";
import { isAuthEnabled } from "@/auth/enabled";

export default function LoginPage() {
  if (!isAuthEnabled()) notFound();
  return (
    <main>
      <h1>Private fortune access</h1>
      <p>Sign in to view today&apos;s Oohaasa and Gogo rankings.</p>
      <LoginForm />
    </main>
  );
}
