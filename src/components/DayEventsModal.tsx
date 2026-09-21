import React from 'react';
import {
  Calendar,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Truck,
  ClipboardList,
  FolderGit2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  ExternalLink,
  Tag,
  User as UserIcon
} from 'lucide-react';
import { Movement, Project, MaterialRequest, Order, Product } from '../types';

export interface DayEventsData {
  dateStr: string; // YYYY-MM-DD
  dateObj: Date;
  movements: Movement[];
  requests: MaterialRequest[];
  orders: Order[];
  projectsStarting: Project[];
  projectsEnding: Project[];
  alerts: Product[];
}

interface DayEventsModalProps {
  isOpen: boolean;
  eventsData: DayEventsData | null;
  onClose: () => void;
  onSelectProduct?: (productId: string) => void;
  onOpenNewMovement?: (type: 'entrada' | 'salida') => void;
  onNewRequest?: () => void;
  onChangeDateOffset?: (offsetDays: number) => void;
}

export const DayEventsModal: React.FC<DayEventsModalProps> = ({
  isOpen,
  eventsData,
  onClose,
  onSelectProduct,
  onOpenNewMovement,
  onNewRequest,
  onChangeDateOffset
}) => {
  if (!isOpen || !eventsData) return null;

  const {
    dateObj,
    movements,
    requests,
    orders,
    projectsStarting,
    projectsEnding,
    alerts
  } = eventsData;

  const entradas = movements.filter((m) => m.tipo === 'entrada');
  const salidas = movements.filter((m) => m.tipo === 'salida');
  const reservas = movements.filter((m) => m.tipo === 'reserva');

  const formattedDateTitle = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj);

  const totalEvents =
    movements.length +
    requests.length +
    orders.length +
    projectsStarting.length +
    projectsEnding.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-neutral-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white capitalize truncate tracking-tight">
                {formattedDateTitle}
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
                <span>Vista previa de actividad y registros</span>
                <span className="w-1 h-1 rounded-full bg-neutral-600" />
                <span className="font-semibold text-neutral-300 font-mono">
                  {totalEvents} {totalEvents === 1 ? 'evento' : 'eventos'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onChangeDateOffset && (
              <div className="flex items-center bg-neutral-900 rounded-xl border border-neutral-800 p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeDateOffset(-1)}
                  title="Ver día anterior"
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDateOffset(1)}
                  title="Ver día siguiente"
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Counter Summary Pills */}
        <div className="px-4 sm:px-6 py-2.5 bg-neutral-950/60 border-b border-neutral-800/80 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1.5 shrink-0">
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>{entradas.length} Entradas</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-red-950/60 text-red-400 border border-red-900/40 flex items-center gap-1.5 shrink-0">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{salidas.length} Salidas</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-800/40 flex items-center gap-1.5 shrink-0">
            <Truck className="w-3.5 h-3.5" />
            <span>{orders.length} Pedidos</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-800/40 flex items-center gap-1.5 shrink-0">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>{requests.length} Solicitudes</span>
          </span>
          {(projectsStarting.length > 0 || projectsEnding.length > 0) && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center gap-1.5 shrink-0">
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>{projectsStarting.length + projectsEnding.length} Obras</span>
            </span>
          )}
        </div>

        {/* Scrollable Events Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {totalEvents === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-neutral-950/50 border border-dashed border-neutral-800 text-neutral-400">
              <Calendar className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-neutral-200">
                Sin movimientos ni eventos registrados en esta fecha
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                No constan entradas de almacén, salidas para obras, pedidos o solicitudes registradas en este día.
              </p>
              <div className="flex items-center justify-center gap-2 mt-5">
                {onOpenNewMovement && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenNewMovement('entrada');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Registrar Entrada</span>
                  </button>
                )}
                {onOpenNewMovement && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenNewMovement('salida');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EA1D24] hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Registrar Salida</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Entradas Section */}
              {entradas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1 bg-emerald-950 text-emerald-400 rounded-md border border-emerald-800/40">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Entradas de Almacén ({entradas.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {entradas.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40">
                              +{m.cantidad}
                            </span>
                            <span
                              onClick={() => onSelectProduct?.(m.producto_id)}
                              className="font-bold text-white hover:text-emerald-400 cursor-pointer truncate"
                            >
                              {m.producto_nombre}
                            </span>
                            {m.producto_codigo && (
                              <span className="text-[10px] font-mono text-neutral-400">
                                {m.producto_codigo}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-neutral-400 text-[11px] mt-1">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-neutral-500" />
                              {m.usuario_nombre || 'Usuario'}
                            </span>
                            {m.proyecto_nombre && (
                              <span className="flex items-center gap-1 text-neutral-300">
                                <FolderGit2 className="w-3 h-3 text-neutral-500" />
                                {m.proyecto_nombre}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-neutral-400 font-mono text-[11px]">
                            {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Salidas Section */}
              {salidas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1 bg-red-950 text-red-400 rounded-md border border-red-900/40">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                      Salidas de Almacén para Obras ({salidas.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {salidas.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-900/40">
                              -{m.cantidad}
                            </span>
                            <span
                              onClick={() => onSelectProduct?.(m.producto_id)}
                              className="font-bold text-white hover:text-red-400 cursor-pointer truncate"
                            >
                              {m.producto_nombre}
                            </span>
                            {m.producto_codigo && (
                              <span className="text-[10px] font-mono text-neutral-400">
                                {m.producto_codigo}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-neutral-400 text-[11px] mt-1">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-neutral-500" />
                              {m.usuario_nombre || 'Operario'}
                            </span>
                            {m.proyecto_nombre && (
                              <span className="flex items-center gap-1 text-amber-300 font-medium">
                                <FolderGit2 className="w-3 h-3 text-amber-400" />
                                {m.proyecto_nombre}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-neutral-400 font-mono text-[11px]">
                            {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pedidos a Distribuidores Section */}
              {orders.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1 bg-purple-950 text-purple-400 rounded-md border border-purple-800/40">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      Pedidos a Distribuidores ({orders.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {orders.map((o) => (
                      <div
                        key={o.id}
                        className="p-3 bg-neutral-950/80 rounded-xl border border-purple-900/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                              {o.numero_pedido}
                            </span>
                            <span className="font-bold text-white truncate">
                              {o.producto_nombre} ({o.cantidad} ud)
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-neutral-400 text-[11px] mt-1">
                            {o.proveedor_nombre && (
                              <span>Proveedor: <strong className="text-neutral-200">{o.proveedor_nombre}</strong></span>
                            )}
                            {o.proyecto_nombre && (
                              <span className="text-amber-400">Obra: {o.proyecto_nombre}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 shrink-0">
                          {o.estado.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Solicitudes Section */}
              {requests.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1 bg-blue-950 text-blue-400 rounded-md border border-blue-800/40">
                      <ClipboardList className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                      Solicitudes de Material ({requests.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {requests.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 bg-neutral-950/80 rounded-xl border border-blue-900/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">
                              {r.material_nombre} ({r.cantidad} {r.unidad})
                            </span>
                            {r.prioridad === 'urgente' && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-900">
                                Urgente
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-neutral-400 text-[11px] mt-1">
                            <span>Solicitante: <strong className="text-neutral-200">{r.usuario_nombre}</strong></span>
                            {r.proyecto_nombre && (
                              <span className="text-amber-400">Obra: {r.proyecto_nombre}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800 shrink-0">
                          {r.estado.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proyectos / Obras Section */}
              {(projectsStarting.length > 0 || projectsEnding.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="p-1 bg-amber-950 text-amber-400 rounded-md border border-amber-800/40">
                      <FolderGit2 className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      Hitos de Proyectos y Obras
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {projectsStarting.map((p) => (
                      <div
                        key={`start-${p.id}`}
                        className="p-3 bg-neutral-950/80 rounded-xl border border-amber-900/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Inicio de Obra
                            </span>
                            <span className="font-bold text-white">{p.nombre}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-1">
                            Cliente: <span className="text-neutral-200">{p.cliente}</span>
                            {p.direccion && ` · ${p.direccion}`}
                          </div>
                        </div>
                      </div>
                    ))}
                    {projectsEnding.map((p) => (
                      <div
                        key={`end-${p.id}`}
                        className="p-3 bg-neutral-950/80 rounded-xl border border-amber-900/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                              Fin Previsto
                            </span>
                            <span className="font-bold text-white">{p.nombre}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-1">
                            Cliente: <span className="text-neutral-200">{p.cliente}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2">
            {onOpenNewMovement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewMovement('entrada');
                }}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Entrada</span>
              </button>
            )}
            {onOpenNewMovement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewMovement('salida');
                }}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Salida</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
