"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentHouseholdId } from "./household";

export type CreateTransactionInput = {
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  transactionType: "income" | "expense" | "transfer";
  amount: number;
  description: string;
  transactionDate: string;
  notes?: string | null;
};

export async function createTransaction(
  input: CreateTransactionInput
) {
  const supabase = await createClient();
  const householdId = await getCurrentHouseholdId();

  if (!householdId) {
    throw new Error("No se ha encontrado el hogar actual.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("Usuario no autenticado.");
  }

  if (!input.accountId) {
    throw new Error("Debes seleccionar una cuenta.");
  }

  if (
    !Number.isFinite(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error("El importe debe ser mayor que cero.");
  }

  if (!input.transactionDate) {
    throw new Error("Debes seleccionar una fecha.");
  }

  if (
    input.transactionType === "transfer" &&
    !input.destinationAccountId
  ) {
    throw new Error(
      "Debes seleccionar la cuenta de destino."
    );
  }

  if (
    input.transactionType === "transfer" &&
    input.accountId === input.destinationAccountId
  ) {
    throw new Error(
      "La cuenta de origen y destino deben ser diferentes."
    );
  }

  /*
   * Comprobamos que la cuenta de origen pertenece
   * al hogar actual y está activa.
   */
  const { data: sourceAccount, error: sourceError } =
    await supabase
      .from("accounts")
      .select("id, household_id, is_active")
      .eq("id", input.accountId)
      .eq("household_id", householdId)
      .eq("is_active", true)
      .maybeSingle();

  if (sourceError) {
    throw sourceError;
  }

  if (!sourceAccount) {
    throw new Error(
      "La cuenta seleccionada no existe o no está activa."
    );
  }

  /*
   * En una transferencia comprobamos también
   * la cuenta de destino.
   */
  if (input.transactionType === "transfer") {
    const { data: destinationAccount, error: destinationError } =
      await supabase
        .from("accounts")
        .select("id, household_id, is_active")
        .eq("id", input.destinationAccountId!)
        .eq("household_id", householdId)
        .eq("is_active", true)
        .maybeSingle();

    if (destinationError) {
      throw destinationError;
    }

    if (!destinationAccount) {
      throw new Error(
        "La cuenta de destino no existe o no está activa."
      );
    }
  }

  /*
   * Las categorías también deben pertenecer al hogar.
   */
  if (
    input.transactionType !== "transfer" &&
    input.categoryId
  ) {
    const { data: category, error: categoryError } =
      await supabase
        .from("categories")
        .select("id, household_id")
        .eq("id", input.categoryId)
        .eq("household_id", householdId)
        .maybeSingle();

    if (categoryError) {
      throw categoryError;
    }

    if (!category) {
      throw new Error(
        "La categoría seleccionada no pertenece a este hogar."
      );
    }
  }

  const description =
    input.description.trim() ||
    (input.transactionType === "income"
      ? "Ingreso"
      : input.transactionType === "expense"
        ? "Gasto"
        : "Transferencia");

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      household_id: householdId,
      account_id: input.accountId,
      destination_account_id:
        input.transactionType === "transfer"
          ? input.destinationAccountId
          : null,
      category_id:
        input.transactionType === "transfer"
          ? null
          : input.categoryId || null,
      transaction_type: input.transactionType,
      amount: input.amount,
      description,
      transaction_date: input.transactionDate,
      notes: input.notes?.trim() || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}