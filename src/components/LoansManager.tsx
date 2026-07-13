/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Calendar, Check, X, HandCoins, ArrowUpRight, ArrowDownLeft, Trash2, 
  ChevronDown, ChevronUp, Clock, AlertCircle, Sparkles, User, Info, DollarSign, Wallet
} from 'lucide-react';
import { Loan, Account, ExchangeRates } from '../types';

interface LoansManagerProps {
  loans: Loan[];
  accounts: Account[];
  exchangeRates: ExchangeRates;
  onAddLoan: (loan: Omit<Loan, 'id' | 'status' | 'payments'>) => void;
  onDeleteLoan: (id: string) => void;
  onRegisterRepayment: (loanId: string, amount: number, accountId: string, date: string) => void;
}

export function LoansManager({
  loans,
  accounts,
  exchangeRates,
  onAddLoan,
  onDeleteLoan,
  onRegisterRepayment,
}: LoansManagerProps) {
  // Navigation states
  const [filterType, setFilterType] = useState<'todos' | 'prestado' | 'recibido' | 'devuelto'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [activeLoanId, setActiveLoanId] = useState<string | null>(null);

  // Form states - New Loan
  const [loanType, setLoanType] = useState<'prestado' | 'recibido'>('prestado');
  const [loanPerson, setLoanPerson] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanCurrency, setLoanCurrency] = useState<'ARS' | 'USD' | 'USDT' | 'BTC'>('ARS');
  const [loanInterest, setLoanInterest] = useState('');
  const [loanStartDate, setLoanStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanAccountId, setLoanAccountId] = useState('');
  const [loanDesc, setLoanDesc] = useState('');

  // Form states - New Repayment
  const [repayAmount, setRepayAmount] = useState('');
  const [repayAccountId, setRepayAccountId] = useState('');
  const [repayDate, setRepayDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Accordion expanded loans
  const [expandedLoanIds, setExpandedLoanIds] = useState<Record<string, boolean>>({});

  // Helper for currencies conversions
  const convertToARS = (amount: number, currency: string) => {
    if (currency === 'ARS') return amount;
    if (currency === 'USD') return amount * exchangeRates.ARS_USD_BLUE;
    if (currency === 'USDT') return amount * exchangeRates.ARS_USDT;
    if (currency === 'BTC') return amount * exchangeRates.ARS_USD_BLUE * exchangeRates.USD_BTC;
    return amount;
  };

  const formatCurrency = (val: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'USDT' ? 'USD' : currency === 'BTC' ? 'USD' : currency,
      minimumFractionDigits: currency === 'BTC' ? 4 : 0,
      maximumFractionDigits: currency === 'BTC' ? 6 : 0
    }).format(val) + (currency === 'USDT' ? ' USDT' : currency === 'BTC' ? ' BTC' : '');
  };

  const formatARS = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Get unique list of past contacts to autocomplete
  const existingContacts = useMemo(() => {
    const names = loans.map(l => l.person.trim());
    return Array.from(new Set(names)).filter(Boolean);
  }, [loans]);

  // Calculate repaid amount for a loan
  const getLoanRepaidAmount = (loan: Loan) => {
    return loan.payments.reduce((sum, p) => sum + p.amount, 0);
  };

  const getLoanPendingAmount = (loan: Loan) => {
    return Math.max(0, loan.amount - getLoanRepaidAmount(loan));
  };

  // Metrics calculations
  const metrics = useMemo(() => {
    let totalLentARS = 0; // Lo que me deben
    let totalBorrowedARS = 0; // Lo que debo
    
    loans.forEach(loan => {
      const pending = getLoanPendingAmount(loan);
      const pendingARS = convertToARS(pending, loan.currency);
      
      if (loan.type === 'prestado') {
        totalLentARS += pendingARS;
      } else {
        totalBorrowedARS += pendingARS;
      }
    });

    return {
      totalLentARS,
      totalBorrowedARS,
      netBalance: totalLentARS - totalBorrowedARS
    };
  }, [loans, exchangeRates]);

  // Filter and search loans
  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      // Type filtering
      if (filterType === 'prestado' && (loan.type !== 'prestado' || loan.status === 'Devuelto')) return false;
      if (filterType === 'recibido' && (loan.type !== 'recibido' || loan.status === 'Devuelto')) return false;
      if (filterType === 'devuelto' && loan.status !== 'Devuelto') return false;
      if (filterType === 'todos' && loan.status === 'Devuelto' && loans.length > 3) {
        return false;
      }

      // Search query filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = loan.person.toLowerCase().includes(query);
        const matchesDesc = (loan.description || '').toLowerCase().includes(query);
        const matchesAccount = loan.accountName.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesAccount) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [loans, filterType, searchQuery]);

  // Handle open add modal
  const openAddLoan = () => {
    if (accounts.length > 0) {
      setLoanAccountId(accounts[0].id);
    }
    setShowAddModal(true);
  };

  // Form submit - Loan creation
  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanPerson.trim() || !loanAmount || isNaN(Number(loanAmount)) || Number(loanAmount) <= 0) {
      alert('Por favor ingrese un nombre de persona y monto válidos.');
      return;
    }

    const acc = accounts.find(a => a.id === loanAccountId);
    if (!acc) {
      alert('Seleccione una cuenta asociada.');
      return;
    }

    onAddLoan({
      type: loanType,
      person: loanPerson.trim(),
      amount: Number(loanAmount),
      currency: loanCurrency,
      interestRate: loanInterest ? Number(loanInterest) : undefined,
      startDate: loanStartDate,
      dueDate: loanDueDate || undefined,
      accountId: loanAccountId,
      accountName: acc.name,
      description: loanDesc.trim() || undefined,
    });

    // Reset Form
    setLoanPerson('');
    setLoanAmount('');
    setLoanInterest('');
    setLoanDesc('');
    setLoanDueDate('');
    setShowAddModal(false);
  };

  // Open repayment modal
  const openRepaymentModal = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;
    
    setActiveLoanId(loanId);
    setRepayAmount(getLoanPendingAmount(loan).toString());
    setRepayAccountId(loan.accountId);
    setShowRepaymentModal(true);
  };

  // Form submit - Repayment
  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoanId || !repayAmount || isNaN(Number(repayAmount)) || Number(repayAmount) <= 0) {
      alert('Ingrese un monto válido.');
      return;
    }

    const loan = loans.find(l => l.id === activeLoanId);
    if (!loan) return;

    const acc = accounts.find(a => a.id === repayAccountId);
    if (!acc) return;

    // Repayment contable validations
    if (loan.type === 'recibido') {
      // I am paying back a loan -> account balance must support the debt payment
      if (acc.currentBalance < Number(repayAmount)) {
        alert(`Fondos insuficientes en ${acc.name}. Balance actual: ${formatCurrency(acc.currentBalance, acc.currency)}`);
        return;
      }
    }

    onRegisterRepayment(activeLoanId, Number(repayAmount), repayAccountId, repayDate);
    
    setActiveLoanId(null);
    setRepayAmount('');
    setShowRepaymentModal(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedLoanIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isOverdue = (loan: Loan) => {
    if (loan.status === 'Devuelto' || !loan.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return loan.dueDate < today;
  };

  return (
    <div className="space-y-6" id="loans-container">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Préstamos & Deudas</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Controla tu dinero prestado y recibido con liquidación contable de cuentas.</p>
        </div>
        <button 
          onClick={openAddLoan}
          className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
        >
          <Plus size={14} className="stroke-[3]" />
          <span>Registrar Préstamo</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Credits Card (Others owe me) */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Crédito a Favor (Me deben)</span>
            <h4 className="text-xl font-black text-emerald-600">{formatARS(metrics.totalLentARS)}</h4>
            <p className="text-[9px] font-semibold text-neutral-400">Total a recuperar consolidado</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ArrowUpRight size={24} />
          </div>
        </div>

        {/* Debts Card (I owe others) */}
        <div className="bg-white rounded-3xl p-5 border border-neutral-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Deuda Pendiente (Debo)</span>
            <h4 className="text-xl font-black text-rose-600">{formatARS(metrics.totalBorrowedARS)}</h4>
            <p className="text-[9px] font-semibold text-neutral-400">Total a devolver consolidado</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <ArrowDownLeft size={24} />
          </div>
        </div>

        {/* Consolidated Net Balance */}
        <div className={`rounded-3xl p-5 border shadow-xs flex items-center justify-between transition-colors ${metrics.netBalance >= 0 ? 'bg-indigo-950/5 border-indigo-100' : 'bg-rose-950/5 border-rose-100'}`}>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Posición Neta</span>
            <h4 className={`text-xl font-black ${metrics.netBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {formatARS(metrics.netBalance)}
            </h4>
            <p className="text-[9px] font-semibold text-neutral-500">Balance neto de cobros y pagos</p>
          </div>
          <div className={`p-3 rounded-2xl ${metrics.netBalance >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
            <HandCoins size={24} />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3 rounded-2xl border border-neutral-100">
        <div className="flex space-x-1.5 w-full sm:w-auto">
          {(['todos', 'prestado', 'recibido', 'devuelto'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all capitalize cursor-pointer flex-1 sm:flex-none ${filterType === tab ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              {tab === 'todos' ? 'Activos' : tab === 'prestado' ? 'A Favor' : tab === 'recibido' ? 'Por Pagar' : 'Completados'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar persona o cuenta..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full sm:w-64 px-3.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-hidden focus:border-neutral-900 focus:bg-white"
        />
      </div>

      {/* Loans Grid List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredLoans.map(loan => {
          const repaid = getLoanRepaidAmount(loan);
          const pending = getLoanPendingAmount(loan);
          const isLent = loan.type === 'prestado';
          const overdue = isOverdue(loan);
          
          const pctRepaid = loan.amount > 0 ? Math.min(100, Math.round((repaid / loan.amount) * 100)) : 0;
          const isExpanded = !!expandedLoanIds[loan.id];

          return (
            <div key={loan.id} className={`bg-white rounded-3xl p-5 border shadow-xs transition-all hover:border-neutral-200 ${loan.status === 'Devuelto' ? 'opacity-80 border-dashed' : overdue ? 'border-rose-350 bg-rose-50/10' : 'border-neutral-150'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Profile and Persona */}
                <div className="flex items-center space-x-3.5 min-w-[200px]">
                  <div className={`p-3 rounded-2xl ${loan.status === 'Devuelto' ? 'bg-neutral-100 text-neutral-500' : isLent ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    <User size={20} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-black text-neutral-800">{loan.person}</h4>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-sm tracking-wider ${isLent ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isLent ? 'A Favor' : 'Debo'}
                      </span>
                      {overdue && (
                        <span className="bg-rose-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm flex items-center space-x-0.5">
                          <AlertCircle size={9} />
                          <span>Vencido</span>
                        </span>
                      )}
                      {loan.status === 'Devuelto' && (
                        <span className="bg-neutral-200 text-neutral-600 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                          Saldado
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 font-medium flex items-center mt-1">
                      <Clock size={11} className="mr-1" />
                      Inicio: {loan.startDate} {loan.dueDate ? `| Vence: ${loan.dueDate}` : ''}
                    </span>
                  </div>
                </div>

                {/* Amounts display */}
                <div className="grid grid-cols-2 gap-4 md:text-right min-w-[220px]">
                  <div>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Monto Original</span>
                    <span className="text-sm font-black text-neutral-800">{formatCurrency(loan.amount, loan.currency)}</span>
                    {loan.currency !== 'ARS' && (
                      <span className="text-[9px] font-bold text-neutral-400 block mt-0.5">
                        ≈ {formatARS(convertToARS(loan.amount, loan.currency))}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Saldo Pendiente</span>
                    <span className={`text-sm font-black ${loan.status === 'Devuelto' ? 'text-neutral-500' : isLent ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(pending, loan.currency)}
                    </span>
                    {loan.currency !== 'ARS' && (
                      <span className="text-[9px] font-bold text-neutral-400 block mt-0.5">
                        ≈ {formatARS(convertToARS(pending, loan.currency))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Main repayments progress */}
                <div className="flex-1 max-w-xs space-y-1.5">
                  <div className="flex justify-between text-[10px] font-black text-neutral-400">
                    <span>Reembolso</span>
                    <span>{pctRepaid}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${loan.status === 'Devuelto' ? 'bg-neutral-400' : isLent ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${pctRepaid}%` }} 
                    />
                  </div>
                  <span className="text-[9px] text-neutral-400 font-bold block text-right">
                    Devuelto: {formatCurrency(repaid, loan.currency)}
                  </span>
                </div>

                {/* CTA Actions */}
                <div className="flex items-center space-x-2 self-end md:self-center">
                  <button
                    onClick={() => toggleExpand(loan.id)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
                    title="Ver detalle de devoluciones"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {loan.status !== 'Devuelto' && (
                    <button
                      onClick={() => openRepaymentModal(loan.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer ${isLent ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'}`}
                    >
                      <HandCoins size={12} />
                      <span>{isLent ? 'Cobrar' : 'Pagar'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar este préstamo contable? Los balances de tus cuentas no serán revertidos, pero se borrará la deuda.`)) {
                        onDeleteLoan(loan.id);
                      }
                    }}
                    className="p-2 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                    title="Eliminar registro"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Collapsed breakdown repayments details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-neutral-100 mt-4 pt-4 space-y-3"
                  >
                    <div className="bg-neutral-50/50 p-4 rounded-2xl border border-neutral-100 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500">
                        <span>DETALLE E INTERESES</span>
                        <span>CUENTA ORIGINAL: {loan.accountName}</span>
                      </div>
                      <p className="text-xs text-neutral-600 font-medium">
                        {loan.description || 'Sin descripción adicional cargada.'}
                      </p>
                      {loan.interestRate && (
                        <span className="inline-block text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-sm">
                          Tasa de interés fija: {loan.interestRate}%
                        </span>
                      )}
                    </div>

                    {/* Abonos list */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-neutral-400 block tracking-wider uppercase">Historial de Transacciones de Reembolso</span>
                      {loan.payments.length === 0 ? (
                        <p className="text-[10px] text-neutral-400 italic">No se han realizado abonos o devoluciones parciales todavía.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-1.5">
                          {loan.payments.map(p => (
                            <div key={p.id} className="bg-white p-3 rounded-xl border border-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-700 shadow-2xs">
                              <span className="flex items-center space-x-1">
                                <Calendar size={12} className="text-neutral-400" />
                                <span>{p.date}</span>
                              </span>
                              <span>Cuenta: {p.accountName}</span>
                              <span className={`font-black ${isLent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                + {formatCurrency(p.amount, loan.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredLoans.length === 0 && (
          <div className="bg-white rounded-3xl p-12 border border-neutral-100 text-center text-neutral-400 space-y-2">
            <HandCoins className="mx-auto text-neutral-300" size={38} />
            <p className="text-sm font-semibold">No se encontraron préstamos activos en este filtro.</p>
          </div>
        )}
      </div>

      {/* Modal - Registrar Préstamo */}
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
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-5">
                <h3 className="text-lg font-bold text-neutral-900">Registrar Préstamo</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleLoanSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Tipo de Préstamo */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Acción Financiera</label>
                  <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setLoanType('prestado')}
                      className={`py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${loanType === 'prestado' ? 'bg-white text-emerald-600 shadow-sm' : 'text-neutral-500'}`}
                    >
                      Prestar Dinero (A Favor)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanType('recibido')}
                      className={`py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${loanType === 'recibido' ? 'bg-white text-rose-600 shadow-sm' : 'text-neutral-500'}`}
                    >
                      Pedir Prestado (Debo)
                    </button>
                  </div>
                </div>

                {/* Persona */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre de la Persona</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pedro, Mamá, Banco Galicia"
                    value={loanPerson}
                    onChange={e => setLoanPerson(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                  {/* Contacts Autocomplete Suggestion */}
                  {loanPerson.trim() && existingContacts.filter(c => c.toLowerCase().includes(loanPerson.toLowerCase()) && c.toLowerCase() !== loanPerson.toLowerCase()).length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-neutral-200 rounded-2xl mt-1 shadow-lg max-h-32 overflow-y-auto p-1.5 space-y-0.5">
                      {existingContacts
                        .filter(c => c.toLowerCase().includes(loanPerson.toLowerCase()))
                        .map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setLoanPerson(name)}
                            className="w-full text-left p-2 hover:bg-neutral-50 rounded-xl text-[11px] font-semibold text-neutral-700"
                          >
                            {name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Monto & Divisa */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Monto</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={loanAmount}
                      onChange={e => setLoanAmount(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Divisa</label>
                    <select
                      value={loanCurrency}
                      onChange={e => setLoanCurrency(e.target.value as any)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-905 focus:bg-white cursor-pointer font-bold"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                      <option value="USDT">USDT</option>
                      <option value="BTC">BTC</option>
                    </select>
                  </div>
                </div>

                {/* Cuenta de Origen/Destino */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    {loanType === 'prestado' ? 'Cuenta de donde sale el dinero' : 'Cuenta donde entra el dinero'}
                  </label>
                  <select
                    value={loanAccountId}
                    onChange={e => setLoanAccountId(e.target.value)}
                    required
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white cursor-pointer"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha Inicio</label>
                    <input
                      type="date"
                      required
                      value={loanStartDate}
                      onChange={e => setLoanStartDate(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha Vencimiento (Opcional)</label>
                    <input
                      type="date"
                      value={loanDueDate}
                      onChange={e => setLoanDueDate(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Interés Fijo (%) */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Tasa de Interés (%) - Opcional</label>
                  <input
                    type="number"
                    placeholder="Ej. 10% (Tasa fija calculada)"
                    value={loanInterest}
                    onChange={e => setLoanInterest(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Descripción o Notas</label>
                  <textarea
                    placeholder="Añade notas breves sobre el préstamo..."
                    value={loanDesc}
                    onChange={e => setLoanDesc(e.target.value)}
                    rows={2}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-sm transition-all mt-4 cursor-pointer"
                >
                  Confirmar Préstamo Contable
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Registrar Devolución/Repay */}
      <AnimatePresence>
        {showRepaymentModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Registrar Pago / Abono</h3>
                  <span className="text-[10px] font-semibold text-neutral-400">
                    Abono para {loans.find(l => l.id === activeLoanId)?.person}
                  </span>
                </div>
                <button 
                  onClick={() => setShowRepaymentModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleRepaymentSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Monto del Abono */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    Monto de Devolución ({loans.find(l => l.id === activeLoanId)?.currency})
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={repayAmount}
                    onChange={e => setRepayAmount(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Cuenta de Destino/Origen */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                    {loans.find(l => l.id === activeLoanId)?.type === 'prestado' 
                      ? 'Cuenta donde ingresa el dinero devuelto' 
                      : 'Cuenta de donde sale el dinero para pagar'}
                  </label>
                  <select
                    value={repayAccountId}
                    onChange={e => setRepayAccountId(e.target.value)}
                    required
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white cursor-pointer"
                  >
                    {accounts
                      .filter(acc => loans.find(l => l.id === activeLoanId)?.currency === acc.currency)
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.currentBalance, acc.currency)})
                        </option>
                      ))}
                    {accounts.filter(acc => loans.find(l => l.id === activeLoanId)?.currency === acc.currency).length === 0 && (
                      <option value="">-- No hay cuentas en esta divisa --</option>
                    )}
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha de Transacción</label>
                  <input
                    type="date"
                    required
                    value={repayDate}
                    onChange={e => setRepayDate(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-xs transition-all mt-4 cursor-pointer"
                >
                  Registrar Abono y Generar Movimiento
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
