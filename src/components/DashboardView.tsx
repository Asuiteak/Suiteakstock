import React from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  FolderGit2,
  Camera,
  PlusCircle,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Bookmark,
  ClipboardList,
  ShoppingCart
} from 'lucide-react';
import { DashboardStats, Product, MovementType, Movement, Project, MaterialRequest, Order } from '../types';
import { NavTab } from './Navbar';
import { MonthlyActivityCalendar } from './MonthlyActivityCalendar';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  onNavigate: (tab: NavTab) => void;
  onOpenNewMovement: (type?: MovementType, defaultProductId?: string) => void;
  onOpenScanner: () => void;
  onSelectProduct: (productId: string) => void;
  onNewProduct?: () => void;
  onNewRequest?: () => void;
  movements?: Movement[];
  projects?: Project[];
  requests?: MaterialRequest[];
  orders?: Order[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  onNavigate,
  onOpenNewMovement,
  onOpenScanner,
  onSelectProduct,
  onNewProduct,
  onNewRequest,
  movements = [],
  projects = [],
  requests = [],
  orders = [],
}) => {
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Cargando datos del almacén...</p>
        </div>
      </div>
    );
  }

  const alertItems = stats?.alertas || [];
  const recentMoves = stats?.ultimos_movimientos || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Full-Width Quick Actions Hub */}
      <div className="bento-card p-5 sm:p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#EA1D24] border border-red-200 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                  Acciones Rápidas de Almacén
                </h2>
                <span className="w-2 h-2 rounded-full bg-[#EA1D24] animate-pulse" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Operaciones inmediatas para registrar movimientos de stock y consultar inventario
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onNewProduct && (
              <button
                id="dash-btn-new-product"
                onClick={onNewProduct}
                className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs border border-neutral-800"
              >
                <PlusCircle className="w-4 h-4 text-[#EA1D24]" />
                <span>Nuevo Producto</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('products')}
              className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#EA1D24] px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <span>Catálogo ({stats?.total_productos ?? 0})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Large Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {/* Button 1: Nueva Entrada */}
          <button
            id="dash-btn-entrada"
            onClick={() => onOpenNewMovement('entrada')}
            className="group text-left p-3 sm:p-6 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 hover:from-emerald-100/80 hover:to-emerald-200/40 border-2 border-emerald-300/80 hover:border-emerald-500 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between min-h-[112px] sm:min-h-[140px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-1.5 sm:px-2.5 py-1 rounded-full bg-emerald-600/10 text-emerald-800 border border-emerald-600/20">
                Entrada
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-xl font-bold text-slate-900 group-hover:text-emerald-900 transition-colors">
                  Nueva Entrada
                </h3>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[10px] sm:text-sm text-slate-600 mt-1 leading-snug">
                Recepción de material de proveedor o compra
              </p>
            </div>
          </button>

          {/* Button 2: Nueva Salida */}
          <button
            id="dash-btn-salida"
            onClick={() => onOpenNewMovement('salida')}
            className="group text-left p-3 sm:p-6 bg-gradient-to-br from-red-50/70 to-red-100/30 hover:from-red-100/80 hover:to-red-200/40 border-2 border-red-300/80 hover:border-[#EA1D24] rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between min-h-[112px] sm:min-h-[140px] focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24]"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-[#EA1D24] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-1.5 sm:px-2.5 py-1 rounded-full bg-red-600/10 text-red-800 border border-red-600/20">
                Salida
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-xl font-bold text-slate-900 group-hover:text-[#EA1D24] transition-colors">
                  Nueva Salida
                </h3>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#EA1D24] opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[10px] sm:text-sm text-slate-600 mt-1 leading-snug">
                Retirada y consumo directo de material para obra
              </p>
            </div>
          </button>

          {/* Button 3: Reservar Material */}
          <button
            id="dash-btn-reserva"
            onClick={() => onOpenNewMovement('reserva')}
            className="group text-left p-3 sm:p-6 bg-gradient-to-br from-amber-50/70 to-amber-100/30 hover:from-amber-100/80 hover:to-amber-200/40 border-2 border-amber-300/80 hover:border-amber-500 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between min-h-[112px] sm:min-h-[140px] focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Bookmark className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-1.5 sm:px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/20">
                Reserva
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-xl font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                  Reservar Material
                </h3>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[10px] sm:text-sm text-slate-600 mt-1 leading-snug">
                Apartar y asignar existencias a un proyecto u obra
              </p>
            </div>
          </button>

          {/* Button 4: Realizar Nuevo Pedido */}
          <button
            id="dash-btn-nuevo-pedido"
            onClick={() => onNavigate('orders')}
            className="group text-left p-3 sm:p-6 bg-gradient-to-br from-blue-50/70 to-blue-100/30 hover:from-blue-100/80 hover:to-blue-200/40 border-2 border-blue-300/80 hover:border-blue-500 rounded-2xl transition-all shadow-xs hover:shadow-md flex flex-col justify-between min-h-[112px] sm:min-h-[140px] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex items-start justify-between w-full">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-1.5 sm:px-2.5 py-1 rounded-full bg-blue-600/10 text-blue-800 border border-blue-600/20">
                Pedidos
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-xl font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                  Nuevo Pedido
                </h3>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-[10px] sm:text-sm text-slate-600 mt-1 leading-snug">
                Gestionar y encargar material a proveedores
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Material Requests Hub Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#EA1D24]/10 text-[#EA1D24] border border-[#EA1D24]/20 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Solicitudes de Material & Preparación de Cargas
              </h3>
              {(stats?.solicitudes_pendientes ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {stats?.solicitudes_pendientes} pendientes
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Los operarios pueden pedir preparación de carga de almacén o solicitar material nuevo no catalogado para compra
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {onNewRequest && (
            <button
              id="dash-btn-nueva-solicitud"
              onClick={onNewRequest}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Hacer Solicitud</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('requests')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs sm:text-sm font-semibold border border-neutral-700 transition-colors"
          >
            <span>Ver Tablón de Solicitudes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Interactive Calendar */}
      <MonthlyActivityCalendar
        movements={movements.length > 0 ? movements : recentMoves}
        projects={projects}
        requests={requests}
        orders={orders}
        alerts={alertItems}
        onSelectProduct={onSelectProduct}
        onOpenNewMovement={onOpenNewMovement}
        onNewRequest={onNewRequest}
      />

      {/* Bento Grid: Two Column Section (Critical Deficit Bento & Recent Activity Bento) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bento Left: Critical Stock Alerts (col-span-5) */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Alertas de Stock</h2>
                  <span className="text-xs text-slate-500">Artículos prioritarios para reposición</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('alerts')}
                className="text-xs text-[#EA1D24] hover:text-[#c4141a] font-semibold flex items-center gap-1"
              >
                Ver todas ({alertItems.length})
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {alertItems.length === 0 ? (
              <div className="py-10 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">Almacén abastecido</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-0.5">
                  Todas las referencias cuentan con stock disponible superior al mínimo de seguridad.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertItems.slice(0, 4).map((product) => (
                  <div
                    key={product.id}
                    className="p-3.5 bg-slate-50/80 hover:bg-slate-100/90 rounded-xl border border-slate-200 transition-colors flex items-center justify-between gap-3"
                  >
                    <div
                      className="cursor-pointer min-w-0 flex-1"
                      onClick={() => onSelectProduct(product.id)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          {product.codigo}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {product.nombre}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs mt-1.5">
                        <span className="text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-md">
                          Disp. almacén: {product.stock_disponible}
                        </span>
                        <span className="text-slate-500">Mín: {product.stock_minimo}</span>
                      </div>
                    </div>

                    <button
                      id={`btn-reponer-${product.id}`}
                      onClick={() => onOpenNewMovement('entrada', product.id)}
                      className="px-3 py-1.5 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white text-xs font-bold rounded-lg shadow-xs shadow-red-600/20 transition-colors shrink-0"
                    >
                      Reponer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              onClick={() => onNavigate('products')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors text-center"
            >
              Consultar Catálogo de Productos
            </button>
          </div>
        </div>

        {/* Bento Right: Recent Movements Table (col-span-7) */}
        <div className="lg:col-span-7 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Últimos Movimientos</h2>
                  <span className="text-xs text-slate-500">Trazabilidad de entradas, salidas y reservas</span>
                </div>
              </div>
              <button
                onClick={() => onNavigate('movements')}
                className="text-xs text-[#EA1D24] hover:text-[#c4141a] font-semibold flex items-center gap-1"
              >
                Historial completo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentMoves.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-medium">Aún no hay movimientos registrados hoy.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Usa los botones de acción rápida para registrar entradas o salidas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Tipo</th>
                      <th className="pb-3">Producto</th>
                      <th className="pb-3 text-right">Cant.</th>
                      <th className="pb-3">Proyecto / Destino</th>
                      <th className="pb-3">Responsable</th>
                      <th className="pb-3 text-right">Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentMoves.map((m) => {
                      const isEntrada = m.tipo === 'entrada';
                      const isSalida = m.tipo === 'salida';
                      const isReserva = m.tipo === 'reserva';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3">
                            {isEntrada && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                <ArrowDownLeft className="w-3 h-3" /> Entrada
                              </span>
                            )}
                            {isSalida && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                <ArrowUpRight className="w-3 h-3" /> Salida
                              </span>
                            )}
                            {isReserva && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                <Bookmark className="w-3 h-3" /> Reserva
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => onSelectProduct(m.producto_id)}
                              className="text-left group focus:outline-hidden"
                            >
                              <div className="font-semibold text-slate-900 group-hover:text-[#EA1D24] transition-colors">
                                {m.producto_nombre}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {m.producto_codigo}
                              </div>
                            </button>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-slate-900">
                            {isEntrada ? `+${m.cantidad}` : isSalida ? `-${m.cantidad}` : m.cantidad}
                          </td>
                          <td className="py-3 text-slate-600">
                            {m.proyecto_nombre ? (
                              <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                <FolderGit2 className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[130px]">{m.proyecto_nombre}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Almacén central</span>
                            )}
                          </td>
                          <td className="py-3 text-slate-600 truncate max-w-[110px]">
                            {m.usuario_nombre}
                          </td>
                          <td className="py-3 text-right text-slate-400 font-mono text-[11px]">
                            {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Últimos registros automáticos del almacén</span>
            <button
              onClick={() => onOpenNewMovement('salida')}
              className="text-[#EA1D24] hover:text-[#c4141a] font-semibold"
            >
              + Registrar salida
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
