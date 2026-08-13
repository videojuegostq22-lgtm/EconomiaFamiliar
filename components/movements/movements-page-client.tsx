"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Wallet,
  X,
} from "lucide-react";

import type {
  Account,
  Category,
  Transaction,
} from "@/lib/supabase/finance";
import { createTransaction } from "@/lib/supabase/transactions";

type MovementType = "income" | "expense" | "transfer";

type MovementsPageClientProps = {
  initialTransactions: Transaction[];
  initialAccounts: Account[];
  initialCategories: Category[];
};

const formatCurrency = (
  amount: number,
  currency = "EUR"
) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(amount);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));

function getTransactionType(type: string): MovementType {
  const normalized = type.toLowerCase();

  if (
    normalized === "income" ||
    normalized === "ingreso" ||
    normalized === "credit" ||
    normalized === "deposit"
  ) {
    return "income";
  }

  if (
    normalized === "transfer" ||
    normalized === "transferencia"
  ) {
    return "transfer";
  }

  return "expense";
}

export default function MovementsPageClient({
  initialTransactions,
  initialAccounts,
  initialCategories,
}: MovementsPageClientProps) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

  const [accounts, setAccounts] =
    useState<Account[]>(initialAccounts);

  const [showForm, setShowForm] = useState(false);
  const [movementType, setMovementType] =
    useState<MovementType>("expense");

  const [accountId, setAccountId] = useState(
    initialAccounts[0]?.id ?? ""
  );

  const [destinationAccountId, setDestinationAccountId] =
    useState("");

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalIncome = transactions
    .filter(
      (transaction) =>
        getTransactionType(transaction.transaction_type) ===
        "income"
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0
    );

  const totalExpenses = transactions
    .filter(
      (transaction) =>
        getTransactionType(transaction.transaction_type) ===
        "expense"
    )
    .reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount),
      0
    );

  const openNewMovement = () => {
    setMovementType("expense");
    setAccountId(accounts[0]?.id ?? "");
    setDestinationAccountId("");
    setCategoryId("");
    setAmount("");
    setDescription("");
    setTransactionDate(
      new Date().toISOString().split("T")[0]
    );
    setNotes("");
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setError("");
  };

  const updateAccountBalance = (
    id: string,
    difference: number
  ) => {
    setAccounts((current) =>
      current.map((account) =>
        account.id === id
          ? {
              ...account,
              balance:
                Number(account.balance) + difference,
            }
          : account
      )
    );
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    const numericAmount = Number(
      amount.replace(",", ".")
    );

    if (!accountId) {
      setError("Selecciona una cuenta.");
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Introduce un importe válido mayor que cero."
      );
      return;
    }

    if (!transactionDate) {
      setError("Selecciona una fecha.");
      return;
    }

    if (
      movementType === "transfer" &&
      !destinationAccountId
    ) {
      setError("Selecciona una cuenta de destino.");
      return;
    }

    if (
      movementType === "transfer" &&
      accountId === destinationAccountId
    ) {
      setError(
        "La cuenta de origen y destino deben ser diferentes."
      );
      return;
    }

    setSaving(true);

    try {
      const created = await createTransaction({
        accountId,
        destinationAccountId:
          movementType === "transfer"
            ? destinationAccountId
            : null,
        categoryId:
          movementType === "transfer"
            ? null
            : categoryId || null,
        transactionType: movementType,
        amount: numericAmount,
        description:
          description.trim() ||
          (movementType === "income"
            ? "Ingreso"
            : movementType === "expense"
              ? "Gasto"
              : "Transferencia"),
        transactionDate,
        notes,
      });

      setTransactions((current) => [
        created as Transaction,
        ...current,
      ]);

      /*
       * Actualizamos inmediatamente los saldos de la UI.
       *
       * Los saldos reales siguen calculándose en el servidor
       * a partir de initial_balance + transactions.
       */

      if (movementType === "income") {
        updateAccountBalance(
          accountId,
          numericAmount
        );
      }

      if (movementType === "expense") {
        updateAccountBalance(
          accountId,
          -numericAmount
        );
      }

      if (movementType === "transfer") {
        updateAccountBalance(
          accountId,
          -numericAmount
        );

        updateAccountBalance(
          destinationAccountId,
          numericAmount
        );
      }

      setShowForm(false);
      setDescription("");
      setAmount("");
      setNotes("");
      setCategoryId("");
      setDestinationAccountId("");
      setError("");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se ha podido guardar el movimiento."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:bg-black/[.04] dark:hover:bg-white/[.06]"
            >
              ← Dashboard
            </Link>

            <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />

            <h1 className="font-semibold tracking-tight">
              Movimientos
            </h1>
          </div>

          <Link
            href="/accounts"
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            Cuentas
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-sm text-[var(--muted)]">
              Economía Familiar
            </p>

            <h2 className="text-3xl font-semibold tracking-tight">
              Tus movimientos
            </h2>

            <p className="mt-2 text-[var(--muted)]">
              Consulta todos los ingresos, gastos y transferencias.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewMovement}
            className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
          >
            + Nuevo movimiento
          </button>
        </section>

        <section className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="glass soft-shadow rounded-3xl p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-green-500/10 p-2.5 text-green-600">
                <ArrowDownLeft size={19} />
              </div>

              <span className="text-sm text-[var(--muted)]">
                Ingresos
              </span>
            </div>

            <p className="text-2xl font-semibold text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </div>

          <div className="glass soft-shadow rounded-3xl p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-red-500/10 p-2.5 text-red-600">
                <ArrowUpRight size={19} />
              </div>

              <span className="text-sm text-[var(--muted)]">
                Gastos
              </span>
            </div>

            <p className="text-2xl font-semibold text-red-600">
              {formatCurrency(totalExpenses)}
            </p>
          </div>

          <div className="glass soft-shadow rounded-3xl p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-2.5 text-[var(--accent)]">
                <Wallet size={19} />
              </div>

              <span className="text-sm text-[var(--muted)]">
                Movimientos
              </span>
            </div>

            <p className="text-2xl font-semibold">
              {transactions.length}
            </p>
          </div>
        </section>

        <section className="glass soft-shadow overflow-hidden rounded-3xl">
          <div className="border-b border-[var(--border)] p-5 sm:p-6">
            <div>
              <h3 className="font-semibold">
                Todos los movimientos
              </h3>

              <p className="mt-1 text-sm text-[var(--muted)]">
                {transactions.length === 1
                  ? "1 movimiento registrado"
                  : `${transactions.length} movimientos registrados`}
              </p>
            </div>
          </div>

          {transactions.length > 0 ? (
            <div className="divide-y divide-black/[.06] dark:divide-white/[.07]">
              {transactions.map((transaction) => {
                const type = getTransactionType(
                  transaction.transaction_type
                );

                const account = accounts.find(
                  (item) =>
                    item.id === transaction.account_id
                );

                const destinationAccount =
                  transaction.destination_account_id
                    ? accounts.find(
                        (item) =>
                          item.id ===
                          transaction.destination_account_id
                      )
                    : null;

                const category = transaction.category_id
                  ? initialCategories.find(
                      (item) =>
                        item.id === transaction.category_id
                    )
                  : null;

                const Icon =
                  type === "income"
                    ? ArrowDownLeft
                    : type === "transfer"
                      ? ArrowLeftRight
                      : ArrowUpRight;

                const iconClass =
                  type === "income"
                    ? "bg-green-500/10 text-green-600"
                    : type === "transfer"
                      ? "bg-blue-500/10 text-[var(--accent)]"
                      : "bg-red-500/10 text-red-600";

                const amountClass =
                  type === "income"
                    ? "text-green-600"
                    : type === "transfer"
                      ? "text-[var(--accent)]"
                      : "text-red-600";

                const prefix =
                  type === "income"
                    ? "+"
                    : type === "transfer"
                      ? ""
                      : "-";

                return (
                  <div
                    key={transaction.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
                      >
                        <Icon size={19} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {transaction.description ||
                            "Sin descripción"}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
                          <span>
                            {formatDate(
                              transaction.transaction_date
                            )}
                          </span>

                          {account && (
                            <>
                              <span>·</span>
                              <span>{account.name}</span>
                            </>
                          )}

                          {category && (
                            <>
                              <span>·</span>
                              <span>{category.name}</span>
                            </>
                          )}

                          {destinationAccount && (
                            <>
                              <span>·</span>
                              <span>
                                → {destinationAccount.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 sm:justify-end">
                      <span className="rounded-lg bg-black/[.04] px-2.5 py-1 text-xs capitalize text-[var(--muted)] dark:bg-white/[.06]">
                        {type === "income"
                          ? "Ingreso"
                          : type === "expense"
                            ? "Gasto"
                            : "Transferencia"}
                      </span>

                      <span
                        className={`whitespace-nowrap text-base font-semibold ${amountClass}`}
                      >
                        {prefix}
                        {formatCurrency(
                          Number(transaction.amount),
                          account?.currency ?? "EUR"
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[.05] dark:bg-white/[.07]">
                <ArrowLeftRight
                  size={24}
                  className="text-[var(--muted)]"
                />
              </div>

              <h3 className="font-semibold">
                Todavía no hay movimientos
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
                Cuando registres ingresos, gastos o transferencias,
                aparecerán aquí.
              </p>

              <button
                type="button"
                onClick={openNewMovement}
                className="mt-5 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
              >
                + Crear primer movimiento
              </button>
            </div>
          )}
        </section>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="glass w-full max-w-lg rounded-3xl p-6 shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Nuevo movimiento
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Registra un ingreso, gasto o transferencia.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl p-2 hover:bg-black/[.05] dark:hover:bg-white/[.06]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMovementType("expense");
                  setCategoryId("");
                  setDestinationAccountId("");
                }}
                className={`rounded-xl px-3 py-3 text-sm font-medium ${
                  movementType === "expense"
                    ? "bg-red-500/10 text-red-600"
                    : "border border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                Gasto
              </button>

              <button
                type="button"
                onClick={() => {
                  setMovementType("income");
                  setCategoryId("");
                  setDestinationAccountId("");
                }}
                className={`rounded-xl px-3 py-3 text-sm font-medium ${
                  movementType === "income"
                    ? "bg-green-500/10 text-green-600"
                    : "border border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                Ingreso
              </button>

              <button
                type="button"
                onClick={() => {
                  setMovementType("transfer");
                  setCategoryId("");
                }}
                className={`rounded-xl px-3 py-3 text-sm font-medium ${
                  movementType === "transfer"
                    ? "bg-blue-500/10 text-[var(--accent)]"
                    : "border border-[var(--border)] text-[var(--muted)]"
                }`}
              >
                Transferencia
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid gap-4"
            >
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Importe
                </label>

                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="0,00 €"
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 text-lg outline-none focus:border-blue-500"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {movementType === "transfer"
                    ? "Cuenta de origen"
                    : "Cuenta"}
                </label>

                <select
                  value={accountId}
                  onChange={(event) =>
                    setAccountId(event.target.value)
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none focus:border-blue-500"
                  disabled={saving}
                >
                  <option value="">
                    Selecciona una cuenta
                  </option>

                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              {movementType === "transfer" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Cuenta de destino
                  </label>

                  <select
                    value={destinationAccountId}
                    onChange={(event) =>
                      setDestinationAccountId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none focus:border-blue-500"
                    disabled={saving}
                  >
                    <option value="">
                      Selecciona una cuenta
                    </option>

                    {accounts
                      .filter(
                        (account) =>
                          account.id !== accountId
                      )
                      .map((account) => (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {movementType !== "transfer" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Categoría
                  </label>

                  <select
                    value={categoryId}
                    onChange={(event) =>
                      setCategoryId(event.target.value)
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none focus:border-blue-500"
                    disabled={saving}
                  >
                    <option value="">
                      Sin categoría
                    </option>

                    {initialCategories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.icon
                          ? `${category.icon} `
                          : ""}
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Descripción
                </label>

                <input
                  type="text"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder={
                    movementType === "income"
                      ? "Ej. Nómina"
                      : movementType === "expense"
                        ? "Ej. Supermercado"
                        : "Ej. Traspaso a ahorro"
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-blue-500"
                  disabled={saving}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Fecha
                  </label>

                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(event) =>
                      setTransactionDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none focus:border-blue-500"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Notas
                  </label>

                  <input
                    type="text"
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    placeholder="Opcional"
                    className="w-full rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-blue-500"
                    disabled={saving}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Guardando..."
                    : "Guardar movimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}