"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from "@/lib/supabase/accounts";

type Props = {
  initialAccounts: Account[];
};

const ACCOUNT_TYPES = [
  { value: "bank", label: "Cuenta bancaria" },
  { value: "savings", label: "Cuenta de ahorro" },
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "investment", label: "Inversión" },
  { value: "other", label: "Otra" },
];

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
];

const ICONS = ["🏦", "💳", "💶", "🐷", "📈", "💰", "🏠"];

function formatMoney(value: number, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(value);
}

export function AccountsPage({ initialAccounts }: Props) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [initialBalance, setInitialBalance] = useState("0");
  const [currency, setCurrency] = useState("EUR");
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);

  const resetForm = () => {
    setName("");
    setType("bank");
    setInitialBalance("0");
    setCurrency("EUR");
    setColor(COLORS[0]);
    setIcon(ICONS[0]);
    setEditingAccount(null);
    setErrorMessage("");
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setInitialBalance(String(account.initial_balance));
    setCurrency(account.currency);
    setColor(account.color ?? COLORS[0]);
    setIcon(account.icon ?? ICONS[0]);
    setErrorMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (loading) return;

    setShowForm(false);
    resetForm();
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Tu sesión ha caducado. Vuelve a iniciar sesión."
        );
      }

      if (!name.trim()) {
        throw new Error(
          "Introduce un nombre para la cuenta."
        );
      }

      const balance = Number(initialBalance);

      if (!Number.isFinite(balance)) {
        throw new Error(
          "El saldo inicial no es válido."
        );
      }

      if (editingAccount) {
        const updateData: UpdateAccountInput = {
          name: name.trim(),
          type,
          initial_balance: balance,
          currency,
          color,
          icon,
        };

        const { data, error } = await supabase
          .from("accounts")
          .update({
            ...updateData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAccount.id)
          .eq(
            "household_id",
            editingAccount.household_id
          )
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const updatedAccount: Account = {
          ...(data as Omit<Account, "balance">),
          balance:
            Number(data.initial_balance) || 0,
        };

        setAccounts((current) =>
          current.map((account) =>
            account.id === editingAccount.id
              ? updatedAccount
              : account
          )
        );
      } else {
        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from("household_members")
          .select("household_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          throw membershipError;
        }

        if (!membership?.household_id) {
          throw new Error(
            "No se ha encontrado tu hogar."
          );
        }

        const createData: CreateAccountInput = {
          name: name.trim(),
          type,
          initial_balance: balance,
          currency,
          color,
          icon,
        };

        const { data, error } = await supabase
          .from("accounts")
          .insert({
            household_id: membership.household_id,
            name: createData.name,
            type: createData.type,
            initial_balance:
              createData.initial_balance,
            currency: createData.currency ?? "EUR",
            color: createData.color ?? null,
            icon: createData.icon ?? null,
            is_active: true,
            created_by: user.id,
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const newAccount: Account = {
          ...(data as Omit<Account, "balance">),
          balance:
            Number(data.initial_balance) || 0,
        };

        setAccounts((current) => [
          ...current,
          newAccount,
        ]);
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se ha podido guardar la cuenta."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (account: Account) => {
    const confirmed = window.confirm(
      `¿Quieres desactivar la cuenta "${account.name}"?`
    );

    if (!confirmed) return;

    setLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("accounts")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id)
        .eq(
          "household_id",
          account.household_id
        );

      if (error) {
        throw error;
      }

      setAccounts((current) =>
        current.filter(
          (item) => item.id !== account.id
        )
      );
    } catch (error) {
      console.error(error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se ha podido desactivar la cuenta."
      );
    } finally {
      setLoading(false);
    }
  };

  const totalBalance = accounts.reduce(
    (total, account) =>
      total + Number(account.balance),
    0
  );

  return (
    <main className="min-h-screen">
      {/* =====================================================
          CABECERA
          Misma estructura visual que la página Movimientos
          ===================================================== */}
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              ← Dashboard
            </Link>

            <span className="text-[var(--border)]">
              |
            </span>

            <span className="text-sm font-semibold">
              Cuentas
            </span>
          </div>

          <Link
            href="/movements"
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/[.05]"
          >
            Movimientos
          </Link>
        </div>
      </header>

      {/* =====================================================
          CONTENIDO
          ===================================================== */}
      <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Economía Familiar
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Cuentas
            </h1>

            <p className="mt-2 text-muted-foreground">
              Gestiona las cuentas y el dinero disponible de
              vuestra economía.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
          >
            + Añadir cuenta
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Dinero disponible total
          </p>

          <p className="mt-2 text-3xl font-bold">
            {formatMoney(totalBalance)}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            {accounts.length === 1
              ? "1 cuenta activa"
              : `${accounts.length} cuentas activas`}
          </p>
        </section>

        {accounts.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="text-5xl">💰</div>

            <h2 className="mt-4 text-xl font-semibold">
              Todavía no tienes cuentas
            </h2>

            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Añade vuestra primera cuenta bancaria, cuenta de
              ahorro, tarjeta o efectivo.
            </p>

            <button
              type="button"
              onClick={openCreateForm}
              className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Añadir primera cuenta
            </button>
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <article
                key={account.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
                      style={{
                        backgroundColor: `${
                          account.color ?? COLORS[0]
                        }22`,
                      }}
                    >
                      {account.icon ?? "💰"}
                    </div>

                    <div>
                      <h2 className="font-semibold">
                        {account.name}
                      </h2>

                      <p className="text-sm text-muted-foreground">
                        {ACCOUNT_TYPES.find(
                          (item) =>
                            item.value === account.type
                        )?.label ?? account.type}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-muted-foreground">
                    Saldo actual
                  </p>

                  <p className="mt-1 text-2xl font-bold">
                    {formatMoney(
                      Number(account.balance),
                      account.currency
                    )}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Saldo inicial:{" "}
                    {formatMoney(
                      Number(account.initial_balance),
                      account.currency
                    )}
                  </p>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openEditForm(account)
                    }
                    disabled={loading}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDeactivate(account)
                    }
                    disabled={loading}
                    className="flex-1 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    Desactivar
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* =====================================================
            FORMULARIO CREAR / EDITAR
            ===================================================== */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {editingAccount
                      ? "Editar cuenta"
                      : "Nueva cuenta"}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {editingAccount
                      ? "Modifica los datos de la cuenta."
                      : "Añade una nueva cuenta a vuestra economía."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={loading}
                  className="rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Nombre
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Ej. Cuenta principal"
                    required
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Tipo de cuenta
                  </label>

                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value)
                    }
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {ACCOUNT_TYPES.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Saldo inicial
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      value={initialBalance}
                      onChange={(event) =>
                        setInitialBalance(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Moneda
                    </label>

                    <select
                      value={currency}
                      onChange={(event) =>
                        setCurrency(event.target.value)
                      }
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-blue-500"
                    >
                      <option value="EUR">
                        EUR — Euro
                      </option>

                      <option value="USD">
                        USD — Dólar
                      </option>

                      <option value="GBP">
                        GBP — Libra
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium">
                    Icono
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setIcon(item)}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border text-xl ${
                          icon === item
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-border"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-sm font-medium">
                    Color
                  </label>

                  <div className="flex flex-wrap gap-3">
                    {COLORS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setColor(item)}
                        className={`h-8 w-8 rounded-full border-2 ${
                          color === item
                            ? "border-white"
                            : "border-transparent"
                        }`}
                        style={{
                          backgroundColor: item,
                        }}
                        aria-label={`Seleccionar color ${item}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-border px-4 py-3 font-medium hover:bg-muted disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading
                      ? "Guardando..."
                      : editingAccount
                        ? "Guardar cambios"
                        : "Crear cuenta"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}