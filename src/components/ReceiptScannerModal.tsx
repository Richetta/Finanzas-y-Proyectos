/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Camera, Upload, Trash2, Plus, Check, Info, FileText, 
  ArrowRight, ShieldAlert, Sparkles, HelpCircle, ShoppingCart 
} from 'lucide-react';
import { Account, Transaction, TransactionItem } from '../types';

interface ReceiptScannerModalProps {
  show: boolean;
  onClose: () => void;
  accounts: Account[];
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
}

export function ReceiptScannerModal({
  show,
  onClose,
  accounts,
  transactions,
  onAddTransaction
}: ReceiptScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'scanner' | 'manual'>('scanner');
  
  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<TransactionItem[]>([]);
  
  // Manual list states
  const [manualItems, setManualItems] = useState<TransactionItem[]>([]);
  
  // Form states
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => {
    return accounts.length > 0 ? accounts[0].id : '';
  });
  const [supermarketName, setSupermarketName] = useState('COTO Supermercado');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txCategory, setTxCategory] = useState('Comida');

  // Input states for adding items inline
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCat, setItemCat] = useState('Comida');

  // Total sum of active items
  const activeItems = useMemo(() => {
    return activeTab === 'scanner' ? scannedItems : manualItems;
  }, [activeTab, scannedItems, manualItems]);

  const totalAmount = useMemo(() => {
    return activeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [activeItems]);

  // Historical Price Lookup
  const historicalMatch = useMemo(() => {
    if (!itemName.trim() || itemName.length < 3) return null;
    
    const searchName = itemName.toLowerCase().trim();
    for (const tx of transactions) {
      if (tx.items) {
        const found = tx.items.find(it => it.name.toLowerCase().includes(searchName));
        if (found) {
          return {
            price: found.price,
            date: tx.date,
            merchant: tx.description.replace('Compra Súper: ', '').replace('Compra supermercado: ', '') || 'Supermercado'
          };
        }
      }
    }
    return null;
  }, [itemName, transactions]);

  // Mock receipt image upload and trigger AI scan simulation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptImage(reader.result as string);
        triggerAiScan();
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAiScan = () => {
    setIsScanning(true);
    setScannedItems([]);
    
    // Simulate AI parsing delay of 3 seconds
    setTimeout(() => {
      setIsScanning(false);
      // Realistic parsed receipt items
      const mockItems: TransactionItem[] = [
        { id: 'item_1', name: 'Leche Entera La Serenísima 1L', quantity: 2, price: 1450, category: 'Comida' },
        { id: 'item_2', name: 'Tallarines Lucchetti 500g', quantity: 3, price: 1200, category: 'Comida' },
        { id: 'item_3', name: 'Jabón Líquido Ala Matic 3L', quantity: 1, price: 8900, category: 'Limpieza' },
        { id: 'item_4', name: 'Queso Cremoso Barra La Paulina 1kg', quantity: 1, price: 6200, category: 'Comida' },
        { id: 'item_5', name: 'Gaseosa Coca Cola Retornable 2.25L', quantity: 2, price: 2800, category: 'Comida' },
        { id: 'item_6', name: 'Esponja de Cocina Mortimer 3u', quantity: 1, price: 1800, category: 'Limpieza' }
      ];
      setScannedItems(mockItems);
      setSupermarketName('Carrefour Express');
    }, 3000);
  };

  const handleAddItem = () => {
    if (!itemName.trim() || !itemPrice || isNaN(Number(itemPrice))) return;

    const newItem: TransactionItem = {
      id: 'item_' + Date.now(),
      name: itemName.trim(),
      quantity: Number(itemQty) || 1,
      price: Number(itemPrice),
      category: itemCat
    };

    if (activeTab === 'scanner') {
      setScannedItems([...scannedItems, newItem]);
    } else {
      setManualItems([...manualItems, newItem]);
    }

    // Reset inline inputs
    setItemName('');
    setItemQty('1');
    setItemPrice('');
  };

  const handleDeleteItem = (id: string) => {
    if (activeTab === 'scanner') {
      setScannedItems(scannedItems.filter(item => item.id !== id));
    } else {
      setManualItems(manualItems.filter(item => item.id !== id));
    }
  };

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeItems.length === 0) {
      alert('Por favor agregue o escanee productos antes de registrar la compra.');
      return;
    }

    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return;

    // Create the detailed transaction payload
    const txPayload: Omit<Transaction, 'id'> = {
      date: purchaseDate,
      type: 'Gasto',
      originAccount: account.name,
      category: txCategory,
      amount: totalAmount,
      description: `Compra Súper: ${supermarketName}`,
      tags: ['supermercado', 'compra-desglosada'],
      items: activeItems,
      receiptImage: receiptImage || undefined
    };

    onAddTransaction(txPayload);
    
    // Reset scanner states
    setReceiptImage(null);
    setScannedItems([]);
    setManualItems([]);
    onClose();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[92vh]"
        id="receipt-scanner-modal"
      >
        {/* Cabecera */}
        <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900">Registrar Compra del Súper</h3>
              <p className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">Desglose inteligente de productos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full cursor-pointer"
          >
            <X size={20} className="text-neutral-500" />
          </button>
        </div>

        {/* Selector de Métodos (Escanear vs Manual) */}
        <div className="flex items-center space-x-1.5 bg-neutral-100 p-1.2 rounded-2xl mb-6">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${activeTab === 'scanner' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <Camera size={13} />
            <span>Escanear Foto de Ticket (Simulado)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${activeTab === 'manual' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'}`}
          >
            <FileText size={13} />
            <span>Desglose Manual</span>
          </button>
        </div>

        <form onSubmit={handleConfirmPurchase} className="space-y-6">
          {/* Ficha General de Compra */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Comercio / Supermercado</label>
              <input
                type="text"
                required
                value={supermarketName}
                onChange={e => setSupermarketName(e.target.value)}
                className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:outline-hidden focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Fecha de Compra</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:outline-hidden focus:border-neutral-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">Categoría Contable</label>
              <select
                value={txCategory}
                onChange={e => setTxCategory(e.target.value)}
                className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:outline-hidden focus:border-neutral-900"
              >
                <option value="Comida">Comida / Supermercado</option>
                <option value="Servicios">Hogar / Limpieza</option>
                <option value="Otros">Otros Gastos</option>
              </select>
            </div>
          </div>

          {/* Área Principal por Pestaña */}
          {activeTab === 'scanner' && (
            <div className="space-y-4">
              {/* Cargador de Ticket */}
              {!receiptImage ? (
                <div className="border-2 border-dashed border-neutral-200 rounded-3xl p-8 text-center bg-neutral-50/50 hover:bg-neutral-50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-3">
                    <div className="w-12 h-12 bg-white rounded-2xl border border-neutral-100 flex items-center justify-center mx-auto text-neutral-400 shadow-xs">
                      <Upload size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">Sube la foto de tu ticket de compra</p>
                      <p className="text-[10px] text-neutral-400 mt-1 font-semibold">Formatos soportados: JPG, PNG. Simula lectura por IA.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Vista Previa del Ticket y Escaneo */}
                  <div className="md:col-span-2 relative bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 flex items-center justify-center min-h-[220px]">
                    <img 
                      src={receiptImage} 
                      alt="Ticket de supermercado" 
                      className={`object-cover w-full h-full max-h-[260px] opacity-70 ${isScanning ? 'blur-xs' : ''}`}
                    />
                    
                    {/* Botón para cambiar foto */}
                    <button 
                      type="button"
                      onClick={() => { setReceiptImage(null); setScannedItems([]); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/85 text-white rounded-full transition-colors cursor-pointer"
                      title="Quitar foto"
                    >
                      <X size={14} />
                    </button>

                    {/* Animación Láser de Escáner IA */}
                    <AnimatePresence>
                      {isScanning && (
                        <>
                          <motion.div 
                            initial={{ top: '0%' }}
                            animate={{ top: '100%' }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                            className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_12px_#34d399] z-10"
                          />
                          <div className="absolute inset-0 bg-emerald-500/10 flex flex-col items-center justify-center text-center p-4">
                            <Sparkles className="text-emerald-400 animate-spin mb-2" size={24} />
                            <span className="text-[10px] text-white font-black uppercase tracking-wider bg-neutral-950/80 px-2 py-1 rounded-lg">Analizando Ticket con IA...</span>
                          </div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Listado de Productos escaneados */}
                  <div className="md:col-span-3 flex flex-col justify-between min-h-[240px]">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                        <Sparkles size={11} className="text-emerald-500" />
                        <span>Productos leídos por IA</span>
                      </h4>
                      {scannedItems.length === 0 && !isScanning && (
                        <div className="p-8 text-center text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col items-center justify-center space-y-1 h-[200px]">
                          <Info size={24} className="text-neutral-300" />
                          <p className="text-xs font-bold">Sin productos leídos aún</p>
                          <p className="text-[10px] max-w-[180px] mx-auto mt-0.5">Sube una imagen para ver la detección automática por IA.</p>
                        </div>
                      )}

                      {isScanning && (
                        <div className="p-8 text-center text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col items-center justify-center space-y-2 h-[200px]">
                          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs font-bold">Analizando ticket...</p>
                        </div>
                      )}

                      {scannedItems.length > 0 && (
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                          {scannedItems.map((item, idx) => (
                            <div key={item.id} className="p-2 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-between text-xs">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-neutral-800 block truncate">{item.name}</span>
                                <span className="text-[10px] text-neutral-400 font-semibold">{item.category} • Cantidad: {item.quantity}</span>
                              </div>
                              <div className="flex items-center space-x-3 ml-2">
                                <span className="font-extrabold text-neutral-900">{formatCurrency(item.price * item.quantity)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-neutral-300 hover:text-rose-500 transition-colors cursor-pointer"
                                  title="Quitar"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Desglose de compras cargadas</h4>
              
              {manualItems.length === 0 ? (
                <div className="p-8 text-center text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100 flex flex-col items-center justify-center space-y-1 min-h-[160px]">
                  <ShoppingCart size={24} className="text-neutral-300" />
                  <p className="text-xs font-bold text-neutral-600">Ningún producto cargado</p>
                  <p className="text-[10px] max-w-[200px] mx-auto mt-0.5">Usa la fila de carga debajo para añadir los productos de tu ticket.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {manualItems.map(item => (
                    <div key={item.id} className="p-2.5 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-between text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-neutral-800 block truncate">{item.name}</span>
                        <span className="text-[10px] text-neutral-400 font-semibold">{item.category} • Cantidad: {item.quantity} x {formatCurrency(item.price)}</span>
                      </div>
                      <div className="flex items-center space-x-3 ml-2">
                        <span className="font-extrabold text-neutral-900">{formatCurrency(item.price * item.quantity)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-neutral-300 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fila de Carga Rápida (para agregar artículos en ambos modos) */}
          {(activeTab === 'manual' || (activeTab === 'scanner' && receiptImage && !isScanning)) && (
            <div className="bg-neutral-50/50 p-3 rounded-2xl border border-neutral-100 space-y-2" id="quick-add-item-row">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Agregar Producto a la Lista</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Producto (ej. Arroz, Detergente)"
                    value={itemName}
                    onChange={e => setItemName(e.target.value)}
                    className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-900"
                  />
                  {/* Comparador de Precios Histórico */}
                  <AnimatePresence>
                    {historicalMatch && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="mt-1.5 p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg flex justify-between items-center text-[9px] text-indigo-700 font-semibold"
                      >
                        <span className="truncate">Historial: {formatCurrency(historicalMatch.price)} ({historicalMatch.merchant})</span>
                        <button
                          type="button"
                          onClick={() => setItemPrice(historicalMatch.price.toString())}
                          className="px-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[7px] font-black uppercase cursor-pointer"
                        >
                          Usar
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Cant."
                    value={itemQty}
                    onChange={e => setItemQty(e.target.value)}
                    className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Precio unitario ($)"
                    value={itemPrice}
                    onChange={e => setItemPrice(e.target.value)}
                    className="w-full p-2 bg-white border border-neutral-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-neutral-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="p-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center space-x-1 shadow-xs"
                >
                  <Plus size={13} />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer del Modal: Sumas, Cuenta de Pago y Confirmación */}
          <div className="border-t border-neutral-100 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Total */}
            <div>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Total de Compra Registrado</span>
              <span className="text-xl font-extrabold text-neutral-900">{formatCurrency(totalAmount)}</span>
              <span className="text-[10px] text-neutral-400 block font-semibold">{activeItems.length} productos en lista</span>
            </div>

            {/* Selector de cuenta y Guardar */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <select
                  required
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                  {accounts.length === 0 && (
                    <option value="">No hay cuentas creadas</option>
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={activeItems.length === 0 || accounts.length === 0 || isScanning}
                className="py-3 px-5 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Check size={14} className="stroke-[2.5]" />
                <span>Confirmar Compra</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
