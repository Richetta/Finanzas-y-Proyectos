/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Calendar, CheckSquare, Square, FileText, Link, Trash2, 
  ChevronRight, ChevronDown, ArrowRight, DollarSign, Award, Percent, AlertTriangle, 
  Clock, Info, Save, Settings, X, Edit, Sliders, Play, Check, Copy 
} from 'lucide-react';
import { Project, Account, BudgetItem, ProjectTask, ProjectFile, ProjectCalendarEvent, ExchangeRates } from '../types';

interface ProjectPlannerProps {
  projects: Project[];
  accounts: Account[];
  onAddProject: (proj: Omit<Project, 'id'>) => void;
  onUpdateProject: (proj: Project) => void;
  onDeleteProject: (id: string) => void;
  onRegisterTaskPayment?: (projectId: string, taskId: string, accountId: string, amount: number, taskName: string, customDate?: string) => void;
  exchangeRates?: ExchangeRates;
  goals?: SavingGoal[];
  onUpdateGoal?: (goal: SavingGoal) => void;
}

export function ProjectPlanner({
  projects,
  accounts,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onRegisterTaskPayment,
  exchangeRates,
  goals = [],
  onUpdateGoal,
}: ProjectPlannerProps) {
  // Navigation and Payment Registration
  const [payingItem, setPayingItem] = useState<{
    type: 'budget' | 'task';
    id: string;
    name: string;
    estimatedAmount: number;
    targetStatus?: BudgetItem['status'];
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentIsPast, setPaymentIsPast] = useState(false);

  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return projects.length > 0 ? projects[0].id : null;
  });
  const [projectSubTab, setProjectSubTab] = useState<'resumen' | 'presupuesto' | 'simulador' | 'tareas' | 'archivos' | 'calendario'>('resumen');

  // Edit states for budget items and tasks
  const [editingBudgetItemId, setEditingBudgetItemId] = useState<string | null>(null);
  const [editBudgetItemName, setEditBudgetItemName] = useState('');
  const [editBudgetItemEstimated, setEditBudgetItemEstimated] = useState('');

  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskCategory, setEditTaskCategory] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskAmount, setEditTaskAmount] = useState('');
  const [editTaskPaymentLink, setEditTaskPaymentLink] = useState('');
  const [editTaskIsPayment, setEditTaskIsPayment] = useState(false);

  // Accordion states for summary breakdown
  const [isBudgetExpanded, setIsBudgetExpanded] = useState(false);
  const [isTasksExpanded, setIsTasksExpanded] = useState(false);
  const [isGoalsExpanded, setIsGoalsExpanded] = useState(false);

  // Convert account balances to ARS supporting multiple currencies (USD, USDT, BTC)
  const getAccountBalanceInARS = (acc: Account) => {
    const cur = acc.currency || 'ARS';
    if (cur === 'ARS') return acc.currentBalance;
    if (cur === 'USDT') return acc.currentBalance * (exchangeRates?.ARS_USDT || 1240);
    if (cur === 'USD') return acc.currentBalance * (exchangeRates?.ARS_USD_BLUE || 1220);
    if (cur === 'BTC') return acc.currentBalance * (exchangeRates?.USD_BTC || 62000) * (exchangeRates?.ARS_USD_BLUE || 1220);
    return acc.currentBalance;
  };
  
  // Create / Edit Project modal
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form states for project
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projStatus, setProjStatus] = useState<Project['status']>('Idea');
  const [projPriority, setProjPriority] = useState<Project['priority']>('Media');
  const [projTargetDate, setProjTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [projAllocatedAccounts, setProjAllocatedAccounts] = useState<string[]>([]);

  // Simulator Inputs (local sliders)
  const [simMonthlySavings, setSimMonthlySavings] = useState(60000); // 60k pesos per month
  const [simYieldRate, setSimYieldRate] = useState(8); // 8% monthly yield (typical for some investments/ARS inflation indexing)

  // Local state for adding sub-items in active project
  const [newItemName, setNewItemName] = useState('');
  const [newItemEstimated, setNewItemEstimated] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskAmount, setNewTaskAmount] = useState('');
  const [newTaskPaymentLink, setNewTaskPaymentLink] = useState('');
  const [newTaskIsPayment, setNewTaskIsPayment] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'photo' | 'contract' | 'pdf' | 'link' | 'note'>('pdf');
  const [newFileContent, setNewFileContent] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState<ProjectCalendarEvent['type']>('Recordatorio');

  // Active Project Reference
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Budget Calculations
  const budgetStats = useMemo(() => {
    if (!activeProject) return { estimated: 0, spent: 0, remaining: 0, variance: 0 };
    
    let estimated = 0;
    let spent = 0;

    activeProject.budgetItems.forEach(item => {
      estimated += item.estimatedAmount;
      if (item.status === 'Comprado' || item.status === 'Pagado') {
        spent += item.realAmount || item.estimatedAmount;
      }
    });

    const remaining = Math.max(0, estimated - spent);
    const variance = spent - estimated; // Negative is good (under budget)

    return { estimated, spent, remaining, variance };
  }, [activeProject]);

  // Capital Availability from connected financial module accounts
  const capitalStats = useMemo(() => {
    if (!activeProject) return { available: 0, needed: 0, isComplete: false };
    
    const available = accounts
      .filter(acc => activeProject.allocatedAccountIds.includes(acc.id))
      .reduce((sum, acc) => sum + getAccountBalanceInARS(acc), 0);

    const needed = Math.max(0, budgetStats.estimated - available);
    const isComplete = available >= budgetStats.estimated;

    return { available, needed, isComplete };
  }, [activeProject, accounts, budgetStats, exchangeRates]);

  // Resumen Financiero Completo Consolidado (Cuentas + Presupuesto + Tareas de Pago + Metas Vinculadas)
  const financialSummary = useMemo(() => {
    if (!activeProject) {
      return {
        linkedCapital: 0,
        budgetEstimated: 0,
        budgetSpent: 0,
        tasksEstimated: 0,
        tasksSpent: 0,
        goalsEstimated: 0,
        goalsSpent: 0,
        totalEstimatedExpense: 0,
        totalSpentExpense: 0,
        surplusOrDeficit: 0,
        isSufficient: false,
        globalCapital: 0,
        globalSurplusOrDeficit: 0
      };
    }

    // 1. Capital Vinculado (Cuentas seleccionadas)
    const linkedCapital = accounts
      .filter(acc => activeProject.allocatedAccountIds.includes(acc.id))
      .reduce((sum, acc) => sum + getAccountBalanceInARS(acc), 0);

    // 2. Gastos en Presupuesto
    let budgetEstimated = 0;
    let budgetSpent = 0;
    activeProject.budgetItems.forEach(item => {
      budgetEstimated += item.estimatedAmount;
      if (item.status === 'Comprado' || item.status === 'Pagado') {
        budgetSpent += item.realAmount || item.estimatedAmount;
      }
    });

    // 3. Gastos en Tareas de Pago
    let tasksEstimated = 0;
    let tasksSpent = 0;
    if (activeProject.tasks) {
      activeProject.tasks.forEach(task => {
        if (task.isPayment && task.amount) {
          tasksEstimated += task.amount;
          if (task.completed) {
            tasksSpent += task.amount;
          }
        }
      });
    }

    // 3.5. Gastos en Metas Vinculadas (Ahorros)
    let goalsEstimated = 0;
    let goalsSpent = 0;
    const activeGoals = (goals || []).filter(g => g.projectId === activeProject.id && g.isActive !== false);
    activeGoals.forEach(goal => {
      goalsEstimated += goal.targetAmount;
      goalsSpent += goal.accumulatedAmount;
    });

    // 4. Totales Consolidados
    const totalEstimatedExpense = budgetEstimated + tasksEstimated + goalsEstimated;
    const totalSpentExpense = budgetSpent + tasksSpent + goalsSpent;
    const surplusOrDeficit = linkedCapital - (totalEstimatedExpense - totalSpentExpense);
    const isSufficient = surplusOrDeficit >= 0;

    // 5. Capital Global (Suma de todas las cuentas del sistema)
    const globalCapital = accounts.reduce((sum, acc) => sum + getAccountBalanceInARS(acc), 0);
    const globalSurplusOrDeficit = globalCapital - (totalEstimatedExpense - totalSpentExpense);

    return {
      linkedCapital,
      budgetEstimated,
      budgetSpent,
      tasksEstimated,
      tasksSpent,
      goalsEstimated,
      goalsSpent,
      totalEstimatedExpense,
      totalSpentExpense,
      surplusOrDeficit,
      isSufficient,
      globalCapital,
      globalSurplusOrDeficit
    };
  }, [activeProject, accounts, exchangeRates, goals]);

  // Safe file and event lists to prevent undefined crashes on Sheets pull
  const activeFiles = useMemo(() => activeProject?.files || [], [activeProject]);
  const activeEvents = useMemo(() => activeProject?.calendarEvents || [], [activeProject]);

  // Task editing helpers
  const openEditTaskModal = (task: ProjectTask) => {
    setEditingTask(task);
    setEditTaskName(task.name);
    setEditTaskCategory(task.category || 'Planificación');
    setEditTaskDescription(task.description || '');
    setEditTaskDueDate(task.dueDate || '');
    setEditTaskAmount(task.amount ? task.amount.toString() : '');
    setEditTaskPaymentLink(task.paymentLink || '');
    setEditTaskIsPayment(!!task.isPayment);
    setShowEditTaskModal(true);
  };

  const handleSaveTask = () => {
    if (!activeProject || !editingTask) return;

    const updatedTasks = activeProject.tasks.map(t => {
      if (t.id === editingTask.id) {
        return {
          ...t,
          name: editTaskName,
          category: editTaskCategory,
          description: editTaskDescription || undefined,
          dueDate: editTaskDueDate || undefined,
          amount: editTaskAmount ? Number(editTaskAmount) : undefined,
          paymentLink: editTaskPaymentLink || undefined,
          isPayment: editTaskIsPayment
        };
      }
      return t;
    });

    onUpdateProject({
      ...activeProject,
      tasks: updatedTasks
    });

    setShowEditTaskModal(false);
    setEditingTask(null);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !payingItem) return;

    const amountNum = Number(paymentAmount) || payingItem.estimatedAmount;

    // 1. Registrar debito contable si no es pago en el pasado
    if (!paymentIsPast && onRegisterTaskPayment && paymentAccountId) {
      onRegisterTaskPayment(
        activeProject.id,
        payingItem.id,
        paymentAccountId,
        amountNum,
        payingItem.name,
        paymentDate
      );
    }

    // 2. Modificar estado del item o tarea
    if (payingItem.type === 'budget') {
      const targetStatus = payingItem.targetStatus || 'Pagado';
      onUpdateProject({
        ...activeProject,
        budgetItems: activeProject.budgetItems.map(item => {
          if (item.id === payingItem.id) {
            return {
              ...item,
              status: targetStatus,
              realAmount: amountNum,
              isPastPayment: paymentIsPast
            };
          }
          return item;
        })
      });
    } else if (payingItem.type === 'task') {
      onUpdateProject({
        ...activeProject,
        tasks: activeProject.tasks.map(t => {
          if (t.id === payingItem.id) {
            return {
              ...t,
              completed: true,
              amount: amountNum,
              isPastPayment: paymentIsPast
            };
          }
          return t;
        })
      });
    }

    setPayingItem(null);
  };

  // Projection math
  const projectionResults = useMemo(() => {
    if (!activeProject || capitalStats.needed <= 0) {
      return { months: 0, targetDate: activeProject?.targetDate || '', canAchieve: true };
    }

    const neededAmount = capitalStats.needed;
    const monthlyRate = simYieldRate / 100;
    
    let months = 0;
    let accumulated = 0;

    if (simMonthlySavings <= 0) {
      return { months: 999, targetDate: 'Nunca (Ajusta tus ahorros)', canAchieve: false };
    }

    // Compound interest simulation month-by-month
    while (accumulated < neededAmount && months < 120) {
      // Apply yield to previous balance
      accumulated = accumulated * (1 + monthlyRate);
      // Add new savings
      accumulated += simMonthlySavings;
      months++;
    }

    const today = new Date();
    today.setMonth(today.getMonth() + months);
    
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    const dateStr = today.toLocaleDateString('es-AR', options);

    // Is the projected completion date before the target date?
    const targetDateObj = new Date(activeProject.targetDate);
    const canAchieve = today <= targetDateObj;

    return {
      months,
      targetDate: dateStr,
      canAchieve
    };
  }, [activeProject, capitalStats.needed, simMonthlySavings, simYieldRate]);

  // Budget status class helpers
  const getStatusBadge = (status: BudgetItem['status']) => {
    switch (status) {
      case 'Pagado': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Comprado': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  // Status for general Project
  const getProjectStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'Finalizado': return 'bg-emerald-50 text-emerald-600';
      case 'En progreso': return 'bg-blue-50 text-blue-600';
      case 'Planificación': return 'bg-amber-50 text-amber-600';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  // Submit Project (Create/Edit)
  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) {
      alert('Por favor ingrese el nombre del proyecto.');
      return;
    }

    if (editingProject) {
      const updated: Project = {
        ...editingProject,
        name: projName,
        description: projDesc,
        status: projStatus,
        priority: projPriority,
        targetDate: projTargetDate,
        allocatedAccountIds: projAllocatedAccounts,
      };
      onUpdateProject(updated);
    } else {
      const newProj: Omit<Project, 'id'> = {
        name: projName,
        description: projDesc,
        status: projStatus,
        priority: projPriority,
        targetDate: projTargetDate,
        allocatedAccountIds: projAllocatedAccounts,
        budgetItems: [],
        tasks: [],
        notes: '',
        files: [],
        calendarEvents: [],
      };
      onAddProject(newProj);
    }

    // Reset
    setProjName('');
    setProjDesc('');
    setProjStatus('Idea');
    setProjPriority('Media');
    setProjTargetDate(new Date().toISOString().split('T')[0]);
    setProjAllocatedAccounts([]);
    setEditingProject(null);
    setShowAddProjectModal(false);
  };

  // Open Edit Project Mode
  const openEditProject = (proj: Project) => {
    setEditingProject(proj);
    setProjName(proj.name);
    setProjDesc(proj.description);
    setProjStatus(proj.status);
    setProjPriority(proj.priority);
    setProjTargetDate(proj.targetDate);
    setProjAllocatedAccounts(proj.allocatedAccountIds);
    setShowAddProjectModal(true);
  };

  // Quick Account selector toggles
  const toggleAllocatedAccount = (accId: string) => {
    if (projAllocatedAccounts.includes(accId)) {
      setProjAllocatedAccounts(prev => prev.filter(id => id !== accId));
    } else {
      setProjAllocatedAccounts(prev => [...prev, accId]);
    }
  };

  // Add sub-elements inside project
  const addBudgetItem = () => {
    if (!newItemName.trim() || !newItemEstimated || isNaN(Number(newItemEstimated))) return;
    if (!activeProject) return;

    const newItem: BudgetItem = {
      id: 'bi_' + Date.now(),
      name: newItemName,
      estimatedAmount: Number(newItemEstimated),
      realAmount: 0,
      status: 'Pendiente',
    };

    onUpdateProject({
      ...activeProject,
      budgetItems: [...activeProject.budgetItems, newItem],
    });

    setNewItemName('');
    setNewItemEstimated('');
  };

  const deleteBudgetItem = (itemId: string) => {
    if (!activeProject) return;
    onUpdateProject({
      ...activeProject,
      budgetItems: activeProject.budgetItems.filter(item => item.id !== itemId),
    });
  };

  const updateBudgetItemStatus = (itemId: string, status: BudgetItem['status'], realAmount?: number) => {
    if (!activeProject) return;

    const item = activeProject.budgetItems.find(bi => bi.id === itemId);
    if (!item) return;

    if ((status === 'Comprado' || status === 'Pagado') && item.status === 'Pendiente') {
      setPayingItem({
        type: 'budget',
        id: itemId,
        name: item.name,
        estimatedAmount: item.estimatedAmount,
        targetStatus: status
      });
      setPaymentAmount((item.realAmount || item.estimatedAmount).toString());
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentIsPast(false);
      if (activeProject.allocatedAccountIds && activeProject.allocatedAccountIds.length > 0) {
        setPaymentAccountId(activeProject.allocatedAccountIds[0]);
      } else if (accounts.length > 0) {
        setPaymentAccountId(accounts[0].id);
      }
      return;
    }

    onUpdateProject({
      ...activeProject,
      budgetItems: activeProject.budgetItems.map(bi => {
        if (bi.id === itemId) {
          return {
            ...bi,
            status,
            realAmount: realAmount !== undefined ? realAmount : (status === 'Pendiente' ? 0 : bi.realAmount || bi.estimatedAmount),
            isPastPayment: status === 'Pendiente' ? false : bi.isPastPayment
          };
        }
        return bi;
      }),
    });
  };

  // Task list manipulators
  const addTask = () => {
    if (!newTaskName.trim()) return;
    if (!activeProject) return;

    const newTask: ProjectTask = {
      id: 'task_' + Date.now(),
      name: newTaskName,
      completed: false,
      category: newTaskCategory || 'Planificación',
      description: newTaskDescription || undefined,
      dueDate: newTaskDueDate || undefined,
      amount: newTaskAmount ? Number(newTaskAmount) : undefined,
      paymentLink: newTaskPaymentLink || undefined,
      isPayment: newTaskIsPayment
    };

    onUpdateProject({
      ...activeProject,
      tasks: [...activeProject.tasks, newTask],
    });

    setNewTaskName('');
    setNewTaskCategory('');
    setNewTaskDescription('');
    setNewTaskDueDate('');
    setNewTaskAmount('');
    setNewTaskPaymentLink('');
    setNewTaskIsPayment(false);
  };

  const toggleTaskStatus = (taskId: string) => {
    if (!activeProject) return;
    
    const task = activeProject.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newCompleted = !task.completed;
    
    if (newCompleted && task.amount && task.amount > 0 && task.isPayment) {
      setPayingItem({
        type: 'task',
        id: taskId,
        name: task.name,
        estimatedAmount: task.amount
      });
      setPaymentAmount(task.amount.toString());
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentIsPast(false);
      if (activeProject.allocatedAccountIds && activeProject.allocatedAccountIds.length > 0) {
        setPaymentAccountId(activeProject.allocatedAccountIds[0]);
      } else if (accounts.length > 0) {
        setPaymentAccountId(accounts[0].id);
      }
      return;
    }
    
    onUpdateProject({
      ...activeProject,
      tasks: activeProject.tasks.map(t => t.id === taskId ? { 
        ...t, 
        completed: newCompleted,
        isPastPayment: newCompleted ? t.isPastPayment : false
      } : t),
    });
  };

  const deleteTask = (taskId: string) => {
    if (!activeProject) return;
    onUpdateProject({
      ...activeProject,
      tasks: activeProject.tasks.filter(t => t.id !== taskId),
    });
  };

  // Rich notes save
  const saveProjectNotes = (notesText: string) => {
    if (!activeProject) return;
    onUpdateProject({
      ...activeProject,
      notes: notesText,
    });
  };

  // Files simulation
  const addProjectFile = () => {
    if (!newFileName.trim()) return;
    if (!activeProject) return;

    const newFile: ProjectFile = {
      id: 'file_' + Date.now(),
      name: newFileName,
      type: newFileType,
      urlOrContent: newFileContent || 'Simulador de archivo cargado con éxito en la bóveda.',
      date: new Date().toISOString().split('T')[0],
    };

    onUpdateProject({
      ...activeProject,
      files: [...(activeProject.files || []), newFile],
    });

    setNewFileName('');
    setNewFileContent('');
  };

  const deleteProjectFile = (fileId: string) => {
    if (!activeProject) return;
    onUpdateProject({
      ...activeProject,
      files: (activeProject.files || []).filter(f => f.id !== fileId),
    });
  };

  // Calendar
  const addCalendarEvent = () => {
    if (!newEventTitle.trim() || !newEventDate) return;
    if (!activeProject) return;

    const newEvent: ProjectCalendarEvent = {
      id: 'evt_' + Date.now(),
      title: newEventTitle,
      date: newEventDate,
      type: newEventType,
    };

    onUpdateProject({
      ...activeProject,
      calendarEvents: [...(activeProject.calendarEvents || []), newEvent],
    });

    setNewEventTitle('');
    setNewEventDate('');
  };

  const deleteCalendarEvent = (evtId: string) => {
    if (!activeProject) return;
    onUpdateProject({
      ...activeProject,
      calendarEvents: (activeProject.calendarEvents || []).filter(e => e.id !== evtId),
    });
  };

  // Progress metrics
  const taskCompletionPercentage = useMemo(() => {
    if (!activeProject || activeProject.tasks.length === 0) return 0;
    const completed = activeProject.tasks.filter(t => t.completed).length;
    return Math.round((completed / activeProject.tasks.length) * 100);
  }, [activeProject]);

  const budgetCompletionPercentage = useMemo(() => {
    if (!activeProject || budgetStats.estimated === 0) return 0;
    return Math.round((budgetStats.spent / budgetStats.estimated) * 100);
  }, [activeProject, budgetStats]);

  const daysRemaining = useMemo(() => {
    if (!activeProject) return 0;
    const target = new Date(activeProject.targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [activeProject]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6" id="projects-section-container">
      {/* Selector superior de Proyectos */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" id="projects-header-controls">
        <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none max-w-full">
          {projects.map(proj => (
            <button
              key={proj.id}
              onClick={() => setSelectedProjectId(proj.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all border ${selectedProjectId === proj.id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200/60 hover:bg-neutral-50'}`}
              id={`select-project-${proj.id}`}
            >
              {proj.name}
            </button>
          ))}
          {projects.length === 0 && (
            <span className="text-xs text-neutral-400 font-medium italic">No hay proyectos creados aún</span>
          )}
        </div>

        <button 
          onClick={() => {
            setEditingProject(null);
            setProjName('');
            setProjDesc('');
            setProjStatus('Idea');
            setProjPriority('Media');
            setProjTargetDate(new Date().toISOString().split('T')[0]);
            setProjAllocatedAccounts([]);
            setShowAddProjectModal(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center space-x-1 whitespace-nowrap shadow-sm cursor-pointer"
          id="btn-nuevo-proyecto"
        >
          <Plus size={14} className="stroke-[3]" />
          <span>Nuevo Proyecto</span>
        </button>
      </div>

      {activeProject ? (
        <div className="space-y-6" id="active-project-workspace">
          {/* Header del Proyecto Activo */}
          <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs" id="active-project-header">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center space-x-2.5">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${getProjectStatusBadge(activeProject.status)}`}>
                    {activeProject.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${activeProject.priority === 'Alta' ? 'bg-rose-500' : activeProject.priority === 'Media' ? 'bg-amber-500' : 'bg-blue-400'}`}>
                    Prioridad {activeProject.priority}
                  </span>
                </div>
                <h2 className="text-2xl font-black text-neutral-900 mt-2">{activeProject.name}</h2>
                <p className="text-sm text-neutral-500 mt-1">{activeProject.description}</p>
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => openEditProject(activeProject)}
                  className="p-2.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 rounded-xl border border-neutral-200/50 transition-all cursor-pointer"
                  title="Editar metadatos del proyecto"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`¿Eliminar definitivamente el proyecto "${activeProject.name}" y todos sus presupuestos/tareas asociadas?`)) {
                      onDeleteProject(activeProject.id);
                      setSelectedProjectId(projects.length > 1 ? projects[0].id : null);
                    }
                  }}
                  className="p-2.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-100 transition-all cursor-pointer"
                  title="Eliminar proyecto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Sub-Tabs del Proyecto */}
            <div className="flex items-center space-x-4 overflow-x-auto border-t border-neutral-50 mt-6 pt-4 scrollbar-none" id="project-sub-tabs">
              {([
                { id: 'resumen', label: 'Resumen' },
                { id: 'presupuesto', label: 'Presupuesto' },
                { id: 'simulador', label: 'Proyecciones' },
                { id: 'tareas', label: 'Tareas' },
                { id: 'archivos', label: 'Bóveda de Archivos' },
                { id: 'calendario', label: 'Calendario' }
              ] as const).map(subTab => (
                <button
                  key={subTab.id}
                  onClick={() => setProjectSubTab(subTab.id)}
                  className={`pb-1 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${projectSubTab === subTab.id ? 'text-neutral-900 border-neutral-900 font-extrabold' : 'text-neutral-400 border-transparent hover:text-neutral-600'}`}
                  id={`project-tab-${subTab.id}`}
                >
                  {subTab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Tab Contenidos */}
          <AnimatePresence mode="wait">
            <motion.div
              key={projectSubTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              id="sub-tab-content-wrapper"
            >
              {/* RESUMEN */}
              {projectSubTab === 'resumen' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="resumen-dashboard">
                  {/* Panel de Análisis Financiero Conectado */}
                  <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs space-y-5 md:col-span-2" id="finance-connection-panel">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-neutral-800 flex items-center space-x-2">
                        <DollarSign size={18} className="text-emerald-500" />
                        <span>Flujo de Caja y Capital del Proyecto</span>
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-full border border-neutral-200/50">
                        {accounts.filter(a => activeProject.allocatedAccountIds.includes(a.id)).length} Cuentas Vinculadas
                      </span>
                    </div>
                    
                    {/* Tarjetas de Métricas Principales */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/50">
                        <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Capital Disponible</span>
                        <p className="text-lg font-black text-emerald-500 mt-1">{formatCurrency(financialSummary.linkedCapital)}</p>
                        <span className="text-[9.5px] text-neutral-400 mt-1 block truncate">
                          {accounts.filter(a => activeProject.allocatedAccountIds.includes(a.id)).map(a => a.name).join(', ') || 'Sin cuentas.'}
                        </span>
                      </div>
                      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/50">
                        <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">Gasto Total Previsto</span>
                        <p className="text-lg font-black text-rose-500 mt-1">{formatCurrency(financialSummary.totalEstimatedExpense)}</p>
                        <span className="text-[9.5px] text-neutral-400 mt-1 block">
                          Presupuesto + Tareas de Pago
                        </span>
                      </div>
                      <div className={`rounded-2xl p-4 border transition-all ${financialSummary.surplusOrDeficit >= 0 ? 'bg-emerald-50/50 border-emerald-100 text-emerald-850' : 'bg-rose-50/50 border-rose-100 text-rose-850'}`}>
                        <span className="text-[10px] font-bold block uppercase tracking-wider">{financialSummary.surplusOrDeficit >= 0 ? 'Capital Restante' : 'Faltante de Ahorro'}</span>
                        <p className="text-lg font-black mt-1">{formatCurrency(Math.abs(financialSummary.surplusOrDeficit))}</p>
                        <span className="text-[9.5px] font-bold mt-1 block">
                          {financialSummary.surplusOrDeficit >= 0 ? '¡Proyecto 100% financiado!' : 'Se requiere vincular más capital.'}
                        </span>
                      </div>
                    </div>

                    {/* Tabla de Desglose de Gastos */}
                    <div className="pt-4 border-t border-neutral-100 space-y-2">
                      <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Desglose de Áreas</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left text-neutral-600">
                          <thead>
                            <tr className="border-b border-neutral-100 text-neutral-400 font-bold">
                              <th className="py-2">Área de Gasto</th>
                              <th className="py-2 text-right">Previsto</th>
                              <th className="py-2 text-right">Pagado</th>
                              <th className="py-2 text-right">Pendiente</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-50 font-medium">
                            <tr 
                              onClick={() => setIsBudgetExpanded(!isBudgetExpanded)}
                              className="hover:bg-neutral-50 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 font-bold text-neutral-800 flex items-center space-x-1.5">
                                {isBudgetExpanded ? <ChevronDown size={14} className="text-neutral-500" /> : <ChevronRight size={14} className="text-neutral-500" />}
                                <span>1. Presupuesto Base (Items)</span>
                              </td>
                              <td className="py-2.5 text-right text-neutral-700">{formatCurrency(financialSummary.budgetEstimated)}</td>
                              <td className="py-2.5 text-right text-emerald-600">{formatCurrency(financialSummary.budgetSpent)}</td>
                              <td className="py-2.5 text-right text-neutral-500">{formatCurrency(Math.max(0, financialSummary.budgetEstimated - financialSummary.budgetSpent))}</td>
                            </tr>
                            
                            {/* Despliegue de ítems de presupuesto */}
                            {isBudgetExpanded && activeProject.budgetItems.map(item => (
                              <tr key={`sub-bi-${item.id}`} className="bg-neutral-50/40 text-[10px] text-neutral-500 font-semibold border-l-2 border-emerald-400">
                                <td className="py-2 pl-8 text-neutral-750 flex items-center space-x-1.5">
                                  <span>{item.name}</span>
                                  {item.isPastPayment && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-sm text-[8px] font-bold tracking-wider">
                                      Ant.
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 text-right">{formatCurrency(item.estimatedAmount)}</td>
                                <td className="py-2 text-right text-emerald-600">{item.status === 'Pendiente' ? '-' : formatCurrency(item.realAmount || item.estimatedAmount)}</td>
                                <td className="py-2 text-right">{formatCurrency(Math.max(0, item.estimatedAmount - (item.status === 'Pendiente' ? 0 : item.realAmount || item.estimatedAmount)))}</td>
                              </tr>
                            ))}

                            <tr 
                              onClick={() => setIsTasksExpanded(!isTasksExpanded)}
                              className="hover:bg-neutral-50 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 font-bold text-neutral-800 flex items-center space-x-1.5">
                                {isTasksExpanded ? <ChevronDown size={14} className="text-neutral-500" /> : <ChevronRight size={14} className="text-neutral-500" />}
                                <span>2. Compras Planificadas (Tareas)</span>
                              </td>
                              <td className="py-2.5 text-right text-neutral-700">{formatCurrency(financialSummary.tasksEstimated)}</td>
                              <td className="py-2.5 text-right text-emerald-600">{formatCurrency(financialSummary.tasksSpent)}</td>
                              <td className="py-2.5 text-right text-neutral-500">{formatCurrency(Math.max(0, financialSummary.tasksEstimated - financialSummary.tasksSpent))}</td>
                            </tr>

                            {/* Despliegue de tareas de compra */}
                            {isTasksExpanded && (activeProject.tasks || []).filter(t => t.isPayment && t.amount).map(task => (
                              <tr 
                                key={`sub-tsk-${task.id}`} 
                                className={`bg-neutral-50/40 text-[10px] text-neutral-500 font-semibold border-l-2 ${task.completed ? 'border-emerald-500 line-through opacity-75' : 'border-rose-400'}`}
                              >
                                <td className="py-2 pl-8 text-neutral-750 flex items-center space-x-1.5">
                                  <span>{task.name}</span>
                                  {task.isPastPayment && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-sm text-[8px] font-bold tracking-wider">
                                      Ant.
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 text-right">{formatCurrency(task.amount || 0)}</td>
                                <td className="py-2 text-right text-emerald-600">{task.completed ? formatCurrency(task.amount || 0) : '-'}</td>
                                <td className="py-2 text-right">{formatCurrency(task.completed ? 0 : task.amount || 0)}</td>
                              </tr>
                            ))}

                            <tr 
                              onClick={() => setIsGoalsExpanded(!isGoalsExpanded)}
                              className="hover:bg-neutral-50 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 font-bold text-neutral-800 flex items-center space-x-1.5">
                                {isGoalsExpanded ? <ChevronDown size={14} className="text-neutral-500" /> : <ChevronRight size={14} className="text-neutral-500" />}
                                <span>3. Metas de Ahorro Vinculadas (Simulador)</span>
                              </td>
                              <td className="py-2.5 text-right text-neutral-700">{formatCurrency(financialSummary.goalsEstimated)}</td>
                              <td className="py-2.5 text-right text-emerald-600">{formatCurrency(financialSummary.goalsSpent)}</td>
                              <td className="py-2.5 text-right text-neutral-500">{formatCurrency(Math.max(0, financialSummary.goalsEstimated - financialSummary.goalsSpent))}</td>
                            </tr>
                            
                            {/* Despliegue de metas vinculadas */}
                            {isGoalsExpanded && (goals || []).filter(g => g.projectId === activeProject.id).map(goal => (
                              <tr key={`sub-goal-${goal.id}`} className="bg-neutral-50/40 text-[10px] text-neutral-500 font-semibold border-l-2 border-indigo-400">
                                <td className="py-2 pl-8 text-neutral-750 flex items-center justify-between">
                                  <span className="truncate max-w-[130px]">{goal.name}</span>
                                  {onUpdateGoal && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateGoal({
                                          ...goal,
                                          isActive: goal.isActive === false ? true : false
                                        });
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border transition-all cursor-pointer ${goal.isActive !== false ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-neutral-100 text-neutral-400 border-neutral-200'}`}
                                    >
                                      {goal.isActive !== false ? 'Simular: ON' : 'Simular: OFF'}
                                    </button>
                                  )}
                                </td>
                                <td className="py-2 text-right">{formatCurrency(goal.targetAmount)}</td>
                                <td className="py-2 text-right text-emerald-600">{formatCurrency(goal.accumulatedAmount)}</td>
                                <td className="py-2 text-right">{formatCurrency(Math.max(0, goal.targetAmount - goal.accumulatedAmount))}</td>
                              </tr>
                            ))}

                            <tr className="border-t-2 border-neutral-100 font-extrabold bg-neutral-50/50">
                              <td className="py-2.5 text-neutral-800 font-black pl-5">Gastos Consolidados del Proyecto</td>
                              <td className="py-2.5 text-right text-rose-500 font-black">{formatCurrency(financialSummary.totalEstimatedExpense)}</td>
                              <td className="py-2.5 text-right text-emerald-500 font-black">{formatCurrency(financialSummary.totalSpentExpense)}</td>
                              <td className="py-2.5 text-right text-neutral-850 font-black">{formatCurrency(Math.max(0, financialSummary.totalEstimatedExpense - financialSummary.totalSpentExpense))}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Proyección del Sobrante Neto en Cuentas Globales */}
                    <div className="pt-4 border-t border-neutral-100 space-y-3">
                      <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Proyección de Balance de tu Capital Total</h4>
                      <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/50 space-y-3">
                        <div className="flex justify-between items-center text-xs text-neutral-600 font-semibold">
                          <span>1. Capital Total del Sistema (Todas las cuentas sumadas)</span>
                          <span className="font-extrabold text-neutral-800">{formatCurrency(financialSummary.globalCapital)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-neutral-600 font-semibold">
                          <span>2. Gastos Consolidados Previstos de este Proyecto</span>
                          <span className="font-extrabold text-rose-500">-{formatCurrency(financialSummary.totalEstimatedExpense)}</span>
                        </div>
                        <div className="pt-2.5 border-t border-neutral-200 flex justify-between items-center text-xs font-black">
                          <span className="text-neutral-800">Sobrante Neto Final (Tu dinero total restante)</span>
                          <span className={financialSummary.globalSurplusOrDeficit >= 0 ? "text-emerald-600" : "text-rose-600"}>
                            {formatCurrency(financialSummary.globalSurplusOrDeficit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Rings/Bars */}
                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1.5">
                          <span>Tareas Completadas</span>
                          <span>{taskCompletionPercentage}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-neutral-900 h-full rounded-full" style={{ width: `${taskCompletionPercentage}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-neutral-700 mb-1.5">
                          <span>Ejecución del Presupuesto (Gastado vs Estimado)</span>
                          <span>{budgetCompletionPercentage}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${budgetCompletionPercentage}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Panel de Tiempos y Estado */}
                  <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs flex flex-col justify-between" id="timing-panel">
                    <div>
                      <h3 className="text-base font-bold text-neutral-800 flex items-center space-x-2 mb-4">
                        <Clock size={18} className="text-blue-500" />
                        <span>Plan de Entrega</span>
                      </h3>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-neutral-50">
                          <span className="text-xs text-neutral-400">Fecha Límite</span>
                          <span className="text-sm font-bold text-neutral-800 flex items-center space-x-1">
                            <Calendar size={14} className="mr-1 text-neutral-500" />
                            {activeProject.targetDate}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-neutral-50">
                          <span className="text-xs text-neutral-400">Días Restantes</span>
                          <span className={`text-sm font-black ${daysRemaining < 30 ? 'text-rose-500' : 'text-neutral-800'}`}>
                            {daysRemaining > 0 ? `${daysRemaining} días` : 'Plazo Cumplido'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-xs text-neutral-400">Riesgo de Desvío</span>
                          {budgetStats.variance > 0 ? (
                            <span className="text-xs px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-full font-bold flex items-center">
                              <AlertTriangle size={12} className="mr-1" />
                              Alto (+ {formatCurrency(budgetStats.variance)})
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full font-bold">
                              Controlado / Ahorro
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Nota Rápida */}
                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 mt-6">
                      <p className="text-xs font-bold text-amber-800 flex items-center">
                        <Info size={13} className="mr-1" /> Nota del Director:
                      </p>
                      <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                        {activeProject.notes || 'No hay notas ingresadas aún. Haz clic en la pestaña Bóveda o Presupuesto para documentar.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PRESUPUESTO */}
              {projectSubTab === 'presupuesto' && (
                <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs space-y-6" id="presupuesto-dashboard">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h3 className="text-base font-bold text-neutral-800">Planificador de Ítems Presupuestarios</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Controla lo estimado frente a lo gastado real en tiempo de ejecución.</p>
                    </div>

                    <div className="flex items-center space-x-4 bg-neutral-50 px-4 py-2 rounded-2xl border border-neutral-100">
                      <div>
                        <span className="text-[10px] text-neutral-400 block">Diferencia Total</span>
                        <span className={`text-sm font-extrabold ${budgetStats.variance <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {budgetStats.variance <= 0 ? 'Ahorro: ' : 'Sobrecosto: '}{formatCurrency(Math.abs(budgetStats.variance))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Formulario de carga rápida de ítem */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-neutral-50/50 rounded-2xl border border-neutral-200/40" id="add-budget-item-form">
                    <div className="sm:col-span-1">
                      <input
                        type="text"
                        placeholder="Nombre del ítem (Ej. Pintura, Flete)"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-neutral-900"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <input
                        type="number"
                        placeholder="Estimado ($)"
                        value={newItemEstimated}
                        onChange={e => setNewItemEstimated(e.target.value)}
                        className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-neutral-900"
                      />
                    </div>
                    <button
                      onClick={addBudgetItem}
                      className="w-full p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Plus size={14} />
                      <span>Agregar Ítem</span>
                    </button>
                  </div>

                  {/* Tabla de presupuesto */}
                  <div className="overflow-x-auto" id="budget-items-table">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-100 text-neutral-400 uppercase tracking-wider font-semibold">
                          <th className="py-3 px-2">Concepto</th>
                          <th className="py-3 px-2 text-right">Estimado</th>
                          <th className="py-3 px-2 text-right">Real / Gastado</th>
                          <th className="py-3 px-2 text-center">Estado</th>
                          <th className="py-3 px-2 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-50 font-medium">
                        {activeProject.budgetItems.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-neutral-400 italic">No hay ítems presupuestados aún.</td>
                          </tr>
                        ) : (
                          activeProject.budgetItems.map(item => {
                            const isEditing = editingBudgetItemId === item.id;
                            
                            if (isEditing) {
                              return (
                                <tr key={item.id} className="bg-neutral-50/70 transition-colors">
                                  <td className="py-2 px-2">
                                    <input
                                      type="text"
                                      value={editBudgetItemName}
                                      onChange={e => setEditBudgetItemName(e.target.value)}
                                      className="p-1.5 border border-neutral-200 rounded-lg font-semibold text-xs bg-white w-full"
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-right">
                                    <input
                                      type="number"
                                      value={editBudgetItemEstimated}
                                      onChange={e => setEditBudgetItemEstimated(e.target.value)}
                                      className="p-1.5 border border-neutral-200 rounded-lg font-semibold text-xs bg-white w-24 text-right"
                                    />
                                  </td>
                                  <td className="py-2 px-2 text-right text-neutral-400">-</td>
                                  <td className="py-2 px-2 text-center text-xs font-bold text-neutral-500">Editando...</td>
                                  <td className="py-2 px-2 text-right space-x-1.5">
                                    <button
                                      onClick={() => {
                                        if (!editBudgetItemName.trim() || !editBudgetItemEstimated || isNaN(Number(editBudgetItemEstimated))) return;
                                        onUpdateProject({
                                          ...activeProject,
                                          budgetItems: activeProject.budgetItems.map(bi => bi.id === item.id ? {
                                            ...bi,
                                            name: editBudgetItemName,
                                            estimatedAmount: Number(editBudgetItemEstimated)
                                          } : bi)
                                        });
                                        setEditingBudgetItemId(null);
                                      }}
                                      className="p-1 text-emerald-600 hover:text-emerald-850 hover:bg-emerald-50 rounded-lg inline-flex"
                                      title="Guardar"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => setEditingBudgetItemId(null)}
                                      className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg inline-flex"
                                      title="Cancelar"
                                    >
                                      <X size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="py-3 px-2 font-bold text-neutral-800">{item.name}</td>
                                <td className="py-3 px-2 text-right font-extrabold text-neutral-700">{formatCurrency(item.estimatedAmount)}</td>
                                <td className="py-3 px-2 text-right">
                                  {item.status === 'Pendiente' ? (
                                    <span className="text-neutral-300">-</span>
                                  ) : (
                                    <input
                                      type="number"
                                      defaultValue={item.realAmount || item.estimatedAmount}
                                      onBlur={(e) => {
                                        const val = Number(e.target.value);
                                        if (!isNaN(val)) {
                                          updateBudgetItemStatus(item.id, item.status, val);
                                        }
                                      }}
                                      className="w-24 p-1 text-right border border-neutral-200 rounded font-semibold focus:outline-hidden focus:border-neutral-900 bg-neutral-50"
                                    />
                                  )}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <div className="flex justify-center space-x-1">
                                    {(['Pendiente', 'Comprado', 'Pagado'] as const).map(st => (
                                      <button
                                        key={st}
                                        onClick={() => updateBudgetItemStatus(item.id, st)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${item.status === st ? getStatusBadge(st) : 'bg-white text-neutral-400 border-neutral-100 hover:bg-neutral-50'}`}
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-right space-x-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingBudgetItemId(item.id);
                                      setEditBudgetItemName(item.name);
                                      setEditBudgetItemEstimated(item.estimatedAmount.toString());
                                    }}
                                    className="p-1 text-neutral-350 hover:text-neutral-700 rounded transition-all cursor-pointer inline-flex"
                                    title="Editar ítem"
                                  >
                                    <Edit size={13} />
                                  </button>
                                  <button
                                    onClick={() => deleteBudgetItem(item.id)}
                                    className="p-1 text-neutral-350 hover:text-rose-500 rounded transition-all cursor-pointer inline-flex"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SIMULADOR / PROYECCIONES */}
              {projectSubTab === 'simulador' && (
                <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs space-y-6" id="simulador-dashboard">
                  <div>
                    <h3 className="text-base font-bold text-neutral-800 flex items-center space-x-1.5">
                      <Sliders size={18} className="text-blue-500" />
                      <span>Simulador Financiero de Escenarios de Ahorro</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Analiza el impacto de cambiar tu capacidad de ahorro o rendimientos financieros sobre este proyecto.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Controles de Sliders */}
                    <div className="space-y-6 bg-neutral-50 p-6 rounded-2xl border border-neutral-200/50" id="sim-sliders">
                      {/* Capacidad de Ahorro Mensual */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-neutral-700">
                          <span>Ahorro Mensual Adicional</span>
                          <span className="text-emerald-600 font-extrabold">{formatCurrency(simMonthlySavings)} / mes</span>
                        </div>
                        <input
                          type="range"
                          min="10000"
                          max="300000"
                          step="1000"
                          value={simMonthlySavings}
                          onChange={e => setSimMonthlySavings(Number(e.target.value))}
                          className="w-full accent-neutral-900 bg-neutral-200 h-1.5 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>$10,000</span>
                          <span>$150,000</span>
                          <span>$300,000+</span>
                        </div>
                      </div>

                      {/* Tasa de Rendimiento de Inversiones */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-neutral-700">
                          <span>Tasa Rendimiento Inversiones (Mensual)</span>
                          <span className="text-blue-600 font-extrabold">{simYieldRate}% mensual</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="0.5"
                          value={simYieldRate}
                          onChange={e => setSimYieldRate(Number(e.target.value))}
                          className="w-full accent-neutral-900 bg-neutral-200 h-1.5 rounded-full appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400">
                          <span>0% (Sólido Cash)</span>
                          <span>10% (Indexado / Crypto)</span>
                          <span>20% (Alto Riesgo)</span>
                        </div>
                      </div>
                    </div>

                    {/* Resultados de la Simulación */}
                    <div className="bg-neutral-900 text-white rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between" id="sim-results">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                      
                      <div className="relative z-10 space-y-4">
                        <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Fecha Estimada de Consecución</span>
                        <div>
                          <h4 className="text-2xl font-black text-emerald-400 tracking-tight">
                            {projectionResults.targetDate}
                          </h4>
                          <p className="text-xs text-neutral-400 mt-1">
                            Faltan aproximadamente <span className="font-bold text-neutral-200">{projectionResults.months} meses</span> de acumulación con interés compuesto.
                          </p>
                        </div>

                        <div className="pt-4 border-t border-neutral-800">
                          <span className="text-xs text-neutral-400 font-medium">Factibilidad del Proyecto</span>
                          <div className="flex items-center space-x-2 mt-2">
                            {projectionResults.canAchieve ? (
                              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
                                <Award size={16} />
                                <span>¡Dentro de tu plazo objetivo! ({activeProject.targetDate})</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-xs">
                                <AlertTriangle size={16} />
                                <span>Supera el plazo fijado ({activeProject.targetDate}). Intenta ahorrar más.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-neutral-800 border border-neutral-700/50 rounded-xl p-3 mt-6 text-[10px] text-neutral-300">
                        * Nota: Los cálculos simulan un crecimiento mensual con interés compuesto continuo basado en la tasa y el capital inicial de tus cuentas vinculadas ({formatCurrency(capitalStats.available)}).
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAREAS / CHECKLIST */}
              {projectSubTab === 'tareas' && (
                <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs space-y-6" id="tasks-dashboard">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-bold text-neutral-800">Checklist de Tareas y Seguimiento</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Define los pasos para lograr completar este hito operativo.</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 bg-neutral-100 text-neutral-700 rounded-lg">
                      {taskCompletionPercentage}% Completado
                    </span>
                  </div>

                  {/* Carga rápida de tareas */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3" id="add-task-form">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Nombre de la tarea o concepto"
                          value={newTaskName}
                          onChange={e => setNewTaskName(e.target.value)}
                          className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-950"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Categoría (Ej. Compras, Trámites)"
                          value={newTaskCategory}
                          onChange={e => setNewTaskCategory(e.target.value)}
                          className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-955"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Descripción adicional (opcional)..."
                          value={newTaskDescription}
                          onChange={e => setNewTaskDescription(e.target.value)}
                          className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-955"
                        />
                      </div>
                      <div>
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={e => setNewTaskDueDate(e.target.value)}
                          className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-955 text-neutral-500"
                          title="Fecha de vencimiento / plazo"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-200/50">
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-bold text-neutral-600">
                          <input 
                            type="checkbox"
                            className="rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer"
                            checked={newTaskIsPayment}
                            onChange={e => setNewTaskIsPayment(e.target.checked)}
                          />
                          <span>¿Representa un Pago?</span>
                        </label>

                        {newTaskIsPayment && (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="number"
                              placeholder="Monto ($)"
                              value={newTaskAmount}
                              onChange={e => setNewTaskAmount(e.target.value)}
                              className="w-24 p-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-900"
                            />
                            <input
                              type="text"
                              placeholder="Alias / Enlace pago"
                              value={newTaskPaymentLink}
                              onChange={e => setNewTaskPaymentLink(e.target.value)}
                              className="w-36 p-1.5 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-900"
                            />
                          </div>
                        )}
                      </div>

                      <button
                        onClick={addTask}
                        className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center space-x-1 shadow-xs"
                      >
                        <Plus size={14} />
                        <span>Agregar Tarea</span>
                      </button>
                    </div>
                  </div>

                  {/* Lista de tareas */}
                  <div className="space-y-2.5" id="tasks-list">
                    {activeProject.tasks.length === 0 ? (
                      <p className="text-center py-6 text-xs text-neutral-400 italic">No hay tareas creadas para este proyecto.</p>
                    ) : (
                      activeProject.tasks.map(task => {
                        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
                        const isLink = task.paymentLink?.startsWith('http');

                        return (
                          <div key={task.id} className={`p-4 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors ${task.completed ? 'opacity-70' : ''}`} id={`task-item-${task.id}`}>
                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                              <button
                                onClick={() => toggleTaskStatus(task.id)}
                                className="mt-0.5 text-neutral-500 hover:text-neutral-900 cursor-pointer focus:outline-hidden"
                              >
                                {task.completed ? (
                                  <CheckSquare size={18} className="text-neutral-900 fill-neutral-900" />
                                ) : (
                                  <Square size={18} />
                                )}
                              </button>
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <span className={`text-xs font-bold ${task.completed ? 'line-through text-neutral-400 font-medium' : 'text-neutral-800'}`}>
                                    {task.name}
                                  </span>
                                  {task.category && (
                                    <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-neutral-100 text-neutral-500 rounded border border-neutral-200/50">
                                      {task.category}
                                    </span>
                                  )}
                                  {task.isPayment && (
                                    task.completed ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 flex items-center space-x-0.5">
                                        <Check size={9} className="stroke-[3]" />
                                        <span>Pagado</span>
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-50 text-rose-600 rounded border border-rose-100">
                                        Pago Requerido
                                      </span>
                                    )
                                  )}
                                </div>

                                {task.description && (
                                  <p className="text-[11px] text-neutral-400 mt-1">{task.description}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[10px] text-neutral-400 font-semibold">
                                  {task.dueDate && (
                                    <span className={`flex items-center space-x-1 ${isOverdue ? 'text-rose-500 font-extrabold' : ''}`}>
                                      <Calendar size={11} />
                                      <span>Plazo: {task.dueDate} {isOverdue && '(Vencido)'}</span>
                                    </span>
                                  )}
                                  
                                  {task.amount !== undefined && task.amount > 0 && (
                                    <span className="text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded font-black">
                                      Monto: {formatCurrency(task.amount)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Enlaces de pago, Editar y Borrar */}
                            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end sm:justify-start border-t sm:border-t-0 pt-2 sm:pt-0 border-neutral-200/40">
                              {task.paymentLink && !task.completed && (
                                <div>
                                  {isLink ? (
                                    <a
                                      href={task.paymentLink}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-2.5 py-1.2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg text-[10px] font-black transition-all flex items-center space-x-1"
                                    >
                                      <Link size={10} />
                                      <span>Pagar</span>
                                    </a>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(task.paymentLink!);
                                        setCopiedTaskId(task.id);
                                        setTimeout(() => setCopiedTaskId(null), 2000);
                                      }}
                                      className="px-2.5 py-1.2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
                                      title="Copiar alias o CBU"
                                    >
                                      {copiedTaskId === task.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                                      <span>{copiedTaskId === task.id ? 'Copiado!' : 'Copiar Alias'}</span>
                                    </button>
                                  )}
                                </div>
                              )}

                              <button
                                onClick={() => openEditTaskModal(task)}
                                className="p-1.5 text-neutral-350 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer inline-flex"
                                title="Editar tarea"
                              >
                                <Edit size={13} />
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="p-1.5 text-neutral-350 hover:text-rose-500 rounded-lg transition-colors cursor-pointer inline-flex"
                                title="Eliminar tarea"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ARCHIVOS Y NOTAS */}
              {projectSubTab === 'archivos' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="files-notes-dashboard">
                  {/* Bóveda de Archivos Simulados */}
                  <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs space-y-4" id="vault-section">
                    <div>
                      <h3 className="text-base font-bold text-neutral-800">Bóveda de Documentos</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Almacena links, presupuestos escritos o notas rápidas clave.</p>
                    </div>

                    {/* Agregar archivo */}
                    <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nombre (Ej. Contrato, PDF)"
                          value={newFileName}
                          onChange={e => setNewFileName(e.target.value)}
                          className="p-2 bg-white border border-neutral-200 rounded-lg font-semibold"
                        />
                        <select
                          value={newFileType}
                          onChange={e => setNewFileType(e.target.value as any)}
                          className="p-2 bg-white border border-neutral-200 rounded-lg font-semibold"
                        >
                          <option value="pdf">PDF</option>
                          <option value="photo">Foto</option>
                          <option value="contract">Contrato</option>
                          <option value="link">Enlace web (Link)</option>
                          <option value="note">Nota / Comentario</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Contenido / URL del archivo"
                        value={newFileContent}
                        onChange={e => setNewFileContent(e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-semibold"
                      />
                      <button
                        onClick={addProjectFile}
                        className="w-full p-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Plus size={14} />
                        <span>Subir / Registrar</span>
                      </button>
                    </div>

                    {/* Lista de archivos */}
                    <div className="space-y-2">
                      {activeFiles.length === 0 ? (
                        <p className="text-center py-6 text-xs text-neutral-400 italic">No hay archivos resguardados.</p>
                      ) : (
                        activeFiles.map(file => (
                          <div key={file.id} className="p-3 bg-neutral-50 rounded-xl flex justify-between items-start border border-neutral-100">
                            <div className="flex items-start space-x-2 text-xs">
                              <div className="p-2 bg-neutral-200 text-neutral-600 rounded-lg mt-0.5">
                                {file.type === 'link' ? <Link size={14} /> : <FileText size={14} />}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-neutral-800 block truncate">{file.name}</span>
                                {file.type === 'link' && file.urlOrContent.startsWith('http') ? (
                                  <a href={file.urlOrContent} target="_blank" rel="noreferrer" className="text-blue-500 font-semibold underline truncate block">
                                    {file.urlOrContent}
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-neutral-500 block break-words">{file.urlOrContent}</span>
                                )}
                                <span className="text-[9px] text-neutral-400 block mt-1">Cargado el: {file.date}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => deleteProjectFile(file.id)}
                              className="p-1 text-neutral-300 hover:text-rose-500 rounded cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Notas de Negociación */}
                  <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs space-y-4" id="notes-section">
                    <div>
                      <h3 className="text-base font-bold text-neutral-800">Notas Generales y Bitácora</h3>
                      <p className="text-xs text-neutral-400 mt-0.5">Escribe ideas sueltas, teléfonos o borradores sobre este proyecto.</p>
                    </div>

                    <textarea
                      defaultValue={activeProject.notes}
                      onBlur={(e) => saveProjectNotes(e.target.value)}
                      placeholder="Escribe libremente aquí. Se guardará de manera automática en Local / Sheets cuando cambies de pestaña o quites foco..."
                      className="w-full h-64 p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold focus:outline-hidden focus:border-neutral-900 focus:bg-white resize-none"
                    />

                    <div className="flex justify-end text-[10px] text-neutral-400 items-center space-x-1">
                      <Save size={12} />
                      <span>Se autoguarda al salir del cuadro.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CALENDARIO / EVENTOS */}
              {projectSubTab === 'calendario' && (
                <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-xs space-y-6" id="calendar-dashboard">
                  <div>
                    <h3 className="text-base font-bold text-neutral-800">Eventos y Fechas Clave</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Mantente alerta de pagos, firmas o vencimientos operativos de este proyecto.</p>
                  </div>

                  {/* Carga rápida evento */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-xs" id="add-event-form">
                    <div className="sm:col-span-1">
                      <input
                        type="text"
                        placeholder="Título del evento"
                        value={newEventTitle}
                        onChange={e => setNewEventTitle(e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <input
                        type="date"
                        value={newEventDate}
                        onChange={e => setNewEventDate(e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-semibold"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <select
                        value={newEventType}
                        onChange={e => setNewEventType(e.target.value as any)}
                        className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-semibold"
                      >
                        <option value="Recordatorio">Recordatorio</option>
                        <option value="Pago">Pago / Facturación</option>
                        <option value="Firma">Firma de contrato</option>
                        <option value="Vencimiento">Vencimiento de cuota</option>
                        <option value="Entrega">Entrega / Hito</option>
                      </select>
                    </div>
                    <button
                      onClick={addCalendarEvent}
                      className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-lg cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Plus size={14} />
                      <span>Fijar Fecha</span>
                    </button>
                  </div>

                  {/* Timeline del calendario */}
                  <div className="relative border-l border-neutral-200/80 ml-3 pl-6 space-y-6" id="calendar-timeline">
                    {activeEvents.length === 0 ? (
                      <p className="text-xs text-neutral-400 italic py-2">No hay eventos fechados para este proyecto.</p>
                    ) : (
                      activeEvents
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map(evt => {
                          const badgeColor = 
                            evt.type === 'Firma' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' :
                            evt.type === 'Pago' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                            evt.type === 'Vencimiento' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                            evt.type === 'Entrega' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                            'bg-amber-50 border-amber-100 text-amber-600';

                          return (
                            <div key={evt.id} className="relative group" id={`evt-item-${evt.id}`}>
                              {/* Círculo indicador */}
                              <span className="absolute -left-[31px] top-1 bg-white border-2 border-neutral-800 rounded-full w-4 h-4 z-10" />
                              
                              <div className="bg-neutral-50/50 hover:bg-neutral-50 p-4 border border-neutral-100 rounded-2xl flex justify-between items-center transition-colors">
                                <div className="text-xs space-y-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-extrabold text-neutral-800 truncate">{evt.title}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}>
                                      {evt.type}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-neutral-400 flex items-center">
                                    <Calendar size={11} className="mr-1" />
                                    {evt.date}
                                  </span>
                                </div>

                                <button
                                  onClick={() => deleteCalendarEvent(evt.id)}
                                  className="p-1 text-neutral-300 hover:text-rose-500 rounded transition-all cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 border border-neutral-100 shadow-sm text-center max-w-xl mx-auto space-y-4" id="empty-projects-state">
          <Info className="mx-auto text-neutral-300" size={48} />
          <h3 className="text-lg font-black text-neutral-800">Comienza a planificar tu futuro</h3>
          <p className="text-sm text-neutral-500">
            Los proyectos te permiten simular metas complejas de ahorro, presupuestar de forma milimétrica y verificar si tu capital disponible es suficiente para tomarlos.
          </p>
          <button
            onClick={() => setShowAddProjectModal(true)}
            className="px-5 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer"
          >
            Crear mi Primer Proyecto
          </button>
        </div>
      )}

      {/* Modal para Crear/Editar Proyecto */}
      <AnimatePresence>
        {showAddProjectModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4" id="modal-project-backdrop">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] border-t border-neutral-100"
              id="modal-project-content"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-6">
                <h3 className="text-lg font-bold text-neutral-900">
                  {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                </h3>
                <button 
                  onClick={() => setShowAddProjectModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleProjectSubmit} className="space-y-4">
                {/* Nombre de Proyecto */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre del proyecto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Mudanza, Comprar Moto 150cc"
                    value={projName}
                    onChange={e => setProjName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Descripción General</label>
                  <input
                    type="text"
                    placeholder="Ej. Buscar alquiler en Palermo y comprar electrodomésticos"
                    value={projDesc}
                    onChange={e => setProjDesc(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Estado */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Estado</label>
                    <select
                      value={projStatus}
                      onChange={e => setProjStatus(e.target.value as any)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    >
                      <option value="Idea">Idea / Bosquejo</option>
                      <option value="Planificación">Planificación</option>
                      <option value="En progreso">En progreso</option>
                      <option value="Finalizado">Finalizado / Logrado</option>
                    </select>
                  </div>

                  {/* Prioridad */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Prioridad</label>
                    <select
                      value={projPriority}
                      onChange={e => setProjPriority(e.target.value as any)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    >
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>
                </div>

                {/* Fecha Objetivo */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha Límite / Objetivo</label>
                  <input
                    type="date"
                    required
                    value={projTargetDate}
                    onChange={e => setProjTargetDate(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Vinculación Financiera - Seleccionar cuentas de respaldo */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Cuentas vinculadas a este presupuesto</label>
                  <p className="text-[10px] text-neutral-400 mb-2">Determina de qué cuentas se debitará el capital disponible para este proyecto.</p>
                  
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 bg-neutral-50 rounded-2xl border border-neutral-200/50">
                    {accounts.map(acc => {
                      const selected = projAllocatedAccounts.includes(acc.id);
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => toggleAllocatedAccount(acc.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1 cursor-pointer ${selected ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-100'}`}
                        >
                          {selected && <Check size={12} className="stroke-[3]" />}
                          <span>{acc.name} ({formatCurrency(acc.currentBalance)})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Guardar */}
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-base transition-all mt-6 cursor-pointer"
                >
                  {editingProject ? 'Guardar Cambios' : 'Fijar Proyecto'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Registrar Pago del Proyecto (Unified) */}
      <AnimatePresence>
        {payingItem && activeProject && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">Registrar Pago</h3>
                <button 
                  onClick={() => setPayingItem(null)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full cursor-pointer"
                >
                  <X size={18} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
                <div className="p-3.5 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-start space-x-2 text-neutral-600">
                  <Info size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p>
                    Vas a registrar el pago de **"{payingItem.name}"** (estimado original: {formatCurrency(payingItem.estimatedAmount)}).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Monto Real Pagado ($)</label>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white font-semibold"
                  />
                </div>

                {/* Opción de pago en el pasado */}
                <div className="flex items-start space-x-2.5 p-3 bg-amber-50/50 border border-amber-100 rounded-2xl">
                  <input
                    type="checkbox"
                    id="payment-is-past"
                    checked={paymentIsPast}
                    onChange={e => setPaymentIsPast(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-amber-900 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="payment-is-past" className="cursor-pointer text-[11px] font-bold text-amber-800 select-none">
                    Pagado con anterioridad (El débito ya se realizó antes de declarar los saldos actuales. No modificará tus cuentas hoy).
                  </label>
                </div>

                {!paymentIsPast && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Cuenta / Tarjeta para debitar</label>
                      <select
                        required
                        value={paymentAccountId}
                        onChange={e => setPaymentAccountId(e.target.value)}
                        className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-850 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                      >
                        {accounts
                          .filter(acc => activeProject.allocatedAccountIds.includes(acc.id))
                          .map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCurrency(acc.currentBalance)})
                            </option>
                          ))}
                        {accounts
                          .filter(acc => !activeProject.allocatedAccountIds.includes(acc.id))
                          .map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} ({formatCurrency(acc.currentBalance)}) (No Vinculada)
                            </option>
                          ))}
                        {accounts.length === 0 && (
                          <option value="">Crea una cuenta antes de pagar</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha de Pago</label>
                      <input
                        type="date"
                        required
                        value={paymentDate}
                        onChange={e => setPaymentDate(e.target.value)}
                        className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!paymentIsPast && accounts.length === 0}
                  className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white rounded-2xl font-bold text-sm transition-all flex items-center justify-center space-x-1 shadow-xs cursor-pointer mt-2"
                >
                  <Check size={14} className="stroke-[3]" />
                  <span>{paymentIsPast ? 'Marcar como Pagado en el Pasado' : 'Confirmar y Debitar de Cuenta'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Editar Tarea */}
      <AnimatePresence>
        {showEditTaskModal && editingTask && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">Editar Tarea de Proyecto</h3>
                <button 
                  onClick={() => { setShowEditTaskModal(false); setEditingTask(null); }}
                  className="p-1.5 hover:bg-neutral-100 rounded-full cursor-pointer"
                >
                  <X size={18} className="text-neutral-500" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Nombre de la tarea</label>
                  <input
                    type="text"
                    value={editTaskName}
                    onChange={e => setEditTaskName(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Categoría</label>
                    <input
                      type="text"
                      value={editTaskCategory}
                      onChange={e => setEditTaskCategory(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Plazo / Vencimiento</label>
                    <input
                      type="date"
                      value={editTaskDueDate}
                      onChange={e => setEditTaskDueDate(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Descripción</label>
                  <input
                    type="text"
                    value={editTaskDescription}
                    onChange={e => setEditTaskDescription(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                <div className="flex items-center space-x-1.5 py-1">
                  <input 
                    type="checkbox"
                    id="edit-is-payment"
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer"
                    checked={editTaskIsPayment}
                    onChange={e => setEditTaskIsPayment(e.target.checked)}
                  />
                  <label htmlFor="edit-is-payment" className="cursor-pointer text-xs font-bold text-neutral-600 select-none">
                    ¿Representa un Gasto / Pago?
                  </label>
                </div>

                {editTaskIsPayment && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Monto ($)</label>
                      <input
                        type="number"
                        value={editTaskAmount}
                        onChange={e => setEditTaskAmount(e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-semibold text-neutral-800 focus:outline-hidden focus:border-neutral-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Alias / Link pago</label>
                      <input
                        type="text"
                        value={editTaskPaymentLink}
                        onChange={e => setEditTaskPaymentLink(e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-semibold text-neutral-800 focus:outline-hidden focus:border-neutral-900"
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveTask}
                  className="w-full mt-4 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-1"
                >
                  <Check size={14} />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
