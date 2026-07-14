import React from 'react';
import { Bell, X, Calendar, AlertTriangle, CheckCircle, Info, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { AppNotification } from '../types';

interface NotificationPanelProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotification: (id: string) => void;
  onClose: () => void;
  onNavigateToSection: (section: 'dashboard' | 'proyectos' | 'metas' | 'estadisticas' | 'sheets' | 'gastos-fijos' | 'compras' | 'prestamos') => void;
}

export function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
  onClose,
  onNavigateToSection
}: NotificationPanelProps) {
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (n: AppNotification) => {
    onMarkAsRead(n.id);
    if (n.category === 'gasto_fijo') {
      onNavigateToSection('gastos-fijos');
    } else if (n.category === 'loan') {
      onNavigateToSection('prestamos');
    } else if (n.category === 'project') {
      onNavigateToSection('proyectos');
    } else if (n.category === 'goal') {
      onNavigateToSection('metas');
    } else if (n.category === 'sync') {
      onNavigateToSection('sheets');
    }
    onClose();
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="text-rose-650 stroke-[2.5]" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500 stroke-[2.5]" size={16} />;
      case 'success':
        return <CheckCircle className="text-emerald-650 stroke-[2.5]" size={16} />;
      default:
        return <Info className="text-indigo-650 stroke-[2.5]" size={16} />;
    }
  };

  const getBgColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'danger':
        return 'bg-rose-50 border-rose-100/60';
      case 'warning':
        return 'bg-amber-50/70 border-amber-100/50';
      case 'success':
        return 'bg-emerald-50 border-emerald-100/60';
      default:
        return 'bg-indigo-50/75 border-indigo-100/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-start justify-center sm:justify-end sm:p-6" id="notification-panel-overlay">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div 
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0.8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative bg-white w-full sm:w-96 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] sm:max-h-[600px] flex flex-col border border-neutral-100"
        id="notification-panel-content"
      >
        {/* Mobile top pill indicator */}
        <div className="sm:hidden w-12 h-1 bg-neutral-200 rounded-full mx-auto my-3 flex-shrink-0" />

        {/* Header */}
        <div className="px-5 py-4 flex justify-between items-center border-b border-neutral-100">
          <div className="flex items-center space-x-2">
            <Bell size={18} className="text-indigo-600" />
            <h4 className="text-sm font-bold text-neutral-900">Notificaciones</h4>
            {unreadCount > 0 && (
              <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer text-neutral-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar actions */}
        {notifications.length > 0 && (
          <div className="px-5 py-2.5 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center text-[10.5px] font-bold text-neutral-500">
            <span>Alertas Activas: {notifications.length}</span>
            <button
              onClick={onMarkAllAsRead}
              className="text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer font-black"
            >
              Marcar todo como leído
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-50 scrollbar-thin">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-5 transition-colors flex gap-3 relative ${n.read ? 'opacity-60 bg-white' : 'bg-indigo-50/10'}`}
            >
              {/* Status Icon */}
              <div className={`p-2 rounded-xl h-fit border ${getBgColor(n.type)} flex-shrink-0`}>
                {getIcon(n.type)}
              </div>

              {/* Content info */}
              <div className="flex-1 min-w-0 pr-6 text-left">
                <span className="text-[9px] font-bold text-neutral-400 block mb-1 uppercase tracking-wider">
                  {n.category.replace('_', ' ')} • {n.date}
                </span>
                <p className={`text-xs leading-relaxed ${n.read ? 'text-neutral-500 font-semibold' : 'text-neutral-850 font-bold'}`}>
                  {n.body}
                </p>

                {/* Action Link button */}
                <button
                  onClick={() => handleNotificationClick(n)}
                  className="mt-2.5 text-[10px] font-black text-indigo-600 hover:text-indigo-750 flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <span>Ver y solucionar</span>
                  <ArrowRight size={11} className="stroke-[2.5]" />
                </button>
              </div>

              {/* Clear button */}
              <button
                onClick={() => onClearNotification(n.id)}
                className="absolute top-5 right-5 text-neutral-300 hover:text-rose-500 p-1 rounded-md transition-colors cursor-pointer"
                title="Quitar alerta"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="py-16 px-6 text-center text-xs text-neutral-400 italic space-y-3 flex flex-col items-center justify-center">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full">
                <Bell size={28} className="stroke-[1.5]" />
              </div>
              <div>
                <p className="font-extrabold text-neutral-800 not-italic text-sm">¡Bandeja vacía!</p>
                <p className="text-[10.5px] text-neutral-400 not-italic mt-1 leading-relaxed">No tienes alertas ni vencimientos pendientes por el momento.</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
