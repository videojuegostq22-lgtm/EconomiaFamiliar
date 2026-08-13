"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CreditCard,
  Home,
  Moon,
  MoreHorizontal,
  Plus,
  Settings,
  ShoppingCart,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  Account,
  Category,
  Transaction,
} from "@/lib/supabase/finance";

import { createTransaction } from "@/lib/supabase/transactions";

type MovementType = "income" | "expense" | "transfer";

type DashboardProps = {
  initialData: {
    accounts: Account[];
    categories: Category[];
    transactions: Transaction[];
  };
};

const format = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(n);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));

const isIncome = (type: string) =>
  ["income", "ingreso", "credit", "deposit"].includes(type.toLowerCase());

const isExpense = (type: string) =>
  ["expense", "gasto", "debit", "withdrawal"].includes(type.toLowerCase());

const isTransfer = (type: string) =>
  ["transfer", "transferencia"].includes(type.toLowerCase());

const getAccountIcon = (type: string) => {
  const normalized = type.toLowerCase();

  if (
    normalized.includes("cash") ||
    normalized.includes("efectivo") ||
    normalized.includes("wallet")
  ) {
    return Banknote;
  }

  if (
    normalized.includes("card") ||
    normalized.includes("tarjeta") ||
    normalized.includes("credit")
  ) {
    return CreditCard;
  }

  if (normalized.includes("saving") || normalized.includes("ahorro")) {
    return Banknote;
  }

  return Wallet;
};

const getMovementIcon = (transaction: Transaction) => {
  if (isIncome(transaction.transaction_type)) {
    return ArrowDownLeft;
  }

  if (isTransfer(transaction.transaction_type)) {
    return CreditCard;
  }

  const description = transaction.description.toLowerCase();

  if (
    description.includes("super") ||
    description.includes("compra") ||
    description.includes("aliment")
  ) {
    return ShoppingCart;
  }

  if (
    description.includes("alquiler") ||
    description.includes("hipoteca") ||
    description.includes("casa")
  ) {
    return Home;
  }

  return ArrowUpRight;
};

export default function Dashboard({ initialData }: DashboardProps) {
  const { theme, setTheme } = useTheme();

  const [period, setPeriod] = useState("Este mes");

  const [transactions, setTransactions] = useState<Transaction[]>(
    initialData.transactions
  );

  const { accounts, categories } = initialData;

  const [showAdd, setShowAdd] = useState(false);

  const [movementType, setMovementType] =
    useState<MovementType>("expense");

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");

  const [destinationAccountId, setDestinationAccountId] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const date = new Date(
        `${transaction.transaction_date}T12:00:00`
      );

      return (
        date.getFullYear() === currentYear &&
        date.getMonth() === currentMonth
      );
    });
  }, [transactions, currentYear, currentMonth]);

  const income = useMemo(() => {
    return currentMonthTransactions
      .filter((transaction) =>
        isIncome(transaction.transaction_type)
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [currentMonthTransactions]);

  const expenses = useMemo(() => {
    return currentMonthTransactions
      .filter((transaction) =>
        isExpense(transaction.transaction_type)
      )
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount),
        0
      );
  }, [currentMonthTransactions]);

  const balance = income - expenses;

  const accountBalances = useMemo(() => {
    return accounts.map((account) => {
      const accountTransactions = transactions.filter(
        (transaction) =>
          transaction.account_id === account.id
      );

      const balance = accountTransactions.reduce(
        (total, transaction) => {
          const amount = Number(transaction.amount);

          if (isIncome(transaction.transaction_type)) {
            return total + amount;
          }

          if (isExpense(transaction.transaction_type)) {
            return total - amount;
          }

          if (isTransfer(transaction.transaction_type)) {
            return total - amount;
          }

          return total;
        },
        Number(account.initial_balance)
      );

      return {
        ...account,
        amount: balance,
      };
    });
  }, [accounts, transactions]);

  const total = useMemo(() => {
    return accountBalances.reduce(
      (sum, account) => sum + account.amount,
      0
    );
  }, [accountBalances]);

  const monthlyData = useMemo(() => {
    const result: {
      name: string;
      income: number;
      expenses: number;
      balance: number;
    }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        currentYear,
        currentMonth - i,
        1
      );

      const year = date.getFullYear();
      const month = date.getMonth();

      const monthTransactions = transactions.filter(
        (transaction) => {
          const transactionDate = new Date(
            `${transaction.transaction_date}T12:00:00`
          );

          return (
            transactionDate.getFullYear() === year &&
            transactionDate.getMonth() === month
          );
        }
      );

      const monthIncome = monthTransactions
        .filter((transaction) =>
          isIncome(transaction.transaction_type)
        )
        .reduce(
          (sum, transaction) =>
            sum + Number(transaction.amount),
          0
        );

      const monthExpenses = monthTransactions
        .filter((transaction) =>
          isExpense(transaction.transaction_type)
        )
        .reduce(
          (sum, transaction) =>
            sum + Number(transaction.amount),
          0
        );

      result.push({
        name: new Intl.DateTimeFormat("es-ES", {
          month: "short",
        })
          .format(date)
          .replace(".", ""),
        income: monthIncome,
        expenses: monthExpenses,
        balance: monthIncome - monthExpenses,
      });
    }

    return result;
  }, [transactions, currentYear, currentMonth]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();

    currentMonthTransactions
      .filter((transaction) =>
        isExpense(transaction.transaction_type)
      )
      .forEach((transaction) => {
        const category = categories.find(
          (item) =>
            item.id === transaction.category_id
        );

        const name =
          category?.name ?? "Sin categoría";

        totals.set(
          name,
          (totals.get(name) ?? 0) +
            Number(transaction.amount)
        );
      });

    return [...totals.entries()]
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions, categories]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort(
        (a, b) =>
          new Date(b.transaction_date).getTime() -
          new Date(a.transaction_date).getTime()
      )
      .slice(0, 6);
  }, [transactions]);

  const today = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const savingsRate =
    income > 0
      ? (balance / income) * 100
      : 0;

  const categoryColors = [
    "#007aff",
    "#5856d6",
    "#ff9500",
    "#34c759",
    "#af52de",
    "#8e8e93",
  ];

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
    setShowAdd(true);
  };

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowAdd(false);
    setError("");
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
      setError(
        "Selecciona una cuenta de destino."
      );
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

      setShowAdd(false);

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
    <main className="min-h-screen pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
              <Wallet size={19} />
            </div>

            <span className="font-semibold tracking-tight">
              Economía Familiar
            </span>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {[
              {
                label: "Dashboard",
                href: "/",
              },
              {
                label: "Movimientos",
                href: "/movements",
              },
              {
                label: "Cuentas",
                href: "/accounts",
              },
              {
                label: "Presupuestos",
                href: "/budgets",
              },
            ].map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm ${
                  i === 0
                    ? "bg-black/[.06] font-medium dark:bg-white/[.08]"
                    : "text-[var(--muted)] hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setTheme(
                  theme === "dark"
                    ? "light"
                    : "dark"
                )
              }
              className="rounded-xl border border-[var(--border)] p-2.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              title="Cambiar tema"
            >
              {theme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            <button
              className="hidden rounded-xl border border-[var(--border)] p-2.5 sm:block"
              title="Configuración"
            >
              <Settings size={18} />
            </button>

            <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-sm font-semibold text-white">
              D
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-sm capitalize text-[var(--muted)]">
              {today}
            </p>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Buenos días 👋
            </h1>

            <p className="mt-2 text-[var(--muted)]">
              Este es el resumen de vuestra economía.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value)
              }
              className="glass rounded-xl px-3 py-2.5 text-sm outline-none"
            >
              <option>Este mes</option>
              <option>Últimos 3 meses</option>
              <option>Este año</option>
            </select>

            <button
              type="button"
              onClick={openNewMovement}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
            >
              <Plus size={18} />

              <span className="hidden sm:inline">
                Añadir
              </span>
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            title="Patrimonio total"
            value={format(total)}
            subtitle={`${accounts.length} ${
              accounts.length === 1
                ? "cuenta activa"
                : "cuentas activas"
            }`}
            icon={Wallet}
            positive={total >= 0}
          />

          <Metric
            title="Ingresos"
            value={format(income)}
            subtitle={`${
              currentMonthTransactions.filter((t) =>
                isIncome(t.transaction_type)
              ).length
            } ingresos registrados`}
            icon={ArrowDownLeft}
            positive
          />

          <Metric
            title="Gastos"
            value={format(expenses)}
            subtitle={`${
              currentMonthTransactions.filter((t) =>
                isExpense(t.transaction_type)
              ).length
            } gastos registrados`}
            icon={ArrowUpRight}
          />

          <Metric
            title="Balance mensual"
            value={format(balance)}
            subtitle={
              income > 0
                ? `Ahorro del ${savingsRate
                    .toFixed(1)
                    .replace(".", ",")}%`
                : "Sin ingresos registrados"
            }
            icon={BarChart3}
            positive={balance >= 0}
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <div className="glass soft-shadow rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Evolución de ingresos y gastos
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Últimos 6 meses
                </p>
              </div>

              <button className="rounded-xl p-2 text-[var(--muted)] hover:bg-black/[.04] dark:hover:bg-white/[.06]">
                <MoreHorizontal size={20} />
              </button>
            </div>

            <div className="h-[280px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient
                      id="balanceFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#007aff"
                        stopOpacity={0.28}
                      />

                      <stop
                        offset="100%"
                        stopColor="#007aff"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="currentColor"
                    opacity={0.08}
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    hide
                    domain={[
                      "dataMin - 300",
                      "dataMax + 300",
                    ]}
                  />

                  <Tooltip
                    formatter={(value) =>
                      format(Number(value))
                    }
                    contentStyle={{
                      borderRadius: 16,
                      border:
                        "1px solid var(--border)",
                      background:
                        "var(--card)",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#007aff"
                    strokeWidth={3}
                    fill="url(#balanceFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass soft-shadow rounded-3xl p-5 sm:p-6">
            <div className="mb-3">
              <h2 className="font-semibold">
                Gastos por categoría
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Este mes · {format(expenses)}
              </p>
            </div>

            <div className="h-[220px]">
              {categoryTotals.length > 0 ? (
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <PieChart>
                    <Pie
                      data={categoryTotals}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {categoryTotals.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            categoryColors[
                              i %
                                categoryColors.length
                            ]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value) =>
                        format(Number(value))
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                  No hay gastos registrados
                  este mes.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              {categoryTotals
                .slice(0, 6)
                .map((category, i) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-[var(--muted)]">
                      <i
                        className="h-2 w-2 rounded-full"
                        style={{
                          background:
                            categoryColors[
                              i %
                                categoryColors.length
                            ],
                        }}
                      />

                      {category.name}
                    </span>

                    <span className="font-medium">
                      {format(category.value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass soft-shadow rounded-3xl p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold">
                Ingresos y gastos
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Comparativa mensual
              </p>
            </div>

            <div className="h-[230px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={monthlyData}
                  barGap={5}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="currentColor"
                    opacity={0.08}
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis hide />

                  <Tooltip
                    formatter={(value) =>
                      format(Number(value))
                    }
                    contentStyle={{
                      borderRadius: 16,
                      border:
                        "1px solid var(--border)",
                      background:
                        "var(--card)",
                    }}
                  />

                  <Bar
                    dataKey="income"
                    name="Ingresos"
                    fill="#34c759"
                    radius={[5, 5, 0, 0]}
                  />

                  <Bar
                    dataKey="expenses"
                    name="Gastos"
                    fill="#ff3b30"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass soft-shadow rounded-3xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">
                  Cuentas
                </h2>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Dinero disponible
                </p>
              </div>

              <Link
                href="/accounts"
                className="text-sm font-medium text-[var(--accent)]"
              >
                Ver todas
              </Link>
            </div>

            <div className="space-y-2">
              {accountBalances.length > 0 ? (
                accountBalances.map((account) => {
                  const Icon = getAccountIcon(
                    account.type
                  );

                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-2xl p-3 hover:bg-black/[.03] dark:hover:bg-white/[.04]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[.05] dark:bg-white/[.08]">
                          <Icon size={18} />
                        </div>

                        <div>
                          <p className="text-sm font-medium">
                            {account.name}
                          </p>

                          <p className="text-xs text-[var(--muted)]">
                            {account.type}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-semibold">
                        {format(account.amount)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-sm text-[var(--muted)]">
                  Todavía no hay cuentas
                  configuradas.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="glass soft-shadow mt-5 rounded-3xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">
                Últimos movimientos
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Actividad reciente
              </p>
            </div>

            <Link
              href="/movements"
              className="text-sm font-medium text-[var(--accent)]"
            >
              Ver todos
            </Link>
          </div>

          <div className="divide-y divide-black/[.06] dark:divide-white/[.07]">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => {
                const Icon =
                  getMovementIcon(transaction);

                const incomeMovement = isIncome(
                  transaction.transaction_type
                );

                const transferMovement =
                  isTransfer(
                    transaction.transaction_type
                  );

                const category = categories.find(
                  (item) =>
                    item.id ===
                    transaction.category_id
                );

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                          incomeMovement
                            ? "bg-green-500/10 text-green-600"
                            : transferMovement
                              ? "bg-blue-500/10 text-[var(--accent)]"
                              : "bg-black/[.05] dark:bg-white/[.07]"
                        }`}
                      >
                        <Icon size={18} />
                      </div>

                      <div>
                        <p className="text-sm font-medium">
                          {transaction.description ||
                            "Sin descripción"}
                        </p>

                        <p className="text-xs text-[var(--muted)]">
                          {category?.name ??
                            transaction.transaction_type}{" "}
                          ·{" "}
                          {formatDate(
                            transaction.transaction_date
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-sm font-semibold ${
                        incomeMovement
                          ? "text-green-600"
                          : transferMovement
                            ? "text-[var(--accent)]"
                            : ""
                      }`}
                    >
                      {incomeMovement
                        ? "+"
                        : transferMovement
                          ? ""
                          : "-"}
                      {format(
                        Number(
                          transaction.amount
                        )
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm text-[var(--muted)]">
                Todavía no hay movimientos
                registrados.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* MENÚ INFERIOR MÓVIL
          5 botones:
          Inicio · Movimientos · Añadir · Cuentas · Presupuestos
          
          Configuración NO aparece aquí.
      */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="border-t border-[var(--border)] bg-[var(--card)]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-md items-center justify-between">
            <Link
              href="/"
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[var(--accent)]"
            >
              <BarChart3 size={20} />
              <span className="text-[10px] font-medium">
                Inicio
              </span>
            </Link>

            <Link
              href="/movements"
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[var(--muted)]"
            >
              <CreditCard size={20} />
              <span className="text-[10px] font-medium">
                Movimientos
              </span>
            </Link>

            <button
              type="button"
              onClick={openNewMovement}
              className="mx-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-lg shadow-blue-500/30"
              aria-label="Añadir movimiento"
            >
              <Plus size={24} />
            </button>

            <Link
              href="/accounts"
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[var(--muted)]"
            >
              <Wallet size={20} />
              <span className="text-[10px] font-medium">
                Cuentas
              </span>
            </Link>

            <Link
              href="/budgets"
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[var(--muted)]"
            >
              <BarChart3 size={20} />
              <span className="text-[10px] font-medium">
                Presupuestos
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={closeForm}
        >
          <div
            className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-2xl"
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
                  Registra un ingreso, gasto o
                  transferencia.
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
                    setAccountId(
                      event.target.value
                    )
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
                          account.id !==
                          accountId
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
                      setCategoryId(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 outline-none focus:border-blue-500"
                    disabled={saving}
                  >
                    <option value="">
                      Sin categoría
                    </option>

                    {categories.map(
                      (category) => (
                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.icon
                            ? `${category.icon} `
                            : ""}
                          {category.name}
                        </option>
                      )
                    )}
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
                    setDescription(
                      event.target.value
                    )
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
                      setNotes(
                        event.target.value
                      )
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

function Metric({
  title,
  value,
  subtitle,
  icon: Icon,
  positive = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  positive?: boolean;
}) {
  return (
    <div className="glass soft-shadow rounded-3xl p-5">
      <div className="mb-5 flex items-start justify-between">
        <span className="text-sm text-[var(--muted)]">
          {title}
        </span>

        <div className="rounded-xl bg-[var(--accent)]/10 p-2.5 text-[var(--accent)]">
          <Icon size={18} />
        </div>
      </div>

      <p className="text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p
        className={`mt-1 text-xs ${
          positive
            ? "text-green-600"
            : "text-[var(--muted)]"
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
}