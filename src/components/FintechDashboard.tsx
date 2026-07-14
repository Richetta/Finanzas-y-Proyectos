/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Wallet, CreditCard, 
  Coins, Trash2, Edit2, X, ChevronRight, Check, AlertTriangle, Calendar, Info,
  FileText, Camera, RefreshCw
} from 'lucide-react';
import { Account, Transaction, Category, ExchangeRates } from '../types';

interface FintechDashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (t: Transaction) => void;
  onAddAccount: (acc: Omit<Account, 'id' | 'currentBalance' | 'currency'> & { currency: 'ARS' | 'USD' | 'USDT' | 'BTC' }) => void;
  onEditAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
  exchangeRates: ExchangeRates;
  onOpenScanner?: () => void;
}

export function FintechDashboard({
  accounts,
  transactions,
  categories,
  onAddTransaction,
  onDeleteTransaction,
  onEditTransaction,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  exchangeRates,
  onOpenScanner,
}: FintechDashboardProps) {
  // UI states
  const [activeTab, setActiveTab] = useState<'movimientos' | 'cuentas'>('movimientos');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleStartEditTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxType(tx.type);
    setTxAmount(String(tx.amount));
    setTxOriginAccount(tx.originAccount);
    setTxDestAccount(tx.destinationAccount || '');
    setTxCategory(tx.category || 'Otros');
    setTxDescription(tx.description || '');
    setTxTags(tx.tags ? tx.tags.join(', ') : '');
    setTxDate(tx.date);
    setShowAddTxModal(true);
  };
  const [expandedTxIds, setExpandedTxIds] = useState<Record<string, boolean>>({});

  // Form states for new transaction
  const [txType, setTxType] = useState<'Ingreso' | 'Gasto' | 'Transferencia'>('Gasto');
  const [txAmount, setTxAmount] = useState('');
  const [txOriginAccount, setTxOriginAccount] = useState('');
  const [txDestAccount, setTxDestAccount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txTags, setTxTags] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Form states for Account
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<'Billetera Digital' | 'Banco' | 'Efectivo' | 'Cripto' | 'Inversión' | 'Otro'>('Billetera Digital');
  const [accInitialBalance, setAccInitialBalance] = useState('');
  const [accCurrency, setAccCurrency] = useState<'ARS' | 'USD' | 'USDT' | 'BTC'>('ARS');
  const [accCurrentBalance, setAccCurrentBalance] = useState('');

  // Currency Conversion States
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertOriginAccount, setConvertOriginAccount] = useState('');
  const [convertAmount, setConvertAmount] = useState('');
  const [convertRate, setConvertRate] = useState('');
  const [convertDestAccount, setConvertDestAccount] = useState('');

  // Conversion helper: returns value in ARS
  const convertToArs = (amount: number, currency: 'ARS' | 'USD' | 'USDT' | 'BTC') => {
    const cur = currency || 'ARS';
    if (cur === 'ARS') return amount;
    if (cur === 'USDT') return amount * (exchangeRates.ARS_USDT || 1240);
    if (cur === 'USD') return amount * (exchangeRates.ARS_USD_BLUE || 1220);
    if (cur === 'BTC') return amount * (exchangeRates.USD_BTC || 62000) * (exchangeRates.ARS_USD_BLUE || 1220);
    return amount;
  };


  // Open Currency Conversion Modal
  const openConvertModalWithPreset = (accName: string) => {
    const acc = accounts.find(a => a.name === accName);
    if (!acc) return;
    
    setConvertOriginAccount(acc.name);
    setConvertAmount('');
    
    // Autofill rate based on exchangeRates
    if (acc.currency === 'USD') setConvertRate(String(exchangeRates.ARS_USD_BLUE || 1220));
    else if (acc.currency === 'USDT') setConvertRate(String(exchangeRates.ARS_USDT || 1240));
    else if (acc.currency === 'BTC') setConvertRate(String((exchangeRates.USD_BTC || 62000) * (exchangeRates.ARS_USD_BLUE || 1220)));
    else setConvertRate('1');

    // Default destination account to the first ARS account
    const arsAcc = accounts.find(a => a.currency === 'ARS');
    if (arsAcc) {
      setConvertDestAccount(arsAcc.name);
    } else {
      setConvertDestAccount('');
    }
    
    setShowConvertModal(true);
  };

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const originAcc = accounts.find(a => a.name === convertOriginAccount);
    const destAcc = accounts.find(a => a.name === convertDestAccount);
    const amountToConvert = Number(convertAmount) || 0;
    const rate = Number(convertRate) || 1;

    if (!originAcc || !destAcc || amountToConvert <= 0 || rate <= 0) {
      alert('Por favor complete todos los campos con valores válidos.');
      return;
    }

    if (amountToConvert > originAcc.currentBalance) {
      alert(`Saldo insuficiente en ${originAcc.name}. Saldo disponible: ${formatAccountBalance(originAcc.currentBalance, originAcc.currency)}`);
      return;
    }

    const resultingArs = amountToConvert * rate;

    // Post Gasto and Ingreso transactions atomically in a single batch
    onAddTransactionsBatch([
      {
        date: new Date().toISOString().split('T')[0],
        type: 'Gasto',
        originAccount: originAcc.name,
        category: 'Otros',
        amount: amountToConvert,
        description: `Conversión: Venta de ${amountToConvert} ${originAcc.currency} a Pesos`,
        tags: ['conversión', `${originAcc.currency.toLowerCase()}-a-ars`]
      },
      {
        date: new Date().toISOString().split('T')[0],
        type: 'Ingreso',
        originAccount: destAcc.name,
        category: 'Otros',
        amount: resultingArs,
        description: `Conversión: Ingreso de pesos desde ${originAcc.name}`,
        tags: ['conversión', `${originAcc.currency.toLowerCase()}-a-ars`]
      }
    ]);

    setShowConvertModal(false);
  };

  // Calculations
  const patrimonioTotal = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + convertToArs(acc.currentBalance, acc.currency), 0);
  }, [accounts, exchangeRates]);

  const disponibleTotal = useMemo(() => {
    // El usuario considera todas sus cuentas (incluyendo cripto/inversión/efectivo) como capital disponible hoy.
    return accounts.reduce((sum, acc) => sum + convertToArs(acc.currentBalance, acc.currency), 0);
  }, [accounts, exchangeRates]);

  const statsMensual = useMemo(() => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = String(now.getFullYear());
    
    let ingresos = 0;
    let gastos = 0;

    transactions.forEach(t => {
      if (!t.date.startsWith(`${currentYear}-${currentMonth}`)) return;
      
      if (t.type === 'Ingreso') {
        ingresos += t.amount;
      } else if (t.type === 'Gasto') {
        gastos += t.amount;
      }
    });

    return {
      ingresos,
      gastos,
      balance: ingresos - gastos
    };
  }, [transactions]);

  // Handle transaction submit
  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) {
      alert('Por favor ingrese un monto válido.');
      return;
    }
    if (!txOriginAccount) {
      alert('Seleccione una cuenta de origen.');
      return;
    }
    if (txType === 'Transferencia' && !txDestAccount) {
      alert('Seleccione una cuenta de destino.');
      return;
    }
    if (txType === 'Transferencia' && txOriginAccount === txDestAccount) {
      alert('La cuenta origen y destino deben ser diferentes.');
      return;
    }

    if (editingTransaction) {
      onEditTransaction({
        ...editingTransaction,
        date: txDate,
        type: txType,
        originAccount: txOriginAccount,
        destinationAccount: txType === 'Transferencia' ? txDestAccount : undefined,
        category: txType === 'Transferencia' ? 'Inversiones' : txCategory || 'Otros',
        amount: Number(txAmount),
        description: txDescription || (txType === 'Transferencia' ? 'Transferencia entre cuentas' : ''),
        tags: txTags ? txTags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      });
      setEditingTransaction(null);
    } else {
      onAddTransaction({
        date: txDate,
        type: txType,
        originAccount: txOriginAccount,
        destinationAccount: txType === 'Transferencia' ? txDestAccount : undefined,
        category: txType === 'Transferencia' ? 'Inversiones' : txCategory || 'Otros',
        amount: Number(txAmount),
        description: txDescription || (txType === 'Transferencia' ? 'Transferencia entre cuentas' : ''),
        tags: txTags ? txTags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      });
    }

    // Reset and close
    setTxAmount('');
    setTxDescription('');
    setTxTags('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setShowAddTxModal(false);
  };

  // Handle account submit
  const handleAccountSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!accName.trim()) {
        alert('Ingrese un nombre de cuenta.');
        return;
      }

      if (editingAccount) {
        const currentVal = Number(accCurrentBalance) || 0;
        const diff = currentVal - editingAccount.currentBalance;
        const computedInitial = editingAccount.initialBalance + diff;

        onEditAccount({
          ...editingAccount,
          name: accName,
          type: accType,
          initialBalance: computedInitial,
          currency: accCurrency
        });
      } else {
      onAddAccount({
        name: accName,
        type: accType,
        initialBalance: Number(accInitialBalance) || 0,
        currency: accCurrency
      });
    }

    // Reset and close
    setAccName('');
    setAccInitialBalance('');
    setAccCurrency('ARS');
    setEditingAccount(null);
    setShowAccountModal(false);
  };

  // Open edit account modal
  const openEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccInitialBalance(String(acc.initialBalance));
    setAccCurrency(acc.currency || 'ARS');
    setAccCurrentBalance(String(acc.currentBalance));
    setShowAccountModal(true);
  };

  // Open add transaction modal with preset type or account
  const openAddTx = (type: 'Ingreso' | 'Gasto' | 'Transferencia', accountName?: string) => {
    setTxType(type);
    if (accountName) {
      setTxOriginAccount(accountName);
    } else if (accounts.length > 0) {
      setTxOriginAccount(accounts[0].name);
    }
    
    // Choose first matching category
    const matchingCats = categories.filter(c => c.type === type || c.type === 'Ambos');
    if (matchingCats.length > 0) {
      setTxCategory(matchingCats[0].name);
    } else {
      setTxCategory('Otros');
    }

    if (type === 'Transferencia' && accounts.length > 1) {
      const other = accounts.find(a => a.name !== (accountName || accounts[0].name));
      setTxDestAccount(other ? other.name : '');
    }

    setShowAddTxModal(true);
  };

  // Filtered transactions for selected account
  const filteredTransactions = useMemo(() => {
    if (!selectedAccount) return transactions;
    return transactions.filter(t => 
      t.originAccount === selectedAccount.name || 
      t.destinationAccount === selectedAccount.name
    );
  }, [transactions, selectedAccount]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatAccountBalance = (val: number, currency: 'ARS' | 'USD' | 'USDT' | 'BTC') => {
    const cur = currency || 'ARS';
    if (cur === 'BTC') {
      return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6
      }).format(val) + ' BTC';
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: cur === 'USDT' ? 'USD' : cur,
      minimumFractionDigits: cur === 'ARS' ? 0 : 2,
      maximumFractionDigits: cur === 'ARS' ? 0 : 2
    }).format(val) + (cur === 'USDT' ? ' USDT' : '');
  };

  const showArsEquivalent = (val: number, currency: 'ARS' | 'USD' | 'USDT' | 'BTC') => {
    const cur = currency || 'ARS';
    if (cur === 'ARS') return null;
    const equivalent = convertToArs(val, cur);
    return (
      <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
        ≈ {formatCurrency(equivalent)}
      </span>
    );
  };

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Ticker de Cotizaciones en Vivo */}
      <div className="bg-white border border-neutral-100 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold shadow-xs" id="exchange-rates-ticker">
        <div className="flex items-center space-x-2 text-neutral-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] uppercase font-black tracking-wider text-neutral-400">Cotizaciones en tiempo real</span>
        </div>
        <div className="flex items-center space-x-6 overflow-x-auto py-0.5 scrollbar-none">
          <div className="flex items-center space-x-1.5 whitespace-nowrap">
            <span className="text-neutral-400">💵 Dólar Blue:</span>
            <span className="text-neutral-800 font-extrabold">${new Intl.NumberFormat('es-AR').format(exchangeRates.ARS_USD_BLUE)} ARS</span>
          </div>
          <div className="flex items-center space-x-1.5 whitespace-nowrap">
            <span className="text-neutral-400">🪙 USDT Crypto:</span>
            <span className="text-neutral-800 font-extrabold">${new Intl.NumberFormat('es-AR').format(exchangeRates.ARS_USDT)} ARS</span>
          </div>
          <div className="flex items-center space-x-1.5 whitespace-nowrap">
            <span className="text-neutral-400">₿ Bitcoin:</span>
            <span className="text-neutral-800 font-extrabold">${new Intl.NumberFormat('es-AR').format(exchangeRates.USD_BTC)} USD</span>
          </div>
        </div>
        <div className="text-[10px] text-neutral-400 font-medium whitespace-nowrap bg-neutral-50 px-2.5 py-1 rounded-xl border border-neutral-100">
          Actualizado: {exchangeRates.lastUpdated || 'Nunca'}
        </div>
      </div>
      {/* Resumen Patrimonial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Principal - Estilo Fintech */}
        <div className="bg-neutral-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl" id="wealth-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div>
              <p className="text-neutral-400 text-sm font-medium tracking-wide">Patrimonio Neto Total</p>
              <h1 className="text-4xl font-bold tracking-tight mt-1">{formatCurrency(patrimonioTotal)}</h1>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
              <div>
                <p className="text-xs text-neutral-400">Saldo Disponible</p>
                <p className="text-lg font-semibold text-emerald-400">{formatCurrency(disponibleTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-400">Cuentas Activas</p>
                <p className="text-lg font-semibold text-neutral-200">{accounts.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Mensual */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between" id="monthly-balance-card">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-500 text-sm font-medium">Resumen Mensual (Julio)</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statsMensual.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {statsMensual.balance >= 0 ? 'Superávit' : 'Déficit'}
              </span>
            </div>
            <div className="text-2xl font-bold text-neutral-800">{formatCurrency(statsMensual.balance)}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-neutral-100">
            <div className="flex items-start space-x-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl mt-0.5">
                <ArrowUpRight size={16} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Ingresos</p>
                <p className="text-sm font-semibold text-neutral-800">{formatCurrency(statsMensual.ingresos)}</p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl mt-0.5">
                <ArrowDownLeft size={16} />
              </div>
              <div>
                <p className="text-xs text-neutral-400">Gastos</p>
                <p className="text-sm font-semibold text-neutral-800">{formatCurrency(statsMensual.gastos)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón de Acción Principal Prominente */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full max-w-3xl mx-auto" id="quick-action-button-container">
        <button 
          onClick={() => openAddTx('Gasto')}
          className="w-full sm:flex-1 py-3.5 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-base flex items-center justify-center space-x-2 shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          id="btn-nuevo-movimiento"
        >
          <Plus size={18} className="stroke-[3]" />
          <span>Registrar Movimiento</span>
        </button>
        {accounts.some(a => a.currency !== 'ARS') && (
          <button 
            type="button"
            onClick={() => {
              const foreignAcc = accounts.find(a => a.currency !== 'ARS');
              if (foreignAcc) openConvertModalWithPreset(foreignAcc.name);
            }}
            className="w-full sm:flex-1 py-3.5 px-6 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl font-bold text-base flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
            id="btn-convertir-moneda"
          >
            <RefreshCw size={18} />
            <span>Convertir Cripto / Divisas</span>
          </button>
        )}
        {onOpenScanner && (
          <button 
            type="button"
            onClick={onOpenScanner}
            className="w-full sm:flex-1 py-3.5 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-base flex items-center justify-center space-x-2 shadow-lg active:scale-[0.98] transition-all cursor-pointer"
            id="btn-escanear-ticket"
          >
            <Camera size={18} />
            <span>Escanear Compra Súper</span>
          </button>
        )}
      </div>

      {/* Tabs Principales */}
      <div className="border-b border-neutral-100" id="tabs-navigation">
        <div className="flex space-x-6">
          <button 
            onClick={() => { setActiveTab('movimientos'); setSelectedAccount(null); }}
            className={`pb-3 text-sm font-semibold relative transition-colors ${activeTab === 'movimientos' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
            id="tab-movimientos"
          >
            Últimos Movimientos
            {activeTab === 'movimientos' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
          </button>
          <button 
            onClick={() => setActiveTab('cuentas')}
            className={`pb-3 text-sm font-semibold relative transition-colors ${activeTab === 'cuentas' ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
            id="tab-cuentas"
          >
            Mis Cuentas ({accounts.length})
            {activeTab === 'cuentas' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
          </button>
        </div>
      </div>

      {/* Contenido de Tabs */}
      {activeTab === 'movimientos' && (
        <div className="space-y-4" id="tab-content-movimientos">
          {/* Selector rápido de cuenta para filtrar */}
          <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none" id="account-filters">
            <button
              onClick={() => setSelectedAccount(null)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${!selectedAccount ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}
              id="filter-all-accounts"
            >
              Todas las cuentas
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccount(acc)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${selectedAccount?.id === acc.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}
                id={`filter-account-${acc.id}`}
              >
                {acc.name}
              </button>
            ))}
          </div>

          {/* Historial detallado de la cuenta seleccionada */}
          {selectedAccount && (
            <div className="bg-neutral-50 border border-neutral-200/60 rounded-2xl p-4 flex justify-between items-center" id="selected-account-details">
              <div>
                <p className="text-xs text-neutral-400 font-medium">Cuenta seleccionada</p>
                <h4 className="text-base font-bold text-neutral-800">{selectedAccount.name}</h4>
                <p className="text-xs text-neutral-500 mt-0.5">Tipo: {selectedAccount.type}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-400">Saldo Actual</p>
                <p className="text-lg font-extrabold text-neutral-900">{formatAccountBalance(selectedAccount.currentBalance, selectedAccount.currency)}</p>
                <div className="flex space-x-2 mt-2 justify-end">
                  {selectedAccount.currency !== 'ARS' && (
                    <button 
                      onClick={() => openConvertModalWithPreset(selectedAccount.name)}
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                      title="Convertir a pesos"
                    >
                      <RefreshCw size={11} className="animate-spin-slow" />
                      <span>Convertir a $</span>
                    </button>
                  )}
                  <button 
                    onClick={() => openEditAccount(selectedAccount)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-white rounded-lg border border-neutral-200/50 transition-all cursor-pointer"
                    title="Editar cuenta"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm(`¿Eliminar la cuenta "${selectedAccount.name}"? Los movimientos asociados permanecerán pero no tendrán cuenta válida.`)) {
                        onDeleteAccount(selectedAccount.id);
                        setSelectedAccount(null);
                      }
                    }}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-100 transition-all cursor-pointer"
                    title="Eliminar cuenta"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Movimientos */}
          <div className="bg-white rounded-3xl border border-neutral-100 divide-y divide-neutral-50 overflow-hidden shadow-sm" id="movements-list">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 space-y-2">
                <Info className="mx-auto text-neutral-300" size={32} />
                <p className="text-sm font-medium">No hay movimientos registrados para esta cuenta.</p>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isGasto = tx.type === 'Gasto';
                const isIngreso = tx.type === 'Ingreso';
                const isTransfer = tx.type === 'Transferencia';
                const txAccount = accounts.find(a => a.id === tx.originAccount || a.name === tx.originAccount);
                const txCurrency = txAccount ? txAccount.currency : 'ARS';
                
                return (
                  <div key={tx.id} className="p-4 hover:bg-neutral-50/50 transition-colors flex flex-col space-y-3" id={`tx-item-${tx.id}`}>
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-2.5 rounded-xl ${isIngreso ? 'bg-emerald-50 text-emerald-600' : isGasto ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                          {isIngreso ? <ArrowUpRight size={18} /> : isGasto ? <ArrowDownLeft size={18} /> : <ArrowLeftRight size={18} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-neutral-800 truncate">{tx.description || tx.category}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-100 text-neutral-500 rounded-full font-semibold">{tx.category}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center space-x-2 truncate">
                            <span>{tx.date}</span>
                            <span>•</span>
                            <span className="flex items-center font-medium">
                              {isTransfer ? `${tx.originAccount} ➔ ${tx.destinationAccount}` : tx.originAccount}
                            </span>
                          </div>
                          {tx.tags && tx.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {tx.tags.map((tag, idx) => (
                                <span key={idx} className="text-[9px] px-1.5 py-0.2 bg-neutral-50 text-neutral-400 rounded border border-neutral-100">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Botón para desglose */}
                          {tx.items && tx.items.length > 0 && (
                            <button 
                              type="button"
                              onClick={() => setExpandedTxIds(prev => ({ ...prev, [tx.id]: !prev[tx.id] }))}
                              className="text-[10.5px] text-emerald-600 hover:text-emerald-700 font-extrabold flex items-center space-x-0.5 mt-1.5 cursor-pointer"
                            >
                              <FileText size={10} />
                              <span>{expandedTxIds[tx.id] ? 'Ocultar Detalle' : `Ver Desglose (${tx.items.length} productos)`}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-3 ml-4">
                        <div>
                          <span className={`text-sm font-extrabold block ${isIngreso ? 'text-emerald-500' : isGasto ? 'text-rose-500' : 'text-blue-500'}`}>
                            {isIngreso ? '+' : isGasto ? '-' : ''}{formatAccountBalance(tx.amount, txCurrency)}
                          </span>
                          {showArsEquivalent(tx.amount, txCurrency)}
                        </div>
                        <button 
                          onClick={() => handleStartEditTx(tx)}
                          className="p-1 text-neutral-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                          title="Editar movimiento"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('¿Estás seguro de eliminar este movimiento? Los saldos se recalcularán automáticamente.')) {
                              onDeleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Eliminar movimiento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Desglose Expandible de Productos */}
                    {expandedTxIds[tx.id] && tx.items && tx.items.length > 0 && (
                      <div className="pl-12 pr-4 py-2 bg-neutral-50/50 rounded-2xl border border-neutral-100/50 space-y-1.5 w-full">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Artículos Comprados</span>
                        <div className="divide-y divide-neutral-100">
                          {tx.items.map((item, idx) => (
                            <div key={item.id || idx} className="py-1.5 flex justify-between items-center text-[11px] text-neutral-600">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="font-extrabold text-neutral-800">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'cuentas' && (
        <div className="space-y-4" id="tab-content-cuentas">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Cuentas creadas</h3>
            <button 
              onClick={() => {
                setEditingAccount(null);
                setAccName('');
                setAccType('Billetera Digital');
                setAccInitialBalance('');
                setShowAccountModal(true);
              }}
              className="text-xs font-bold text-emerald-500 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
              id="btn-nueva-cuenta"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>Nueva Cuenta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="accounts-grid">
            {accounts.map(acc => {
              const iconColor = 
                acc.type === 'Cripto' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                acc.type === 'Billetera Digital' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                acc.type === 'Banco' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                acc.type === 'Efectivo' ? 'bg-green-50 text-green-600 border-green-100' :
                'bg-neutral-50 text-neutral-600 border-neutral-100';

              return (
                <div key={acc.id} className="bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm flex justify-between items-start hover:border-neutral-200 transition-all" id={`account-card-${acc.id}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2.5 rounded-xl border ${iconColor}`}>
                      {acc.type === 'Cripto' ? <Coins size={18} /> : acc.type === 'Banco' ? <CreditCard size={18} /> : <Wallet size={18} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-neutral-800">{acc.name}</h4>
                      <p className="text-[10px] px-1.5 py-0.5 bg-neutral-50 text-neutral-400 rounded-full font-medium inline-block mt-1">{acc.type}</p>
                      <p className="text-[10px] text-neutral-400 mt-2">Saldo inicial: {formatAccountBalance(acc.initialBalance, acc.currency)}</p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col justify-between h-full min-h-[70px]">
                    <div>
                      <span className="text-base font-extrabold text-neutral-900 block">{formatAccountBalance(acc.currentBalance, acc.currency)}</span>
                      {showArsEquivalent(acc.currentBalance, acc.currency)}
                    </div>
                    <div className="flex space-x-1 justify-end mt-4">
                      <button 
                        onClick={() => openEditAccount(acc)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 rounded-lg transition-all cursor-pointer"
                        title="Editar cuenta"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar "${acc.name}"? Los movimientos asociados permanecerán.`)) {
                            onDeleteAccount(acc.id);
                          }
                        }}
                        className="p-1.5 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Eliminar cuenta"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal / Bottom Sheet para Nueva Transacción */}
      <AnimatePresence>
        {showAddTxModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4" id="modal-tx-backdrop">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] sm:max-h-[85vh] border-t border-neutral-100"
              id="modal-tx-content"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-6">
                <h3 className="text-lg font-bold text-neutral-900">{editingTransaction ? 'Editar Movimiento' : 'Registrar Movimiento'}</h3>
                <button 
                  onClick={() => {
                    setShowAddTxModal(false);
                    setEditingTransaction(null);
                    setTxAmount('');
                    setTxDescription('');
                    setTxTags('');
                    setTxDate(new Date().toISOString().split('T')[0]);
                  }}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              {/* Selector de Tipo (Ingreso, Gasto, Transferencia) */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-neutral-100 rounded-2xl mb-6">
                {(['Gasto', 'Ingreso', 'Transferencia'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setTxType(type);
                      // Update default category
                      const firstCat = categories.find(c => c.type === type || c.type === 'Ambos');
                      setTxCategory(firstCat ? firstCat.name : 'Otros');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all ${txType === type ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <form onSubmit={handleTxSubmit} className="space-y-4">
                {/* Monto */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Monto ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-neutral-400">$</span>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-2xl font-extrabold text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white transition-all"
                      id="input-tx-amount"
                    />
                  </div>
                </div>

                {/* Cuenta Origen / Destino */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                      {txType === 'Transferencia' ? 'Cuenta Origen' : 'Cuenta'}
                    </label>
                    <select
                      value={txOriginAccount}
                      onChange={e => setTxOriginAccount(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                      id="select-tx-origin"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.name}>{acc.name} ({formatCurrency(acc.currentBalance)})</option>
                      ))}
                    </select>
                  </div>

                  {txType === 'Transferencia' && (
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Cuenta Destino</label>
                      <select
                        value={txDestAccount}
                        onChange={e => setTxDestAccount(e.target.value)}
                        className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                        id="select-tx-dest"
                      >
                        <option value="">-- Seleccionar --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.name}>{acc.name} ({formatCurrency(acc.currentBalance)})</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Categoría (Ocultar para Transferencia) */}
                {txType !== 'Transferencia' && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Categoría</label>
                    <select
                      value={txCategory}
                      onChange={e => setTxCategory(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                      id="select-tx-category"
                    >
                      {categories
                        .filter(c => c.type === txType || c.type === 'Ambos')
                        .map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Fecha */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    id="input-tx-date"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Descripción / Detalle</label>
                  <input
                    type="text"
                    placeholder="Ej. Compras en Coto, Pago de expensas"
                    value={txDescription}
                    onChange={e => setTxDescription(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    id="input-tx-desc"
                  />
                </div>

                {/* Etiquetas */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Etiquetas (separadas por coma)</label>
                  <input
                    type="text"
                    placeholder="Ej. tarjeta, obligatorio, pasivo"
                    value={txTags}
                    onChange={e => setTxTags(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    id="input-tx-tags"
                  />
                </div>

                {/* Guardar */}
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-base transition-all mt-6 cursor-pointer"
                  id="btn-save-tx"
                >
                  {editingTransaction ? 'Guardar Cambios' : 'Confirmar Registro'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Crear/Editar Cuenta */}
      <AnimatePresence>
        {showAccountModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4" id="modal-account-backdrop">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto"
              id="modal-account-content"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-6">
                <h3 className="text-lg font-bold text-neutral-900">
                  {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
                </h3>
                <button 
                  onClick={() => setShowAccountModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                {/* Nombre de Cuenta */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre de la cuenta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mercado Pago, Galicia Ahorro"
                    value={accName}
                    onChange={e => setAccName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    id="input-acc-name"
                  />
                </div>

                {/* Tipo de Cuenta */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Tipo de cuenta</label>
                  <select
                    value={accType}
                    onChange={e => setAccType(e.target.value as any)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    id="select-acc-type"
                  >
                    <option value="Billetera Digital">Billetera Digital (MP, Ualá, NaranjaX)</option>
                    <option value="Banco">Banco (Galicia, Nación, etc.)</option>
                    <option value="Efectivo">Efectivo / Cash</option>
                    <option value="Cripto">Criptomonedas / Wallet (Bitcoin, USDT)</option>
                    <option value="Inversión">Cuenta de Inversión / Broker (Stack, Balanz)</option>
                    <option value="Otro">Otro Tipo</option>
                  </select>
                </div>

                {/* Divisa */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Divisa / Moneda</label>
                  <select
                    value={accCurrency}
                    onChange={e => setAccCurrency(e.target.value as any)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    id="select-acc-currency"
                  >
                    <option value="ARS">Pesos Argentinos (ARS)</option>
                    <option value="USD">Dólares (USD)</option>
                    <option value="USDT">Tether (USDT)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                  </select>
                </div>

                {/* Saldo Inicial / Actual */}
                {editingAccount ? (
                  <div className="space-y-4">
                    {/* Saldo Actual editable */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider mb-2">Saldo Actual en Cuenta ({accCurrency})</label>
                      <input
                        type="number"
                        required
                        placeholder="0"
                        value={accCurrentBalance}
                        onChange={e => setAccCurrentBalance(e.target.value)}
                        className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                        id="input-acc-current-balance"
                      />
                    </div>

                    {/* Alert Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2 text-xs font-semibold text-amber-850">
                      <div className="flex items-center space-x-2">
                        <span>⚠️</span>
                        <span className="font-black text-amber-900">Ajuste de Saldo Directo</span>
                      </div>
                      <p className="text-[10.5px] leading-relaxed text-amber-850 font-medium">
                        Al cambiar el saldo actual de la cuenta, se recalculará automáticamente su Saldo Inicial para mantener la coherencia matemática con tu historial de transacciones registradas.
                      </p>
                    </div>

                    {/* Margins Preview Box */}
                    {(() => {
                      const currentVal = Number(accCurrentBalance) || 0;
                      const diff = currentVal - editingAccount.currentBalance;
                      if (diff === 0) return null;

                      let rate = 1;
                      if (accCurrency === 'USD') rate = exchangeRates.ARS_USD_BLUE || 1220;
                      else if (accCurrency === 'USDT') rate = exchangeRates.ARS_USDT || 1240;
                      else if (accCurrency === 'BTC') rate = (exchangeRates.USD_BTC || 62000) * (exchangeRates.ARS_USD_BLUE || 1220);
                      const diffArs = diff * rate;

                      return (
                        <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3 text-xs">
                          <h4 className="font-bold text-neutral-700 text-[10px] uppercase tracking-wider">Impacto en Márgenes y Números</h4>
                          <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-white p-2.5 rounded-xl border border-neutral-100 flex flex-col justify-between">
                              <span className="text-[9px] text-neutral-400 font-bold uppercase block">En esta Cuenta</span>
                              <span className="block font-black text-neutral-850 mt-1 truncate">
                                {formatAccountBalance(editingAccount.currentBalance, editingAccount.currency)} ➔ {formatAccountBalance(currentVal, editingAccount.currency)}
                              </span>
                              <span className={`text-[10px] font-black block mt-1 ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {diff >= 0 ? '+' : ''}{diff} {accCurrency}
                              </span>
                            </div>

                            <div className="bg-white p-2.5 rounded-xl border border-neutral-100 flex flex-col justify-between">
                              <span className="text-[9px] text-neutral-400 font-bold uppercase block">Patrimonio Total</span>
                              <span className="block font-black text-neutral-850 mt-1 truncate">
                                {formatCurrency(patrimonioTotal)} ➔ {formatCurrency(patrimonioTotal + diffArs)}
                              </span>
                              <span className={`text-[10px] font-black block mt-1 ${diffArs >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {diffArs >= 0 ? '+' : ''}{formatCurrency(diffArs)} ARS
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Saldo inicial / de respaldo ({accCurrency})</label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={accInitialBalance}
                      onChange={e => setAccInitialBalance(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                      id="input-acc-balance"
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">Este saldo servirá como base para recalcular todos tus movimientos futuros en la divisa elegida.</p>
                  </div>
                )}

                {/* Guardar */}
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-base transition-all mt-6 cursor-pointer"
                  id="btn-save-account"
                >
                  {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Modal: Convertir Criptomonedas / Divisas a Pesos */}
      <AnimatePresence>
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-5">
                <h3 className="text-base font-bold text-neutral-950 flex items-center space-x-1.5">
                  <RefreshCw size={16} className="text-indigo-650" />
                  <span>Convertir Divisa a Pesos</span>
                </h3>
                <button 
                  onClick={() => setShowConvertModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-505" />
                </button>
              </div>

              <form onSubmit={handleConvertSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Cuenta Origen */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Cuenta Origen (Divisa / Cripto)</label>
                  <select
                    value={convertOriginAccount}
                    onChange={e => {
                      const name = e.target.value;
                      setConvertOriginAccount(name);
                      const acc = accounts.find(a => a.name === name);
                      if (acc) {
                        if (acc.currency === 'USD') setConvertRate(String(exchangeRates.ARS_USD_BLUE || 1220));
                        else if (acc.currency === 'USDT') setConvertRate(String(exchangeRates.ARS_USDT || 1240));
                        else if (acc.currency === 'BTC') setConvertRate(String((exchangeRates.USD_BTC || 62000) * (exchangeRates.ARS_USD_BLUE || 1220)));
                        else setConvertRate('1');
                      }
                    }}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-805 focus:outline-hidden"
                  >
                    {accounts.filter(a => a.currency !== 'ARS').map(a => (
                      <option key={a.id} value={a.name}>
                        {a.name} ({formatAccountBalance(a.currentBalance, a.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monto a vender */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Monto a vender</label>
                  <input
                    type="number"
                    required
                    placeholder="Monto de la divisa"
                    value={convertAmount}
                    onChange={e => setConvertAmount(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-805 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Tipo de Cambio */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Cotización / Tipo de Cambio (ARS por Unidad)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej. 1240"
                    value={convertRate}
                    onChange={e => setConvertRate(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-805 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Cuenta Destino (Solo ARS) */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Acreditar Pesos en Cuenta</label>
                  <select
                    value={convertDestAccount}
                    onChange={e => setConvertDestAccount(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-805 focus:outline-hidden"
                  >
                    {accounts.filter(a => a.currency === 'ARS').map(a => (
                      <option key={a.id} value={a.name}>
                        {a.name} ({formatCurrency(a.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preview Box */}
                {(() => {
                  const amt = Number(convertAmount) || 0;
                  const rate = Number(convertRate) || 0;
                  const totalArs = amt * rate;
                  if (totalArs <= 0) return null;

                  return (
                    <div className="bg-indigo-50 border border-indigo-150 rounded-2xl p-4 text-center">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Recibirás en Pesos</span>
                      <span className="text-base font-black text-indigo-900 mt-1 block">
                        {formatCurrency(totalArs)} ARS
                      </span>
                    </div>
                  );
                })()}

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-850 text-white rounded-2xl font-black text-xs transition-colors cursor-pointer"
                >
                  Confirmar Conversión
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
