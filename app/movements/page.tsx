import {
  getAccounts,
  getCategories,
  getTransactions,
} from "@/lib/supabase/finance";
import MovementsPageClient from "@/components/movements-page";

export default async function MovementsPage() {
  const [transactions, accounts, categories] = await Promise.all([
    getTransactions(),
    getAccounts(),
    getCategories(),
  ]);

  return (
    <MovementsPageClient
      initialTransactions={transactions}
      initialAccounts={accounts}
      initialCategories={categories}
    />
  );
}