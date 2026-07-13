/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, Check, Info, ShoppingCart, Sparkles, HelpCircle, 
  ChevronDown, ChevronUp, Link as LinkIcon, MapPin, Calendar, Clock,
  Edit2, Wallet, X, CheckSquare, Square, Folder, AlertCircle, Database
} from 'lucide-react';
import { Account, Transaction, ShoppingItem, ShoppingGroup, PantryItem } from '../types';

interface ShoppingListViewProps {
  shoppingGroups: ShoppingGroup[];
  accounts: Account[];
  transactions: Transaction[];
  pantry: PantryItem[];
  onAddShoppingGroup: (group: Omit<ShoppingGroup, 'id'>) => void;
  onUpdateShoppingGroup: (group: ShoppingGroup) => void;
  onDeleteShoppingGroup: (id: string) => void;
  onConvertGroupToTransaction: (groupId: string, checkedItems: ShoppingItem[], accountId: string, date: string, merchantName: string) => void;
  onUpdatePantry: (pantry: PantryItem[]) => void;
}

function ShoppingListViewInner({
  shoppingGroups = [],
  accounts,
  transactions,
  pantry = [],
  onAddShoppingGroup,
  onUpdateShoppingGroup,
  onDeleteShoppingGroup,
  onConvertGroupToTransaction,
  onUpdatePantry
}: ShoppingListViewProps) {
  // Filters & Sorting States
  const [urgencyFilter, setUrgencyFilter] = useState<'todos' | 'Alta' | 'Media' | 'Baja'>('todos');
  const [sortBy, setSortBy] = useState<'date' | 'urgency' | 'name'>('urgency');

  // Pantry States
  const [showPantryModal, setShowPantryModal] = useState(false);
  const [pantryName, setPantryName] = useState('');
  const [pantryCategory, setPantryCategory] = useState('Higiene Personal');
  const [pantryPrice, setPantryPrice] = useState('');
  const [pantryFrequency, setPantryFrequency] = useState('Cuando se acabe');
  const [pantryCategoryFilter, setPantryCategoryFilter] = useState('todos');
  const [pantryStatusFilter, setPantryStatusFilter] = useState('todos');
  const [pantrySearchQuery, setPantrySearchQuery] = useState('');

  // Toggle Pantry item status
  const handleTogglePantryItem = (pItem: PantryItem) => {
    const isNowAgotado = pItem.status === 'Disponible';
    const newStatus = isNowAgotado ? 'Agotado' : 'Disponible';

    // 1. Update status
    const updatedPantry = pantry.map(item => item.id === pItem.id ? {
      ...item,
      status: newStatus,
      lastCheckedDate: new Date().toISOString().split('T')[0]
    } : item);
    onUpdatePantry(updatedPantry);

    // 2. Add or remove from special "Reposición Despensa" shopping group
    if (isNowAgotado) {
      let group = shoppingGroups.find(g => g.name === 'Reposición Despensa');
      const newItem: ShoppingItem = {
        id: 'pantry_it_' + pItem.id + '_' + Date.now(),
        name: pItem.name,
        quantity: 1,
        estimatedPrice: pItem.estimatedPrice,
        completed: false
      };

      if (group) {
        onUpdateShoppingGroup({
          ...group,
          items: [...group.items, newItem]
        });
      } else {
        onAddShoppingGroup({
          name: 'Reposición Despensa',
          date: new Date().toISOString().split('T')[0],
          urgency: 'Media',
          storeLocation: 'Supermercado',
          items: [newItem]
        });
      }
    } else {
      let group = shoppingGroups.find(g => g.name === 'Reposición Despensa');
      if (group) {
        const updatedItems = group.items.filter(it => it.name.toLowerCase().trim() !== pItem.name.toLowerCase().trim());
        onUpdateShoppingGroup({
          ...group,
          items: updatedItems
        });
      }
    }
  };

  // Add new Pantry item
  const handleAddPantryItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pantryName.trim()) return;

    const newItem: PantryItem = {
      id: 'pantry_it_' + Date.now(),
      name: pantryName.trim(),
      category: pantryCategory,
      estimatedPrice: Number(pantryPrice) || 0,
      status: 'Disponible',
      frequency: pantryFrequency,
      lastCheckedDate: new Date().toISOString().split('T')[0]
    };

    onUpdatePantry([...pantry, newItem]);
    setPantryName('');
    setPantryPrice('');
    setShowPantryModal(false);
  };

  // Delete Pantry item
  const handleDeletePantryItem = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este insumo recurrente de la despensa?')) {
      onUpdatePantry(pantry.filter(item => item.id !== id));
    }
  };

  // Filter Pantry Items
  const filteredPantry = useMemo(() => {
    let result = pantry || [];
    const q = pantrySearchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(it => it.name.toLowerCase().includes(q));
    }
    if (pantryCategoryFilter !== 'todos') {
      result = result.filter(it => it.category === pantryCategoryFilter);
    }
    if (pantryStatusFilter !== 'todos') {
      result = result.filter(it => it.status === pantryStatusFilter);
    }
    return result;
  }, [pantry, pantrySearchQuery, pantryCategoryFilter, pantryStatusFilter]);


  // Mode & Tabs States
  const [shoppingMode, setShoppingMode] = useState<'daily' | 'planned' | 'pantry'>('daily');
  const [selectedGroupTab, setSelectedGroupTab] = useState<string>('all');
  const [dailyInput, setDailyInput] = useState('');

  // Modals States
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [showCheckoutGroupId, setShowCheckoutGroupId] = useState<string | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemGroupId, setEditingItemGroupId] = useState<string | null>(null);

  // Edit Item Form States
  const [editItemName, setEditItemName] = useState('');
  const [editItemQty, setEditItemQty] = useState('1');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemUrl, setEditItemUrl] = useState('');
  const [editItemStore, setEditItemStore] = useState('');

  // Group Form States
  const [groupName, setGroupName] = useState('');
  const [groupDate, setGroupDate] = useState('');
  const [groupUrgency, setGroupUrgency] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [groupUrl, setGroupUrl] = useState('');
  const [groupStore, setGroupStore] = useState('');

  // Checkout Form States
  const [checkoutAccountId, setCheckoutAccountId] = useState(() => {
    return accounts.length > 0 ? accounts[0].id : '';
  });
  const [checkoutMerchant, setCheckoutMerchant] = useState('');
  const [checkoutDate, setCheckoutDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Inline Item Adding States (Mapped by groupId)
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [itemQtys, setItemQtys] = useState<Record<string, string>>({});
  const [itemPrices, setItemPrices] = useState<Record<string, string>>({});
  const [itemUrls, setItemUrls] = useState<Record<string, string>>({});
  const [itemStores, setItemStores] = useState<Record<string, string>>({});

  // Accordion Expand/Collapse state
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    // Keep first group expanded by default if exists
    return {};
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Autocomplete price suggestion logic based on item name typing
  const getHistoricalPrice = (name: string) => {
    if (!name.trim() || name.length < 3) return null;
    const searchName = name.toLowerCase().trim();
    for (const tx of transactions) {
      if (tx.items) {
        const found = tx.items.find(it => it.name.toLowerCase().includes(searchName));
        if (found) {
          return {
            price: found.price,
            date: tx.date,
            merchant: tx.description.replace('Compra: ', '').replace('Compra Súper: ', '') || 'Comercio'
          };
        }
      }
    }
    return null;
  };

  // Group level operations
  const handleOpenCreateGroup = () => {
    setEditingGroupId(null);
    setGroupName('');
    setGroupDate('');
    setGroupUrgency('Media');
    setGroupUrl('');
    setGroupStore('');
    setShowGroupModal(true);
  };

  const handleOpenEditGroup = (group: ShoppingGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setGroupDate(group.date || '');
    setGroupUrgency(group.urgency);
    setGroupUrl(group.url || '');
    setGroupStore(group.storeLocation || '');
    setShowGroupModal(true);
  };

  const handleGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('Ingrese un nombre de lista válido.');
      return;
    }

    if (editingGroupId) {
      const orig = shoppingGroups.find(g => g.id === editingGroupId);
      if (orig) {
        onUpdateShoppingGroup({
          ...orig,
          name: groupName.trim(),
          date: groupDate || undefined,
          urgency: groupUrgency,
          url: groupUrl.trim() || undefined,
          storeLocation: groupStore.trim() || undefined
        });
      }
    } else {
      onAddShoppingGroup({
        name: groupName.trim(),
        date: groupDate || undefined,
        urgency: groupUrgency,
        url: groupUrl.trim() || undefined,
        storeLocation: groupStore.trim() || undefined
      });
      // Automatically expand new group
      setExpandedGroups(prev => ({ ...prev, ['shop_grp_' + Date.now()]: true }));
    }

    setShowGroupModal(false);
  };

  // Frequent items suggested from past transactions ledger
  const frequentItems = useMemo(() => {
    const counts: Record<string, number> = {};
    (transactions || []).forEach(tx => {
      if (tx.items) {
        tx.items.forEach(it => {
          const name = it.name.trim();
          if (name) {
            counts[name] = (counts[name] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(x => x[0]);
  }, [transactions]);

  const handleDailyInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyInput.trim()) return;

    let targetGroupId = selectedGroupTab;
    if (targetGroupId === 'all') {
      const first = shoppingGroups[0];
      if (first) {
        targetGroupId = first.id;
      } else {
        onAddShoppingGroup({
          name: 'Súper Diario',
          urgency: 'Media'
        });
        setDailyInput('');
        alert('Creando carpeta "Súper Diario". Vuelve a presionar Enter para agregar tus artículos.');
        return;
      }
    }

    const group = shoppingGroups.find(g => g.id === targetGroupId);
    if (!group) return;

    const names = dailyInput.split(',').map(s => s.trim()).filter(Boolean);
    const newItems: ShoppingItem[] = names.map((name, index) => {
      const hist = getHistoricalPrice(name);
      return {
        id: 'item_' + (Date.now() + index),
        name,
        quantity: 1,
        estimatedPrice: hist ? hist.price : 0,
        completed: false
      };
    });

    onUpdateShoppingGroup({
      ...group,
      items: [...(group.items || []), ...newItems]
    });

    setDailyInput('');
  };

  const handleQuickAddFrequent = (name: string) => {
    let targetGroupId = selectedGroupTab;
    if (targetGroupId === 'all') {
      const first = shoppingGroups[0];
      if (first) {
        targetGroupId = first.id;
      } else {
        onAddShoppingGroup({
          name: 'Súper Diario',
          urgency: 'Media'
        });
        alert('Se ha creado la carpeta "Súper Diario". Vuelve a pulsar el botón para agregar el artículo.');
        return;
      }
    }

    const group = shoppingGroups.find(g => g.id === targetGroupId);
    if (!group) return;

    const hist = getHistoricalPrice(name);
    const newItem: ShoppingItem = {
      id: 'item_' + Date.now(),
      name,
      quantity: 1,
      estimatedPrice: hist ? hist.price : 0,
      completed: false
    };

    onUpdateShoppingGroup({
      ...group,
      items: [...(group.items || []), newItem]
    });
  };

  const handleClearCompletedInGroup = (groupId: string) => {
    const group = shoppingGroups.find(g => g.id === groupId);
    if (!group) return;
    const updated = (group.items || []).filter(it => !it.completed);
    onUpdateShoppingGroup({ ...group, items: updated });
  };

  const handleOpenEditItem = (groupId: string, item: ShoppingItem) => {
    setEditingItemGroupId(groupId);
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemQty(item.quantity.toString());
    setEditItemPrice(item.estimatedPrice.toString());
    setEditItemUrl(item.url || '');
    setEditItemStore(item.store || '');
    setShowItemModal(true);
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemGroupId || !editingItemId) return;
    
    const group = shoppingGroups.find(g => g.id === editingItemGroupId);
    if (!group) return;
    
    const updatedItems = (group.items || []).map(it => {
      if (it.id === editingItemId) {
        return {
          ...it,
          name: editItemName.trim(),
          quantity: Number(editItemQty) || 1,
          estimatedPrice: Number(editItemPrice) || 0,
          url: editItemUrl.trim() || undefined,
          store: editItemStore.trim() || undefined
        };
      }
      return it;
    });
    
    onUpdateShoppingGroup({
      ...group,
      items: updatedItems
    });
    
    setShowItemModal(false);
  };

  // Item level mutations within a group
  const handleAddItem = (groupId: string, e: React.FormEvent) => {
    e.preventDefault();
    const name = itemNames[groupId] || '';
    const qty = Number(itemQtys[groupId] || '1');
    const price = Number(itemPrices[groupId] || '0');
    const url = itemUrls[groupId] || '';
    const store = itemStores[groupId] || '';

    if (!name.trim()) {
      alert('Ingrese el nombre del artículo.');
      return;
    }

    const group = shoppingGroups.find(g => g.id === groupId);
    if (!group) return;

    const newItem: ShoppingItem = {
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
      estimatedPrice: isNaN(price) || price < 0 ? 0 : price,
      completed: false,
      url: url.trim() || undefined,
      store: store.trim() || undefined
    };

    onUpdateShoppingGroup({
      ...group,
      items: [...group.items, newItem]
    });

    // Reset item inputs for this group
    setItemNames(prev => ({ ...prev, [groupId]: '' }));
    setItemQtys(prev => ({ ...prev, [groupId]: '1' }));
    setItemPrices(prev => ({ ...prev, [groupId]: '' }));
    setItemUrls(prev => ({ ...prev, [groupId]: '' }));
    setItemStores(prev => ({ ...prev, [groupId]: '' }));
  };

  const handleToggleItem = (groupId: string, itemId: string) => {
    const group = shoppingGroups.find(g => g.id === groupId);
    if (!group) return;

    const updatedItems = group.items.map(it => {
      if (it.id === itemId) return { ...it, completed: !it.completed };
      return it;
    });

    onUpdateShoppingGroup({
      ...group,
      items: updatedItems
    });
  };

  const handleDeleteItem = (groupId: string, itemId: string) => {
    const group = shoppingGroups.find(g => g.id === groupId);
    if (!group) return;

    onUpdateShoppingGroup({
      ...group,
      items: group.items.filter(it => it.id !== itemId)
    });
  };

  const toggleGroupExpand = (id: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Checkout operations
  const handleOpenCheckout = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const group = shoppingGroups.find(g => g.id === groupId);
    if (!group) return;

    const checked = group.items.filter(it => it.completed);
    if (checked.length === 0) {
      alert('Tilda primero los artículos que vas a comprar para liquidarlos.');
      return;
    }

    setShowCheckoutGroupId(groupId);
    setCheckoutMerchant(group.name);
    if (accounts.length > 0) {
      setCheckoutAccountId(accounts[0].id);
    }
    setShowCheckoutModal(true);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCheckoutGroupId) return;

    const group = shoppingGroups.find(g => g.id === showCheckoutGroupId);
    if (!group) return;

    const checkedItems = group.items.filter(it => it.completed);
    if (checkedItems.length === 0) return;

    const acc = accounts.find(a => a.id === checkoutAccountId);
    if (!acc) return;

    const totalCost = checkedItems.reduce((sum, it) => sum + (it.estimatedPrice * it.quantity), 0);
    if (acc.currentBalance < totalCost) {
      alert(`Fondos insuficientes en la cuenta ${acc.name}. Requieres ${formatCurrency(totalCost)} y tienes ${formatCurrency(acc.currentBalance)}`);
      return;
    }

    onConvertGroupToTransaction(
      showCheckoutGroupId,
      checkedItems,
      checkoutAccountId,
      checkoutDate,
      checkoutMerchant.trim() || group.name
    );

    setShowCheckoutGroupId(null);
    setShowCheckoutModal(false);
  };

  // Filter and sort groups
  const sortedAndFilteredGroups = useMemo(() => {
    const groups = Array.isArray(shoppingGroups) ? shoppingGroups : [];
    let result = groups.filter(g => g !== null && g !== undefined);

    // Urgency filter
    if (urgencyFilter !== 'todos') {
      result = result.filter(g => g.urgency === urgencyFilter);
    }

    // Sort operations
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'date') {
        const dateA = a.date || '9999-12-31';
        const dateB = b.date || '9999-12-31';
        return dateA.localeCompare(dateB);
      }
      // Default: Urgency priority
      const priorityMap = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
      const urgA = a.urgency || 'Media';
      const urgB = b.urgency || 'Media';
      return (priorityMap[urgB] || 2) - (priorityMap[urgA] || 2);
    });

    return result;
  }, [shoppingGroups, urgencyFilter, sortBy]);

  // Daily mode list computations
  const [showHistory, setShowHistory] = useState(false);

  const activeDailyItems = useMemo(() => {
    const items: { item: ShoppingItem; groupName: string; groupId: string }[] = [];
    (shoppingGroups || []).forEach(g => {
      if (selectedGroupTab !== 'all' && g.id !== selectedGroupTab) return;
      (g.items || []).forEach(it => {
        if (!it.completed) {
          items.push({ item: it, groupName: g.name, groupId: g.id });
        }
      });
    });
    return items;
  }, [shoppingGroups, selectedGroupTab]);

  const completedDailyItems = useMemo(() => {
    const items: { item: ShoppingItem; groupName: string; groupId: string }[] = [];
    (shoppingGroups || []).forEach(g => {
      if (selectedGroupTab !== 'all' && g.id !== selectedGroupTab) return;
      (g.items || []).forEach(it => {
        if (it.completed) {
          items.push({ item: it, groupName: g.name, groupId: g.id });
        }
      });
    });
    return items;
  }, [shoppingGroups, selectedGroupTab]);

  return (
    <div className="space-y-6" id="shopping-lists-view">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-wider">Lista de Compras</h3>
          <p className="text-xs text-neutral-400 mt-0.5">Anota tus faltantes diarios o planifica presupuestos detallados.</p>
        </div>
        
        {/* Mode Switcher */}
        <div className="flex bg-neutral-100 p-1.5 rounded-2xl w-full sm:w-[460px] shadow-2xs border border-neutral-100/55">
          <button
            onClick={() => setShoppingMode('daily')}
            className={`flex-1 text-xs py-2 rounded-xl font-bold transition-all flex justify-center items-center space-x-1.5 cursor-pointer ${shoppingMode === 'daily' ? 'bg-white text-neutral-900 shadow-sm font-black' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            <ShoppingCart size={13} />
            <span>Diario & Súper</span>
          </button>
          <button
            onClick={() => setShoppingMode('planned')}
            className={`flex-1 text-xs py-2 rounded-xl font-bold transition-all flex justify-center items-center space-x-1.5 cursor-pointer ${shoppingMode === 'planned' ? 'bg-white text-neutral-900 shadow-sm font-black' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            <Folder size={13} />
            <span>Planificado</span>
          </button>
          <button
            onClick={() => setShoppingMode('pantry')}
            className={`flex-1 text-xs py-2 rounded-xl font-bold transition-all flex justify-center items-center space-x-1.5 cursor-pointer ${shoppingMode === 'pantry' ? 'bg-white text-neutral-900 shadow-sm font-black' : 'text-neutral-500 hover:text-neutral-800'}`}
          >
            <Database size={13} />
            <span>Despensa</span>
          </button>
        </div>
      </div>

      {shoppingMode === 'daily' && (
        <div className="space-y-5">
          {/* Pills Selector de Listas */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            <button
              onClick={() => setSelectedGroupTab('all')}
              className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${selectedGroupTab === 'all' ? 'bg-neutral-900 text-white shadow-xs' : 'bg-white border border-neutral-150 text-neutral-500 hover:bg-neutral-50'}`}
            >
              Ver Todo ({(shoppingGroups || []).reduce((sum, g) => sum + (g.items || []).filter(it => !it.completed).length, 0)})
            </button>
            {(shoppingGroups || []).map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupTab(g.id)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${selectedGroupTab === g.id ? 'bg-neutral-900 text-white shadow-xs' : 'bg-white border border-neutral-150 text-neutral-500 hover:bg-neutral-50'}`}
              >
                <span>{g.name}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${selectedGroupTab === g.id ? 'bg-neutral-850 text-neutral-200' : 'bg-neutral-100 text-neutral-600'}`}>
                  {(g.items || []).filter(it => !it.completed).length}
                </span>
              </button>
            ))}
            <button
              onClick={handleOpenCreateGroup}
              className="text-xs px-3.5 py-2 rounded-xl font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center space-x-1 cursor-pointer whitespace-nowrap"
            >
              <Plus size={12} className="stroke-[3]" />
              <span>Nueva Carpeta</span>
            </button>
          </div>

          {/* Autocomplete / Frequent Items suggestions */}
          {frequentItems.length > 0 && (
            <div className="bg-neutral-50/50 p-4 rounded-3xl border border-neutral-100 space-y-2.5">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Artículos Frecuentes (Añadir en 1-Tap)</span>
              <div className="flex flex-wrap gap-2">
                {frequentItems.map(name => (
                  <button
                    key={name}
                    onClick={() => handleQuickAddFrequent(name)}
                    className="text-xs bg-white hover:bg-neutral-100 text-neutral-700 font-bold px-3.5 py-1.5 rounded-xl border border-neutral-200/80 transition-all cursor-pointer flex items-center space-x-1 shadow-3xs"
                  >
                    <Plus size={11} className="text-neutral-400 stroke-[3]" />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Frictionless Text Input */}
          <form onSubmit={handleDailyInputSubmit} className="flex gap-2">
            <input
              type="text"
              required
              value={dailyInput}
              onChange={e => setDailyInput(e.target.value)}
              placeholder={
                selectedGroupTab === 'all' 
                  ? "Anota qué falta en tu hogar... (separa con comas: Pan, Manteca, Café)"
                  : `Anota en "${shoppingGroups.find(g => g.id === selectedGroupTab)?.name || 'Lista'}"... (Pan, Fideos)`
              }
              className="flex-1 p-3.5 bg-white border border-neutral-200 rounded-2xl text-xs font-semibold text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-neutral-900 focus:ring-1 focus:ring-neutral-950/5 shadow-2xs"
            />
            <button
              type="submit"
              className="p-3.5 bg-neutral-950 hover:bg-neutral-900 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer shadow-xs"
            >
              <Plus size={16} className="stroke-[3]" />
            </button>
          </form>

          {/* Checklist of Active Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Artículos Pendientes ({activeDailyItems.length})
              </span>
              {selectedGroupTab !== 'all' && activeDailyItems.length > 0 && (
                <span className="text-xs font-black text-neutral-700">
                  Total Estimado: {formatCurrency(
                    activeDailyItems.reduce((sum, x) => sum + (x.item.estimatedPrice * x.item.quantity), 0)
                  )}
                </span>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-neutral-100 shadow-2xs overflow-hidden divide-y divide-neutral-50">
              {activeDailyItems.map(({ item, groupName, groupId }) => (
                <div 
                  key={item.id}
                  className="p-3.5 flex items-center justify-between gap-3 text-xs font-semibold hover:bg-neutral-50/20 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleItem(groupId, item.id)}
                      className="text-neutral-300 hover:text-neutral-500 transition-colors cursor-pointer"
                    >
                      <Square size={16} />
                    </button>
                    <div className="truncate flex items-center space-x-2">
                      <span className="font-bold text-neutral-800">{item.name}</span>
                      {selectedGroupTab === 'all' && (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-sm bg-neutral-100 text-neutral-500 tracking-wider">
                          {groupName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      {item.estimatedPrice > 0 ? (
                        <>
                          <span className="block font-bold text-neutral-850">{formatCurrency(item.estimatedPrice * item.quantity)}</span>
                          <span className="text-[9px] text-neutral-400 font-bold block">
                            {item.quantity} x {formatCurrency(item.estimatedPrice)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[9px] text-neutral-450 italic font-bold">Sin precio</span>
                      )}
                    </div>
                    
                    <div className="flex space-x-0.5">
                      <button
                        onClick={() => handleOpenEditItem(groupId, item)}
                        className="p-1.5 text-neutral-350 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar artículo"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(groupId, item.id)}
                        className="p-1.5 text-neutral-350 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar artículo"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {activeDailyItems.length === 0 && (
                <div className="p-8 text-center text-xs text-neutral-400 italic">
                  No hay artículos pendientes. ¡Anota cosas arriba para armar tu lista!
                </div>
              )}
            </div>
          </div>

          {/* Action Footer for Checked Items */}
          {completedDailyItems.length > 0 && (
            <div className="bg-neutral-50 p-4 rounded-3xl border border-neutral-150/40 flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">
              <div className="text-center sm:text-left">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Artículos comprados ({completedDailyItems.length})</span>
                <span className="text-xs font-black text-rose-600">
                  Total de Comprados: {formatCurrency(
                    completedDailyItems.reduce((sum, x) => sum + (x.item.estimatedPrice * x.item.quantity), 0)
                  )}
                </span>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    if (selectedGroupTab === 'all') {
                      shoppingGroups.forEach(g => handleClearCompletedInGroup(g.id));
                    } else {
                      handleClearCompletedInGroup(selectedGroupTab);
                    }
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-neutral-200 hover:bg-neutral-250 text-neutral-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 shadow-3xs"
                >
                  <span>🧹 Archivar Comprados</span>
                </button>
                
                <button
                  onClick={(e) => {
                    let checkoutId = selectedGroupTab;
                    if (checkoutId === 'all') {
                      const firstWithChecked = shoppingGroups.find(g => (g.items || []).some(it => it.completed));
                      if (firstWithChecked) {
                        checkoutId = firstWithChecked.id;
                      } else return;
                    }
                    handleOpenCheckout(checkoutId, e);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 shadow-xs"
                >
                  <Wallet size={13} />
                  <span>💳 Liquidar Gasto Contable</span>
                </button>
              </div>
            </div>
          )}

          {/* History Collapsible Panel */}
          {completedDailyItems.length > 0 && (
            <div className="border border-neutral-100 rounded-3xl bg-white overflow-hidden shadow-2xs mt-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full p-4 flex justify-between items-center text-xs font-bold text-neutral-600 hover:bg-neutral-50/50 transition-colors cursor-pointer"
              >
                <span className="flex items-center space-x-1.5">
                  <CheckSquare size={14} className="text-emerald-600" />
                  <span>Ver Historial de Comprados / Archivados ({completedDailyItems.length})</span>
                </span>
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-neutral-50 divide-y divide-neutral-50"
                  >
                    {completedDailyItems.map(({ item, groupName, groupId }) => (
                      <div 
                        key={item.id}
                        className="p-3 flex items-center justify-between text-xs text-neutral-400 font-semibold line-through bg-neutral-50/20"
                      >
                        <div className="flex items-center space-x-3.5">
                          <Check size={14} className="text-emerald-500" />
                          <span>{item.name}</span>
                          {selectedGroupTab === 'all' && (
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-sm bg-neutral-100 text-neutral-400">
                              {groupName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-3">
                          <span>{formatCurrency(item.estimatedPrice * item.quantity)}</span>
                          <button
                            onClick={() => {
                              const group = shoppingGroups.find(g => g.id === groupId);
                              if (!group) return;
                              const updated = (group.items || []).map(it => {
                                if (it.id === item.id) return { ...it, completed: false };
                                return it;
                              });
                              onUpdateShoppingGroup({ ...group, items: updated });
                            }}
                            className="p-1 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors cursor-pointer line-through-none"
                            title="Volver a anotar"
                          >
                            <Plus size={12} className="stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {shoppingMode === 'planned' && (
        <>
          {/* Filters Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-3 rounded-2xl border border-neutral-100 shadow-2xs">
            <div className="flex space-x-1.5 w-full sm:w-auto">
              {(['todos', 'Alta', 'Media', 'Baja'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setUrgencyFilter(tab)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all capitalize cursor-pointer flex-1 sm:flex-none ${urgencyFilter === tab ? 'bg-neutral-900 text-white shadow-xs' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >
                  {tab === 'todos' ? 'Todas' : `Urgente: ${tab}`}
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full sm:w-44 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-neutral-900 focus:bg-white"
              >
                <option value="urgency">Prioridad Urgencia</option>
                <option value="date">Fecha de Compra</option>
                <option value="name">Alfabeto (Nombre)</option>
              </select>
            </div>
          </div>

          {/* Collapsible Groups List */}
          <div className="space-y-4">
            {sortedAndFilteredGroups.map(group => {
              const isExpanded = expandedGroups[group.id] !== false; // expanded by default
              const groupItems = group.items || [];
              const totalItems = groupItems.length;
              const completedItems = groupItems.filter(it => it.completed).length;
              const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
              
              const totalUncheckedPrice = groupItems
                .filter(it => !it.completed)
                .reduce((sum, it) => sum + (it.estimatedPrice * it.quantity), 0);

              const totalCheckedPrice = groupItems
                .filter(it => it.completed)
                .reduce((sum, it) => sum + (it.estimatedPrice * it.quantity), 0);

              // Suggest historical price matching as you type in this specific group form
              const typingName = itemNames[group.id] || '';
              const hist = getHistoricalPrice(typingName);

              return (
                <div key={group.id} className="bg-white rounded-3xl border border-neutral-100 shadow-2xs overflow-hidden transition-all">
                  {/* Group Folder Banner Header */}
                  <div 
                    onClick={() => toggleGroupExpand(group.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50/50 transition-colors border-b border-neutral-50"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`p-3 rounded-2xl ${group.urgency === 'Alta' ? 'bg-rose-50 text-rose-600' : group.urgency === 'Media' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-50 text-neutral-600'}`}>
                        <Folder size={18} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-black text-neutral-800">{group.name}</h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-sm tracking-wider ${group.urgency === 'Alta' ? 'bg-rose-100 text-rose-700' : group.urgency === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-150 text-neutral-600'}`}>
                            {group.urgency}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-400 font-bold mt-1.5">
                          {group.date && (
                            <span className="flex items-center">
                              <Calendar size={11} className="mr-1" />
                              Comprar antes de: {group.date}
                            </span>
                          )}
                          {group.storeLocation && (
                            <a 
                              href={group.storeLocation.startsWith('http') ? group.storeLocation : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(group.storeLocation)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center text-indigo-500 hover:text-indigo-600 transition-colors"
                            >
                              <MapPin size={11} className="mr-1" />
                              Tienda / Ubicación
                            </a>
                          )}
                          {group.url && (
                            <a 
                              href={group.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center text-neutral-500 hover:text-neutral-700 transition-colors"
                            >
                              <LinkIcon size={11} className="mr-1" />
                              Enlace
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Summary Stats */}
                    <div className="flex items-center space-x-5 self-end md:self-auto pl-12 md:pl-0">
                      <div className="text-right">
                        <span className="text-[10px] text-neutral-400 font-bold block uppercase tracking-wider">
                          {isExpanded ? 'Pendiente' : `Comprado: ${completedItems}/${totalItems}`}
                        </span>
                        <span className="text-xs font-black text-neutral-800">
                          {isExpanded ? formatCurrency(totalUncheckedPrice) : formatCurrency(totalCheckedPrice)}
                        </span>
                      </div>

                      {/* Small edit/delete controls */}
                      <div className="flex items-center space-x-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => handleOpenEditGroup(group, e)}
                          className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-700 transition-all cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Quitar la carpeta de compras "${group.name}" y todos sus artículos?`)) {
                              onDeleteShoppingGroup(group.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-neutral-400 hover:text-rose-600 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                        {isExpanded ? <ChevronUp size={14} className="text-neutral-400 ml-1" /> : <ChevronDown size={14} className="text-neutral-400 ml-1" />}
                      </div>
                    </div>

                  </div>

                  {/* Items List Accordion body */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-neutral-50/20"
                      >
                        <div className="p-5 space-y-4">
                          
                          {/* Items Grid */}
                          <div className="space-y-1.5">
                            {groupItems.map(item => (
                              <div 
                                key={item.id}
                                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold shadow-2xs transition-all ${item.completed ? 'bg-neutral-50/50 border-neutral-100 text-neutral-400 line-through' : 'bg-white border-neutral-150/70 text-neutral-800'}`}
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  <button
                                    onClick={() => handleToggleItem(group.id, item.id)}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${item.completed ? 'text-emerald-600 bg-emerald-50' : 'text-neutral-300 hover:text-neutral-500'}`}
                                  >
                                    {item.completed ? <CheckSquare size={16} /> : <Square size={16} />}
                                  </button>
                                  
                                  <div className="truncate">
                                    <span className="font-bold">{item.name}</span>
                                    <div className="flex items-center space-x-2 text-[9px] font-bold text-neutral-400 mt-0.5 line-through-none">
                                      {item.store && (
                                        <span className="flex items-center">
                                          <MapPin size={9} className="mr-0.5" />
                                          {item.store}
                                        </span>
                                      )}
                                      {item.url && (
                                        <a 
                                          href={item.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center text-indigo-500 hover:underline"
                                        >
                                          <LinkIcon size={9} className="mr-0.5" />
                                          Ver enlace
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Qty & Cost */}
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <span className="block font-bold">{formatCurrency(item.estimatedPrice * item.quantity)}</span>
                                    <span className="text-[9px] text-neutral-400 font-bold block">
                                      {item.quantity} x {formatCurrency(item.estimatedPrice)}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleOpenEditItem(group.id, item)}
                                    className="p-1.5 text-neutral-350 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Editar artículo"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(group.id, item.id)}
                                    className="p-1.5 text-neutral-350 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Quitar artículo"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {groupItems.length === 0 && (
                              <p className="text-xs text-neutral-400 italic py-2">No hay artículos añadidos en esta carpeta de compras.</p>
                            )}
                          </div>

                          {/* Quick Add Form */}
                          <form onSubmit={e => handleAddItem(group.id, e)} className="pt-3 border-t border-neutral-100/60">
                            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">Añadir Artículo a la lista</span>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs font-semibold">
                              
                              {/* Name Input */}
                              <div className="sm:col-span-4 relative">
                                <input
                                  type="text"
                                  required
                                  placeholder="Ej. Silla de Oficina, Cables, Pan"
                                  value={itemNames[group.id] || ''}
                                  onChange={e => setItemNames(prev => ({ ...prev, [group.id]: e.target.value }))}
                                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                                />
                                
                                {/* Autocomplete hint */}
                                {hist && (
                                  <div className="absolute z-10 w-full bg-white border border-neutral-200 rounded-xl mt-1 shadow-md p-2 text-[10px] text-neutral-500 flex items-center justify-between">
                                    <span className="truncate">Historial: {formatCurrency(hist.price)} en {hist.merchant} ({hist.date})</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setItemPrices(prev => ({ ...prev, [group.id]: hist.price.toString() }));
                                        setItemStores(prev => ({ ...prev, [group.id]: hist.merchant }));
                                      }}
                                      className="text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-sm cursor-pointer ml-1"
                                    >
                                      Cargar
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Qty Input */}
                              <div className="sm:col-span-2">
                                <input
                                  type="number"
                                  required
                                  placeholder="Cant."
                                  value={itemQtys[group.id] || '1'}
                                  onChange={e => setItemQtys(prev => ({ ...prev, [group.id]: e.target.value }))}
                                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                                />
                              </div>

                              {/* Price Input */}
                              <div className="sm:col-span-2">
                                <input
                                  type="number"
                                  placeholder="Precio ($)"
                                  value={itemPrices[group.id] || ''}
                                  onChange={e => setItemPrices(prev => ({ ...prev, [group.id]: e.target.value }))}
                                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                                />
                              </div>

                              {/* URL Input */}
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  placeholder="URL enlace (opc)"
                                  value={itemUrls[group.id] || ''}
                                  onChange={e => setItemUrls(prev => ({ ...prev, [group.id]: e.target.value }))}
                                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                                />
                              </div>

                              {/* Store Name Input */}
                              <div className="sm:col-span-2 flex space-x-1.5">
                                <input
                                  type="text"
                                  placeholder="Tienda/Lugar (opc)"
                                  value={itemStores[group.id] || ''}
                                  onChange={e => setItemStores(prev => ({ ...prev, [group.id]: e.target.value }))}
                                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:border-neutral-900"
                                />
                                <button
                                  type="submit"
                                  className="p-2 bg-neutral-900 hover:bg-neutral-850 text-white rounded-xl flex items-center justify-center cursor-pointer"
                                >
                                  <Plus size={14} className="stroke-[3]" />
                                </button>
                              </div>

                            </div>
                          </form>

                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              );
            })}

            {shoppingGroups.length === 0 && (
              <div className="bg-white rounded-3xl p-12 border border-neutral-100 text-center text-neutral-400 space-y-2">
                <ShoppingCart className="mx-auto text-neutral-300" size={38} />
                <p className="text-sm font-semibold">No has creado listas de compras todavía.</p>
                <p className="text-xs">Usa el botón superior para crear tu primera carpeta colapsable.</p>
              </div>
            )}
          </div>
        </>
      )}
      {/* Modal: Crear / Editar Carpeta de Lista de Compras */}
      <AnimatePresence>
        {showGroupModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-5">
                <h3 className="text-base font-bold text-neutral-900">
                  {editingGroupId ? 'Editar Carpeta de Compras' : 'Nueva Carpeta de Compras'}
                </h3>
                <button 
                  onClick={() => setShowGroupModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleGroupSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Nombre de la Lista */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre de la Lista/Carpeta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Súper Semanal, Cosas de PC, Hogar"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Prioridad Urgencia */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Prioridad Urgencia</label>
                  <div className="grid grid-cols-3 gap-2 bg-neutral-100 p-1 rounded-2xl">
                    {(['Baja', 'Media', 'Alta'] as const).map(urg => (
                      <button
                        key={urg}
                        type="button"
                        onClick={() => setGroupUrgency(urg)}
                        className={`py-2 rounded-xl font-bold transition-all text-xs cursor-pointer ${groupUrgency === urg ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-505 hover:text-neutral-900'}`}
                      >
                        {urg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fecha Límite */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha sugerida de compra (Opcional)</label>
                  <input
                    type="date"
                    value={groupDate}
                    onChange={e => setGroupDate(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Enlace Maps / Dónde comprar */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Tienda o enlace Google Maps (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Easy Palermo o enlace https://maps.google..."
                    value={groupStore}
                    onChange={e => setGroupStore(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Enlace General */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Enlace de Referencia General (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. https://tienda.com/carrito"
                    value={groupUrl}
                    onChange={e => setGroupUrl(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-neutral-900 hover:bg-neutral-850 text-white rounded-2xl font-bold text-sm transition-all mt-4 cursor-pointer"
                >
                  {editingGroupId ? 'Guardar Cambios' : 'Crear Carpeta'}
                </button>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Checkout / Liquidación de Lista */}
      <AnimatePresence>
        {showCheckoutModal && (
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
                  <h3 className="text-base font-bold text-neutral-900">Liquidar Compra Contable</h3>
                  <span className="text-[10px] font-semibold text-neutral-400 block mt-0.5">
                    Se debitarán todos los ítems marcados de esta lista.
                  </span>
                </div>
                <button 
                  onClick={() => setShowCheckoutModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Monto Total Informativo */}
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100 text-center">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Monto total a debitar</span>
                  <h4 className="text-xl font-black text-rose-600">
                    {formatCurrency(
                      (shoppingGroups.find(g => g.id === showCheckoutGroupId)?.items.filter(it => it.completed) || [])
                        .reduce((sum, it) => sum + (it.estimatedPrice * it.quantity), 0)
                    )}
                  </h4>
                </div>

                {/* Cuenta de Débito */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Cuenta de Pago</label>
                  <select
                    value={checkoutAccountId}
                    onChange={e => setCheckoutAccountId(e.target.value)}
                    required
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white cursor-pointer"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comercio / Descripción */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Comercio / Descripción del Pago</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Coto, Easy, Compumundo"
                    value={checkoutMerchant}
                    onChange={e => setCheckoutMerchant(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Fecha del movimiento */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Fecha del Pago</label>
                  <input
                    type="date"
                    required
                    value={checkoutDate}
                    onChange={e => setCheckoutDate(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-850 text-white rounded-2xl font-bold text-xs transition-all mt-4 cursor-pointer"
                >
                  Registrar Gasto Contable y Vaciar Comprados
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Artículo Individual */}
      <AnimatePresence>
        {showItemModal && (
          <div className="fixed inset-0 z-55 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-5">
                <h3 className="text-base font-bold text-neutral-900">Editar Artículo</h3>
                <button 
                  onClick={() => setShowItemModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleItemSubmit} className="space-y-4 text-xs font-semibold">
                
                {/* Nombre */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre del Artículo</label>
                  <input
                    type="text"
                    required
                    value={editItemName}
                    onChange={e => setEditItemName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Cantidad y Precio */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Cantidad</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editItemQty}
                      onChange={e => setEditItemQty(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Precio Estimado ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editItemPrice}
                      onChange={e => setEditItemPrice(e.target.value)}
                      className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Enlace del producto */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Enlace de Compra / URL (Opcional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={editItemUrl}
                    onChange={e => setEditItemUrl(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Tienda */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Tienda / Comercio (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Easy, Coto, Logitech"
                    value={editItemStore}
                    onChange={e => setEditItemStore(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Guardar */}
                <button
                  type="submit"
                  className="w-full py-3 px-6 bg-neutral-900 hover:bg-neutral-850 text-white rounded-2xl font-bold text-xs transition-all mt-4 cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export function ShoppingListView(props: ShoppingListViewProps) {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 space-y-4">
        <h3 className="text-sm font-black flex items-center">
          <AlertCircle className="mr-2" size={16} /> 
          Error al cargar Lista de Compras
        </h3>
        <p className="text-xs font-semibold">
          Detectamos una inconsistencia en los datos cargados o en la estructura. Puedes restablecer los datos locales para solucionar el problema.
        </p>
        <pre className="text-xs p-4 bg-white rounded-xl border border-rose-100 overflow-auto max-h-60 font-mono">
          {error.stack || error.message || String(error)}
        </pre>
        <button 
          onClick={() => { 
            localStorage.removeItem('fp_shopping_groups'); 
            window.location.reload(); 
          }} 
          className="text-xs bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl font-bold cursor-pointer transition-all shadow-xs"
        >
          Restablecer Datos Locales y Recargar
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={setError}>
      <ShoppingListViewInner {...props} />

      {/* Modal: Crear Insumo de Despensa */}
      <AnimatePresence>
        {showPantryModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100 mb-5">
                <h3 className="text-base font-bold text-neutral-900">Nuevo Insumo de Despensa</h3>
                <button 
                  onClick={() => setShowPantryModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-neutral-500" />
                </button>
              </div>

              <form onSubmit={handleAddPantryItemSubmit} className="space-y-4 text-xs font-semibold">
                {/* Nombre */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Nombre del Insumo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Desodorante, Talco, Rejilla, Limpia piso"
                    value={pantryName}
                    onChange={e => setPantryName(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Categoría / Rubro</label>
                  <select
                    value={pantryCategory}
                    onChange={e => setPantryCategory(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-850 cursor-pointer"
                  >
                    <option value="Higiene Personal">Higiene Personal</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Almacén">Almacén / Comida</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                {/* Precio Estimado */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Precio Estimado ($)</label>
                  <input
                    type="number"
                    placeholder="0 (Opcional)"
                    value={pantryPrice}
                    onChange={e => setPantryPrice(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-800 focus:outline-hidden focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* Frecuencia */}
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Frecuencia de Reposición</label>
                  <select
                    value={pantryFrequency}
                    onChange={e => setPantryFrequency(e.target.value)}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-850 cursor-pointer"
                  >
                    <option value="Cuando se acabe">Manual (Cuando se acabe)</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Cada 60 días">Cada 60 días</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl font-black text-xs transition-colors cursor-pointer"
                >
                  Registrar en Despensa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </ErrorBoundary>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (err: Error) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
