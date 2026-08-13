import Dashboard from "@/components/dashboard";
import { getFinanceData } from "@/lib/supabase/finance";

export default async function Home() {
  const financeData = await getFinanceData();

  return <Dashboard initialData={financeData} />;
}