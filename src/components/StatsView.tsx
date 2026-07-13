/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon, 
  BarChart2, LineChart as LineIcon, Activity, AlertCircle 
} from 'lucide-react';
import { Transaction, Account } from '../types';

interface StatsViewProps {
  transactions: Transaction[];
  accounts: Account[];
}

const COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#EC4899', '#06B6D4', '#14B8A6', '#6366F1', '#84CC16'
];

export function StatsView({ transactions, accounts }: StatsViewProps) {
  const [timeframe, setTimeframe] = useState<'current' | 'all'>('all');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // 1. Group Expenses by Category
  const expensesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'Gasto')
      .forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.amount;
      });

    return Object.entries(data)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // 2. Group Income vs Expenses per Month
  const monthlyData = useMemo(() => {
    const months: Record<string, { month: string; ingresos: number; gastos: number }> = {};
    
    // Sort transactions by date first
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

    sorted.forEach(t => {
      // Extract year-month e.g., '2026-07'
      const yearMonth = t.date.substring(0, 7);
      if (!months[yearMonth]) {
        // Convert '2026-07' to a friendly text name 'Jul 26'
        const [year, month] = yearMonth.split('-');
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const label = `${monthNames[parseInt(month) - 1]} ${year.substring(2)}`;
        
        months[yearMonth] = { month: label, ingresos: 0, gastos: 0 };
      }

      if (t.type === 'Ingreso') {
        months[yearMonth].ingresos += t.amount;
      } else if (t.type === 'Gasto') {
        months[yearMonth].gastos += t.amount;
      }
    });

    return Object.values(months);
  }, [transactions]);

  // 3. Proportions of Wealth by Account Type
  const accountsProportions = useMemo(() => {
    const data: Record<string, number> = {};
    accounts.forEach(acc => {
      data[acc.type] = (data[acc.type] || 0) + acc.currentBalance;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [accounts]);

  // Total sums
  const totalIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Ingreso')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter(t => t.type === 'Gasto')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const avgMonthlyExpense = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const sum = monthlyData.reduce((acc, m) => acc + m.gastos, 0);
    return Math.round(sum / monthlyData.length);
  }, [monthlyData]);

  return (
    <div className="space-y-6" id="stats-container">
      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="stats-metric-cards">
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Ingresos Históricos</span>
            <span className="text-base font-extrabold text-neutral-800">{formatCurrency(totalIncome)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <TrendingDown size={20} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Gastos Históricos</span>
            <span className="text-base font-extrabold text-neutral-800">{formatCurrency(totalExpense)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Gasto Promedio Mensual</span>
            <span className="text-base font-extrabold text-neutral-800">{formatCurrency(avgMonthlyExpense)}</span>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="stats-charts-grid">
        {/* Gráfico 1: Gastos por Categoría */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-4 flex flex-col justify-between min-h-[360px]" id="chart-expenses-by-category">
          <div>
            <h4 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
              <PieIcon size={16} className="text-rose-500" />
              <span>Distribución de Gastos por Categoría</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Muestra en qué conceptos se concentra el egreso de capital.</p>
          </div>

          <div className="h-64 relative flex items-center justify-center">
            {expensesByCategory.length === 0 ? (
              <span className="text-xs text-neutral-400 italic">No hay suficientes gastos para graficar.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Gasto']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: '11px', fontFamily: 'Inter' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 2: Ingresos vs Gastos Mensuales */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-4 flex flex-col justify-between min-h-[360px]" id="chart-income-vs-expenses">
          <div>
            <h4 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
              <BarChart2 size={16} className="text-emerald-500" />
              <span>Ingresos vs Gastos Mensuales</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Evolución e historial comparativo mensual.</p>
          </div>

          <div className="h-64">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic">No hay suficientes meses para graficar.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#888888', fontWeight: 'semibold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#888888' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value))]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: '11px', fontFamily: 'Inter' }}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 3: Distribución del Patrimonio por Cuentas */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-4 flex flex-col justify-between min-h-[360px]" id="chart-wealth-distribution">
          <div>
            <h4 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
              <LineIcon size={16} className="text-blue-500" />
              <span>Distribución de Patrimonio por Tipo de Activo</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">Muestra la diversificación y balance de tu liquidez.</p>
          </div>

          <div className="h-64 flex items-center justify-center">
            {accountsProportions.length === 0 ? (
              <span className="text-xs text-neutral-400 italic">No hay cuentas con fondos para graficar.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accountsProportions}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {accountsProportions.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Total']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: '11px', fontFamily: 'Inter' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Gráfico 4: Flujo de Dinero / Margen Neto */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm space-y-4 flex flex-col justify-between min-h-[360px]" id="chart-cash-flow">
          <div>
            <h4 className="text-sm font-bold text-neutral-800 flex items-center space-x-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <span>Flujo Neto Mensual (Ahorro Efectivo)</span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">El excedente neto que te queda para invertir o ahorrar.</p>
          </div>

          <div className="h-64">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic">No hay suficientes datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData.map(m => ({ ...m, neto: m.ingresos - m.gastos }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#888888' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#888888' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Margen Neto']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: '11px', fontFamily: 'Inter' }}
                  />
                  <Line type="monotone" dataKey="neto" stroke="#6366F1" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
