import { Dashboard } from "@/components/dashboard";
import { getManagerSession } from "@/lib/auth";
import { loadDashboardSnapshot } from "@/lib/repository";
import { connection } from "next/server";
import { redirect } from "next/navigation";

export default async function Home() {
  await connection();
  const session = await getManagerSession();
  if (!session) redirect("/login");
  const snapshot = await loadDashboardSnapshot();
  return <Dashboard snapshot={snapshot} managerName={session.displayName} />;
}
