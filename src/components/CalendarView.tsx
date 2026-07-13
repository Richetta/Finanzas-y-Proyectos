/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Plus, X, Calendar, CreditCard, DollarSign, 
  Target, Award, ListTodo, AlertTriangle, Info, Repeat, CheckCircle2, 
  Trash2, ArrowUpRight, Check, ArrowDownLeft, Search, EyeOff, LayoutGrid, List
} from 'lucide-react';
import { FixedExpense, Account, Transaction, Project, Loan, SavingGoal } from '../types';

interface CalendarViewProps {
  fixedExpenses: FixedExpense[];
  accounts: Account[];
  transactions: Transaction[];
  projects: Project[];
  loans: Loan[];
  savingGoals: SavingGoal[];
  onPayFixedExpense: (id: string, accountId: string) => void;
  onUpdateFixedExpense: (exp: FixedExpense) => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateProject: (p: Project) => void;
  onUpdateLoan: (l: Loan) => void;
}

interface CalendarEvent {
  id: string;
  type: 'fixed_expense' | 'loan' | 'goal' | 'project_task' | 'project' | 'transaction_income' | 'transaction_expense';
  title: string;
  amount?: number;
  currency?: string;
  status: 'pending' | 'completed' | 'income' | 'expense';
  date: string;
  originalObject: any;
  icon: React.ReactNode;
}

export function CalendarView({
  fixedExpenses = [],
  accounts = [],
  transactions = [],
  projects = [],
  loans = [],
  savingGoals = [],
  onPayFixedExpense,
  onUpdateFixedExpense,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onUpdateProject,
  onUpdateLoan
}: CalendarViewProps) {
  // Navigation month state
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next

  // View state: 'grid' or 'agenda' - Defaults to agenda on mobile for comfortable reading
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'agenda';
    }
    return 'grid';
  });

  // Sidebar Tab state: 'detail' or 'upcoming'
  const [sidebarTab, setSidebarTab] = useState<'detail' | 'upcoming'>('detail');

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);

  // Category filter states
  const [showFixedExpenses, setShowFixedExpenses] = useState(true);
  const [showLoans, setShowLoans] = useState(true);
  const [showGoals, setShowGoals] = useState(true);
  const [showTransactions, setShowTransactions] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

  // Selected date details panel
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Event detail popup/modal state
  const [activeDetailEvent, setActiveDetailEvent] = useState<CalendarEvent | null>(null);

  // Quick Action Modal states
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddType, setQuickAddType] = useState<'reminder' | 'transaction'>('reminder');
  
  // Quick Add Form states
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCategory, setQuickCategory] = useState('Servicios');
  const [quickAccount, setQuickAccount] = useState(() => accounts.length > 0 ? accounts[0].name : '');
  const [quickIsIncome, setQuickIsIncome] = useState(false);
  const [quickDesc, setQuickDesc] = useState('');

  // Fixed Expense Pay Modal state
  const [payingExpenseId, setPayingExpenseId] = useState<string | null>(null);
  const [payAccountId, setPayAccountId] = useState('');
  const [onlyMarkPaid, setOnlyMarkPaid] = useState(false);

  // Constants
  const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Event style configuration mapping (Glassmorphic tags with Left-border accents)
  const eventStyles: Record<CalendarEvent['type'], string> = {
    fixed_expense: 'bg-amber-50/50 hover:bg-amber-100/60 text-amber-800 border-l-3 border-amber-500 border-y border-r border-amber-100/40',
    loan: 'bg-rose-50/50 hover:bg-rose-100/60 text-rose-800 border-l-3 border-rose-500 border-y border-r border-rose-100/40',
    goal: 'bg-sky-50/50 hover:bg-sky-100/60 text-sky-800 border-l-3 border-sky-500 border-y border-r border-sky-100/40',
    project: 'bg-purple-50/50 hover:bg-purple-100/60 text-purple-800 border-l-3 border-purple-500 border-y border-r border-purple-100/40',
    project_task: 'bg-violet-50/50 hover:bg-violet-105/60 text-violet-850 border-l-3 border-violet-550 border-y border-r border-violet-100/40',
    transaction_income: 'bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-800 border-l-3 border-emerald-500 border-y border-r border-emerald-100/40 font-bold',
    transaction_expense: 'bg-rose-50/50 hover:bg-rose-100/60 text-rose-800 border-l-3 border-rose-500 border-y border-r border-rose-100/40 font-bold'
  };

  const exchangeRates = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('fp_exchange_rates') || '{}') || {};
    } catch {
      return {};
    }
  }, []);

  // Calculate current patrimony total in ARS
  const currentPatrimony = useMemo(() => {
    return (accounts || []).reduce((sum, acc) => {
      let amt = acc.currentBalance;
      if (acc.currency === 'USD') amt *= (exchangeRates.ARS_USD_BLUE || 1220);
      else if (acc.currency === 'USDT') amt *= (exchangeRates.ARS_USDT || 1240);
      else if (acc.currency === 'BTC') amt *= (exchangeRates.USD_BTC || 62000) * (exchangeRates.ARS_USD_BLUE || 1220);
      return sum + amt;
    }, 0);
  }, [accounts, exchangeRates]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setDirection(-1);
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDirection(1);
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const target = new Date();
    setDirection(currentMonthDate.getMonth() < target.getMonth() ? 1 : -1);
    setCurrentMonthDate(target);
    setSelectedDateStr(todayStr);
  };

  // Grid Cell generator
  const gridCells = useMemo(() => {
    const y = currentMonthDate.getFullYear();
    const m = currentMonthDate.getMonth();

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => {
      const day = new Date(year, month, 1).getDay(); // Sunday=0, Monday=1, ...
      return day === 0 ? 6 : day - 1; // Monday=0
    };

    const totalDays = getDaysInMonth(y, m);
    const firstDayIndex = getFirstDayOfMonth(y, m);

    const prevMonth = m === 0 ? 11 : m - 1;
    const prevYear = m === 0 ? y - 1 : y;
    const prevMonthDays = getDaysInMonth(prevYear, prevMonth);

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      cells.push({
        dateStr: prevYear + '-' + mStr + '-' + dStr,
        dayNum: day,
        isCurrentMonth: false
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const mStr = String(m + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      cells.push({
        dateStr: y + '-' + mStr + '-' + dStr,
        dayNum: day,
        isCurrentMonth: true
      });
    }

    const nextMonth = m === 11 ? 0 : m + 1;
    const nextYear = m === 11 ? y + 1 : y;
    const remaining = cells.length % 7;
    if (remaining > 0) {
      const padding = 7 - remaining;
      for (let day = 1; day <= padding; day++) {
        const mStr = String(nextMonth + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        cells.push({
          dateStr: nextYear + '-' + mStr + '-' + dStr,
          dayNum: day,
          isCurrentMonth: false
        });
      }
    }

    return cells;
  }, [currentMonthDate]);

  // Consolidate Calendar Events
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    const addEvent = (date: string, evt: CalendarEvent) => {
      if (!map[date]) map[date] = [];
      map[date].push(evt);
    };

    gridCells.forEach(cell => {
      const cellDateStr = cell.dateStr;
      const cellMonthStr = cellDateStr.slice(0, 7);
      const cellDayNum = cell.dayNum;

      // 1. Gastos Fijos
      if (showFixedExpenses) {
        fixedExpenses.forEach(exp => {
          if (exp.dueDay === cellDayNum) {
            const isPaid = exp.lastPaidMonth && exp.lastPaidMonth >= cellMonthStr;
            addEvent(cellDateStr, {
              id: 'exp_' + exp.id + '_' + cellDateStr,
              type: 'fixed_expense',
              title: exp.name,
              amount: exp.amount,
              currency: exp.currency || 'ARS',
              status: isPaid ? 'completed' : 'pending',
              date: cellDateStr,
              originalObject: exp,
              icon: <Repeat size={9} />
            });
          }
        });
      }

      // 2. Préstamos y Deudas
      if (showLoans) {
        loans.forEach(loan => {
          if (loan.dueDate === cellDateStr) {
            const isPaid = loan.status === 'Devuelto';
            addEvent(cellDateStr, {
              id: 'loan_' + loan.id,
              type: 'loan',
              title: (loan.type === 'Prestado' ? 'Cobrar a' : 'Pagar a') + ' ' + loan.person,
              amount: loan.amount,
              currency: 'ARS',
              status: isPaid ? 'completed' : 'pending',
              date: cellDateStr,
              originalObject: loan,
              icon: <AlertTriangle size={9} />
            });
          }
        });
      }

      // 3. Metas de Ahorro
      if (showGoals) {
        savingGoals.forEach(goal => {
          if (goal.targetDate === cellDateStr) {
            const isReached = goal.accumulatedAmount >= goal.targetAmount;
            addEvent(cellDateStr, {
              id: 'goal_' + goal.id,
              type: 'goal',
              title: 'Meta: ' + goal.name,
              amount: goal.targetAmount,
              currency: 'ARS',
              status: isReached ? 'completed' : 'pending',
              date: cellDateStr,
              originalObject: goal,
              icon: <Target size={9} />
            });
          }
        });
      }

      // 4. Proyectos y Tareas
      projects.forEach(proj => {
        if (showGoals && proj.targetDate === cellDateStr) {
          addEvent(cellDateStr, {
            id: 'proj_' + proj.id,
            type: 'project',
            title: 'Proyecto: ' + proj.name,
            status: proj.status === 'Completado' ? 'completed' : 'pending',
            date: cellDateStr,
            originalObject: proj,
            icon: <Award size={9} />
          });
        }

        if (showTasks && proj.tasks) {
          proj.tasks.forEach(task => {
            if (task.dueDate === cellDateStr) {
              addEvent(cellDateStr, {
                id: 'task_' + proj.id + '_' + task.id,
                type: 'project_task',
                title: task.name,
                amount: task.amount,
                currency: 'ARS',
                status: task.completed ? 'completed' : 'pending',
                date: cellDateStr,
                originalObject: { proj, task },
                icon: <ListTodo size={9} />
              });
            }
          });
        }
      });

      // 5. Transacciones Contables
      if (showTransactions) {
        transactions.forEach(tx => {
          if (tx.date === cellDateStr) {
            const isIncome = tx.type === 'Ingreso';
            addEvent(cellDateStr, {
              id: 'tx_' + tx.id,
              type: isIncome ? 'transaction_income' : 'transaction_expense',
              title: tx.description || tx.category,
              amount: tx.amount,
              currency: 'ARS',
              status: isIncome ? 'income' : 'expense',
              date: cellDateStr,
              originalObject: tx,
              icon: isIncome ? <ArrowUpRight size={9} className="text-emerald-600" /> : <ArrowUpRight size={9} className="text-rose-600 rotate-90" />
            });
          }
        });
      }
    });

    return map;
  }, [gridCells, fixedExpenses, loans, savingGoals, projects, transactions, showFixedExpenses, showLoans, showGoals, showTransactions, showTasks]);

  // Apply search query and hideCompleted filters to events
  const filteredEventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    const q = searchQuery.toLowerCase().trim();

    Object.keys(eventsByDate).forEach(dateStr => {
      let evts = eventsByDate[dateStr] || [];
      if (q) {
        evts = evts.filter(evt => evt.title.toLowerCase().includes(q));
      }
      if (hideCompleted) {
        evts = evts.filter(evt => evt.status !== 'completed');
      }
      if (evts.length > 0) {
        map[dateStr] = evts;
      }
    });
    return map;
  }, [eventsByDate, searchQuery, hideCompleted]);

  // Calculate projected balance day-by-day (Cash Flow Forecast)
  const projectedBalances = useMemo(() => {
    const map: Record<string, number> = {};
    const todayStr = new Date().toISOString().split('T')[0];
    const sortedCells = [...gridCells].sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    let runningBalance = currentPatrimony;

    sortedCells.forEach(cell => {
      const cellDateStr = cell.dateStr;
      
      // Apply events only from today onwards to project future balance
      if (cellDateStr >= todayStr) {
        const dayEvts = eventsByDate[cellDateStr] || [];
        dayEvts.forEach(evt => {
          if (evt.status === 'pending') {
            let amtArs = 0;
            if (evt.amount) {
              const cur = evt.currency || 'ARS';
              if (cur === 'ARS') amtArs = evt.amount;
              else if (cur === 'USD') amtArs = evt.amount * (exchangeRates.ARS_USD_BLUE || 1220);
              else if (cur === 'USDT') amtArs = evt.amount * (exchangeRates.ARS_USDT || 1240);
              else if (cur === 'BTC') amtArs = evt.amount * (exchangeRates.USD_BTC || 62000) * (exchangeRates.ARS_USD_BLUE || 1220);
            }

            if (evt.type === 'fixed_expense') {
              runningBalance -= amtArs;
            } else if (evt.type === 'loan') {
              if (evt.originalObject.type === 'Prestado') {
                runningBalance += amtArs;
              } else {
                runningBalance -= amtArs;
              }
            } else if (evt.type === 'project_task' && evt.originalObject.task.isPayment) {
              runningBalance -= amtArs;
            }
          }
        });
      }
      map[cellDateStr] = runningBalance;
    });

    return map;
  }, [gridCells, eventsByDate, currentPatrimony, exchangeRates]);

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    return filteredEventsByDate[selectedDateStr] || [];
  }, [filteredEventsByDate, selectedDateStr]);

  // Upcoming top 5 unpaid obligations from today onwards
  const upcomingObligations = useMemo(() => {
    const list: CalendarEvent[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    Object.keys(eventsByDate)
      .filter(k => k >= todayStr)
      .sort()
      .forEach(k => {
        eventsByDate[k].forEach(evt => {
          if (evt.status === 'pending' && evt.type !== 'transaction_income' && evt.type !== 'transaction_expense') {
            list.push(evt);
          }
        });
      });
    return list.slice(0, 5);
  }, [eventsByDate]);

  // Daily summary cash flow widget calculations
  const dailySummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    selectedDateEvents.forEach(evt => {
      if (evt.type === 'transaction_income') {
        income += evt.amount || 0;
      } else if (evt.type === 'transaction_expense') {
        expense += evt.amount || 0;
      }
    });
    return {
      income,
      expense,
      net: income - expense,
      hasTransactions: income > 0 || expense > 0
    };
  }, [selectedDateEvents]);

  // Formatting helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMonthYearTitle = () => {
    return currentMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  };

  // Event Action handlers
  const handleOpenPayModal = (expId: string) => {
    setPayingExpenseId(expId);
    if (accounts.length > 0) {
      setPayAccountId(accounts[0].id);
    }
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingExpenseId) return;

    if (onlyMarkPaid) {
      onPayFixedExpense(payingExpenseId, 'skip_contabilidad');
    } else {
      if (!payAccountId) return;
      onPayFixedExpense(payingExpenseId, payAccountId);
    }

    setPayingExpenseId(null);
    setPayAccountId('');
    setOnlyMarkPaid(false);
    setActiveDetailEvent(null);
  };

  const handleToggleTaskStatus = (proj: Project, taskId: string, completed: boolean) => {
    const updatedTasks = proj.tasks.map(t => t.id === taskId ? { ...t, completed } : t);
    onUpdateProject({
      ...proj,
      tasks: updatedTasks
    });
    setActiveDetailEvent(null);
  };

  const handleMarkLoanReturned = (loan: Loan) => {
    onUpdateLoan({
      ...loan,
      status: 'Devuelto'
    });
    setActiveDetailEvent(null);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    if (quickAddType === 'reminder') {
      const targetProj = projects.find(p => p.name === 'Recordatorios Generales');
      const newTask = {
        id: 'task_' + Date.now(),
        name: quickTitle.trim(),
        completed: false,
        dueDate: selectedDateStr,
        category: 'Recordatorio',
        description: quickDesc.trim() || 'Recordatorio general del calendario',
        amount: Number(quickAmount) || 0,
        isPayment: false
      };

      if (!targetProj) {
        const firstProj = projects.length > 0 ? projects[0] : null;
        if (firstProj) {
          onUpdateProject({
            ...firstProj,
            tasks: [...(firstProj.tasks || []), newTask]
          });
          alert('Recordatorio creado e integrado en el proyecto "' + firstProj.name + '" para su sincronización.');
        } else {
          alert('Por favor crea un proyecto en la pestaña "Proyectos" antes de agendar recordatorios.');
        }
      } else {
        onUpdateProject({
          ...targetProj,
          tasks: [...(targetProj.tasks || []), newTask]
        });
      }
    } else {
      onAddTransaction({
        date: selectedDateStr,
        type: quickIsIncome ? 'Ingreso' : 'Gasto',
        originAccount: quickAccount,
        category: quickCategory,
        amount: Number(quickAmount) || 0,
        description: quickTitle.trim(),
        tags: ['calendario-quick-add']
      });
    }

    setQuickTitle('');
    setQuickAmount('');
    setQuickDesc('');
    setShowQuickAddModal(false);
  };

  // Agenda / List mode filter days
  const agendaDays = useMemo(() => {
    const yStr = String(currentMonthDate.getFullYear());
    const mStr = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const targetMonthPrefix = yStr + '-' + mStr;

    // Filter grid cells that belong to the current month and have filtered events
    return gridCells.filter(cell => {
      const belongs = cell.dateStr.startsWith(targetMonthPrefix);
      if (!belongs) return false;
      const dayEvts = filteredEventsByDate[cell.dateStr] || [];
      return dayEvts.length > 0;
    });
  }, [gridCells, filteredEventsByDate, currentMonthDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-1" id="calendar-container">
      {/* Grilla o Lista de Calendario (3/4) */}
      <div className="lg:col-span-3 bg-white rounded-3xl border border-neutral-100 p-5 shadow-xs space-y-4">
        
        {/* Cabecera del Calendario */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 pb-3 border-b border-neutral-100">
          
          <div className="flex items-center space-x-3">
            <Calendar size={18} className="text-neutral-500" />
            <h2 className="text-sm font-extrabold text-neutral-855 uppercase tracking-wider capitalize">
              {getMonthYearTitle()}
            </h2>
            
            {/* View Mode Switcher */}
            <div className="flex bg-neutral-100 rounded-xl p-0.5 border border-neutral-200 ml-2">
              <button
                onClick={() => setViewMode('grid')}
                className={'p-1 rounded-lg transition-all ' + (viewMode === 'grid' ? 'bg-white shadow-xs text-neutral-850' : 'text-neutral-400 hover:text-neutral-650')}
                title="Vista Grilla"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                onClick={() => setViewMode('agenda')}
                className={'p-1 rounded-lg transition-all ' + (viewMode === 'agenda' ? 'bg-white shadow-xs text-neutral-850' : 'text-neutral-400 hover:text-neutral-650')}
                title="Vista Lista / Agenda"
              >
                <List size={13} />
              </button>
            </div>
          </div>

          {/* Search bar and Navigation controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative text-xs">
              <Search className="absolute left-2.5 top-2.5 text-neutral-400" size={13} />
              <input
                type="text"
                placeholder="Buscar evento..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs w-[150px] md:w-[180px] focus:outline-hidden focus:border-neutral-900 focus:bg-white"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-650"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Completed Checkbox */}
            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className={'p-1.5 border rounded-xl flex items-center justify-center transition-all cursor-pointer ' + (hideCompleted ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-neutral-200 text-neutral-505 hover:bg-neutral-50')}
              title={hideCompleted ? 'Mostrando solo pendientes' : 'Ocultar completados'}
            >
              <EyeOff size={13} />
            </button>

            <button 
              onClick={handleToday}
              className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-250 text-neutral-600 rounded-xl text-[10px] font-bold uppercase transition-colors cursor-pointer"
            >
              Hoy
            </button>
            
            <div className="flex items-center bg-neutral-100 rounded-xl p-0.5 border border-neutral-200">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg transition-all text-neutral-600 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg transition-all text-neutral-600 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* Filtros Notion Style */}
        <div className="flex flex-wrap gap-2 py-1 items-center">
          <span className="text-[10px] font-bold text-neutral-455 uppercase tracking-wide mr-1.5">Categorías:</span>
          
          <button 
            onClick={() => setShowFixedExpenses(!showFixedExpenses)}
            className={'px-2.5 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ' + (showFixedExpenses ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-neutral-455 border-neutral-100 hover:text-neutral-600')}
          >
            Gastos Fijos
          </button>
          
          <button 
            onClick={() => setShowLoans(!showLoans)}
            className={'px-2.5 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ' + (showLoans ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-neutral-455 border-neutral-100 hover:text-neutral-600')}
          >
            Préstamos
          </button>

          <button 
            onClick={() => setShowGoals(!showGoals)}
            className={'px-2.5 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ' + (showGoals ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-white text-neutral-455 border-neutral-100 hover:text-neutral-655')}
          >
            Proyectos/Metas
          </button>

          <button 
            onClick={() => setShowTasks(!showTasks)}
            className={'px-2.5 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ' + (showTasks ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-white text-neutral-455 border-neutral-100 hover:text-neutral-655')}
          >
            Tareas
          </button>

          <button 
            onClick={() => setShowTransactions(!showTransactions)}
            className={'px-2.5 py-1 border rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ' + (showTransactions ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-neutral-455 border-neutral-100 hover:text-neutral-655')}
          >
            Flujo de Caja
          </button>
        </div>

        {/* CONTENIDO DEL CALENDARIO: GRILLA VS LISTA DE AGENDA */}
        {viewMode === 'grid' ? (
          /* VISTA GRILLA MENSUAL */
          <div className="border border-neutral-150 rounded-2xl overflow-hidden bg-white">
            <div className="grid grid-cols-7 bg-neutral-50 border-b border-neutral-150 text-center py-2">
              {DAYS_OF_WEEK.map(d => (
                <span key={d} className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{d}</span>
              ))}
            </div>

            <div className="relative overflow-hidden bg-neutral-50">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.div
                  key={currentMonthDate.toISOString()}
                  initial={{ x: direction > 0 ? 120 : -120, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction > 0 ? -120 : 120, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 210 }}
                  className="grid grid-cols-7 grid-rows-5 md:grid-rows-6 auto-rows-[100px] md:auto-rows-[120px] bg-neutral-150/45 divide-x divide-y divide-neutral-150"
                >
                  {gridCells.map((cell, idx) => {
                    const dateEvts = filteredEventsByDate[cell.dateStr] || [];
                    const isSelected = selectedDateStr === cell.dateStr;
                    const isToday = new Date().toISOString().split('T')[0] === cell.dateStr;
                    const projBalance = projectedBalances[cell.dateStr] || currentPatrimony;

                    return (
                      <div 
                        key={cell.dateStr + '-' + idx}
                        onClick={() => setSelectedDateStr(cell.dateStr)}
                        className={'p-1.5 flex flex-col justify-between items-stretch transition-all select-none cursor-pointer relative group ' + (cell.isCurrentMonth ? 'bg-white' : 'bg-neutral-50/50 text-neutral-350') + ' ' + (isSelected ? 'ring-2 ring-neutral-900 ring-inset z-10' : '')}
                      >
                        {/* Número de Día */}
                        <div className="flex justify-between items-center mb-1">
                          <span className={'text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full transition-colors ' + (isToday ? 'bg-rose-500 text-white shadow-xs' : cell.isCurrentMonth ? 'text-neutral-800' : 'text-neutral-400')}>
                            {cell.dayNum}
                          </span>
                          
                          {/* Hover Plus Quick Add button */}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateStr(cell.dateStr);
                              setShowQuickAddModal(true);
                            }}
                            className="p-0.5 hover:bg-neutral-100 rounded-md transition-all text-neutral-400 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Añadir evento"
                          >
                            <Plus size={10} className="stroke-[2.5]" />
                          </button>
                        </div>

                        {/* Listado de eventos en miniatura */}
                        <div className="flex-1 overflow-hidden space-y-0.5 text-[9px] font-semibold pr-0.5">
                          {/* Desktop: Event badges with text */}
                          <div className="hidden md:block space-y-0.5">
                            {dateEvts.slice(0, 2).map(evt => (
                              <div 
                                key={evt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDetailEvent(evt);
                                  setSelectedDateStr(evt.date);
                                }}
                                className={'px-1.5 py-0.5 rounded-sm truncate flex items-center space-x-1 transition-all ' + eventStyles[evt.type]}
                                title={evt.title + (evt.amount ? ' - ' + formatCurrency(evt.amount) : '')}
                              >
                                <span className="flex-shrink-0 text-[8.5px]">{evt.icon}</span>
                                <span className="truncate">{evt.title}</span>
                              </div>
                            ))}
                            {dateEvts.length > 2 && (
                              <div className="text-[8px] text-neutral-400 font-extrabold pl-1 pt-0.5">
                                + {dateEvts.length - 2} más
                              </div>
                            )}
                          </div>

                          {/* Mobile: Clean dots to prevent vertical stretching/squishing */}
                          <div className="flex md:hidden flex-wrap gap-1 justify-center items-center mt-1">
                            {dateEvts.map(evt => {
                              let dotColor = 'bg-neutral-400';
                              if (evt.type === 'fixed_expense') dotColor = 'bg-amber-500';
                              else if (evt.type === 'loan') dotColor = 'bg-rose-500';
                              else if (evt.type === 'goal') dotColor = 'bg-sky-500';
                              else if (evt.type === 'project' || evt.type === 'project_task') dotColor = 'bg-purple-505';
                              else if (evt.type === 'transaction_income') dotColor = 'bg-emerald-500';
                              else if (evt.type === 'transaction_expense') dotColor = 'bg-rose-600';

                              return (
                                <span 
                                  key={evt.id}
                                  className={'w-1.5 h-1.5 rounded-full ' + dotColor}
                                  title={evt.title}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Saldo patrimonial diario proyectado - Hidden on mobile, shown on desktop */}
                        {cell.isCurrentMonth && (
                          <span className="text-[7.5px] text-neutral-400 font-mono text-right hidden md:block tracking-tighter">
                            Saldo: {formatCurrency(projBalance)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* VISTA AGENDA / LISTA */
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
            {agendaDays.map(cell => {
              const dayEvts = filteredEventsByDate[cell.dateStr] || [];
              const dateObj = new Date(cell.dateStr + 'T00:00:00');
              const isToday = new Date().toISOString().split('T')[0] === cell.dateStr;

              return (
                <div key={cell.dateStr} className={'p-4 bg-neutral-50/50 border border-neutral-100 rounded-2xl flex flex-col md:flex-row md:items-start justify-between gap-3 ' + (isToday ? 'border-rose-300 ring-1 ring-rose-200' : '')}>
                  {/* Fecha de la Fila */}
                  <div className="md:w-1/4">
                    <p className="text-xs font-black text-neutral-900 capitalize">
                      {dateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </p>
                    {isToday && (
                      <span className="inline-block mt-0.5 px-2 py-0.2 bg-rose-50 text-rose-600 border border-rose-100 text-[8.5px] font-black uppercase rounded-sm">Hoy</span>
                    )}
                  </div>

                  {/* Listado de eventos de este día */}
                  <div className="flex-1 space-y-2">
                    {dayEvts.map(evt => (
                      <div 
                        key={evt.id}
                        onClick={() => {
                          setSelectedDateStr(evt.date);
                          setActiveDetailEvent(evt);
                        }}
                        className={'p-3 rounded-xl border flex justify-between items-center transition-all cursor-pointer ' + eventStyles[evt.type]}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="p-1 bg-white/90 rounded-lg flex-shrink-0">
                            {evt.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate leading-snug">{evt.title}</p>
                            <p className="text-[8px] uppercase font-bold opacity-60 mt-0.5">{evt.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        {evt.amount !== undefined && (
                          <span className="font-extrabold text-xs ml-3 whitespace-nowrap">
                            {evt.status === 'income' ? '+' : evt.status === 'expense' ? '-' : ''}{formatCurrency(evt.amount)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {agendaDays.length === 0 && (
              <div className="text-center py-12 text-neutral-400 space-y-2 bg-neutral-50/50 rounded-3xl border border-dashed p-6">
                <Info className="mx-auto text-neutral-300" size={32} />
                <p className="text-sm font-bold text-neutral-700">No hay eventos para este mes</p>
                <p className="text-xs text-neutral-450">Ajusta los filtros o cambia de mes para ver obligaciones.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Panel Lateral: Detalle / Próximos Vencimientos (1/4) */}
      <div className="space-y-4">
        
        {/* Pestañas de Navegación Lateral */}
        <div className="flex bg-neutral-100 p-0.5 rounded-2xl border border-neutral-200">
          <button
            onClick={() => setSidebarTab('detail')}
            className={'flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ' + (sidebarTab === 'detail' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-750')}
          >
            Detalle Día
          </button>
          <button
            onClick={() => setSidebarTab('upcoming')}
            className={'flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ' + (sidebarTab === 'upcoming' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-750')}
          >
            Próximos Pagos
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-neutral-100 p-5 shadow-xs space-y-4">
          <AnimatePresence mode="wait">
            {sidebarTab === 'detail' ? (
              /* PESTAÑA: DETALLE DEL DÍA SELECCIONADO */
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Fecha Seleccionada</h3>
                    <p className="text-xs font-extrabold text-neutral-850 mt-0.5 capitalize">
                      {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowQuickAddModal(true)}
                    className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                    title="Agendar recordatorio o gasto"
                  >
                    <Plus size={13} />
                  </button>
                </div>

                {/* Widget de Flujo de Caja Diario */}
                {dailySummary.hasTransactions && (
                  <div className="bg-neutral-50 border border-neutral-150/70 rounded-2xl p-3 grid grid-cols-3 gap-1.5 text-center text-[9.5px] font-bold">
                    <div>
                      <span className="text-neutral-400 uppercase tracking-wider block">Ingresos</span>
                      <span className="text-emerald-600 font-extrabold block mt-0.5">+{formatCurrency(dailySummary.income)}</span>
                    </div>
                    <div className="border-l border-r border-neutral-200">
                      <span className="text-neutral-400 uppercase tracking-wider block">Gastos</span>
                      <span className="text-rose-600 font-extrabold block mt-0.5">-{formatCurrency(dailySummary.expense)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 uppercase tracking-wider block">Balance</span>
                      <span className={'font-extrabold block mt-0.5 ' + (dailySummary.net >= 0 ? 'text-emerald-700' : 'text-rose-700')}>
                        {dailySummary.net >= 0 ? '+' : ''}{formatCurrency(dailySummary.net)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Listado Completo de Eventos del Día */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200">
                  {selectedDateEvents.map(evt => {
                    return (
                      <div 
                        key={evt.id}
                        onClick={() => setActiveDetailEvent(evt)}
                        className={'p-3 border rounded-2xl flex justify-between items-center transition-all hover:translate-x-0.5 cursor-pointer ' + eventStyles[evt.type]}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="p-1 bg-white/80 rounded-lg border border-neutral-155 flex-shrink-0">
                            {evt.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate leading-snug">{evt.title}</p>
                            <p className="text-[8px] uppercase font-bold opacity-60 mt-0.5">{evt.type.replace('_', ' ')}</p>
                          </div>
                        </div>
                        {evt.amount !== undefined && (
                          <span className="font-extrabold text-xs ml-3 whitespace-nowrap">
                            {evt.status === 'income' ? '+' : evt.status === 'expense' ? '-' : ''}{formatCurrency(evt.amount)}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {selectedDateEvents.length === 0 && (
                    <div className="text-center py-8 text-neutral-400 space-y-1 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-205 p-4">
                      <Info className="mx-auto text-neutral-350" size={20} />
                      <p className="text-xs font-bold text-neutral-700">Día libre de eventos</p>
                      <p className="text-[9.5px] text-neutral-400 max-w-[160px] mx-auto leading-relaxed">No hay vencimientos ni movimientos contables para esta fecha.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* PESTAÑA: PRÓXIMOS VENCIMIENTOS (TIMELINE A PARTIR DE HOY) */
              <motion.div
                key="upcoming"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="pb-2 border-b border-neutral-100">
                  <h3 className="text-xs font-bold text-neutral-450 uppercase tracking-wider">Cronograma de Vencimientos</h3>
                  <p className="text-[9.5px] text-neutral-400 mt-0.5">Siguientes 5 obligaciones de pago pendientes.</p>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                  {upcomingObligations.map(evt => {
                    const dateObj = new Date(evt.date + 'T00:00:00');
                    return (
                      <div 
                        key={evt.id}
                        onClick={() => {
                          setSelectedDateStr(evt.date);
                          setActiveDetailEvent(evt);
                        }}
                        className={'p-3 border rounded-2xl flex flex-col space-y-2 cursor-pointer transition-all hover:bg-neutral-50/20 ' + eventStyles[evt.type]}
                      >
                        <div className="flex justify-between items-start min-w-0 gap-2">
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs truncate leading-snug">{evt.title}</p>
                            <span className="text-[8.5px] uppercase font-bold opacity-60 tracking-wider">
                              Vence: {dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          {evt.amount !== undefined && (
                            <span className="font-extrabold text-xs whitespace-nowrap">
                              -{formatCurrency(evt.amount)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {upcomingObligations.length === 0 && (
                    <div className="text-center py-10 text-neutral-400 space-y-2">
                      <CheckCircle2 className="mx-auto text-emerald-500" size={24} />
                      <p className="text-xs font-bold text-neutral-700">¡Todo al día!</p>
                      <p className="text-[9.5px] text-neutral-400 max-w-[155px] mx-auto leading-relaxed">No tienes vencimientos pendientes a la vista para las próximas semanas.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Modal: Detalle Ampliado de Evento */}
      <AnimatePresence>
        {activeDetailEvent && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '105%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-1">
                  {activeDetailEvent.icon}
                  <span>Detalle de Evento</span>
                </span>
                <button 
                  onClick={() => setActiveDetailEvent(null)}
                  className="p-1 hover:bg-neutral-100 rounded-full cursor-pointer text-neutral-505"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-sm font-black text-neutral-900 leading-snug">{activeDetailEvent.title}</h4>
                <p className="text-[10.5px] font-semibold text-neutral-400 flex items-center">
                  <Calendar size={12} className="mr-1" />
                  <span>Programado: {activeDetailEvent.date}</span>
                </p>
              </div>

              {/* Importes */}
              {activeDetailEvent.amount !== undefined && (
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Monto</span>
                  <span className={'text-base font-black ' + (activeDetailEvent.status === 'income' ? 'text-emerald-600' : 'text-neutral-805')}>
                    {activeDetailEvent.status === 'income' ? '+' : ''}
                    {formatCurrency(activeDetailEvent.amount)} {activeDetailEvent.currency || 'ARS'}
                  </span>
                </div>
              )}

              {/* Notas context específicas */}
              <div className="text-xs text-neutral-500 font-semibold leading-relaxed">
                {activeDetailEvent.type === 'fixed_expense' && (
                  <p>Este es un gasto fijo mensual recurrente. El estado de este mes figura como **{activeDetailEvent.status === 'completed' ? 'PAGADO' : 'PENDIENTE'}**.</p>
                )}
                {activeDetailEvent.type === 'loan' && (
                  <p>Préstamo registrado con {activeDetailEvent.originalObject.person}. Fecha límite acordada: {activeDetailEvent.originalObject.dueDate || 'No configurada'}.</p>
                )}
                {activeDetailEvent.type === 'project_task' && (
                  <p>Tarea asociada al proyecto **"{activeDetailEvent.originalObject.proj.name}"**. {activeDetailEvent.originalObject.task.description}</p>
                )}
                {activeDetailEvent.type.startsWith('transaction') && (
                  <p>Movimiento contable asentado en tu caja de **{activeDetailEvent.originalObject.originAccount}** bajo la categoría **"{activeDetailEvent.originalObject.category}"**.</p>
                )}
              </div>

              {/* Acciones contextuales */}
              <div className="pt-2 flex flex-col gap-2">
                {/* Gasto Fijo pendiente */}
                {activeDetailEvent.type === 'fixed_expense' && activeDetailEvent.status === 'pending' && (
                  <button
                    onClick={() => handleOpenPayModal(activeDetailEvent.originalObject.id)}
                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                  >
                    <CreditCard size={13} />
                    <span>Marcar y Registrar Pago</span>
                  </button>
                )}

                {/* Tarea de proyecto pendiente */}
                {activeDetailEvent.type === 'project_task' && activeDetailEvent.status === 'pending' && (
                  <button
                    onClick={() => handleToggleTaskStatus(activeDetailEvent.originalObject.proj, activeDetailEvent.originalObject.task.id, true)}
                    className="w-full py-3 px-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 size={13} />
                    <span>Marcar como Completada</span>
                  </button>
                )}

                {/* Tarea de proyecto completada */}
                {activeDetailEvent.type === 'project_task' && activeDetailEvent.status === 'completed' && (
                  <button
                    onClick={() => handleToggleTaskStatus(activeDetailEvent.originalObject.proj, activeDetailEvent.originalObject.task.id, false)}
                    className="w-full py-3 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-250 rounded-xl text-xs font-black flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Reabrir Tarea (Pendiente)</span>
                  </button>
                )}

                {/* Préstamo pendiente */}
                {activeDetailEvent.type === 'loan' && activeDetailEvent.status === 'pending' && (
                  <button
                    onClick={() => handleMarkLoanReturned(activeDetailEvent.originalObject)}
                    className="w-full py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                  >
                    <Check size={13} />
                    <span>Marcar como Devuelto / Liquidado</span>
                  </button>
                )}

                {/* Transacción Contable */}
                {activeDetailEvent.type.startsWith('transaction') && (
                  <button
                    onClick={() => {
                      if (confirm('¿Estás seguro de eliminar esta transacción desde el calendario?')) {
                        onDeleteTransaction(activeDetailEvent.originalObject.id);
                        setActiveDetailEvent(null);
                      }
                    }}
                    className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-xs font-black flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Eliminar Transacción</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Agregar Recordatorio o Gasto Fijo rápido */}
      <AnimatePresence>
        {showQuickAddModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900">Agendar Evento</h3>
                <button 
                  onClick={() => setShowQuickAddModal(false)}
                  className="p-1 hover:bg-neutral-100 rounded-full cursor-pointer text-neutral-505"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Selector de tipo */}
              <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-2xl text-[10px] font-bold">
                <button 
                  type="button" 
                  onClick={() => setQuickAddType('reminder')}
                  className={'py-2 rounded-xl uppercase tracking-wider transition-all cursor-pointer ' + (quickAddType === 'reminder' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-505')}
                >
                  Recordatorio / Tarea
                </button>
                <button 
                  type="button" 
                  onClick={() => setQuickAddType('transaction')}
                  className={'py-2 rounded-xl uppercase tracking-wider transition-all cursor-pointer ' + (quickAddType === 'transaction' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-505')}
                >
                  Movimiento de Caja
                </button>
              </div>

              <form onSubmit={handleQuickAddSubmit} className="space-y-4 text-xs font-semibold">
                {/* Título */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5">Nombre / Concepto</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Revisar vencimientos de tarjeta, Pagar internet"
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-805 focus:outline-hidden focus:border-neutral-955 focus:bg-white"
                  />
                </div>

                {quickAddType === 'transaction' && (
                  <>
                    {/* Ingreso o Gasto */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5">Tipo de Movimiento</label>
                      <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-xl text-[10px]">
                        <button 
                          type="button" 
                          onClick={() => setQuickIsIncome(false)}
                          className={'py-1.5 rounded-lg transition-all cursor-pointer ' + (!quickIsIncome ? 'bg-rose-500 text-white font-bold' : 'text-neutral-500')}
                        >
                          Gasto / Egreso
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setQuickIsIncome(true)}
                          className={'py-1.5 rounded-lg transition-all cursor-pointer ' + (quickIsIncome ? 'bg-emerald-500 text-white font-bold' : 'text-neutral-500')}
                        >
                          Ingreso
                        </button>
                      </div>
                    </div>

                    {/* Cuenta */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5">Cuenta de origen</label>
                      <select 
                        value={quickAccount}
                        onChange={e => setQuickAccount(e.target.value)}
                        className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-850 cursor-pointer"
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.name}>{a.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Categoría */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5">Categoría</label>
                      <select 
                        value={quickCategory}
                        onChange={e => setQuickCategory(e.target.value)}
                        className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-855 cursor-pointer"
                      >
                        <option value="Servicios">Servicios</option>
                        <option value="Comida">Comida</option>
                        <option value="Suscripciones">Suscripciones</option>
                        <option value="Alquiler">Alquiler</option>
                        <option value="Otros">Otros</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Importe */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5">Monto Estimado / Importe ($)</label>
                  <input 
                    type="number" 
                    placeholder="0 (Opcional)"
                    value={quickAmount}
                    onChange={e => setQuickAmount(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-805 focus:outline-hidden focus:border-neutral-955 focus:bg-white"
                  />
                </div>

                {quickAddType === 'reminder' && (
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5">Notas adicionales</label>
                    <input 
                      type="text" 
                      placeholder="Notas del recordatorio..."
                      value={quickDesc}
                      onChange={e => setQuickDesc(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-250 rounded-2xl text-xs text-neutral-805 focus:outline-hidden focus:border-neutral-955 focus:bg-white"
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-black text-xs transition-colors cursor-pointer"
                >
                  Agendar para el {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmar Pago de Gasto Fijo desde Calendario */}
      <AnimatePresence>
        {payingExpenseId && (
          <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-neutral-100 mb-4">
                <h3 className="text-base font-bold text-neutral-900">Registrar Pago de Gasto Fijo</h3>
                <button 
                  onClick={() => setPayingExpenseId(null)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full cursor-pointer"
                >
                  <X size={18} className="text-neutral-505" />
                </button>
              </div>

              <form onSubmit={handleConfirmPayment} className="space-y-4">
                <div className="p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-start space-x-2 text-xs text-neutral-600">
                  <Info size={16} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p>
                    {onlyMarkPaid 
                      ? 'Se marcará el servicio como pagado para este mes (avanzando su vencimiento), pero NO se creará ningún gasto en tu contabilidad.'
                      : 'Al confirmar, se registrará un gasto en tu contabilidad. El saldo de la cuenta elegida disminuirá y el estado del servicio pasará a pagado.'
                    }
                  </p>
                </div>

                {/* Checkbox Pagado de antemano / Sin debito contable */}
                <div className="flex items-start space-x-2.5 p-1">
                  <input
                    type="checkbox"
                    id="only-mark-paid-cal"
                    checked={onlyMarkPaid}
                    onChange={e => setOnlyMarkPaid(e.target.checked)}
                    className="mt-0.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                  />
                  <label htmlFor="only-mark-paid-cal" className="text-xs font-bold text-neutral-600 cursor-pointer select-none">
                    Solo marcar como pagado (de antemano / ya pagado)
                    <span className="block text-[10px] text-neutral-400 font-medium mt-0.5">
                      No se registrará débito contable ni se descontará de ninguna cuenta.
                    </span>
                  </label>
                </div>

                {!onlyMarkPaid && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Seleccionar cuenta de origen</label>
                    <select
                      required={!onlyMarkPaid}
                      value={payAccountId}
                      onChange={e => setPayAccountId(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white cursor-pointer"
                    >
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
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
                  disabled={!onlyMarkPaid && accounts.length === 0}
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-200 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1 shadow-xs cursor-pointer"
                >
                  <Check size={14} />
                  <span>{onlyMarkPaid ? 'Confirmar Pago de Antemano (Sin Débito)' : 'Confirmar Registro de Gasto'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
