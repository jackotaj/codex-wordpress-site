import { Dashboard } from "@/components/dashboard";
import { loadDashboardSnapshot } from "@/lib/repository";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  const snapshot = await loadDashboardSnapshot();
  return <Dashboard snapshot={snapshot} />;
}
