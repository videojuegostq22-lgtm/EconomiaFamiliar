import { getAccounts } from "@/lib/supabase/accounts";
import { AccountsPage } from "@/components/accounts/accounts-page";

export default async function AccountsRoute() {
  const accounts = await getAccounts();

  return <AccountsPage initialAccounts={accounts} />;
}