import React from 'react';
import { Bell, X, Calendar, AlertTriangle, CheckCircle, Info, RefreshCw, Trash2, ArrowRight } from 'lucide-react';
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
        return <AlertTriangle className="text-rose-600 stroke-[2.5]" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-amber-500 stroke-[2.5]" size={16} />;
      case 'success':
        return <CheckCircle className="text-emerald-600 stroke-[2.5]" size={16} />;
      default:
        return <Info className="text-indigo-500 stroke-[2.5]" size={16} />;
    }
  };

  const getBgColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'danger':
        return 'bg-rose-50 border-rose-100/50';
      case 'warning':
        return 'bg-amber-50/70 border-amber-100/40';
      case 'success':
        return 'bg-emerald-50 border-emerald-100/50';
      default:
        return 'bg-indigo-50/60 border-indigo-100/40';
    }
  };

  return (
    <div className="absolute right-0 mt-3 w-full max-w-sm sm:w-96 bg-white border border-neutral-150 rounded-3xl shadow-2xl z-50 overflow-hidden" id="notification-dropdown-panel">
      {/* Header */}
      <div className="p-4 bg-neutral-900 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bell size={16} className="text-amber-400" />
          <h4 className="text-xs font-black uppercase tracking-wider">Centro de Notificaciones</h4>
          {unreadCount > 0 && (
            <span className="text-[9px] font-black bg-rose-600 text-white px-2.5 py-0.5 rounded-full">
              {unreadCount} Nuevas
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Toolbar actions */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100/60 flex justify-between items-center text-[10px] font-black text-neutral-500">
          <span>Alertas Activas: {notifications.length}</span>
          <button
            onClick={onMarkAllAsRead}
            className="text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
          >
            Marcar todo como leído
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-50 scrollbar-thin">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`p-4 transition-colors flex gap-3 relative ${n.read ? 'opacity-70 bg-white' : 'bg-neutral-50/20'}`}
          >
            {/* Status Icon */}
            <div className={`p-2 rounded-xl h-fit border ${getBgColor(n.type)}`}>
              {getIcon(n.type)}
            </div>

            {/* Content info */}
            <div className="flex-1 min-w-0 pr-6 text-left">
              <span className="text-[9px] font-bold text-neutral-400 block mb-0.5 uppercase tracking-wide">
                {n.category.replace('_', ' ')} • {n.date}
              </span>
              <p className={`text-xs leading-relaxed ${n.read ? 'text-neutral-500 font-semibold' : 'text-neutral-800 font-bold'}`}>
                {n.body}
              </p>

              {/* Action Link button */}
              <button
                onClick={() => handleNotificationClick(n)}
                className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <span>Ver y solucionar</span>
                <ArrowRight size={10} />
              </button>
            </div>

            {/* Clear button */}
            <button
              onClick={() => onClearNotification(n.id)}
              className="absolute top-4 right-4 text-neutral-300 hover:text-neutral-500 p-1 rounded-md transition-colors cursor-pointer"
              title="Quitar alerta"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral-400 italic space-y-2.5">
            <Bell size={28} className="mx-auto text-neutral-350 stroke-[1.5]" />
            <div>
              <p className="font-bold text-neutral-500">¡Todo en orden!</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">No hay vencimientos ni alertas pendientes por el momento.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
