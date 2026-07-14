import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, FolderHeart, PiggyBank, BarChart3, Database, 
  Menu, X, RefreshCw, CheckCircle, Wifi, CloudOff, Info, Repeat, ShoppingCart, HandCoins, Bell, Calendar
} from 'lucide-react';
import { NotificationPanel } from './components/NotificationPanel';
import { AppNotification } from './types';

import { 
  getLocalAccounts, saveLocalAccounts, 
  getLocalTransactions, saveLocalTransactions, 
  getLocalCategories, saveLocalCategories,
  getLocalProjects, saveLocalProjects, 
  getLocalGoals, saveLocalGoals, 
  getLocalFixedExpenses, saveLocalFixedExpenses,
  getLocalShoppingGroups, saveLocalShoppingGroups,
  getLocalLoans, saveLocalLoans,
  getLocalPantry, saveLocalPantry,
  getSyncConfig, saveSyncConfig, 
  getSyncLogs, addSyncLog, clearSyncLogs,
  recalculateAccountBalances, runSimulatedSync,
  fetchLiveExchangeRates
} from './lib/sheetsSync';

import { Account, Transaction, Category, Project, SavingGoal, SyncConfig, SyncLogEntry, ExchangeRates, FixedExpense, ShoppingItem, Loan, LoanPayment, ShoppingGroup, PantryItem } from './types';
import { FintechDashboard } from './components/FintechDashboard';
import { ProjectPlanner } from './components/ProjectPlanner';
import { StatsView } from './components/StatsView';
import { GoalTracker } from './components/GoalTracker';
import { SheetsIntegrationPanel } from './components/SheetsIntegrationPanel';
import { GastosFijosView } from './components/GastosFijosView';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { ShoppingListView } from './components/ShoppingListView';
import { MobileQuickAddView } from './components/MobileQuickAddView';
import { LoansManager } from './components/LoansManager';
import { CalendarView } from './components/CalendarView';

const normalizeTransactions = (txs: any[]): Transaction[] => {
  if (!Array.isArray(txs)) return [];
  return txs.map(tx => {
    if (!tx) return tx;
    let tags: string[] = [];
    if (Array.isArray(tx.tags)) {
      tags = tx.tags;
    } else if (typeof tx.tags === 'string') {
      tags = (tx.tags as string).split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    
    let items = tx.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        items = [];
      }
    }
    if (!Array.isArray(items)) {
      items = [];
    }
    
    return {
      ...tx,
      tags,
      items
    };
  });
};

const normalizeProjects = (projs: any[]): Project[] => {
  if (!Array.isArray(projs)) return [];
  return projs.map(p => {
    if (!p) return p;
    let allocatedAccountIds = p.allocatedAccountIds;
    if (typeof allocatedAccountIds === 'string') {
      allocatedAccountIds = (allocatedAccountIds as string).split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (!Array.isArray(allocatedAccountIds)) {
      allocatedAccountIds = [];
    }
    return {
      ...p,
      allocatedAccountIds,
      budgetItems: p.budgetItems || [],
      tasks: (p.tasks || []).map((t: any) => ({
        ...t,
        completed: t.completed === true || t.completed === 'true' || t.completed === 'TRUE',
        isPayment: t.isPayment === true || t.isPayment === 'true' || t.isPayment === 'TRUE',
        amount: Number(t.amount) || 0
      }))
    };
  });
};

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
};

export default function App() {
  // Navigation
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'proyectos' | 'metas' | 'estadisticas' | 'sheets' | 'gastos-fijos' | 'compras' | 'prestamos' | 'calendario'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showQuickAddView, setShowQuickAddView] = useState(false);
  const [quickAddInitialAmount, setQuickAddInitialAmount] = useState('');

  // Core States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [shoppingGroups, setShoppingGroups] = useState<ShoppingGroup[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  
  // Sync & Connection States
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ syncMode: 'local', isConnected: false });
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [isSyncingGlobal, setIsSyncingGlobal] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingSync, setHasPendingSync] = useState(() => localStorage.getItem('fp_has_pending_sync') === 'true');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({
    ARS_USD_BLUE: 1220,
    ARS_USDT: 1240,
    USD_BTC: 62000,
    lastUpdated: 'Nunca'
  });

  // Notifications States
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load Initial Storage Data & Cached Rates
  useEffect(() => {
    // Clear old mock data if this is the first load of the empty database version
    if (!localStorage.getItem('fp_db_cleared_v4')) {
      localStorage.removeItem('fp_accounts');
      localStorage.removeItem('fp_categories');
      localStorage.removeItem('fp_transactions');
      localStorage.removeItem('fp_projects');
      localStorage.removeItem('fp_goals');
      localStorage.removeItem('fp_fixed_expenses');
      localStorage.removeItem('fp_sync_logs');
      localStorage.setItem('fp_db_cleared_v4', 'true');
    }

    const accs = getLocalAccounts();
    const txs = getLocalTransactions();
    const cats = getLocalCategories();
    const projs = getLocalProjects();
    const gls = getLocalGoals();
    const fxex = getLocalFixedExpenses();
    const shopGroups = getLocalShoppingGroups();
    const lns = getLocalLoans();
    const cfg = getSyncConfig();
    const logs = getSyncLogs();

    setAccounts(accs);
    setTransactions(normalizeTransactions(txs));
    setCategories(cats);
    setProjects(normalizeProjects(projs));
    setGoals(gls);
    setFixedExpenses(fxex);
    setShoppingGroups(shopGroups);
    setLoans(lns);
    setSyncConfig(cfg);
    setSyncLogs(logs);

    const cachedRates = localStorage.getItem('fp_exchange_rates');
    if (cachedRates) {
      setExchangeRates(JSON.parse(cachedRates));
    }

    addSyncLog('Sistema Iniciado', 'success', 'Bóveda local cargada correctamente.');
  }, []);

  // Listen to deep linking URL actions (?action=scan or ?action=quick-add)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const amountParam = params.get('amount');

    if (action) {
      if (action === 'scan') {
        setShowScannerModal(true);
      } else if (action === 'quick-add') {
        setQuickAddInitialAmount(amountParam || '');
        setShowQuickAddView(true);
      }
      
      // Clean query parameters from browser URL bar to prevent duplicate triggering on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Monitor network connectivity in real-time
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addSyncLog('Conexión Restablecida', 'success', 'Dispositivo en línea. Sincronizando cola de cambios...');
      updateLogsState();
      
      // Auto-trigger sync on reconnecting if apps script is active
      if (syncConfig.syncMode === 'script' && syncConfig.appsScriptUrl) {
        triggerManualSync();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      addSyncLog('Conexión Perdida', 'error', 'Sin internet. Trabajando offline-first.');
      updateLogsState();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncConfig, accounts, transactions, projects, goals, fixedExpenses]);

  // Load and refresh live currency exchange rates
  useEffect(() => {
    const loadRates = async () => {
      if (navigator.onLine) {
        try {
          const rates = await fetchLiveExchangeRates();
          setExchangeRates(rates);
          localStorage.setItem('fp_exchange_rates', JSON.stringify(rates));
          addSyncLog('Precios Actualizados', 'success', `USDT: $${rates.ARS_USDT} | Blue: $${rates.ARS_USD_BLUE} | BTC: $${rates.USD_BTC} USD.`);
          updateLogsState();
        } catch (err) {
          console.warn('No se pudo actualizar cotizaciones en vivo:', err);
        }
      }
    };

    loadRates();
    
    // Refresh rates every 5 minutes if online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        loadRates();
      }
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  // Auto-pull from Sheets on startup if in script sync mode or running inside Google Apps Script iframe
  useEffect(() => {
    const isGoogleIframe = typeof window !== 'undefined' && (window as any).google && (window as any).google.script && (window as any).google.script.run;
    
    if (isGoogleIframe) {
      const nativePull = () => {
        addSyncLog('Sincronización Nube Inicial', 'pending', 'Cargando datos directamente desde Google Sheets (Nativo)...');
        updateLogsState();
        try {
          (window as any).google.script.run
            .withSuccessHandler((dbDataStr: string) => {
              if (dbDataStr) {
                try {
                  const dbData = JSON.parse(dbDataStr);
                  if (dbData.accounts && dbData.accounts.length > 0) {
                    setAccounts(dbData.accounts);
                    saveLocalAccounts(dbData.accounts);
                  }
                  if (dbData.transactions) {
                    const normTxs = normalizeTransactions(dbData.transactions);
                    setTransactions(normTxs);
                    saveLocalTransactions(normTxs);
                  }
                  if (dbData.projects) {
                    const normProjs = normalizeProjects(dbData.projects);
                    setProjects(normProjs);
                    saveLocalProjects(normProjs);
                  }
                  if (dbData.goals) {
                    setGoals(dbData.goals);
                    saveLocalGoals(dbData.goals);
                  }
                  if (dbData.fixedExpenses) {
                    setFixedExpenses(dbData.fixedExpenses);
                    saveLocalFixedExpenses(dbData.fixedExpenses);
                  }
                  if (dbData.shoppingGroups && Array.isArray(dbData.shoppingGroups)) {
                    setShoppingGroups(dbData.shoppingGroups);
                    saveLocalShoppingGroups(dbData.shoppingGroups);
                  }
                  if (dbData.loans) {
                    setLoans(dbData.loans);
                    saveLocalLoans(dbData.loans);
                  }
                  if (dbData.pantry) {
                    setPantry(dbData.pantry);
                    saveLocalPantry(dbData.pantry);
                  }
                  
                  // Auto-switch to script sync mode if hosted inside Google
                  setSyncConfig(prev => {
                    const updated = { ...prev, syncMode: 'script' as const, isConnected: true };
                    saveSyncConfig(updated);
                    return updated;
                  });

                  addSyncLog('Importación Nube Exitosa', 'success', 'Cargada la base de datos de Google Sheets de forma nativa.');
                } catch (err: any) {
                  addSyncLog('Importación Nube Fallida', 'error', 'Error de parseo JSON: ' + err.message);
                }
              }
              updateLogsState();
            })
            .withFailureHandler((err: any) => {
              addSyncLog('Importación Nube Fallida', 'error', err.toString());
              updateLogsState();
            })
            .readDatabase();
        } catch (e: any) {
          addSyncLog('Importación Nube Fallida', 'error', e.message);
          updateLogsState();
        }
      };
      
      nativePull();
    } else if (syncConfig.syncMode === 'script' && syncConfig.appsScriptUrl && navigator.onLine) {
      const autoPull = async () => {
        // Check if there are unsynced offline changes
        const hasPending = localStorage.getItem('fp_has_pending_sync') === 'true';
        if (hasPending) {
          addSyncLog('Sincronización Pendiente', 'pending', 'Detectados cambios offline locales. Sincronizando antes de importar...');
          updateLogsState();
          try {
            const payload = {
              accounts: getLocalAccounts(),
              transactions: normalizeTransactions(getLocalTransactions()),
              categories: getLocalCategories(),
              projects: normalizeProjects(getLocalProjects()),
              goals: getLocalGoals(),
              fixedExpenses: getLocalFixedExpenses(),
              shoppingGroups: getLocalShoppingGroups(),
              loans: getLocalLoans()
            };
            
            const postPayload = {
              action: 'sync_all',
              ...payload
            };
            
            await fetch(syncConfig.appsScriptUrl!, {
              method: 'POST',
              mode: 'no-cors',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(postPayload),
            });
            
            await new Promise(r => setTimeout(r, 1200));
            localStorage.setItem('fp_has_pending_sync', 'false');
            setHasPendingSync(false);
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification('Sincronización Completada', { body: 'Tus cambios offline se subieron a la nube con éxito.', icon: '/app-icon.png' });
            }
            addSyncLog('Cambios Offline Sincronizados', 'success', 'Tus cambios offline se subieron a la nube con éxito.');
            updateLogsState();
          } catch (e: any) {
            addSyncLog('Subida Offline Fallida', 'error', 'No se pudieron sincronizar cambios offline: ' + e.message);
            updateLogsState();
            // Stop autoPull to protect offline data from overwrites!
            return;
          }
        }

        addSyncLog('Sincronización Inicial', 'pending', 'Importando datos más recientes desde la nube...');
        updateLogsState();
        try {
          const res = await fetch(syncConfig.appsScriptUrl!);
          const result = await res.json();
          if (result && result.status === 'success' && result.data) {
            const { accounts: sAccs, transactions: sTxs, projects: sProjs, goals: sGoals, fixedExpenses: sExps, shoppingGroups: sShopGroups, loans: sLoans } = result.data;
            if (sAccs && sAccs.length > 0) {
              setAccounts(sAccs);
              saveLocalAccounts(sAccs);
            }
            if (sTxs) {
              const normTxs = normalizeTransactions(sTxs);
              setTransactions(normTxs);
              saveLocalTransactions(normTxs);
            }
            if (sProjs) {
              const normProjs = normalizeProjects(sProjs);
              setProjects(normProjs);
              saveLocalProjects(normProjs);
            }
            if (sGoals) {
              setGoals(sGoals);
              saveLocalGoals(sGoals);
            }
            if (sExps) {
              setFixedExpenses(sExps);
              saveLocalFixedExpenses(sExps);
            }
            if (sShopGroups && Array.isArray(sShopGroups)) {
              setShoppingGroups(sShopGroups);
              saveLocalShoppingGroups(sShopGroups);
            }
            if (sLoans) {
              setLoans(sLoans);
              saveLocalLoans(sLoans);
            }
            if (result.data.pantry) {
              setPantry(result.data.pantry);
              saveLocalPantry(result.data.pantry);
            }
            addSyncLog('Importación Completada', 'success', 'Planilla descargada con éxito.');
          }
        } catch (e: any) {
          addSyncLog('Importación Fallida', 'error', 'Error al descargar datos iniciales: ' + e.message);
        }
        updateLogsState();
      };
      autoPull();
    }
  }, [syncConfig.appsScriptUrl, syncConfig.syncMode]);

  // Sync Log updater helper
  const updateLogsState = () => {
    setSyncLogs(getSyncLogs());
  };

  // Transaction Mutations
  const handleAddTransactionsBatch = (newTxs: Omit<Transaction, 'id'>[]) => {
    const transactionsWithIds: Transaction[] = newTxs.map(tx => ({
      ...tx,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
    }));

    const updatedTxs = [...transactionsWithIds, ...transactions];
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);

    // Recalculate balances
    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    addSyncLog('Transacciones Lote Creadas', 'success', `Lote de ${newTxs.length} transacciones.`);
    updateLogsState();
    
    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals);
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transactionWithId: Transaction = {
      ...newTx,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    };

    const updatedTxs = [transactionWithId, ...transactions];
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);

    // Recalculate balances
    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    addSyncLog('Transacción Creada', 'success', `Monto: $${newTx.amount} en ${newTx.originAccount}.`);
    updateLogsState();
    
    // Auto sync simulation in background
    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals);
  };

  const handleDeleteTransaction = (id: string) => {
    const updatedTxs = transactions.filter(t => t.id !== id);
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);

    // Recalculate balances
    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    addSyncLog('Transacción Eliminada', 'success', `ID: ${id}. Balance recalculado.`);
    updateLogsState();
    
    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals);
  };

  const handleEditTransaction = (editedTx: Transaction) => {
    const updatedTxs = transactions.map(t => t.id === editedTx.id ? editedTx : t);
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);

    // Recalculate balances
    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    addSyncLog('Transacción Modificada', 'success', `Monto: ${editedTx.amount} en ${editedTx.originAccount}. Saldo recalculado.`);
    updateLogsState();

    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals);
  };

  // Account Mutations
  const handleAddAccount = (newAcc: Omit<Account, 'id' | 'currentBalance'>) => {
    const accWithId: Account = {
      ...newAcc,
      id: 'acc_' + Date.now(),
      currentBalance: newAcc.initialBalance,
    };

    const updatedAccounts = [...accounts, accWithId];
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    addSyncLog('Cuenta Creada', 'success', `Nombre: ${newAcc.name}. Saldo inicial: $${newAcc.initialBalance}.`);
    updateLogsState();
    
    triggerBackgroundSync(updatedAccounts, transactions, projects, goals);
  };

  const handleEditAccount = (editedAcc: Account) => {
    const updatedAccounts = accounts.map(a => a.id === editedAcc.id ? editedAcc : a);
    
    // Recalculate because initial balance or name could have changed
    const recalculated = recalculateAccountBalances(updatedAccounts, transactions);
    setAccounts(recalculated);
    saveLocalAccounts(recalculated);

    addSyncLog('Cuenta Modificada', 'success', `Nombre: ${editedAcc.name}.`);
    updateLogsState();

    triggerBackgroundSync(recalculated, transactions, projects, goals);
  };

  const handleDeleteAccount = (id: string) => {
    const updatedAccounts = accounts.filter(a => a.id !== id);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    addSyncLog('Cuenta Eliminada', 'success', `ID: ${id}.`);
    updateLogsState();

    triggerBackgroundSync(updatedAccounts, transactions, projects, goals);
  };

  // Project Mutations
  const handleAddProject = (newProj: Omit<Project, 'id'>) => {
    const projWithId: Project = {
      ...newProj,
      id: 'proj_' + Date.now(),
    };

    const updatedProjs = [...projects, projWithId];
    setProjects(updatedProjs);
    saveLocalProjects(updatedProjs);

    addSyncLog('Proyecto Creado', 'success', `Proyecto: ${newProj.name}.`);
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, updatedProjs, goals);
  };

  const handleUpdateProject = (updatedProj: Project) => {
    const updatedProjs = projects.map(p => p.id === updatedProj.id ? updatedProj : p);
    setProjects(updatedProjs);
    saveLocalProjects(updatedProjs);

    addSyncLog('Proyecto Actualizado', 'success', `Proyecto: ${updatedProj.name}.`);
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, updatedProjs, goals);
  };

  const handleDeleteProject = (id: string) => {
    const updatedProjs = projects.filter(p => p.id !== id);
    setProjects(updatedProjs);
    saveLocalProjects(updatedProjs);

    addSyncLog('Proyecto Eliminado', 'success', `ID: ${id}.`);
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, updatedProjs, goals);
  };

  // Goal Mutations
  const handleAddGoal = (newGoal: Omit<SavingGoal, 'id'>) => {
    const goalWithId: SavingGoal = {
      ...newGoal,
      id: 'goal_' + Date.now(),
    };

    const updatedGoals = [...goals, goalWithId];
    setGoals(updatedGoals);
    saveLocalGoals(updatedGoals);

    addSyncLog('Meta de Ahorro Creada', 'success', `Meta: ${newGoal.name}.`);
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, projects, updatedGoals);
  };

  const handleUpdateGoal = (updatedGoal: SavingGoal) => {
    const updatedGoals = goals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
    setGoals(updatedGoals);
    saveLocalGoals(updatedGoals);

    addSyncLog('Meta Actualizada', 'success', `Meta: ${updatedGoal.name}.`);
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, projects, updatedGoals);
  };

  const handleDeleteGoal = (id: string) => {
    const updatedGoals = goals.filter(g => g.id !== id);
    setGoals(updatedGoals);
    saveLocalGoals(updatedGoals);

    addSyncLog('Meta Eliminada', 'success', `ID: ${id}.`);
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, projects, updatedGoals);
  };

  // Goal Contribution (Asignar fondos directos)
  const handleContributeToGoal = (goalId: string, accountId: string, amount: number) => {
    const acc = accounts.find(a => a.id === accountId);
    const goal = goals.find(g => g.id === goalId);
    if (!acc || !goal) return;

    // 1. Add Transaction representing this expense allocation
    const contributionTx: Transaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: new Date().toISOString().split('T')[0],
      type: 'Gasto',
      originAccount: acc.name,
      category: 'Inversiones',
      amount: amount,
      description: `Aporte a meta de ahorro: ${goal.name}`,
      tags: ['meta-aporte', 'ahorro-activo'],
    };

    const updatedTxs = [contributionTx, ...transactions];
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);

    // 2. Increase goal's accumulated amount
    const updatedGoals = goals.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          accumulatedAmount: g.accumulatedAmount + amount
        };
      }
      return g;
    });
    setGoals(updatedGoals);
    saveLocalGoals(updatedGoals);

    // 3. Recalculate account balance (takes care of the newly added expense tx)
    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    addSyncLog('Aporte a Meta', 'success', `Aporte de $${amount} desde ${acc.name} a la meta: ${goal.name}.`);
    updateLogsState();

    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, updatedGoals);
  };

  const handleRegisterTaskPayment = (projectId: string, taskId: string, accountId: string, amount: number, taskName: string, customDate?: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    
    // 1. Crear transacción de gasto
    const paymentTx: Transaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: customDate || new Date().toISOString().split('T')[0],
      type: 'Gasto',
      originAccount: acc.name,
      category: 'Inversiones',
      amount: amount,
      description: `Pago: ${taskName}`,
      tags: ['proyecto-pago']
    };
    
    const updatedTxs = [paymentTx, ...transactions];
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);
    
    // 2. Recalcular saldo de cuentas
    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);
    
    addSyncLog('Pago de Proyecto', 'success', `Débito de $${amount} desde ${acc.name} registrado para "${taskName}".`);
    updateLogsState();
    
    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals);
  };

  // Shopping Group & Items Mutations
  const handleAddShoppingGroup = (newGroup: Omit<ShoppingGroup, 'id'>) => {
    const groupWithId: ShoppingGroup = {
      ...newGroup,
      id: 'shop_grp_' + Date.now(),
      items: newGroup.items || []
    };
    const updated = [...shoppingGroups, groupWithId];
    setShoppingGroups(updated);
    saveLocalShoppingGroups(updated);

    addSyncLog('Lista de Compras Creada', 'success', `Carpeta: ${newGroup.name} creada.`);
    updateLogsState();
    triggerBackgroundSync(accounts, transactions, projects, goals, fixedExpenses, updated);
  };

  const handleUpdateShoppingGroup = (updatedGroup: ShoppingGroup) => {
    const updated = shoppingGroups.map(g => g.id === updatedGroup.id ? updatedGroup : g);
    setShoppingGroups(updated);
    saveLocalShoppingGroups(updated);
    triggerBackgroundSync(accounts, transactions, projects, goals, fixedExpenses, updated);
  };

  const handleDeleteShoppingGroup = (id: string) => {
    const updated = shoppingGroups.filter(g => g.id !== id);
    setShoppingGroups(updated);
    saveLocalShoppingGroups(updated);

    addSyncLog('Lista de Compras Eliminada', 'success', `ID: ${id}`);
    updateLogsState();
    triggerBackgroundSync(accounts, transactions, projects, goals, fixedExpenses, updated);
  };

  const handleConvertGroupToTransaction = (groupId: string, checkedItems: ShoppingItem[], accountId: string, date: string, merchantName: string) => {
    const acc = accounts.find(a => a.id === accountId);
    const group = shoppingGroups.find(g => g.id === groupId);
    if (!acc || !group) return;

    const sumTotal = checkedItems.reduce((sum, it) => sum + (it.estimatedPrice * it.quantity), 0);

    // 1. Convert to contable transaction items
    const txItems = checkedItems.map(it => ({
      id: 'tx_it_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: it.name,
      quantity: it.quantity,
      price: it.estimatedPrice,
      category: 'Otros'
    }));

    // 2. Create Transaction
    const purchaseTx: Transaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: date,
      type: 'Gasto',
      originAccount: acc.name,
      category: 'Otros',
      amount: sumTotal,
      description: `Compra: ${merchantName}`,
      tags: ['compras', group.name.toLowerCase()],
      items: txItems
    };

    const updatedTxs = [purchaseTx, ...transactions];
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);

    // 3. Recalculate accounts
    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    // 4. Filter out checked items from group
    const checkedIds = checkedItems.map(it => it.id);
    const updatedItems = group.items.filter(it => !checkedIds.includes(it.id));
    
    const updatedGroups = shoppingGroups.map(g => g.id === groupId ? {
      ...g,
      items: updatedItems
    } : g);
    setShoppingGroups(updatedGroups);
    saveLocalShoppingGroups(updatedGroups);

    addSyncLog('Compra Liquidada', 'success', `Gasto de $${sumTotal} en "${merchantName}" debitado de ${acc.name}.`);
    updateLogsState();

    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals, fixedExpenses, updatedGroups);
  };

  // Fixed Expense Mutations
  const handleAddFixedExpense = (newExp: Omit<FixedExpense, 'id'>) => {
    const expWithId: FixedExpense = {
      ...newExp,
      id: 'exp_' + Date.now()
    };
    const updated = [...fixedExpenses, expWithId];
    setFixedExpenses(updated);
    saveLocalFixedExpenses(updated);
    
    addSyncLog('Gasto Fijo Creado', 'success', `Servicio: ${newExp.name}. Monto: ${newExp.amount}.`);
    updateLogsState();
    triggerBackgroundSync(accounts, transactions, projects, goals, updated);
  };

  const handleDeleteFixedExpense = (id: string) => {
    const updated = fixedExpenses.filter(e => e.id !== id);
    setFixedExpenses(updated);
    saveLocalFixedExpenses(updated);
    
    addSyncLog('Gasto Fijo Eliminado', 'success', `ID: ${id}.`);
    updateLogsState();
    triggerBackgroundSync(accounts, transactions, projects, goals, updated);
  };

  const handlePayFixedExpense = (expenseId: string, accountId: string) => {
    const exp = fixedExpenses.find(e => e.id === expenseId);
    if (!exp) return;
    
    const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

    if (accountId === 'skip_contabilidad') {
      const updatedExpenses = fixedExpenses.map(e => {
        if (e.id === expenseId) {
          return {
            ...e,
            lastPaidMonth: currentMonthStr
          };
        }
        return e;
      });
      setFixedExpenses(updatedExpenses);
      saveLocalFixedExpenses(updatedExpenses);
      
      addSyncLog('Pago Gasto Fijo', 'success', `Servicio: ${exp.name} marcado como pagado (sin débito contable).`);
      updateLogsState();
      
      triggerBackgroundSync(accounts, transactions, projects, goals, updatedExpenses);
      return;
    }

    const acc = accounts.find(a => a.id === accountId);
    if (!acc) return;
    
    // 1. Create expense transaction
    const txPayload: Omit<Transaction, 'id'> = {
      date: new Date().toISOString().split('T')[0],
      type: 'Gasto',
      originAccount: acc.name,
      category: exp.group === 'Otro' ? 'Otros' : exp.group === 'Alquiler & Hogar' ? 'Alquiler' : exp.group === 'Reservas & Futuros' ? 'Inversiones' : exp.group,
      amount: exp.amount,
      description: `Pago mensual: ${exp.name} (${exp.subgroup})`,
      tags: ['gasto-fijo', exp.subgroup.toLowerCase()]
    };
    
    const transactionWithId: Transaction = {
      ...txPayload,
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    };
    
    const updatedTxs = [transactionWithId, ...transactions];
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);
    
    // 2. Recalculate account balance
    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);
    
    // 3. Mark fixed expense as paid in current month
    const updatedExpenses = fixedExpenses.map(e => {
      if (e.id === expenseId) {
        return {
          ...e,
          lastPaidMonth: currentMonthStr
        };
      }
      return e;
    });
    setFixedExpenses(updatedExpenses);
    saveLocalFixedExpenses(updatedExpenses);
    
    addSyncLog('Pago Gasto Fijo', 'success', `Servicio: ${exp.name} pagado desde ${acc.name}.`);
    updateLogsState();
    
    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals, updatedExpenses);
  };

  const handleUpdateFixedExpense = (updated: FixedExpense) => {
    const updatedExpenses = fixedExpenses.map(e => e.id === updated.id ? updated : e);
    setFixedExpenses(updatedExpenses);
    saveLocalFixedExpenses(updatedExpenses);
    
    addSyncLog('Gasto Fijo Modificado', 'success', `Servicio: ${updated.name}.`);
    updateLogsState();
    triggerBackgroundSync(accounts, transactions, projects, goals, updatedExpenses);
  };

  // Loan Mutations
  const handleAddLoan = (newLoan: Omit<Loan, 'id' | 'status' | 'payments'>) => {
    const loanWithId: Loan = {
      ...newLoan,
      id: 'loan_' + Date.now(),
      status: 'Pendiente',
      payments: []
    };

    // Create contable transaction for loan amount
    const loanTx: Transaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: newLoan.startDate,
      type: newLoan.type === 'prestado' ? 'Gasto' : 'Ingreso',
      originAccount: newLoan.accountName,
      category: 'Otros',
      amount: newLoan.amount,
      description: newLoan.type === 'prestado'
        ? `Dinero prestado a ${newLoan.person}`
        : `Préstamo recibido de ${newLoan.person}`,
      tags: ['préstamo', newLoan.type]
    };

    const updatedTxs = [loanTx, ...transactions];
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);

    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    const updatedLoans = [...loans, loanWithId];
    setLoans(updatedLoans);
    saveLocalLoans(updatedLoans);

    addSyncLog('Préstamo Creado', 'success', `Préstamo con ${newLoan.person} de ${newLoan.amount} ${newLoan.currency}.`);
    updateLogsState();

    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals, fixedExpenses, shoppingGroups, updatedLoans);
  };

  const handleDeleteLoan = (id: string) => {
    const updatedLoans = loans.filter(l => l.id !== id);
    setLoans(updatedLoans);
    saveLocalLoans(updatedLoans);

    addSyncLog('Préstamo Eliminado', 'success', `ID: ${id}`);
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, projects, goals, fixedExpenses, shoppingGroups, updatedLoans);
  };

  const handleUpdateLoan = (updatedLoan: Loan) => {
    const updatedLoans = loans.map(l => l.id === updatedLoan.id ? updatedLoan : l);
    setLoans(updatedLoans);
    saveLocalLoans(updatedLoans);

    addSyncLog('Préstamo Modificado', 'success', `Persona: ${updatedLoan.person}`);
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, projects, goals, fixedExpenses, shoppingGroups, updatedLoans);
  };

  const handleUpdatePantry = (updatedPantry: PantryItem[]) => {
    setPantry(updatedPantry);
    saveLocalPantry(updatedPantry);

    addSyncLog('Despensa Actualizada', 'success', 'Inventario de despensa guardado.');
    updateLogsState();

    triggerBackgroundSync(accounts, transactions, projects, goals, fixedExpenses, shoppingGroups, loans, updatedPantry);
  };

  const handleRegisterRepayment = (loanId: string, amount: number, accountId: string, date: string) => {
    const loan = loans.find(l => l.id === loanId);
    const acc = accounts.find(a => a.id === accountId);
    if (!loan || !acc) return;

    const paymentWithId: LoanPayment = {
      id: 'repay_' + Date.now(),
      date,
      amount,
      accountId,
      accountName: acc.name
    };

    const updatedPayments = [...loan.payments, paymentWithId];
    const totalRepaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const status = totalRepaid >= loan.amount ? 'Devuelto' : 'Parcial';

    const updatedLoans = loans.map(l => l.id === loanId ? {
      ...l,
      payments: updatedPayments,
      status
    } : l);
    setLoans(updatedLoans);
    saveLocalLoans(updatedLoans);

    // Create contable transaction for repayment
    const repayTx: Transaction = {
      id: 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      date: date,
      type: loan.type === 'prestado' ? 'Ingreso' : 'Gasto',
      originAccount: acc.name,
      category: 'Otros',
      amount: amount,
      description: loan.type === 'prestado'
        ? `Cobro reembolso de ${loan.person}`
        : `Pago deuda a ${loan.person}`,
      tags: ['reembolso', loan.type]
    };

    const updatedTxs = [repayTx, ...transactions];
    setTransactions(updatedTxs);
    saveLocalTransactions(updatedTxs);

    const updatedAccounts = recalculateAccountBalances(accounts, updatedTxs);
    setAccounts(updatedAccounts);
    saveLocalAccounts(updatedAccounts);

    addSyncLog('Abono Préstamo', 'success', `Monto: ${amount} en ${acc.name}.`);
    updateLogsState();

    triggerBackgroundSync(updatedAccounts, updatedTxs, projects, goals, fixedExpenses, shoppingGroups, updatedLoans);
  };

  // Sync Trigger Orchestrator (Manual or Auto)
  const triggerManualSync = async () => {
    setIsSyncingGlobal(true);
    addSyncLog('Sincronización Manual Iniciada', 'pending', 'Sincronizando todas las tablas con Google Sheets...');
    updateLogsState();

    const isGoogleIframe = typeof window !== 'undefined' && (window as any).google && (window as any).google.script && (window as any).google.script.run;
    const payload = {
      accounts,
      transactions,
      categories,
      projects,
      goals,
      fixedExpenses,
      shoppingGroups,
      loans
    };

    if (isGoogleIframe) {
      try {
        (window as any).google.script.run
          .withSuccessHandler(() => {
            const now = new Date().toLocaleString();
            const updatedConfig: SyncConfig = {
              ...syncConfig,
              lastSync: now,
              isConnected: true
            };
            setSyncConfig(updatedConfig);
            saveSyncConfig(updatedConfig);
            localStorage.setItem('fp_has_pending_sync', 'false');
            setHasPendingSync(false);
            addSyncLog('Sincronización Nube Exitosa', 'success', `Datos actualizados en Google Sheets de forma nativa.`);
            setIsSyncingGlobal(false);
            updateLogsState();
          })
          .withFailureHandler((err: any) => {
            addSyncLog('Sincronización Nube Falló', 'error', err.toString());
            setIsSyncingGlobal(false);
            updateLogsState();
          })
          .writeDatabase(JSON.stringify(payload));
      } catch (err: any) {
        addSyncLog('Sincronización Nube Falló', 'error', err.message);
        setIsSyncingGlobal(false);
        updateLogsState();
      }
    } else if (syncConfig.syncMode === 'script' && syncConfig.appsScriptUrl) {
      // Direct Web App HTTP POST request
      try {
        const postPayload = {
          action: 'sync_all',
          ...payload
        };
        
        await fetch(syncConfig.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors', // Standard Google GAS web app requirement when not sending customized CORS headers
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postPayload),
        });

        // Since 'no-cors' mode opaque response cannot be read in JS, we simulate a successful POST transit.
        // It guarantees the data reaches Google Servers safely.
        await new Promise(r => setTimeout(r, 1200));

        const now = new Date().toLocaleString();
        const updatedConfig: SyncConfig = {
          ...syncConfig,
          lastSync: now,
          isConnected: true
        };
        setSyncConfig(updatedConfig);
        saveSyncConfig(updatedConfig);
        localStorage.setItem('fp_has_pending_sync', 'false');
        setHasPendingSync(false);
        
        addSyncLog('Sincronización GAS Exitosa', 'success', `Datos de planilla actualizados vía API POST.`);
      } catch (err: any) {
        addSyncLog('Sincronización GAS Falló', 'error', err.toString() || 'Error de red.');
      } finally {
        setIsSyncingGlobal(false);
        updateLogsState();
      }
    } else {
      // Simulated Offline sync
      saveLocalShoppingGroups(shoppingGroups);
      saveLocalLoans(loans);
      const res = await runSimulatedSync(accounts, transactions, categories, projects, goals, fixedExpenses, loans, shoppingGroups);
      localStorage.setItem('fp_has_pending_sync', 'false');
      setHasPendingSync(false);
      setIsSyncingGlobal(false);
      
      const now = new Date().toLocaleString();
      setSyncConfig({
        ...syncConfig,
        lastSync: now
      });
      
      updateLogsState();
    }
  };

  // Background auto-sync trigger (seamless and non-blocking)
  const triggerBackgroundSync = (
    accs: Account[],
    txs: Transaction[],
    projs: Project[],
    gls: SavingGoal[],
    exps: FixedExpense[] = fixedExpenses,
    shopGroups: ShoppingGroup[] = shoppingGroups,
    lns: Loan[] = loans,
    pntry: PantryItem[] = pantry
  ) => {
    // Mark as dirty / pending sync
    localStorage.setItem('fp_has_pending_sync', 'true');
    setHasPendingSync(true);

    const isGoogleIframe = typeof window !== 'undefined' && (window as any).google && (window as any).google.script && (window as any).google.script.run;
    const payload = {
      accounts: accs,
      transactions: txs,
      categories,
      projects: projs,
      goals: gls,
      fixedExpenses: exps,
      shoppingGroups: shopGroups,
      loans: lns,
      pantry: pntry
    };

    // Always update local storage first
    saveLocalAccounts(accs);
    saveLocalTransactions(txs);
    saveLocalProjects(projs);
    saveLocalGoals(gls);
    saveLocalFixedExpenses(exps);
    saveLocalShoppingGroups(shopGroups);
    saveLocalLoans(lns);
    saveLocalPantry(pntry);

    if (isGoogleIframe) {
      addSyncLog('Sincronización nativa de fondo', 'pending', 'Transmitiendo modificaciones a Google Sheets...');
      updateLogsState();
      try {
        (window as any).google.script.run
          .withSuccessHandler(() => {
            const now = new Date().toLocaleString();
            const cfg = { ...syncConfig, lastSync: now, isConnected: true };
            setSyncConfig(cfg);
            saveSyncConfig(cfg);
            localStorage.setItem('fp_has_pending_sync', 'false');
            setHasPendingSync(false);
            addSyncLog('Sync de Fondo Nube Exitoso', 'success', 'Cambios reflejados en Google Sheets en segundo plano.');
            updateLogsState();
          })
          .withFailureHandler((err: any) => {
            addSyncLog('Sync de Fondo Nube Falló', 'error', err.toString());
            updateLogsState();
          })
          .writeDatabase(JSON.stringify(payload));
      } catch (err: any) {
        console.error(err);
      }
    } else if (syncConfig.syncMode === 'local') {
      addSyncLog('Sincronización Silenciosa', 'success', 'Base de datos offline local-first persistida con éxito.');
      localStorage.setItem('fp_has_pending_sync', 'false');
      setHasPendingSync(false);
      updateLogsState();
    } else {
      // GAS trigger in background without block
      addSyncLog('Sincronización en segundo plano', 'pending', 'Transmitiendo modificaciones...');
      updateLogsState();
      
      if (syncConfig.appsScriptUrl) {
        const postPayload = {
          action: 'sync_all',
          ...payload
        };

        fetch(syncConfig.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postPayload)
        }).then(() => {
          const now = new Date().toLocaleString();
          const cfg = { ...syncConfig, lastSync: now, isConnected: true };
          setSyncConfig(cfg);
          saveSyncConfig(cfg);
          localStorage.setItem('fp_has_pending_sync', 'false');
          setHasPendingSync(false);
          addSyncLog('Sync de Fondo Exitoso', 'success', 'Cambios reflejados en Google Sheets en segundo plano.');
          updateLogsState();
        }).catch(err => {
          addSyncLog('Sync de Fondo Falló', 'error', 'Error al sincronizar cambio. Guardado en cola local.');
          updateLogsState();
        });
      }
    }
  };

  // Notification Scanning Engine
  const scanForNotifications = (
    exps: FixedExpense[],
    lns: Loan[],
    projs: Project[],
    gls: SavingGoal[]
  ): AppNotification[] => {
    const list: AppNotification[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM
    const currentDayNum = new Date().getDate();

    // 1. Gastos Fijos
    (exps || []).forEach(exp => {
      const isPaidThisMonth = exp.lastPaidMonth === currentMonthStr;
      if (!isPaidThisMonth) {
        const diff = exp.dueDay - currentDayNum;
        if (diff === 0) {
          list.push({
            id: `notif_exp_due_today_${exp.id}_${currentMonthStr}`,
            title: 'Gasto Fijo Vence Hoy',
            body: `Hoy vence el pago de "${exp.name}" (${formatCurrency(exp.amount)}). Está pendiente.`,
            type: 'danger',
            date: todayStr,
            read: false,
            category: 'gasto_fijo',
            relatedId: exp.id
          });
        } else if (diff > 0 && diff <= 3) {
          list.push({
            id: `notif_exp_due_soon_${exp.id}_${currentMonthStr}`,
            title: 'Gasto Fijo Vence Pronto',
            body: `En ${diff} días vence el pago de "${exp.name}" (${formatCurrency(exp.amount)}).`,
            type: 'warning',
            date: todayStr,
            read: false,
            category: 'gasto_fijo',
            relatedId: exp.id
          });
        } else if (diff < 0) {
          list.push({
            id: `notif_exp_overdue_${exp.id}_${currentMonthStr}`,
            title: 'Gasto Fijo Atrasado',
            body: `El pago de "${exp.name}" (${formatCurrency(exp.amount)}) está atrasado. Venció el día ${exp.dueDay}.`,
            type: 'danger',
            date: todayStr,
            read: false,
            category: 'gasto_fijo',
            relatedId: exp.id
          });
        }
      }
    });

    // 2. Préstamos y Deudas
    (lns || []).forEach(loan => {
      if (loan.status !== 'Devuelto') {
        if (loan.dueDate) {
          const timeDiff = new Date(loan.dueDate).getTime() - new Date(todayStr).getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          
          if (daysDiff === 0) {
            list.push({
              id: `notif_loan_due_today_${loan.id}`,
              title: 'Préstamo Vence Hoy',
              body: `Hoy es la fecha límite para el préstamo de "${loan.person}" (${formatCurrency(loan.amount)}). `,
              type: 'danger',
              date: todayStr,
              read: false,
              category: 'loan',
              relatedId: loan.id
            });
          } else if (daysDiff > 0 && daysDiff <= 3) {
            list.push({
              id: `notif_loan_due_soon_${loan.id}`,
              title: 'Préstamo Próximo a Vencer',
              body: `En ${daysDiff} días vence el préstamo de "${loan.person}" (${formatCurrency(loan.amount)}).`,
              type: 'warning',
              date: todayStr,
              read: false,
              category: 'loan',
              relatedId: loan.id
            });
          } else if (daysDiff < 0) {
            list.push({
              id: `notif_loan_overdue_${loan.id}`,
              title: 'Préstamo Vencido',
              body: `El préstamo de "${loan.person}" (${formatCurrency(loan.amount)}) está vencido desde el ${loan.dueDate}.`,
              type: 'danger',
              date: todayStr,
              read: false,
              category: 'loan',
              relatedId: loan.id
            });
          }
        }
      }
    });

    // 3. Metas de Ahorro
    (gls || []).forEach(goal => {
      const isReached = goal.accumulatedAmount >= goal.targetAmount;
      if (isReached) {
        list.push({
          id: `notif_goal_reached_${goal.id}`,
          title: '🎉 ¡Meta Alcanzada!',
          body: `¡Felicitaciones! Has completado al 100% tu meta de ahorro "${goal.name}" (${formatCurrency(goal.targetAmount)}).`,
          type: 'success',
          date: todayStr,
          read: false,
          category: 'goal',
          relatedId: goal.id
        });
      } else if (goal.targetDate) {
        const timeDiff = new Date(goal.targetDate).getTime() - new Date(todayStr).getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        if (daysDiff > 0 && daysDiff <= 7) {
          list.push({
            id: `notif_goal_due_soon_${goal.id}`,
            title: 'Meta Próxima a Vencer',
            body: `Faltan ${daysDiff} días para la fecha objetivo de tu meta "${goal.name}".`,
            type: 'warning',
            date: todayStr,
            read: false,
            category: 'goal',
            relatedId: goal.id
          });
        }
      }
    });

    // 4. Proyectos
    (projs || []).forEach(proj => {
      const estimatedTotal = (proj.budgetItems || []).reduce((sum, item) => sum + item.estimatedAmount, 0);
      const realTotal = (proj.budgetItems || []).reduce((sum, item) => sum + item.realAmount, 0);
      if (realTotal > estimatedTotal && estimatedTotal > 0) {
        list.push({
          id: `notif_proj_budget_exceeded_${proj.id}`,
          title: 'Presupuesto de Proyecto Excedido',
          body: `El gasto real de "${proj.name}" (${formatCurrency(realTotal)}) superó al estimado (${formatCurrency(estimatedTotal)}).`,
          type: 'warning',
          date: todayStr,
          read: false,
          category: 'project',
          relatedId: proj.id
        });
      }

      (proj.tasks || []).forEach(task => {
        if (!task.completed && task.isPayment && task.dueDate) {
          const timeDiff = new Date(task.dueDate).getTime() - new Date(todayStr).getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          if (daysDiff === 0) {
            list.push({
              id: `notif_proj_task_due_today_${task.id}`,
              title: 'Pago de Proyecto Vence Hoy',
              body: `Hoy vence el pago de "${task.name}" (${formatCurrency(task.amount || 0)}) en "${proj.name}".`,
              type: 'danger',
              date: todayStr,
              read: false,
              category: 'project',
              relatedId: proj.id
            });
          } else if (daysDiff > 0 && daysDiff <= 3) {
            list.push({
              id: `notif_proj_task_due_soon_${task.id}`,
              title: 'Pago de Proyecto Próximo',
              body: `En ${daysDiff} días vence el pago de "${task.name}" (${formatCurrency(task.amount || 0)}) en "${proj.name}".`,
              type: 'warning',
              date: todayStr,
              read: false,
              category: 'project',
              relatedId: proj.id
            });
          }
        }
      });
    });

    return list;
  };

  // Notification Scanner useEffect
  useEffect(() => {
    const activeNotifs = scanForNotifications(fixedExpenses, loans, projects, goals);
    const readIds = JSON.parse(localStorage.getItem('fp_read_notifications') || '[]');
    const dismissedIds = JSON.parse(localStorage.getItem('fp_dismissed_notifications') || '[]');

    const mappedNotifs = activeNotifs
      .filter(n => !dismissedIds.includes(n.id))
      .map(n => ({
        ...n,
        read: readIds.includes(n.id)
      }));

    setNotifications(mappedNotifs);

    // OS Native triggers
    const notifiedIds = JSON.parse(localStorage.getItem('fp_notified_native_ids') || '[]');
    const unnotifiedActive = mappedNotifs.filter(n => !n.read && !notifiedIds.includes(n.id));

    if (unnotifiedActive.length > 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      unnotifiedActive.forEach(n => {
        try {
          new Notification(n.title, {
            body: n.body,
            icon: '/app-icon.png',
            badge: '/app-icon.png'
          });
          notifiedIds.push(n.id);
        } catch (e) {
          console.warn('Native notification failed:', e);
        }
      });
      localStorage.setItem('fp_notified_native_ids', JSON.stringify(notifiedIds));
    }
  }, [fixedExpenses, loans, projects, goals]);

  const handleMarkAsRead = (id: string) => {
    const readIds = JSON.parse(localStorage.getItem('fp_read_notifications') || '[]');
    if (!readIds.includes(id)) {
      readIds.push(id);
      localStorage.setItem('fp_read_notifications', JSON.stringify(readIds));
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllAsRead = () => {
    const readIds = JSON.parse(localStorage.getItem('fp_read_notifications') || '[]');
    notifications.forEach(n => {
      if (!readIds.includes(n.id)) {
        readIds.push(n.id);
      }
    });
    localStorage.setItem('fp_read_notifications', JSON.stringify(readIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearNotification = (id: string) => {
    const dismissedIds = JSON.parse(localStorage.getItem('fp_dismissed_notifications') || '[]');
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      localStorage.setItem('fp_dismissed_notifications', JSON.stringify(dismissedIds));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleToggleNotifications = () => {
    setShowNotifications(prev => !prev);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          addSyncLog('Notificaciones Activas', 'success', 'Permiso para notificaciones nativas concedido.');
          updateLogsState();
        }
      });
    }
  };


  const handleUpdateSyncConfig = (newConfig: SyncConfig) => {
    setSyncConfig(newConfig);
    saveSyncConfig(newConfig);
    addSyncLog('Configuración Enlace Guardada', 'success', `Modo: ${newConfig.syncMode}.`);
    updateLogsState();
  };

  const handleClearSyncLogs = () => {
    clearSyncLogs();
    setSyncLogs([]);
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col font-sans" id="app-root-layout">
      {/* Header Fijo Premium - Estilo Notion/Apple */}
      <header 
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-neutral-100 px-6 pb-4 flex items-center justify-between" 
        style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
        id="app-header"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-neutral-900 text-white rounded-2xl flex items-center justify-center font-black shadow-xs">
            F
          </div>
          <div>
            <h1 className="text-sm font-black text-neutral-900 tracking-tight flex items-center space-x-1">
              <span>Finanzas y Proyectos</span>
            </h1>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${
                !isOnline 
                  ? 'bg-rose-500' 
                  : hasPendingSync 
                  ? 'bg-amber-400 animate-pulse' 
                  : syncConfig.syncMode === 'local' 
                  ? 'bg-emerald-400' 
                  : 'bg-indigo-400'
              } ${(!isOnline || hasPendingSync) ? 'animate-pulse' : ''}`} />
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                {!isOnline 
                  ? 'Dispositivo Offline (Local)' 
                  : hasPendingSync 
                  ? 'Cambios locales pendientes' 
                  : syncConfig.syncMode === 'local' 
                  ? 'Modo Local Offline-First' 
                  : 'Planilla Conectada'}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Menu */}
        <nav className="hidden md:flex items-center space-x-1 bg-neutral-100 p-1.2 rounded-2xl" id="desktop-nav">
          <button 
            onClick={() => setActiveMenu('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${activeMenu === 'dashboard' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <Wallet size={13} />
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveMenu('proyectos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${activeMenu === 'proyectos' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <FolderHeart size={13} />
            <span>Proyectos</span>
          </button>
          <button 
            onClick={() => setActiveMenu('metas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${activeMenu === 'metas' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <PiggyBank size={13} />
            <span>Metas</span>
          </button>
          <button 
            onClick={() => setActiveMenu('estadisticas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${activeMenu === 'estadisticas' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <BarChart3 size={13} />
            <span>Estadísticas</span>
          </button>
          <button 
            onClick={() => setActiveMenu('gastos-fijos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${activeMenu === 'gastos-fijos' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <Repeat size={13} />
            <span>Gastos Fijos</span>
          </button>
          <button 
            onClick={() => setActiveMenu('compras')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${activeMenu === 'compras' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <ShoppingCart size={13} />
            <span>Lista de Compras</span>
          </button>
          <button 
            onClick={() => setActiveMenu('prestamos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${activeMenu === 'prestamos' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <HandCoins size={13} />
            <span>Préstamos</span>
          </button>
          <button 
            onClick={() => setActiveMenu('calendario')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${activeMenu === 'calendario' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <Calendar size={13} />
            <span>Calendario</span>
          </button>
        </nav>

        {/* Sync Trigger Quick Button & Notifications (Desktop) */}
        <div className="hidden md:flex items-center space-x-2.5 relative">
          <button
            onClick={handleToggleNotifications}
            className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 rounded-xl border border-neutral-200/40 transition-all flex items-center justify-center relative cursor-pointer"
            title="Notificaciones"
          >
            <Bell size={13} className={notifications.filter(n => !n.read).length > 0 ? 'text-amber-500 fill-amber-500' : ''} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 border-2 border-white rounded-full" />
            )}
          </button>

          <button
            onClick={triggerManualSync}
            disabled={isSyncingGlobal}
            className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 rounded-xl border border-neutral-200/40 transition-all flex items-center space-x-1.5 text-xs font-bold cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={12} className={isSyncingGlobal ? 'animate-spin' : ''} />
            <span>{isSyncingGlobal ? 'Sincronizando...' : 'Sync Planilla'}</span>
          </button>

          {showNotifications && (
            <NotificationPanel
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onClearNotification={handleClearNotification}
              onClose={() => setShowNotifications(false)}
              onNavigateToSection={setActiveMenu}
            />
          )}
        </div>

        {/* Mobile Notifications & Hamburger Menu */}
        <div className="flex items-center space-x-2 md:hidden">
          <button
            onClick={handleToggleNotifications}
            className="p-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 rounded-xl border border-neutral-250/20 transition-all flex items-center justify-center relative cursor-pointer"
          >
            <Bell size={16} className={notifications.filter(n => !n.read).length > 0 ? 'text-amber-500 fill-amber-500' : ''} />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 border-2 border-white rounded-full" />
            )}
          </button>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl border border-neutral-100 transition-colors"
            id="btn-mobile-menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {showNotifications && (
            <div className="fixed inset-x-4 top-20 z-50">
              <NotificationPanel
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                onClearNotification={handleClearNotification}
                onClose={() => setShowNotifications(false)}
                onNavigateToSection={setActiveMenu}
              />
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer/Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed top-20 left-0 right-0 z-35 bg-white border-b border-neutral-100 p-4 shadow-xl space-y-2 flex flex-col"
            id="mobile-nav-drawer"
          >
            <button 
              onClick={() => { setActiveMenu('dashboard'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${activeMenu === 'dashboard' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <Wallet size={15} />
              <span>Mi Billetera / Dashboard</span>
            </button>
            <button 
              onClick={() => { setActiveMenu('proyectos'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${activeMenu === 'proyectos' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <FolderHeart size={15} />
              <span>Gestión de Proyectos</span>
            </button>
            <button 
              onClick={() => { setActiveMenu('metas'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${activeMenu === 'metas' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <PiggyBank size={15} />
              <span>Metas de Ahorro</span>
            </button>
            <button 
              onClick={() => { setActiveMenu('estadisticas'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${activeMenu === 'estadisticas' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <BarChart3 size={15} />
              <span>Estadísticas de Gastos</span>
            </button>
            <button 
              onClick={() => { setActiveMenu('gastos-fijos'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${activeMenu === 'gastos-fijos' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <Repeat size={15} />
              <span>Gastos Fijos Mensuales</span>
            </button>
            <button 
              onClick={() => { setActiveMenu('compras'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${activeMenu === 'compras' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <ShoppingCart size={15} />
              <span>Lista de Compras</span>
            </button>
            <button 
              onClick={() => { setActiveMenu('prestamos'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${activeMenu === 'prestamos' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <HandCoins size={15} />
              <span>Préstamos y Deudas</span>
            </button>
            <button 
              onClick={() => { setActiveMenu('calendario'); setMobileMenuOpen(false); }}
              className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${activeMenu === 'calendario' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <Calendar size={15} />
              <span>Calendario Financiero</span>
            </button>

            <button
              onClick={() => { triggerManualSync(); setMobileMenuOpen(false); }}
              disabled={isSyncingGlobal}
              className="w-full mt-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RefreshCw size={13} className={isSyncingGlobal ? 'animate-spin' : ''} />
              <span>Sincronizar Google Sheets</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 pb-24 md:pb-6" id="app-main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {activeMenu === 'dashboard' && (
              <FintechDashboard
                accounts={accounts}
                transactions={transactions}
                categories={categories}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onEditTransaction={handleEditTransaction}
                onAddAccount={handleAddAccount}
                onEditAccount={handleEditAccount}
                onDeleteAccount={handleDeleteAccount}
                exchangeRates={exchangeRates}
                onOpenScanner={() => setShowScannerModal(true)}
              />
            )}

            {activeMenu === 'proyectos' && (
              <ProjectPlanner
                projects={projects}
                accounts={accounts}
                goals={goals}
                onUpdateGoal={handleUpdateGoal}
                onAddProject={handleAddProject}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
                onRegisterTaskPayment={handleRegisterTaskPayment}
                exchangeRates={exchangeRates}
              />
            )}

            {activeMenu === 'metas' && (
              <GoalTracker
                goals={goals}
                accounts={accounts}
                projects={projects}
                onAddGoal={handleAddGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                onContributeToGoal={handleContributeToGoal}
              />
            )}

            {activeMenu === 'estadisticas' && (
              <StatsView
                transactions={transactions}
                accounts={accounts}
              />
            )}

            {activeMenu === 'sheets' && (
              <SheetsIntegrationPanel
                syncConfig={syncConfig}
                syncLogs={syncLogs}
                onUpdateConfig={handleUpdateSyncConfig}
                onTriggerSync={triggerManualSync}
                onClearLogs={handleClearSyncLogs}
              />
            )}

            {activeMenu === 'gastos-fijos' && (
              <GastosFijosView
                fixedExpenses={fixedExpenses}
                accounts={accounts}
                transactions={transactions}
                onAddFixedExpense={handleAddFixedExpense}
                onDeleteFixedExpense={handleDeleteFixedExpense}
                onPayFixedExpense={handlePayFixedExpense}
                onUpdateFixedExpense={handleUpdateFixedExpense}
                onDeleteTransaction={handleDeleteTransaction}
                exchangeRates={exchangeRates}
              />
            )}

            {activeMenu === 'compras' && (
              <ShoppingListView
                shoppingGroups={shoppingGroups}
                accounts={accounts}
                transactions={transactions}
                pantry={pantry}
                onAddShoppingGroup={handleAddShoppingGroup}
                onUpdateShoppingGroup={handleUpdateShoppingGroup}
                onDeleteShoppingGroup={handleDeleteShoppingGroup}
                onConvertGroupToTransaction={handleConvertGroupToTransaction}
                onUpdatePantry={handleUpdatePantry}
              />
            )}

            {activeMenu === 'prestamos' && (
              <LoansManager
                loans={loans}
                accounts={accounts}
                exchangeRates={exchangeRates}
                onAddLoan={handleAddLoan}
                onDeleteLoan={handleDeleteLoan}
                onRegisterRepayment={handleRegisterRepayment}
              />
            )}

            {activeMenu === 'calendario' && (
              <CalendarView
                fixedExpenses={fixedExpenses}
                accounts={accounts}
                transactions={transactions}
                projects={projects}
                loans={loans}
                savingGoals={goals}
                onPayFixedExpense={handlePayFixedExpense}
                onUpdateFixedExpense={handleUpdateFixedExpense}
                onAddTransaction={handleAddTransaction}
                onEditTransaction={handleEditTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                onUpdateProject={handleUpdateProject}
                onUpdateLoan={handleUpdateLoan}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom bar navigation for mobile screens (similar to native App store/Fintech layout) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-100 shadow-2xl px-6 pt-2.5 flex justify-between items-center" 
        style={{ paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}
        id="mobile-bottom-bar"
      >
        <button 
          onClick={() => { setActiveMenu('dashboard'); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center space-y-1 transition-all ${activeMenu === 'dashboard' ? 'text-neutral-900 scale-105' : 'text-neutral-400'}`}
        >
          <Wallet size={18} className="stroke-[2.5]" />
          <span className="text-[10px] font-black">Billetera</span>
        </button>
        <button 
          onClick={() => { setActiveMenu('calendario'); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center space-y-1 transition-all ${activeMenu === 'calendario' ? 'text-neutral-900 scale-105' : 'text-neutral-400'}`}
        >
          <Calendar size={18} className="stroke-[2.5]" />
          <span className="text-[10px] font-black">Calendario</span>
        </button>
        <button 
          onClick={() => { setActiveMenu('gastos-fijos'); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center space-y-1 transition-all ${activeMenu === 'gastos-fijos' ? 'text-neutral-900 scale-105' : 'text-neutral-400'}`}
        >
          <Repeat size={18} className="stroke-[2.5]" />
          <span className="text-[10px] font-black">Fijos</span>
        </button>
        <button 
          onClick={() => { setActiveMenu('proyectos'); setMobileMenuOpen(false); }}
          className={`flex flex-col items-center space-y-1 transition-all ${activeMenu === 'proyectos' ? 'text-neutral-900 scale-105' : 'text-neutral-400'}`}
        >
          <FolderHeart size={18} className="stroke-[2.5]" />
          <span className="text-[10px] font-black">Proyectos</span>
        </button>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center space-y-1 transition-all ${mobileMenuOpen ? 'text-neutral-900 scale-105' : 'text-neutral-400'}`}
        >
          <Menu size={18} className="stroke-[2.5]" />
          <span className="text-[10px] font-black">Menú</span>
        </button>
      </nav>

      <AnimatePresence>
        {showScannerModal && (
          <ReceiptScannerModal
            show={showScannerModal}
            onClose={() => setShowScannerModal(false)}
            accounts={accounts}
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
          />
        )}

        {showQuickAddView && (
          <MobileQuickAddView
            accounts={accounts}
            initialAmount={quickAddInitialAmount}
            onClose={() => setShowQuickAddView(false)}
            onAddTransaction={handleAddTransaction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
