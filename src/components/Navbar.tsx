import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  FolderGit2,
  AlertTriangle,
  Camera,
  LogOut,
  Shield,
  User as UserIcon,
  PlusCircle,
  Repeat,
  ClipboardList,
  Users,
  Truck,
  Clock,
  Calendar,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { User, Role } from '../types';
import { useAppTime } from '../context/TimeContext';

export type NavTab = 'dashboard' | 'products' | 'orders' | 'movements' | 'projects' | 'requests' | 'alerts' | 'users';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  user: User;
  onLogout: () => void;
  onQuickSwitchRole: (newRole: Role) => void;
  onOpenScanner: () => void;
  onOpenNewMovement?: () => void;
  lowStockCount: number;
  pendingRequestsCount?: number;
  pendingOrdersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  user,
  onLogout,
  onQuickSwitchRole,
  onOpenScanner,
  lowStockCount,
  pendingRequestsCount = 0,
  pendingOrdersCount = 0,
}) => {
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);
  const { formattedTime, formattedShort, formattedDate, isManual, openTimeModal } = useAppTime();

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setOptionsMenuOpen(false);
      }
    };
    if (optionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [optionsMenuOpen]);

  // Main navigation items (Users has been moved into the 3-lines options menu)
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products' as NavTab, label: 'Productos', icon: Boxes },
    {
      id: 'orders' as NavTab,
      label: 'Pedidos',
      icon: Truck,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    { id: 'projects' as NavTab, label: 'Proyectos', icon: FolderGit2 },
    {
      id: 'requests' as NavTab,
      label: 'Solicitudes',
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
    {
      id: 'alerts' as NavTab,
      label: 'Alertas',
      icon: AlertTriangle,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 text-white w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-16 w-full">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-2.5 sm:gap-3 focus:outline-hidden group text-left py-1"
              title="Suiteak"
            >
              <img
                src="/suiteak-icon.png"
                alt="Suiteak"
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain ring-1 ring-white/10 group-hover:scale-105 transition-transform shrink-0"
              />
              <img
                src="/suiteak-logo-white.png"
                alt="Suiteak"
                referrerPolicy="no-referrer"
                className="h-7 sm:h-8 md:h-9 w-auto max-w-[170px] sm:max-w-[210px] object-contain block group-hover:opacity-90 transition-opacity"
              />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 ml-4 xl:ml-6 bg-neutral-950/80 p-1 rounded-2xl border border-neutral-800">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    onClick={() => onTabChange(item.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#EA1D24] text-white shadow-xs shadow-red-600/30'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full leading-none ${
                        isActive ? 'bg-white text-[#EA1D24]' : 'bg-rose-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Action Buttons & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* System Date & Time Display Badge */}
            <button
              id="btn-nav-datetime"
              onClick={openTimeModal}
              title={`Hora oficial en España (Europe/Madrid): ${formattedTime}. Clic para ver o ajustar`}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                isManual
                  ? 'bg-amber-950/60 hover:bg-amber-900/80 border-amber-700/70 text-amber-300 shadow-xs'
                  : 'bg-neutral-950 hover:bg-neutral-800/90 border-neutral-800 text-neutral-200 hover:text-white'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 shrink-0 ${isManual ? 'text-amber-400' : 'text-red-400'}`} />
              <span className="hidden md:inline-block font-mono text-[11px] text-neutral-400">
                {formattedShort.split('·')[0]}·
              </span>
              <span className="font-mono text-xs font-bold text-white tracking-tight">
                {formattedTime.substring(0, 5)}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wider ${
                  isManual
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-red-950/80 text-red-300 border border-red-900/40'
                }`}
              >
                {isManual ? 'Manual' : 'ES'}
              </span>
            </button>

            {/* User Profile Info */}
            <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-neutral-800">
              <div className="text-right">
                <div className="text-xs font-semibold text-white leading-tight truncate max-w-[140px]">
                  {user.nombre}
                </div>
                <div className="flex items-center justify-end gap-1 text-[10px]">
                  {user.rol === 'admin' ? (
                    <span className="inline-flex items-center gap-0.5 text-red-400 font-semibold bg-red-950/40 px-1.5 py-0.5 rounded-md border border-red-900/50">
                      <Shield className="w-2.5 h-2.5" /> Administrador
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-800/40">
                      <UserIcon className="w-2.5 h-2.5" /> Operario
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 3-Lines Options Menu (Ajustes / Opciones adicionales) */}
            <div className="relative" ref={optionsMenuRef}>
              <button
                id="btn-options-menu"
                onClick={() => setOptionsMenuOpen(!optionsMenuOpen)}
                className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                  optionsMenuOpen
                    ? 'bg-neutral-800 text-white border-neutral-600 ring-2 ring-red-500/40'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
                }`}
                title="Ajustes y opciones adicionales"
                aria-label="Opciones adicionales"
              >
                {/* 3 clean horizontal lines */}
                <div className="w-4 h-4 flex flex-col justify-center items-center gap-1">
                  <span className={`w-4 h-0.5 bg-current rounded-full transition-transform ${optionsMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
                  <span className={`w-4 h-0.5 bg-current rounded-full transition-opacity ${optionsMenuOpen ? 'opacity-0' : ''}`} />
                  <span className={`w-4 h-0.5 bg-current rounded-full transition-transform ${optionsMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
                </div>
              </button>

              {/* Small Dropdown Popover */}
              {optionsMenuOpen && (
                <div
                  id="dropdown-options-menu"
                  className="absolute right-0 mt-2 w-64 bg-neutral-900/98 backdrop-blur-xl border border-neutral-700/90 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* User identity snippet */}
                  <div className="px-3 py-2 mb-1 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{user.nombre}</div>
                      <div className="text-[10px] text-neutral-400 capitalize">{user.rol}</div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        user.rol === 'admin'
                          ? 'bg-red-950/60 text-red-300 border-red-900/60'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                      }`}
                    >
                      {user.rol === 'admin' ? 'Admin' : 'Operario'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {/* Main navigation on compact screens */}
                    <div className="lg:hidden pb-1 mb-1 border-b border-neutral-800">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            id={`menu-nav-${item.id}`}
                            onClick={() => {
                              onTabChange(item.id);
                              setOptionsMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                              isActive
                                ? 'bg-[#EA1D24] text-white font-bold shadow-xs'
                                : 'text-neutral-200 hover:bg-neutral-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4 text-neutral-400" />
                              <span>{item.label}</span>
                            </div>
                            {item.badge !== undefined && (
                              <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* 1. Usuarios */}
                    <button
                      id="menu-opt-users"
                      onClick={() => {
                        onTabChange('users');
                        setOptionsMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        currentTab === 'users'
                          ? 'bg-[#EA1D24] text-white font-bold shadow-xs'
                          : 'text-neutral-200 hover:bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="w-4 h-4 text-neutral-400 group-hover:text-white" />
                        <span>Usuarios</span>
                      </div>
                      {currentTab === 'users' ? (
                        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Activo</span>
                      ) : (
                        <span className="text-[10px] text-neutral-400">Gestión</span>
                      )}
                    </button>

                    {/* 2. Ajustar fecha */}
                    <button
                      id="menu-opt-datetime"
                      onClick={() => {
                        openTimeModal();
                        setOptionsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-neutral-400" />
                        <span>Ajustar fecha</span>
                      </div>
                      <span className="font-mono text-[10px] text-neutral-300 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                        {formattedTime.substring(0, 5)}
                      </span>
                    </button>

                    {/* 3. Cambiar a operario */}
                    <button
                      id="menu-opt-switch-role"
                      onClick={() => {
                        onQuickSwitchRole(user.rol === 'admin' ? 'operario' : 'admin');
                        setOptionsMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-neutral-200 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Repeat className="w-4 h-4 text-neutral-400" />
                        <span>{user.rol === 'admin' ? 'Cambiar a operario' : 'Cambiar a administrador'}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold">Alternar</span>
                    </button>
                  </div>

                  <div className="my-1 border-t border-neutral-800" />

                  {/* 4. Cerrar sesión */}
                  <button
                    id="menu-opt-logout"
                    onClick={() => {
                      onLogout();
                      setOptionsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
