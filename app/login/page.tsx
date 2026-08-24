import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getManagerSession } from "@/lib/auth";

export default async function LoginPage() {
  if (await getManagerSession()) redirect("/");
  return <LoginForm />;
}
