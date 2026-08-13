"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentHouseholdId,
  getCurrentUser,
} from "@/lib/supabase/household";

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
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAccountInput = {
  name: string;
  type: string;
  initial_balance: number;
  currency?: string;
  color?: string | null;
  icon?: string | null;
};

export type UpdateAccountInput = {
  name: string;
  type: string;
  initial_balance: number;
  currency: string;
  color?: string | null;
  icon?: string | null;
};

type TransactionBalanceRow = {
  account_id: string;
  destination_account_id: string | null;
  transaction_type: string;
  amount: number;
};

function calculateBalances(
  accounts: Omit<Account, "balance">[],
  transactions: TransactionBalanceRow[]
) {
  const balances = new Map<string, number>();

  for (const account of accounts) {
    balances.set(
      account.id,
      Number(account.initial_balance) || 0
    );
  }

  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0;

    const type = String(
      transaction.transaction_type
    ).toLowerCase();

    const current =
      balances.get(transaction.account_id) ?? 0;

    if (
      type === "income" ||
      type === "ingreso" ||
      type === "credit" ||
      type === "deposit"
    ) {
      balances.set(
        transaction.account_id,
        current + amount
      );

      continue;
    }

    if (
      type === "expense" ||
      type === "gasto" ||
      type === "debit" ||
      type === "withdrawal"
    ) {
      balances.set(
        transaction.account_id,
        current - amount
      );

      continue;
    }

    if (
      type === "transfer" ||
      type === "transferencia"
    ) {
      balances.set(
        transaction.account_id,
        current - amount
      );

      if (transaction.destination_account_id) {
        const destinationCurrent =
          balances.get(
            transaction.destination_account_id
          ) ?? 0;

        balances.set(
          transaction.destination_account_id,
          destinationCurrent + amount
        );
      }
    }
  }

  return balances;
}

async function getHouseholdTransactions(
  householdId: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "account_id, destination_account_id, transaction_type, amount"
    )
    .eq("household_id", householdId);

  if (error) {
    throw error;
  }

  return (data ?? []) as TransactionBalanceRow[];
}

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
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  const accounts =
    (data ?? []) as Omit<Account, "balance">[];

  if (accounts.length === 0) {
    return [];
  }

  const transactions =
    await getHouseholdTransactions(householdId);

  const balances = calculateBalances(
    accounts,
    transactions
  );

  return accounts.map((account) => ({
    ...account,
    balance: balances.get(account.id) ?? 0,
  }));
}

export async function createAccount(
  input: CreateAccountInput
): Promise<Account> {
  const supabase = await createClient();

  const user = await getCurrentUser();
  const householdId = await getCurrentHouseholdId();

  if (!user) {
    throw new Error("Usuario no autenticado.");
  }

  if (!householdId) {
    throw new Error(
      "No se ha encontrado el hogar del usuario."
    );
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error(
      "El nombre de la cuenta es obligatorio."
    );
  }

  const initialBalance =
    Number(input.initial_balance);

  if (!Number.isFinite(initialBalance)) {
    throw new Error(
      "El saldo inicial no es válido."
    );
  }

  if (!input.type) {
    throw new Error(
      "Debes seleccionar un tipo de cuenta."
    );
  }

  const currency =
    input.currency?.trim().toUpperCase() || "EUR";

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      household_id: householdId,
      name,
      type: input.type,
      initial_balance: initialBalance,
      currency,
      color: input.color ?? null,
      icon: input.icon ?? null,
      is_active: true,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    ...(data as Omit<Account, "balance">),
    balance: initialBalance,
  };
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput
): Promise<Account> {
  const supabase = await createClient();

  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    throw new Error(
      "No se ha encontrado el hogar del usuario."
    );
  }

  if (!id) {
    throw new Error(
      "No se ha indicado la cuenta."
    );
  }

  const name = input.name.trim();

  if (!name) {
    throw new Error(
      "El nombre de la cuenta es obligatorio."
    );
  }

  const initialBalance =
    Number(input.initial_balance);

  if (!Number.isFinite(initialBalance)) {
    throw new Error(
      "El saldo inicial no es válido."
    );
  }

  const currency =
    input.currency.trim().toUpperCase();

  if (!currency) {
    throw new Error(
      "La moneda de la cuenta es obligatoria."
    );
  }

  const { data, error } = await supabase
    .from("accounts")
    .update({
      name,
      type: input.type,
      initial_balance: initialBalance,
      currency,
      color: input.color ?? null,
      icon: input.icon ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("household_id", householdId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const updatedAccount =
    data as Omit<Account, "balance">;

  const transactions =
    await getHouseholdTransactions(householdId);

  const balances = calculateBalances(
    [updatedAccount],
    transactions
  );

  return {
    ...updatedAccount,
    balance:
      balances.get(updatedAccount.id) ??
      initialBalance,
  };
}

export async function deactivateAccount(
  id: string
): Promise<void> {
  const supabase = await createClient();

  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    throw new Error(
      "No se ha encontrado el hogar del usuario."
    );
  }

  if (!id) {
    throw new Error(
      "No se ha indicado la cuenta."
    );
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) {
    throw error;
  }
}