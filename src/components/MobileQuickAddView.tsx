/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, Check, Wallet, ShoppingCart, Car, DollarSign, Coffee, 
  MessageSquare, ArrowLeft, Delete, Sparkles 
} from 'lucide-react';
import { Account, Transaction } from '../types';

interface MobileQuickAddViewProps {
  accounts: Account[];
  initialAmount?: string;
  onClose: () => void;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
}

export function MobileQuickAddView({
  accounts,
  initialAmount = '',
  onClose,
  onAddTransaction
}: MobileQuickAddViewProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return accounts.length > 0 ? accounts[0].id : '';
  });
  const [category, setCategory] = useState('Comida');
  const [description, setDescription] = useState('');

  const activeAccount = accounts.find(a => a.id === selectedAccountId);

  // Quick categories
  const categoriesList = [
    { name: 'Comida', icon: <ShoppingCart size={16} />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { name: 'Transporte', icon: <Car size={16} />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { name: 'Kiosco', icon: <Coffee size={16} />, color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    { name: 'Otros', icon: <Sparkles size={16} />, color: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30' }
  ];

  const handleKeyPress = (key: string) => {
    if (key === 'C') {
      setAmount('');
    } else if (key === 'backspace') {
      setAmount(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!amount.includes('.')) {
        setAmount(prev => prev + '.');
      }
    } else {
      // Limit to 8 digits
      if (amount.length < 8) {
        setAmount(prev => prev + key);
      }
    }
  };

  const handleRegister = () => {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Por favor, ingresa un monto válido.');
      return;
    }

    if (!activeAccount) return;

    onAddTransaction({
      date: new Date().toISOString().split('T')[0],
      type: 'Gasto',
      originAccount: activeAccount.name,
      category: category,
      amount: numAmount,
      description: description.trim() || `Gasto rápido: ${category}`,
      tags: ['quick-add', 'mobile']
    });

    onClose();
  };

  const formatCurrency = (val: string) => {
    if (!val) return '$0';
    const num = Number(val);
    if (isNaN(num)) return '$0';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: val.includes('.') ? 2 : 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white p-6 flex flex-col justify-between overflow-hidden font-sans" id="mobile-quick-add-layout">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-neutral-900 rounded-full cursor-pointer flex items-center space-x-1 text-xs text-neutral-400 font-bold"
        >
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
          Carga Rápida
        </span>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-neutral-900 rounded-full cursor-pointer"
        >
          <X size={20} className="text-neutral-400" />
        </button>
      </div>

      {/* Visor de Monto */}
      <div className="my-2 flex flex-col items-center justify-center space-y-1">
        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Monto a Registrar</span>
        <div className="text-5xl font-black text-center text-emerald-400 tracking-tight font-sans truncate max-w-full px-4">
          {formatCurrency(amount)}
        </div>
      </div>

      {/* Formulario Rápido (Cuenta, Categoría, Detalle) */}
      <div className="space-y-4 my-2">
        {/* Cuenta de Pago */}
        <div className="flex justify-between items-center bg-neutral-900/60 p-3 rounded-2xl border border-neutral-900">
          <span className="text-xs font-bold text-neutral-400 flex items-center space-x-1.5">
            <Wallet size={14} className="text-neutral-500" />
            <span>Pagar desde</span>
          </span>
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className="bg-transparent text-xs font-bold text-neutral-200 focus:outline-hidden text-right cursor-pointer"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                {acc.name} (${acc.currentBalance.toLocaleString('es-AR', { maximumFractionDigits: 0 })})
              </option>
            ))}
          </select>
        </div>

        {/* Categoría Burbujas */}
        <div>
          <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-2 text-center">Categoría</span>
          <div className="grid grid-cols-4 gap-2">
            {categoriesList.map(cat => {
              const active = category === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setCategory(cat.name)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-black border transition-all flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${active ? 'bg-white text-neutral-950 border-white shadow-lg shadow-white/5' : `bg-neutral-900 border-neutral-800 text-neutral-400`}`}
                >
                  {cat.icon}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle Corto */}
        <div className="relative">
          <input
            type="text"
            placeholder="Nota corta (ej. Kiosco, Helado)..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-3.5 bg-neutral-900 border border-neutral-850 rounded-2xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-neutral-700"
          />
        </div>
      </div>

      {/* Teclado Numérico Gigante para Pulgar */}
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto w-full my-2" id="quick-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(key => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className="h-14 bg-neutral-900 hover:bg-neutral-850 active:bg-neutral-800 text-xl font-bold rounded-2xl flex items-center justify-center transition-colors cursor-pointer border border-neutral-900"
          >
            {key}
          </button>
        ))}
        
        {/* Tecla de Borrado */}
        <button
          type="button"
          onClick={() => handleKeyPress('backspace')}
          className="h-14 bg-neutral-900 hover:bg-neutral-850 active:bg-neutral-800 text-neutral-400 rounded-2xl flex items-center justify-center transition-colors cursor-pointer border border-neutral-900"
          title="Borrar carácter"
        >
          <Delete size={20} />
        </button>
      </div>

      {/* Botón de Confirmación Gigante */}
      <div className="w-full max-w-sm mx-auto mt-2">
        <button
          type="button"
          onClick={handleRegister}
          disabled={!amount || Number(amount) <= 0}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-900 disabled:text-neutral-600 rounded-2xl font-black text-sm tracking-widest uppercase transition-all flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          <Check size={16} className="stroke-[3]" />
          <span>Registrar Gasto</span>
        </button>
      </div>
    </div>
  );
}
