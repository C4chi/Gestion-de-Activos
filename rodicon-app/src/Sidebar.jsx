import React from 'react';
import { 
  Wrench, ShieldAlert, ShoppingCart, Activity, 
  Menu, LogOut, RefreshCw, Plus, Settings, Users,
  CheckCircle, Calendar, ClipboardCheck, BarChart3, Package,
  AlertTriangle, CheckSquare
} from 'lucide-react';
import { NotificationToggle } from './components/NotificationToggle';

const SidebarBtn = ({ icon, label, onClick, color, collapsed, disabled }) => (
  <button 
    onClick={onClick}
    aria-disabled={disabled}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all mb-1 font-semibold text-sm
      ${disabled ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-gray-600 hover:bg-gray-50'} 
      ${disabled ? '' : `hover:text-${color}-700 hover:border-l-4 hover:border-${color}-500`}
    `}
    title={disabled ? 'No tienes permiso para esta acción' : ''}
  >
    <span className={disabled ? 'text-gray-300' : `text-${color}-600`}>{icon}</span>
    {!collapsed && <span>{label}</span>}
  </button>
);

export const Sidebar = ({ collapsed, onToggle, onMenuClick, onNewAsset, onRefresh, onLogout, protectedAction, onAdminPanel, onUserPanel, onReportsPanel, onEppAlmacen, isAdmin, canWorkshop, canPurchasing, canHse, canEpp, canReports, userId }) => (
  <>
    {/* Overlay para móvil */}
    {!collapsed && (
      <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onToggle} />
    )}
    
    <aside className={`bg-white border-r border-gray-200 flex flex-col justify-between transition-all duration-300 z-30 shadow-xl
      ${collapsed ? 'w-20' : 'w-64'}
      ${collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
      fixed lg:relative h-full
    `}>
    <div>
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Logo removido */}
        </div>
        <button onClick={onToggle} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition"><Menu className="w-5 h-5"/></button>
      </div>
      <nav className="mt-6 flex flex-col gap-1 px-2">
        <SidebarBtn icon={<Wrench/>} label="Taller" color="purple" collapsed={collapsed} onClick={() => onMenuClick('WORKSHOP')} disabled={!canWorkshop}/>
        <SidebarBtn icon={<Calendar/>} label="Mto Preventivo" color="green" collapsed={collapsed} onClick={() => onMenuClick('PREVENTIVE_MTO')} disabled={!canWorkshop}/>
        
        {/* Solicitudes de Mantenimiento */}
        <SidebarBtn icon={<AlertTriangle/>} label="Reportar Problema" color="orange" collapsed={collapsed} onClick={() => onMenuClick('REQUEST_MAINTENANCE')}/>
        <SidebarBtn icon={<CheckSquare/>} label="Validar Solicitudes" color="orange" collapsed={collapsed} onClick={() => onMenuClick('VALIDATE_REQUESTS')} disabled={!canWorkshop}/>
        
        <SidebarBtn icon={<ShieldAlert/>} label="HSE (Seguridad)" color="orange" collapsed={collapsed} onClick={() => onMenuClick('SAFETY')} disabled={!canHse}/>
        <SidebarBtn icon={<ClipboardCheck/>} label="Inspecciones HSE" color="blue" collapsed={collapsed} onClick={() => onMenuClick('HSE_INSPECTIONS')} disabled={!canHse}/>
        <SidebarBtn icon={<ShoppingCart/>} label="Compras" color="green" collapsed={collapsed} onClick={() => onMenuClick('PURCHASING')} disabled={!canPurchasing}/>
        {/* <SidebarBtn icon={<CheckCircle/>} label="Aprobaciones" color="purple" collapsed={collapsed} onClick={() => onMenuClick('WORKFLOW_APPROVALS')} disabled={!canPurchasing}/> */}
        <SidebarBtn icon={<Activity/>} label="Métricas" color="blue" collapsed={collapsed} onClick={() => onMenuClick('METRICS')}/>
        {canReports && (
          <SidebarBtn icon={<BarChart3/>} label="Reportes" color="blue" collapsed={collapsed} onClick={onReportsPanel}/>
        )}
        {/* {canEpp && (
          <SidebarBtn icon={<Package/>} label="EPP Almacén" color="teal" collapsed={collapsed} onClick={onEppAlmacen}/>
        )} */}
        {isAdmin && (
          <SidebarBtn icon={<Settings/>} label="Administrador" color="indigo" collapsed={collapsed} onClick={onAdminPanel}/>
        )}
        {isAdmin && (
          <SidebarBtn icon={<Users/>} label="Usuarios" color="indigo" collapsed={collapsed} onClick={onUserPanel}/>
        )}
      </nav>
    </div>
    <div className="p-4 border-t border-gray-100 space-y-2">
      {!collapsed && userId && (
        <div className="mb-3">
          <NotificationToggle userId={userId} />
        </div>
      )}
      {isAdmin && (
        <button onClick={onNewAsset} className={`w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition flex items-center justify-center gap-2 overflow-hidden ${collapsed ? 'px-0' : 'px-4'}`}><Plus className="w-6 h-6"/> {!collapsed && <span>Nuevo Activo</span>}</button>
      )}
      <button onClick={onRefresh} className={`w-full bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 overflow-hidden ${collapsed ? 'px-0' : 'px-4'}`}><RefreshCw className="w-5 h-5"/> {!collapsed && <span className="text-xs">Refrescar</span>}</button>
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-600 mt-2 p-2"><LogOut className="w-5 h-5"/> {!collapsed && <span className="text-xs font-bold">Salir</span>}</button>
    </div>
  </aside>
  </>
);