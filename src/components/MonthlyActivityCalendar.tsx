import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  ClipboardList,
  FolderGit2,
  Filter,
  Sparkles,
  CalendarDays,
  Clock
} from 'lucide-react';
import { Movement, Project, MaterialRequest, Order, Product } from '../types';
import { useAppTime } from '../context/TimeContext';
import { DayEventsModal, DayEventsData } from './DayEventsModal';

interface MonthlyActivityCalendarProps {
  movements: Movement[];
  projects: Project[];
  requests: MaterialRequest[];
  orders: Order[];
  alerts?: Product[];
  onSelectProduct?: (productId: string) => void;
  onOpenNewMovement?: (type: 'entrada' | 'salida') => void;
  onNewRequest?: () => void;
}

// Helper to normalize any date string to YYYY-MM-DD
function toDateKey(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    // If it's already YYYY-MM-DD...
    if (dateStr.length >= 10 && dateStr.charAt(4) === '-' && dateStr.charAt(7) === '-') {
      return dateStr.substring(0, 10);
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return null;
  }
}

export const MonthlyActivityCalendar: React.FC<MonthlyActivityCalendarProps> = ({
  movements,
  projects,
  requests,
  orders,
  alerts = [],
  onSelectProduct,
  onOpenNewMovement,
  onNewRequest,
}) => {
  const { currentDate, isoDate, isManual } = useAppTime();

  // Selected Month & Year (defaults to active Spain time date)
  const [viewYear, setViewYear] = useState<number>(() => currentDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => currentDate.getMonth()); // 0-11

  // Filter toggles
  const [showEntradas, setShowEntradas] = useState(true);
  const [showSalidas, setShowSalidas] = useState(true);
  const [showPedidos, setShowPedidos] = useState(true);
  const [showSolicitudes, setShowSolicitudes] = useState(true);
  const [showProyectos, setShowProyectos] = useState(true);

  // Selected day for modal
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Month Names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Map events to date keys
  const eventsByDay = useMemo(() => {
    const map = new Map<string, {
      movements: Movement[];
      requests: MaterialRequest[];
      orders: Order[];
      projectsStarting: Project[];
      projectsEnding: Project[];
    }>();

    const getOrCreate = (key: string) => {
      if (!map.has(key)) {
        map.set(key, {
          movements: [],
          requests: [],
          orders: [],
          projectsStarting: [],
          projectsEnding: [],
        });
      }
      return map.get(key)!;
    };

    // 1. Movements (Entradas, Salidas, Reservas)
    movements.forEach((m) => {
      const key = toDateKey(m.fecha);
      if (key) {
        getOrCreate(key).movements.push(m);
      }
    });

    // 2. Requests
    requests.forEach((r) => {
      const key = toDateKey(r.fecha_solicitud);
      if (key) {
        getOrCreate(key).requests.push(r);
      }
      if (r.fecha_necesidad) {
        const necKey = toDateKey(r.fecha_necesidad);
        if (necKey && necKey !== key) {
          getOrCreate(necKey).requests.push(r);
        }
      }
    });

    // 3. Orders
    orders.forEach((o) => {
      const key = toDateKey(o.fecha_pedido);
      if (key) {
        getOrCreate(key).orders.push(o);
      }
      if (o.fecha_estimada_entrega) {
        const entKey = toDateKey(o.fecha_estimada_entrega);
        if (entKey && entKey !== key) {
          getOrCreate(entKey).orders.push(o);
        }
      }
    });

    // 4. Projects
    projects.forEach((p) => {
      if (p.fecha_inicio) {
        const startKey = toDateKey(p.fecha_inicio);
        if (startKey) {
          getOrCreate(startKey).projectsStarting.push(p);
        }
      }
      if (p.fecha_fin) {
        const endKey = toDateKey(p.fecha_fin);
        if (endKey) {
          getOrCreate(endKey).projectsEnding.push(p);
        }
      }
    });

    return map;
  }, [movements, requests, orders, projects]);

  // Calendar Grid Calculation
  const { calendarDays, monthEventCounts } = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // Day of week: 0 = Sunday, 1 = Monday, etc.
    // In Spain: Monday is day 0, Sunday is day 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6; // Sunday becomes 6

    const days: Array<{
      dateKey: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      dateObj: Date;
    }> = [];

    const pad = (n: number) => String(n).padStart(2, '0');

    // Previous month padding days
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dNum);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      const key = `${prevYear}-${pad(prevMonth)}-${pad(dNum)}`;
      days.push({
        dateKey: key,
        dayNumber: dNum,
        isCurrentMonth: false,
        isToday: key === isoDate,
        dateObj: prevDate
      });
    }

    let monthEntradas = 0;
    let monthSalidas = 0;
    let monthPedidos = 0;
    let monthSolicitudes = 0;
    let monthProyectos = 0;

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`;
      const curDate = new Date(viewYear, viewMonth, d);
      days.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: key === isoDate,
        dateObj: curDate
      });

      const ev = eventsByDay.get(key);
      if (ev) {
        monthEntradas += ev.movements.filter((m) => m.tipo === 'entrada').length;
        monthSalidas += ev.movements.filter((m) => m.tipo === 'salida').length;
        monthPedidos += ev.orders.length;
        monthSolicitudes += ev.requests.length;
        monthProyectos += ev.projectsStarting.length + ev.projectsEnding.length;
      }
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(viewYear, viewMonth + 1, d);
      const nYear = nextDate.getFullYear();
      const nMonth = nextDate.getMonth() + 1;
      const key = `${nYear}-${pad(nMonth)}-${pad(d)}`;
      days.push({
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: key === isoDate,
        dateObj: nextDate
      });
    }

    return {
      calendarDays: days,
      monthEventCounts: {
        total: monthEntradas + monthSalidas + monthPedidos + monthSolicitudes + monthProyectos,
        entradas: monthEntradas,
        salidas: monthSalidas,
        pedidos: monthPedidos,
        solicitudes: monthSolicitudes,
        proyectos: monthProyectos
      }
    };
  }, [viewYear, viewMonth, isoDate, eventsByDay]);

  // Handlers for month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    setViewYear(currentDate.getFullYear());
    setViewMonth(currentDate.getMonth());
    setSelectedDayKey(isoDate);
  };

  // Prepare data for selected day modal
  const selectedDayEventsData: DayEventsData | null = useMemo(() => {
    if (!selectedDayKey) return null;
    const parts = selectedDayKey.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const ev = eventsByDay.get(selectedDayKey) || {
      movements: [],
      requests: [],
      orders: [],
      projectsStarting: [],
      projectsEnding: []
    };

    return {
      dateStr: selectedDayKey,
      dateObj,
      movements: ev.movements,
      requests: ev.requests,
      orders: ev.orders,
      projectsStarting: ev.projectsStarting,
      projectsEnding: ev.projectsEnding,
      alerts
    };
  }, [selectedDayKey, eventsByDay, alerts]);

  // Navigate offset days inside the modal
  const handleChangeDateOffset = (offset: number) => {
    if (!selectedDayKey) return;
    const parts = selectedDayKey.split('-');
    const current = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    current.setDate(current.getDate() + offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    const newKey = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
    setSelectedDayKey(newKey);
    // If navigated outside current month view, sync view
    if (current.getMonth() !== viewMonth || current.getFullYear() !== viewYear) {
      setViewYear(current.getFullYear());
      setViewMonth(current.getMonth());
    }
  };

  const weekDayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="bento-card p-5 sm:p-6 shadow-sm border border-slate-200">
      {/* Calendar Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#EA1D24] border border-red-200 flex items-center justify-center font-bold">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Calendario de Actividad y Eventos
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Vista Mensual
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Supervisión de entradas, salidas de material, pedidos a distribuidores, solicitudes y obras
            </p>
          </div>
        </div>

        {/* Month Navigation & Today Button */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handlePrevMonth}
              title="Mes anterior"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 text-xs sm:text-sm font-bold text-slate-900 min-w-[140px] text-center capitalize">
              {monthNames[viewMonth]} {viewYear}
            </div>
            <button
              onClick={handleNextMonth}
              title="Mes siguiente"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleJumpToToday}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5 text-red-400" />
            <span>Ir a Hoy</span>
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 mb-4 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Filtros rápidos:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowEntradas(!showEntradas)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 text-xs ${
              showEntradas
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Entradas ({monthEventCounts.entradas})</span>
          </button>

          <button
            onClick={() => setShowSalidas(!showSalidas)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 text-xs ${
              showSalidas
                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#EA1D24]" />
            <span>Salidas ({monthEventCounts.salidas})</span>
          </button>

          <button
            onClick={() => setShowPedidos(!showPedidos)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 text-xs ${
              showPedidos
                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span>Pedidos ({monthEventCounts.pedidos})</span>
          </button>

          <button
            onClick={() => setShowSolicitudes(!showSolicitudes)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 text-xs ${
              showSolicitudes
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Solicitudes ({monthEventCounts.solicitudes})</span>
          </button>

          <button
            onClick={() => setShowProyectos(!showProyectos)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 text-xs ${
              showProyectos
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-100 text-slate-400 border border-slate-200 line-through'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Obras ({monthEventCounts.proyectos})</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-600 py-2.5">
          {weekDayHeaders.map((h, idx) => (
            <div
              key={h}
              className={`uppercase tracking-wider text-[11px] ${
                idx >= 5 ? 'text-slate-400' : 'text-slate-700'
              }`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Days Cells Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarDays.map((day) => {
            const ev = eventsByDay.get(day.dateKey);
            const entradasCount = ev ? ev.movements.filter((m) => m.tipo === 'entrada').length : 0;
            const salidasCount = ev ? ev.movements.filter((m) => m.tipo === 'salida').length : 0;
            const pedidosCount = ev ? ev.orders.length : 0;
            const solicitudesCount = ev ? ev.requests.length : 0;
            const proyectosCount = ev ? ev.projectsStarting.length + ev.projectsEnding.length : 0;

            const visibleCount =
              (showEntradas ? entradasCount : 0) +
              (showSalidas ? salidasCount : 0) +
              (showPedidos ? pedidosCount : 0) +
              (showSolicitudes ? solicitudesCount : 0) +
              (showProyectos ? proyectosCount : 0);

            const isSelected = selectedDayKey === day.dateKey;

            return (
              <div
                key={day.dateKey}
                onClick={() => setSelectedDayKey(day.dateKey)}
                className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 flex flex-col justify-between cursor-pointer transition-all relative group ${
                  day.isCurrentMonth
                    ? 'bg-white hover:bg-slate-50/90'
                    : 'bg-slate-50/50 text-slate-400 hover:bg-slate-100/60'
                } ${isSelected ? 'ring-2 ring-red-500 bg-red-50/20 z-10' : ''}`}
              >
                {/* Top Day Header in Cell */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs sm:text-sm font-extrabold flex items-center justify-center w-6 h-6 rounded-full transition-transform group-hover:scale-105 ${
                      day.isToday
                        ? 'bg-[#EA1D24] text-white shadow-xs font-black'
                        : day.isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {day.isToday && (
                    <span className="hidden sm:inline-block text-[10px] font-bold text-[#EA1D24] uppercase tracking-wider bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      Hoy
                    </span>
                  )}

                  {visibleCount > 0 && !day.isToday && (
                    <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-full">
                      {visibleCount}
                    </span>
                  )}
                </div>

                {/* Event Pills Area */}
                <div className="mt-1 space-y-1 overflow-hidden">
                  {showEntradas && entradasCount > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-emerald-100/80 text-emerald-900 border border-emerald-200 text-[10px] font-bold truncate flex items-center gap-1">
                      <ArrowDownLeft className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                      <span>+{entradasCount} {entradasCount === 1 ? 'entrada' : 'entradas'}</span>
                    </div>
                  )}

                  {showSalidas && salidasCount > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-rose-100/80 text-rose-900 border border-rose-200 text-[10px] font-bold truncate flex items-center gap-1">
                      <ArrowUpRight className="w-2.5 h-2.5 text-rose-700 shrink-0" />
                      <span>-{salidasCount} {salidasCount === 1 ? 'salida' : 'salidas'}</span>
                    </div>
                  )}

                  {showPedidos && pedidosCount > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-purple-100/80 text-purple-900 border border-purple-200 text-[10px] font-bold truncate flex items-center gap-1">
                      <Truck className="w-2.5 h-2.5 text-purple-700 shrink-0" />
                      <span>{pedidosCount} {pedidosCount === 1 ? 'pedido' : 'pedidos'}</span>
                    </div>
                  )}

                  {showSolicitudes && solicitudesCount > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-blue-100/80 text-blue-900 border border-blue-200 text-[10px] font-bold truncate flex items-center gap-1">
                      <ClipboardList className="w-2.5 h-2.5 text-blue-700 shrink-0" />
                      <span>{solicitudesCount} {solicitudesCount === 1 ? 'solicitud' : 'solicitudes'}</span>
                    </div>
                  )}

                  {showProyectos && proyectosCount > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-200 text-[10px] font-bold truncate flex items-center gap-1">
                      <FolderGit2 className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                      <span>{proyectosCount} {proyectosCount === 1 ? 'obra' : 'obras'}</span>
                    </div>
                  )}
                </div>

                {/* Bottom subtle hint on hover */}
                <div className="opacity-0 group-hover:opacity-100 text-[9px] text-slate-400 font-medium text-right pt-0.5 transition-opacity">
                  Ver detalle
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events Preview Modal */}
      <DayEventsModal
        isOpen={Boolean(selectedDayKey)}
        eventsData={selectedDayEventsData}
        onClose={() => setSelectedDayKey(null)}
        onSelectProduct={onSelectProduct}
        onOpenNewMovement={onOpenNewMovement}
        onNewRequest={onNewRequest}
        onChangeDateOffset={handleChangeDateOffset}
      />
    </div>
  );
};
