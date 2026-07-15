/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Calendar, Trash2, ExternalLink, Copy, Check, AlertCircle, X, 
  Repeat, CreditCard, CheckCircle2, AlertTriangle, Info, HelpCircle, 
  Briefcase, Tv, Home, Coins, ArrowUpRight, DollarSign, ChevronDown, ChevronUp, Edit2
} from 'lucide-react';
import { FixedExpense, Account } from '../types';

import { Transaction } from '../types';

interface GastosFijosViewProps {
  fixedExpenses: FixedExpense[];
  accounts: Account[];
  transactions: Transaction[];
  onAddFixedExpense: (exp: Omit<FixedExpense, 'id'>) => void;
  onDeleteFixedExpense: (id: string) => void;
  onPayFixedExpense: (id: string, accountId: string) => void;
  onUpdateFixedExpense: (exp: FixedExpense) => void;
  onDeleteTransaction: (id: string) => void;
  exchangeRates: any;
}

export function GastosFijosView({
  fixedExpenses,
  accounts,
  transactions,
  onAddFixedExpense,
  onDeleteFixedExpense,
  onPayFixedExpense,
  onUpdateFixedExpense,
  onDeleteTransaction,
  exchangeRates
}: GastosFijosViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Registrar pago flow state
  const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendientes' | 'pagados'>('todos');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [onlyMarkAsPaid, setOnlyMarkAsPaid] = useState(false);
  
  // Helper for dynamic Next Payment date calculation
  const getNextPaymentDateStr = (dueDay: number, lastPaidMonth: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    let targetMonth = currentMonth;
    let targetYear = currentYear;

    if (lastPaidMonth && lastPaidMonth >= currentMonthStr) {
      const [paidY, paidM] = lastPaidMonth.split('-').map(Number);
      targetMonth = paidM; // Month 1-indexed maps to next month (0-indexed)
      targetYear = paidY;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    const date = new Date(targetYear, targetMonth, Math.min(dueDay, 28));
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const historyPayments = useMemo(() => {
    return (transactions || [])
      .filter(t => t.tags && t.tags.includes('gasto-fijo'))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions]);

  // Edit expense state
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);
  const [expPaidMonthState, setExpPaidMonthState] = useState<'pending' | 'paid'>('pending');

  const handleStartEdit = (exp: FixedExpense) => {
    setEditingExpense(exp);
    setExpName(exp.name);
    setExpGroup(exp.group);
    setExpSubgroup(exp.subgroup);
    setExpAmount(String(exp.amount));
    setExpCurrency(exp.currency);
    setExpDueDay(String(exp.dueDay));
    setExpDesc(exp.description || '');
    setExpPayLink(exp.paymentLink || '');
    setExpPaidMonthState(exp.lastPaidMonth === currentMonthStr ? 'paid' : 'pending');
    setShowAddModal(true);
  };

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Form states
  const [expName, setExpName] = useState('');
  const [expGroup, setExpGroup] = useState<FixedExpense['group']>('Trabajo');
  const [expSubgroup, setExpSubgroup] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCurrency, setExpCurrency] = useState<FixedExpense['currency']>('ARS');
  const [expDueDay, setExpDueDay] = useState('10');
  const [expDesc, setExpDesc] = useState('');
  const [expPayLink, setExpPayLink] = useState('');

  // Current month string YYYY-MM
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthName = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('es-AR', { month: 'long' });
  }, []);

  // Conversion helper: returns value in ARS
  const convertToArs = (amount: number, currency: 'ARS' | 'USD' | 'USDT' | 'BTC') => {
    const cur = currency || 'ARS';
    if (cur === 'ARS') return amount;
    if (cur === 'USDT') return amount * (exchangeRates.ARS_USDT || 1240);
    if (cur === 'USD') return amount * (exchangeRates.ARS_USD_BLUE || 1220);
    if (cur === 'BTC') return amount * (exchangeRates.USD_BTC || 62000) * (exchangeRates.ARS_USD_BLUE || 1220);
    return amount;
  };

  // Group helpers
  const GROUPS: FixedExpense['group'][] = [
    'Trabajo', 'Entretenimiento', 'Alquiler & Hogar', 'Comida', 'Reservas & Futuros', 'Otro'
  ];

  const groupIcons: Record<FixedExpense['group'], React.ReactNode> = {
    'Trabajo': <Briefcase size={16} />,
    'Entretenimiento': <Tv size={16} />,
    'Alquiler & Hogar': <Home size={16} />,
    'Comida': <Coins size={16} />,
    'Reservas & Futuros': <Calendar size={16} />,
    'Otro': <Repeat size={16} />
  };

  const groupColors: Record<FixedExpense['group'], string> = {
    'Trabajo': 'bg-indigo-50 text-indigo-600 border-indigo-100',
    'Entretenimiento': 'bg-pink-50 text-pink-600 border-pink-100',
    'Alquiler & Hogar': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    'Comida': 'bg-amber-50 text-amber-600 border-amber-100',
    'Reservas & Futuros': 'bg-blue-50 text-blue-600 border-blue-100',
    'Otro': 'bg-neutral-50 text-neutral-600 border-neutral-100'
  };

  // Calculations
  const stats = useMemo(() => {
    let totalArs = 0;
    let paidArs = 0;
    let pendingArs = 0;

    fixedExpenses.forEach(exp => {
      const amtArs = convertToArs(exp.amount, exp.currency);
      totalArs += amtArs;
      
      const isPaid = exp.lastPaidMonth === currentMonthStr;
      if (isPaid) {
        paidArs += amtArs;
      } else {
        pendingArs += amtArs;
      }
    });

    return { totalArs, paidArs, pendingArs };
  }, [fixedExpenses, currentMonthStr, exchangeRates]);

  const handleCopyLinkOrAlias = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenPayModal = (id: string) => {
    setPayingExpenseId(id);
    if (accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingExpenseId) return;

    if (onlyMarkAsPaid) {
      onPayFixedExpense(payingExpenseId, 'skip_contabilidad');
    } else {
      if (!selectedAccountId) return;
      onPayFixedExpense(payingExpenseId, selectedAccountId);
    }
    setPayingExpenseId(null);
    setSelectedAccountId('');
    setOnlyMarkAsPaid(false);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName.trim() || !expAmount || isNaN(Number(expAmount))) {
      alert('Por favor complete todos los datos obligatorios.');
      return;
    }

    if (editingExpense) {
      onUpdateFixedExpense({
        ...editingExpense,
        name: expName,
        group: expGroup,
        subgroup: expSubgroup || 'General',
        amount: Number(expAmount),
        currency: expCurrency,
        dueDay: Number(expDueDay) || 10,
        description: expDesc,
        paymentLink: expPayLink,
        lastPaidMonth: expPaidMonthState === 'paid' ? currentMonthStr : ''
      });
      setEditingExpense(null);
    } else {
      onAddFixedExpense({
        name: expName,
        group: expGroup,
        subgroup: expSubgroup || 'General',
        amount: Number(expAmount),
        currency: expCurrency,
        dueDay: Number(expDueDay) || 10,
        description: expDesc,
        paymentLink: expPayLink
      });
    }

    // Reset and close
    setExpName('');
    setExpSubgroup('');
    setExpAmount('');
    setExpCurrency('ARS');
    setExpDueDay('10');
    setExpDesc('');
    setExpPayLink('');
    setShowAddModal(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatNativeBalance = (val: number, currency: FixedExpense['currency']) => {
    if (currency === 'BTC') return val.toFixed(5) + ' BTC';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency,
      minimumFractionDigits: currency === 'ARS' ? 0 : 2,
      maximumFractionDigits: currency === 'ARS' ? 0 : 2
    }).format(val) + (currency === 'USDT' ? ' USDT' : '');
  };

  return (
    <div className="space-y-6" id="fixed-expenses-container">
      {/* Resumen Superior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-grid-expenses">
        {/* Total Planificado */}
        <div className="bg-neutral-900 text-white rounded-3xl p-5 relative overflow-hidden shadow-sm">
          <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
            <div>
              <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Gastos Fijos Planificados</p>
              <h2 className="text-2xl font-bold tracking-tight mt-1">{formatCurrency(stats.totalArs)}</h2>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono">
              Total proyectado para el mes de {currentMonthName}
            </div>
          </div>
        </div>

        {/* Total Pagado */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Pagado este Mes</p>
            <h2 className="text-2xl font-bold text-emerald-500 mt-1">{formatCurrency(stats.paidArs)}</h2>
          </div>
          <div className="flex items-center space-x-2 mt-4 text-[10px] text-neutral-500 font-medium">
            <CheckCircle2 size={12} className="text-emerald-500" />
            <span>Progreso de pagos: {stats.totalArs > 0 ? Math.round((stats.paidArs / stats.totalArs) * 100) : 0}%</span>
          </div>
        </div>

        {/* Total Pendiente */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Pendiente de Pago</p>
            <h2 className="text-2xl font-bold text-amber-500 mt-1">{formatCurrency(stats.pendingArs)}</h2>
          </div>
          <div className="flex items-center space-x-2 mt-4 text-[10px] text-neutral-500 font-medium">
            <AlertCircle size={12} className="text-amber-500" />
            <span>{fixedExpenses.filter(e => e.lastPaidMonth !== currentMonthStr).length} servicios vencen este mes</span>
          </div>
        </div>
      </div>

      {/* Controles y Nueva Suscripción */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Listado de Gastos por Grupo</h3>
          <p className="text-[10px] text-neutral-400 font-semibold">Haz clic en los encabezados para colapsar o expandir las categorías.</p>
        </div>
        <div className="flex items-center space-x-2.5">
          {/* Segmentar / Filtro de Estado */}
          <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-xl">
            {(['todos', 'pendientes', 'pagados'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${statusFilter === f ? 'bg-white text-neutral-800 shadow-xs' : 'text-neutral-500 hover:text-neutral-700'}`}
              >
                {f === 'todos' ? 'Ver Todos' : f === 'pendientes' ? 'Pendientes' : 'Pagados'}
              </button>
            ))}
          </div>

          <button 
            onClick={() => {
              setEditingExpense(null);
              setExpName('');
              setExpSubgroup('');
              setExpAmount('');
              setExpCurrency('ARS');
              setExpDueDay('10');
              setExpDesc('');
              setExpPayLink('');
              setShowAddModal(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-1 whitespace-nowrap shadow-sm cursor-pointer"
            id="btn-nuevo-gasto-fijo"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Nuevo Gasto Fijo</span>
          </button>
        </div>
      </div>

      {/* Grupos de Gastos Fijos */}
      <div className="space-y-6" id="groups-container">
        {GROUPS.map(group => {
          const groupExpenses = fixedExpenses.filter(e => {
            const matchesGroup = e.group === group;
            if (!matchesGroup) return false;
            
            const isPaid = e.lastPaidMonth === currentMonthStr;
            if (statusFilter === 'pendientes') return !isPaid;
            if (statusFilter === 'pagados') return isPaid;
            return true;
          });
          
          if (groupExpenses.length === 0) return null;
          const isCollapsed = collapsedGroups[group] === true;

          return (
            <div key={group} className="space-y-3" id={`group-block-${group}`}>
              <div 
                onClick={() => toggleGroup(group)}
                className="flex items-center justify-between pb-1 border-b border-neutral-100 cursor-pointer hover:bg-neutral-50/50 p-1 rounded-xl transition-all select-none"
              >
                <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg border ${groupColors[group]}`}>
                  {groupIcons[group]}
                </div>
                <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">{group}</h4>
                <span className="text-[10px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-bold">
                  {groupExpenses.length}
                </span>
              </div>
              <div className="text-neutral-400">
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </div>
            </div>

            {!isCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupExpenses.map(exp => {
                  const isPaid = exp.lastPaidMonth === currentMonthStr;
                  const isLink = exp.paymentLink?.startsWith('http');
                  
                  // Filter transactions related to this fixed expense
                  const expPayments = (transactions || []).filter(t => 
                    t.tags && t.tags.includes('gasto-fijo') && 
                    (t.description.toLowerCase().includes(exp.name.toLowerCase()) || 
                     (exp.description && t.description.toLowerCase().includes(exp.description.toLowerCase())))
                  );
                  
                  return (
                    <div 
                      key={exp.id}
                      className="flex flex-col bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md"
                      id={`expense-card-container-${exp.id}`}
                    >
                      {/* Card Content Header */}
                      <div 
                        className={`p-4 flex justify-between items-start transition-all ${isPaid ? 'opacity-85' : ''}`}
                        id={`expense-card-${exp.id}`}
                      >
                        <div className="space-y-2 min-w-0 flex-1">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h5 className="text-sm font-bold text-neutral-805 truncate">{exp.name}</h5>
                              <span className="text-[9px] px-1.5 py-0.2 bg-neutral-100 text-neutral-500 rounded font-medium uppercase tracking-wider">
                                {exp.subgroup}
                              </span>
                            </div>
                            {exp.description && (
                              <p className="text-[10.5px] text-neutral-400 mt-0.5 truncate max-w-xs">{exp.description}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-neutral-400 font-bold">
                            <span className="flex items-center space-x-1">
                              <Calendar size={11} className="text-neutral-450" />
                              <span>Vence: Día ${exp.dueDay} (Próximo: ${getNextPaymentDateStr(exp.dueDay, exp.lastPaidMonth)})</span>
                            </span>
                            
                            {/* Mostrar Estado */}
                            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider ${isPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/60' : 'bg-amber-50 text-amber-600 border border-amber-100/60'}`}>
                              {isPaid ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>

                          {/* Enlaces de pago / Alias */}
                          {exp.paymentLink && (
                            <div className="flex items-center space-x-1 pt-1">
                              {isLink ? (
                                <a 
                                  href={exp.paymentLink}
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] text-indigo-500 hover:text-indigo-650 font-black flex items-center space-x-0.5"
                                >
                                  <ExternalLink size={10} />
                                  <span>Página de Pago</span>
                                </a>
                              ) : (
                                <div className="flex items-center space-x-1.5 bg-neutral-50 border border-neutral-150 rounded-lg px-2.5 py-1 text-[9.5px] font-mono text-neutral-500">
                                  <span className="truncate max-w-[120px]">Alias: ${exp.paymentLink}</span>
                                  <button 
                                    onClick={() => handleCopyLinkOrAlias(exp.paymentLink!, exp.id)}
                                    className="text-indigo-500 hover:text-indigo-655 cursor-pointer"
                                    title="Copiar alias"
                                  >
                                    {copiedId === exp.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Montos y Acciones */}
                        <div className="text-right flex flex-col justify-between items-end h-full min-h-[75px] ml-4 flex-shrink-0">
                          <div>
                            <span className="text-sm font-extrabold text-neutral-900 block">
                              {formatNativeBalance(exp.amount, exp.currency)}
                            </span>
                            {exp.currency !== 'ARS' && (
                              <span className="text-[9px] text-neutral-400 font-bold">
                                ≈ {formatCurrency(convertToArs(exp.amount, exp.currency))}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 mt-4">
                            {!isPaid ? (
                              <button
                                onClick={() => handleOpenPayModal(exp.id)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black transition-colors flex items-center space-x-1 cursor-pointer shadow-xs"
                              >
                                <CreditCard size={10} />
                                <span>Pagar</span>
                              </button>
                            ) : (
                              <div className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg" title="Servicio pagado este mes">
                                <CheckCircle2 size={13} className="stroke-[2.5]" />
                              </div>
                            )}

                            <button 
                              onClick={() => handleStartEdit(exp)}
                              className="p-1.5 text-neutral-455 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar gasto"
                            >
                              <Edit2 size={13} />
                            </button>

                            <button 
                              onClick={() => {
                                if (confirm(`¿Estás seguro de eliminar el gasto fijo "${exp.name}"?`)) {
                                  onDeleteFixedExpense(exp.id);
                                }
                              }}
                              className="p-1.5 text-neutral-455 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar gasto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom / Collapsible History Toggle */}
                      <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/30 flex justify-between items-center text-[9.5px] font-bold text-neutral-400">
                        <button 
                          type="button"
                          onClick={() => setExpandedExpenseId(expandedExpenseId === exp.id ? null : exp.id)}
                          className="hover:text-indigo-655 flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <Clock size={9.5} className="text-neutral-400" />
                          <span>Historial de Pagos (${expPayments.length})</span>
                          <ChevronDown size={8} className={`transform transition-transform duration-200 ${expandedExpenseId === exp.id ? 'rotate-180 text-indigo-500' : ''}`} />
                        </button>
                        <span>
                          Último pago: {exp.lastPaidMonth ? `${monthNames[parseInt(exp.lastPaidMonth.split('-')[1], 10) - 1]} &nbsp;${exp.lastPaidMonth.split('-')[0]}` : 'Ninguno'}
                        </span>
                      </div>

                      {/* Collapsible History Logs list */}
                      <AnimatePresence>
                        {expandedExpenseId === exp.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="bg-neutral-50/50 border-t border-neutral-100 p-4 space-y-2 text-xs overflow-hidden"
                          >
                            <h6 className="text-[9px] font-black uppercase tracking-wider text-neutral-450 flex items-center space-x-1.5">
                              <Repeat size={9.5} className="text-neutral-400" />
                              <span>Pagos Registrados para ${exp.name}</span>
                            </h6>
                            
                            <div className="divide-y divide-neutral-150/40 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
                              {expPayments.map(p => (
                                <div key={p.id} className="py-2 flex justify-between items-center text-[10.5px]">
                                  <div className="space-y-0.5">
                                    <span className="font-extrabold text-neutral-808 block">
                                      {p.description.replace(`Pago: ${exp.name} `, '').replace(/\s*\[Periodo: \d{4}-\d{2}\]/, '').trim()}
                                    </span>
                                    <span className="text-[9px] font-semibold text-neutral-400 block uppercase">
                                      {p.date.split('-').reverse().join('/')} • Desde: {p.originAccount}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2.5">
                                    <span className="font-black text-rose-600">-{formatNativeBalance(p.amount, exp.currency)}</span>
                                    <button
                                      onClick={() => {
                                        if (confirm(`¿Estás seguro de eliminar este pago del historial?\nSe reembolsará el saldo a la cuenta de origen.`)) {
                                          onDeleteTransaction(p.id);
                                        }
                                      }}
                                      className="p-1 hover:bg-neutral-200/60 text-neutral-300 hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                                      title="Eliminar este pago del historial"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              
                              {expPayments.length === 0 && (
                                <p className="text-center py-4 text-neutral-400 italic text-[10px]">No hay transacciones registradas para este servicio.</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          );
        })}

        {fixedExpenses.length === 0 && (
          <div className="bg-white rounded-3xl border border-neutral-100 p-12 text-center text-neutral-400 space-y-3 shadow-xs">
            <Repeat className="mx-auto text-neutral-300 animate-spin" style={{ animationDuration: '4s' }} size={40} />
            <div className="space-y-1">
              <p className="text-sm font-bold text-neutral-700">Sin Gastos Fijos Registrados</p>
              <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                Agrega tus suscripciones mensuales (Netflix, Adobe, Antigravity) o tus pagos fijos (Alquiler, expensas) para controlarlos de forma automática.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal para Confirmar Registro de Pago */}
      <AnimatePresence>
        {payingExpenseId && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-neutral-100 mb-4">
                <h3 className="text-base font-bold text-neutral-900">Registrar Pago de Gasto Fijo</h3>
                <button 
                  onClick={() => setPayingExpenseId(null)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full cursor-pointer"
                >
                  <X size={18} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleConfirmPayment} className="space-y-4">
                <div className="p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-start space-x-2 text-xs text-neutral-600">
                  <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p>
                    {onlyMarkAsPaid 
                      ? 'Se marcará el servicio como pagado para este mes (avanzando su vencimiento), pero NO se creará ningún gasto en tu contabilidad.'
                      : 'Al confirmar, se registrará un gasto en tu contabilidad. El saldo de la cuenta elegida disminuirá y el estado del servicio pasará a pagado.'
                    }
                  </p>
                </div>

                {/* Checkbox Pagado de antemano / Sin debito contable */}
                <div className="flex items-start space-x-2.5 p-1">
                  <input
                    type="checkbox"
                    id="only-mark-paid"
                    checked={onlyMarkAsPaid}
                    onChange={e => setOnlyMarkAsPaid(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                  />
                  <label htmlFor="only-mark-paid" className="text-xs font-bold text-neutral-600 cursor-pointer select-none">
                    Solo marcar como pagado (de antemano / ya pagado)
                    <span className="block text-[10px] text-neutral-400 font-medium mt-0.5">
                      No se registrará débito contable ni se descontará de ninguna cuenta.
                    </span>
                  </label>
                </div>

                {!onlyMarkAsPaid && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Seleccionar cuenta de origen</label>
                    <select
                      required={!onlyMarkAsPaid}
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatNativeBalance(acc.currentBalance, acc.currency)})
                        </option>
                      ))}
                      {accounts.length === 0 && (
                        <option value="">Crea una cuenta bancaria antes de pagar</option>
                      )}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!onlyMarkAsPaid && accounts.length === 0}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-200 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                >
                  <Check size={14} />
                  <span>{onlyMarkAsPaid ? 'Confirmar Pago de Antemano (Sin Débito)' : 'Confirmar Registro de Gasto'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Crear Gasto Fijo */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center pb-3 border-b border-neutral-100 mb-5">
                <h3 className="text-base font-bold text-neutral-900">{editingExpense ? 'Editar Gasto Fijo' : 'Agregar Gasto Fijo Mensual'}</h3>
                <button 
                  onClick={() => { setShowAddModal(false); setEditingExpense(null); }}
                  className="p-1.5 hover:bg-neutral-100 rounded-full cursor-pointer"
                >
                  <X size={18} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleSubmitExpense} className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre del servicio / gasto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Adobe Creative Cloud, Alquiler"
                    value={expName}
                    onChange={e => setExpName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Grupo y Subgrupo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Grupo principal</label>
                    <select
                      value={expGroup}
                      onChange={e => setExpGroup(e.target.value as any)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    >
                      {GROUPS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Subgrupo / Categoría</label>
                    <input
                      type="text"
                      placeholder="Ej. Software, Vivienda"
                      value={expSubgroup}
                      onChange={e => setExpSubgroup(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Monto y Moneda */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Monto mensual</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={expAmount}
                      onChange={e => setExpAmount(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Divisa</label>
                    <select
                      value={expCurrency}
                      onChange={e => setExpCurrency(e.target.value as any)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                      <option value="USDT">USDT</option>
                      <option value="BTC">BTC</option>
                    </select>
                  </div>
                </div>

                {/* Vencimiento */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Día de vencimiento (1 al 31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={expDueDay}
                    onChange={e => setExpDueDay(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Notas / Descripción */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Descripción (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Notas adicionales..."
                    value={expDesc}
                    onChange={e => setExpDesc(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Enlace o alias de pago */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Enlace de Pago o Alias CBU/CVU (Opcional)</label>
                  <input
                    type="text"
                    placeholder="https://... o alias.mercado.pago"
                    value={expPayLink}
                    onChange={e => setExpPayLink(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-base transition-all mt-6 cursor-pointer"
                >
                  Registrar Servicio Fijo
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sección Historial de Pagos de Gastos Fijos */}
      <div className="bg-white rounded-3xl border border-neutral-100 p-6 shadow-xs space-y-4" id="fixed-expenses-history">
        <div className="flex items-center space-x-2">
          <Repeat size={15} className="text-neutral-500" />
          <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Historial de Pagos de Gastos Fijos</h3>
        </div>
        
        <div className="divide-y divide-neutral-50 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
          {historyPayments.map(pay => (
            <div key={pay.id} className="py-3 flex justify-between items-center text-xs" id={`history-item-${pay.id}`}>
              <div>
                <p className="font-bold text-neutral-850">{pay.description}</p>
                <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                  Débito de {pay.originAccount} el {pay.date}
                </p>
              </div>
              <div className="flex items-center space-x-4 ml-4">
                <span className="font-extrabold text-rose-500">-{formatCurrency(pay.amount)}</span>
                <button
                  onClick={() => {
                    if (confirm('¿Estás seguro de revertir este pago del historial? El movimiento contable se eliminará y el saldo se ajustará.')) {
                      onDeleteTransaction(pay.id);
                    }
                  }}
                  className="p-1 text-neutral-350 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Eliminar pago de contabilidad"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          {historyPayments.length === 0 && (
            <p className="text-center text-xs text-neutral-400 italic py-4">No hay pagos registrados aún en el historial.</p>
          )}
        </div>
      </div>
    </div>
  );
}
