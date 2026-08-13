import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "./household";

export type Account = {
  id: string;
  household_id: string;
  name: string;
  type: string;
  initial_balance: number;
  balance: number;
  currency: string;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  household_id: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  household_id: string;
  account_id: string;
  destination_account_id: string | null;
  category_id: string | null;
  transaction_type: string;
  amount: number;
  description: string;
  transaction_date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function getAccounts(): Promise<Account[]> {
  const supabase = await createClient();
  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    return [];
  }

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const accounts = (data ?? []) as Omit<Account, "balance">[];

  const { data: transactions, error: transactionsError } =
    await supabase
      .from("transactions")
      .select(
        "account_id, destination_account_id, transaction_type, amount"
      )
      .eq("household_id", householdId);

  if (transactionsError) {
    throw transactionsError;
  }

  const balances = new Map<string, number>();

  for (const account of accounts) {
    balances.set(
      account.id,
      Number(account.initial_balance) || 0
    );
  }

  for (const transaction of transactions ?? []) {
    const amount = Number(transaction.amount) || 0;
    const type = String(
      transaction.transaction_type
    ).toLowerCase();

    const isIncome =
      type === "income" ||
      type === "ingreso" ||
      type === "credit" ||
      type === "deposit";

    const isTransfer =
      type === "transfer" ||
      type === "transferencia";

    const isExpense =
      type === "expense" ||
      type === "gasto" ||
      type === "debit" ||
      type === "withdrawal";

    if (isIncome) {
      const current =
        balances.get(transaction.account_id) ?? 0;

      balances.set(
        transaction.account_id,
        current + amount
      );

      continue;
    }

    if (isExpense) {
      const current =
        balances.get(transaction.account_id) ?? 0;

      balances.set(
        transaction.account_id,
        current - amount
      );

      continue;
    }

    if (isTransfer) {
      const originBalance =
        balances.get(transaction.account_id) ?? 0;

      balances.set(
        transaction.account_id,
        originBalance - amount
      );

      if (transaction.destination_account_id) {
        const destinationBalance =
          balances.get(
            transaction.destination_account_id
          ) ?? 0;

        balances.set(
          transaction.destination_account_id,
          destinationBalance + amount
        );
      }
    }
  }

  return accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? 0,
  }));
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    return [];
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("household_id", householdId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createClient();
  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    return [];
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("household_id", householdId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getFinanceData() {
  const [accounts, categories, transactions] =
    await Promise.all([
      getAccounts(),
      getCategories(),
      getTransactions(),
    ]);

  return {
    accounts,
    categories,
    transactions,
  };
}