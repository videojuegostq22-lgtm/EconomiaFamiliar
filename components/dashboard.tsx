"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  ArrowDownLeft, ArrowUpRight, Banknote, BarChart3, ChevronDown, CreditCard,
  Home, Menu, Moon, MoreHorizontal, Plus, Settings, ShoppingCart, Sun, Wallet, X
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

const months = [
  { name: "Mar", balance: 6220, income: 2900, expenses: 1860 },
  { name: "Abr", balance: 6700, income: 3100, expenses: 2010 },
  { name: "May", balance: 6940, income: 3000, expenses: 2260 },
  { name: "Jun", balance: 7250, income: 3200, expenses: 1980 },
  { name: "Jul", balance: 7580, income: 3200, expenses: 1950 },
  { name: "Ago", balance: 8010, income: 3400, expenses: 1970 }
];

const categories = [
  { name: "Vivienda", value: 720 },
  { name: "Alimentación", value: 420 },
  { name: "Transporte", value: 260 },
  { name: "Ocio", value: 210 },
  { name: "Compras", value: 180 },
  { name: "Otros", value: 180 }
];

const movements = [
  { title: "Nómina", category: "Ingresos", amount: 1850, type: "income", icon: ArrowDownLeft },
  { title: "Supermercado", category: "Alimentación", amount: -84.32, type: "expense", icon: ShoppingCart },
  { title: "Gasolina", category: "Transporte", amount: -65, type: "expense", icon: CreditCard },
  { title: "Alquiler", category: "Vivienda", amount: -720, type: "expense", icon: Home }
];

const accounts = [
  { name: "Cuenta principal", bank: "Cuenta bancaria", amount: 4250, icon: Wallet },
  { name: "Cuenta ahorro", bank: "Ahorro", amount: 2180, icon: Banknote },
  { name: "Revolut", bank: "Cuenta digital", amount: 850, icon: CreditCard },
  { name: "Efectivo", bank: "Cartera", amount: 300, icon: Banknote }
];

const format = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const [period, setPeriod] = useState("Este mes");
  const [showAdd, setShowAdd] = useState(false);

  const total = useMemo(() => accounts.reduce((a, x) => a + x.amount, 0), []);
  const expenses = 1950;
  const income = 3200;
  const balance = income - expenses;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2 lg:hidden" onClick={() => setMobileNav(true)} aria-label="Abrir menú">
              <Menu size={22} />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
              <Wallet size={19} />
            </div>
            <span className="font-semibold tracking-tight">Economía Familiar</span>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {["Dashboard", "Movimientos", "Cuentas", "Presupuestos"].map((item, i) => (
              <button key={item} className={`rounded-xl px-4 py-2 text-sm ${i === 0 ? "bg-black/[.06] dark:bg-white/[.08] font-medium" : "text-[var(--muted)] hover:bg-black/[.04] dark:hover:bg-white/[.06]"}`}>
                {item}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full border border-[var(--border)] p-2.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
              title="Cambiar modo"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="hidden rounded-full border border-[var(--border)] p-2.5 sm:block" title="Configuración">
              <Settings size={18} />
            </button>
            <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-sm font-semibold text-white">D</div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-1 text-sm text-[var(--muted)]">Jueves, 13 de agosto</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Buenos días 👋</h1>
            <p className="mt-2 text-[var(--muted)]">Este es el resumen de vuestra economía.</p>
          </div>
          <div className="flex gap-2">
            <select value={period} onChange={e => setPeriod(e.target.value)} className="glass rounded-xl px-3 py-2.5 text-sm outline-none">
              <option>Este mes</option><option>Últimos 3 meses</option><option>Este año</option>
            </select>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20">
              <Plus size={18} /> <span className="hidden sm:inline">Añadir</span>
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="Patrimonio total" value={format(total)} subtitle="+5,7% este mes" icon={Wallet} positive />
          <Metric title="Ingresos" value={format(income)} subtitle="2 ingresos registrados" icon={ArrowDownLeft} positive />
          <Metric title="Gastos" value={format(expenses)} subtitle="−3,2% vs. mes anterior" icon={ArrowUpRight} />
          <Metric title="Balance mensual" value={format(balance)} subtitle="Ahorro del 39,1%" icon={BarChart3} positive />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <div className="glass soft-shadow rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Evolución del patrimonio</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Últimos 6 meses</p>
              </div>
              <button className="rounded-xl p-2 text-[var(--muted)] hover:bg-black/[.04] dark:hover:bg-white/[.06]"><MoreHorizontal size={20}/></button>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={months}>
                  <defs>
                    <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#007aff" stopOpacity={0.28}/>
                      <stop offset="100%" stopColor="#007aff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="currentColor" opacity={0.08}/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:12}}/>
                  <YAxis hide domain={["dataMin - 300", "dataMax + 300"]}/>
                  <Tooltip formatter={(value) => format(Number(value))} contentStyle={{borderRadius:16, border:"1px solid var(--border)", background:"var(--card)"}}/>
                  <Area type="monotone" dataKey="balance" stroke="#007aff" strokeWidth={3} fill="url(#balanceFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass soft-shadow rounded-3xl p-5 sm:p-6">
            <div className="mb-3">
              <h2 className="font-semibold">Gastos por categoría</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Agosto · {format(expenses)}</p>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categories} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2}>
                    {categories.map((_, i) => <Cell key={i} fill={["#007aff","#5856d6","#ff9500","#34c759","#af52de","#8e8e93"][i]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => format(Number(value))}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {categories.slice(0, 4).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[var(--muted)]"><i className="h-2 w-2 rounded-full" style={{background:["#007aff","#5856d6","#ff9500","#34c759"][i]}}/>{c.name}</span>
                  <span className="font-medium">{format(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="glass soft-shadow rounded-3xl p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="font-semibold">Ingresos y gastos</h2><p className="mt-1 text-sm text-[var(--muted)]">Comparativa mensual</p></div>
            </div>
            <div className="h-[230px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={months} barGap={5}>
                  <CartesianGrid vertical={false} stroke="currentColor" opacity={0.08}/>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:12}}/>
                  <YAxis hide/>
                  <Tooltip formatter={(value) => format(Number(value))} contentStyle={{borderRadius:16, border:"1px solid var(--border)", background:"var(--card)"}}/>
                  <Bar dataKey="income" name="Ingresos" fill="#34c759" radius={[5,5,0,0]} />
                  <Bar dataKey="expenses" name="Gastos" fill="#ff3b30" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass soft-shadow rounded-3xl p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="font-semibold">Cuentas</h2><p className="mt-1 text-sm text-[var(--muted)]">Dinero disponible</p></div>
              <button className="text-sm font-medium text-[var(--accent)]">Ver todas</button>
            </div>
            <div className="space-y-2">
              {accounts.map(a => {
                const Icon = a.icon;
                return <div key={a.name} className="flex items-center justify-between rounded-2xl p-3 hover:bg-black/[.03] dark:hover:bg-white/[.04]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/[.05] dark:bg-white/[.08]"><Icon size={18}/></div>
                    <div><p className="text-sm font-medium">{a.name}</p><p className="text-xs text-[var(--muted)]">{a.bank}</p></div>
                  </div>
                  <p className="text-sm font-semibold">{format(a.amount)}</p>
                </div>
              })}
            </div>
          </div>
        </section>

        <section className="glass soft-shadow mt-5 rounded-3xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="font-semibold">Últimos movimientos</h2><p className="mt-1 text-sm text-[var(--muted)]">Actividad reciente</p></div>
            <button className="text-sm font-medium text-[var(--accent)]">Ver todos</button>
          </div>
          <div className="divide-y divide-black/[.06] dark:divide-white/[.07]">
            {movements.map(m => {
              const Icon = m.icon;
              return <div key={m.title} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.type === "income" ? "bg-green-500/10 text-green-600" : "bg-black/[.05] dark:bg-white/[.07]"}`}><Icon size={18}/></div>
                  <div><p className="text-sm font-medium">{m.title}</p><p className="text-xs text-[var(--muted)]">{m.category} · Hoy</p></div>
                </div>
                <span className={`text-sm font-semibold ${m.type === "income" ? "text-green-600" : ""}`}>{m.amount > 0 ? "+" : ""}{format(m.amount)}</span>
              </div>
            })}
          </div>
        </section>
      </div>

      <div className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
        <button className="rounded-xl bg-black/[.06] p-3 dark:bg-white/[.08]"><BarChart3 size={19}/></button>
        <button className="rounded-xl p-3 text-[var(--muted)]"><CreditCard size={19}/></button>
        <button onClick={() => setShowAdd(true)} className="rounded-xl bg-[var(--accent)] p-3 text-white"><Plus size={20}/></button>
        <button className="rounded-xl p-3 text-[var(--muted)]"><Wallet size={19}/></button>
        <button className="rounded-xl p-3 text-[var(--muted)]"><Settings size={19}/></button>
      </div>

      {mobileNav && <div className="fixed inset-0 z-50 bg-black/30 lg:hidden" onClick={() => setMobileNav(false)}>
        <aside className="h-full w-[280px] bg-[var(--background)] p-5" onClick={e => e.stopPropagation()}>
          <div className="mb-8 flex items-center justify-between"><b>Economía Familiar</b><button onClick={() => setMobileNav(false)}><X/></button></div>
          <div className="space-y-1">{["Dashboard","Movimientos","Cuentas","Presupuestos","Configuración"].map((x,i)=><button key={x} className={`w-full rounded-xl px-4 py-3 text-left ${i===0?"bg-black/[.06] dark:bg-white/[.08] font-medium":"text-[var(--muted)]"}`}>{x}</button>)}</div>
        </aside>
      </div>}

      {showAdd && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setShowAdd(false)}>
        <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Añadir movimiento</h2><button onClick={() => setShowAdd(false)} className="rounded-full p-2 hover:bg-black/[.05]"><X size={18}/></button></div>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2">
              <button className="rounded-xl bg-red-500/10 py-3 font-medium text-red-600">Gasto</button>
              <button className="rounded-xl border border-[var(--border)] py-3 font-medium text-green-600">Ingreso</button>
            </div>
            <input placeholder="Importe (€)" className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-blue-500" />
            <input placeholder="Descripción" className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none focus:border-blue-500" />
            <select className="rounded-xl border border-[var(--border)] bg-transparent px-4 py-3 outline-none"><option>Categoría</option><option>Vivienda</option><option>Alimentación</option><option>Transporte</option><option>Ocio</option><option>Compras</option></select>
            <button onClick={() => setShowAdd(false)} className="rounded-xl bg-[var(--accent)] py-3 font-semibold text-white">Guardar movimiento</button>
          </div>
        </div>
      </div>}
    </main>
  );
}

function Metric({title,value,subtitle,icon:Icon,positive=false}:{title:string,value:string,subtitle:string,icon:React.ElementType,positive?:boolean}) {
  return <div className="glass soft-shadow rounded-3xl p-5">
    <div className="mb-5 flex items-start justify-between">
      <span className="text-sm text-[var(--muted)]">{title}</span>
      <div className="rounded-xl bg-[var(--accent)]/10 p-2.5 text-[var(--accent)]"><Icon size={18}/></div>
    </div>
    <p className="text-2xl font-semibold tracking-tight">{value}</p>
    <p className={`mt-1 text-xs ${positive ? "text-green-600" : "text-[var(--muted)]"}`}>{subtitle}</p>
  </div>;
}