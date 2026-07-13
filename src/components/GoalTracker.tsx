/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Target, Trash2, Calendar, Check, X, PiggyBank, ArrowRight, ShieldCheck } from 'lucide-react';
import { SavingGoal, Account, Project } from '../types';

interface GoalTrackerProps {
  goals: SavingGoal[];
  accounts: Account[];
  projects?: Project[];
  onAddGoal: (goal: Omit<SavingGoal, 'id'>) => void;
  onUpdateGoal: (goal: SavingGoal) => void;
  onDeleteGoal: (id: string) => void;
  onContributeToGoal: (goalId: string, accountId: string, amount: number) => void;
}

export function GoalTracker({
  goals,
  accounts,
  projects = [],
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onContributeToGoal,
}: GoalTrackerProps) {
  // Modals state
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  // Form states - Goal
  const [goalName, setGoalName] = useState('');
  const [goalTargetAmount, setGoalTargetAmount] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [goalProjectId, setGoalProjectId] = useState('');

  // Form states - Contribution
  const [contribAccount, setContribAccount] = useState('');
  const [contribAmount, setContribAmount] = useState('');

  // Find goal by ID
  const selectedGoal = goals.find(g => g.id === activeGoalId);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Handle Goal submit
  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !goalTargetAmount || isNaN(Number(goalTargetAmount)) || Number(goalTargetAmount) <= 0) {
      alert('Por favor ingrese campos válidos.');
      return;
    }

    onAddGoal({
      name: goalName,
      targetAmount: Number(goalTargetAmount),
      accumulatedAmount: 0,
      targetDate: goalTargetDate,
      projectId: goalProjectId || undefined,
      isActive: true,
    });

    setGoalName('');
    setGoalTargetAmount('');
    setGoalTargetDate(new Date().toISOString().split('T')[0]);
    setGoalProjectId('');
    setShowAddGoalModal(false);
  };

  // Handle Contribution submit
  const handleContribSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalId || !contribAccount || !contribAmount || isNaN(Number(contribAmount)) || Number(contribAmount) <= 0) {
      alert('Ingrese campos válidos para la transferencia.');
      return;
    }

    const acc = accounts.find(a => a.id === contribAccount);
    if (!acc) return;

    if (acc.currentBalance < Number(contribAmount)) {
      alert(`Fondos insuficientes en la cuenta ${acc.name}. Balance actual: ${formatCurrency(acc.currentBalance)}`);
      return;
    }

    // Call state elevator
    onContributeToGoal(activeGoalId, contribAccount, Number(contribAmount));

    // Reset
    setContribAmount('');
    setContribAccount('');
    setActiveGoalId(null);
    setShowContributeModal(false);
  };

  // Open contribution modal
  const openContribute = (goalId: string) => {
    setActiveGoalId(goalId);
    if (accounts.length > 0) {
      setContribAccount(accounts[0].id);
    }
    setShowContributeModal(true);
  };

  return (
    <div className="space-y-6" id="goals-container">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Mis Metas de Ahorro</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Establece propósitos concretos y separa fondos de tus cuentas líquidas de manera directa.</p>
        </div>
        <button 
          onClick={() => setShowAddGoalModal(true)}
          className="text-xs font-bold text-emerald-500 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
          id="btn-nueva-meta"
        >
          <Plus size={14} className="stroke-[3]" />
          <span>Nueva Meta</span>
        </button>
      </div>

      {/* Grid de Metas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="goals-grid">
        {goals.map(goal => {
          const pct = Math.min(100, Math.round((goal.accumulatedAmount / goal.targetAmount) * 100));
          const isCompleted = goal.accumulatedAmount >= goal.targetAmount;

          return (
            <div key={goal.id} className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col justify-between space-y-4 hover:border-neutral-200 transition-all relative overflow-hidden" id={`goal-card-${goal.id}`}>
              {/* Completed badge decor */}
              {isCompleted && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl flex items-center space-x-1">
                  <ShieldCheck size={11} />
                  <span>Logrado</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-xl ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-50 text-neutral-600'}`}>
                    <Target size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-800">{goal.name}</h4>
                    <span className="text-[10px] text-neutral-400 flex items-center mt-0.5">
                      <Calendar size={11} className="mr-1" />
                      Límite: {goal.targetDate}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-lg font-black text-neutral-800">{formatCurrency(goal.accumulatedAmount)}</span>
                  <span className="text-xs text-neutral-400 font-medium">de {formatCurrency(goal.targetAmount)}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-extrabold text-neutral-400">
                    <span>Progreso</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-neutral-900'}`} 
                      style={{ width: `${pct}%` }} 
                    />
                  </div>
                </div>

                {/* Vinculación de Proyectos & Activación */}
                <div className="bg-neutral-50 p-2.5 rounded-2xl border border-neutral-100 flex flex-col space-y-2 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-400">Proyecto:</span>
                    <select
                      value={goal.projectId || ''}
                      onChange={(e) => {
                        onUpdateGoal({
                          ...goal,
                          projectId: e.target.value || undefined,
                          isActive: e.target.value ? true : undefined
                        });
                      }}
                      className="font-bold text-neutral-700 bg-transparent border-none focus:ring-0 max-w-[140px] text-right cursor-pointer p-0"
                    >
                      <option value="">-- Sin Vincular --</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {goal.projectId && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-neutral-200/50">
                      <span className="text-[9px] font-bold text-neutral-400">Simulación Presupuesto:</span>
                      <button
                        onClick={() => {
                          onUpdateGoal({
                            ...goal,
                            isActive: goal.isActive === false ? true : false
                          });
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wider uppercase border transition-all cursor-pointer ${goal.isActive !== false ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-neutral-100 text-neutral-400 border-neutral-200 hover:bg-neutral-200'}`}
                      >
                        {goal.isActive !== false ? 'Simular: ON' : 'Simular: OFF'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-between border-t border-neutral-50 pt-3 mt-2">
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar la meta "${goal.name}"? Los fondos acumulados volverán virtualmente a las cuentas globales.`)) {
                      onDeleteGoal(goal.id);
                    }
                  }}
                  className="p-1.5 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                  title="Eliminar meta"
                >
                  <Trash2 size={13} />
                </button>

                {!isCompleted && (
                  <button
                    onClick={() => openContribute(goal.id)}
                    className="text-xs font-bold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <PiggyBank size={13} />
                    <span>Aportar Fondos</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl p-10 border border-neutral-100 text-center text-neutral-400 space-y-2">
            <PiggyBank className="mx-auto text-neutral-300" size={36} />
            <p className="text-sm font-medium">No has creado metas de ahorro todavía.</p>
          </div>
        )}
      </div>

      {/* Modal para Crear Meta */}
      <AnimatePresence>
        {showAddGoalModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4" id="modal-goal-backdrop">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto"
              id="modal-goal-content"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-6">
                <h3 className="text-lg font-bold text-neutral-900">Nueva Meta de Ahorro</h3>
                <button 
                  onClick={() => setShowAddGoalModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleGoalSubmit} className="space-y-4">
                {/* Nombre de Meta */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">¿Para qué estás ahorrando?</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Comprar Heladera, Viaje a Bariloche"
                    value={goalName}
                    onChange={e => setGoalName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Monto Objetivo */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Monto Objetivo ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={goalTargetAmount}
                    onChange={e => setGoalTargetAmount(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Fecha Estimada */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha estimada de logro</label>
                  <input
                    type="date"
                    required
                    value={goalTargetDate}
                    onChange={e => setGoalTargetDate(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Vincular a un Proyecto */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Vincular a un Proyecto (Opcional)</label>
                  <select
                    value={goalProjectId}
                    onChange={e => setGoalProjectId(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white font-semibold"
                  >
                    <option value="">-- Sin Vincular --</option>
                    {projects.map(proj => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Guardar */}
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-base transition-all mt-6 cursor-pointer"
                >
                  Fijar Meta
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para aportar fondos directos */}
      <AnimatePresence>
        {showContributeModal && selectedGoal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4" id="modal-contrib-backdrop">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto"
              id="modal-contrib-content"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Aportar Fondos</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Asignar fondos directos para la meta: <span className="font-bold text-neutral-700">{selectedGoal.name}</span></p>
                </div>
                <button 
                  onClick={() => setShowContributeModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleContribSubmit} className="space-y-4">
                {/* Cuenta Origen */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Débito de cuenta</label>
                  <select
                    value={contribAccount}
                    onChange={e => setContribAccount(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Disponible: {formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Monto del aporte */}
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Monto del aporte ($)</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={contribAmount}
                    onChange={e => setContribAmount(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    * Nota: Esta transacción se registrará como un egreso por inversiones en tu cuenta origen, y se sumará al acumulado de esta meta.
                  </p>
                </div>

                {/* Guardar */}
                <button
                  type="submit"
                  className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-bold text-base transition-all mt-6 cursor-pointer"
                >
                  Confirmar Aporte
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
