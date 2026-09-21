import React, { useState } from 'react';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Bookmark,
  Plus,
  Filter,
  Calendar,
  FolderGit2,
  Boxes,
  User as UserIcon,
  Search,
  Download,
  RotateCcw,
  AlertTriangle,
  X
} from 'lucide-react';
import { Movement, Project, Product, MovementType, User } from '../types';
import { api } from '../lib/api';

interface MovementsViewProps {
  movements: Movement[];
  projects: Project[];
  products: Product[];
  currentUser?: User;
  onNewMovement: (type?: MovementType) => void;
  onSelectProduct: (productId: string) => void;
  onRefresh?: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const MovementsView: React.FC<MovementsViewProps> = ({
  movements,
  projects,
  products,
  currentUser,
  onNewMovement,
  onSelectProduct,
  onRefresh,
  onShowToast,
}) => {
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterProyecto, setFilterProyecto] = useState<string>('all');
  const [filterProducto, setFilterProducto] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [movementToUndo, setMovementToUndo] = useState<Movement | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);

  const handleConfirmUndo = async () => {
    if (!movementToUndo) return;
    setIsUndoing(true);
    setUndoError(null);
    try {
      const res = await api.undoMovement(movementToUndo.id);
      if (onShowToast) {
        onShowToast(res.message || 'Movimiento deshecho y stock restablecido', 'success');
      }
      setMovementToUndo(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setUndoError(err.message || 'Error al deshacer el movimiento');
    } finally {
      setIsUndoing(false);
    }
  };

  // Filtering
  const filteredMovements = movements.filter((m) => {
    const matchesTipo = filterTipo === 'all' || m.tipo === filterTipo;
    const matchesProyecto = filterProyecto === 'all' || m.proyecto_id === filterProyecto;
    const matchesProducto = filterProducto === 'all' || m.producto_id === filterProducto;

    const matchesSearch =
      !search ||
      (m.producto_nombre && m.producto_nombre.toLowerCase().includes(search.toLowerCase())) ||
      (m.producto_codigo && m.producto_codigo.toLowerCase().includes(search.toLowerCase())) ||
      (m.usuario_nombre && m.usuario_nombre.toLowerCase().includes(search.toLowerCase())) ||
      (m.proyecto_nombre && m.proyecto_nombre.toLowerCase().includes(search.toLowerCase())) ||
      (m.observaciones && m.observaciones.toLowerCase().includes(search.toLowerCase()));

    const moveDate = m.fecha.substring(0, 10);
    const matchesStart = !startDate || moveDate >= startDate;
    const matchesEnd = !endDate || moveDate <= endDate;

    return matchesTipo && matchesProyecto && matchesProducto && matchesSearch && matchesStart && matchesEnd;
  });

  // Calculate totals
  const totalEntradas = filteredMovements
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + m.cantidad, 0);

  const totalSalidas = filteredMovements
    .filter((m) => m.tipo === 'salida')
    .reduce((acc, m) => acc + m.cantidad, 0);

  const totalReservas = filteredMovements
    .filter((m) => m.tipo === 'reserva')
    .reduce((acc, m) => acc + m.cantidad, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header - Bento Card */}
      <div className="bento-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Registro de Movimientos</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-[#EA1D24] border border-red-200">
              {filteredMovements.length} operaciones
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Trazabilidad completa de entradas, salidas y reservas con usuario responsable y proyecto de destino.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-movements-new-entry"
            onClick={() => onNewMovement('entrada')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Entrada</span>
          </button>

          <button
            id="btn-movements-new-exit"
            onClick={() => onNewMovement('salida')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Salida</span>
          </button>

          <button
            id="btn-movements-new-reserve"
            onClick={() => onNewMovement('reserva')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Bookmark className="w-4 h-4" />
            <span>Reserva</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Entradas</span>
              <span className="font-bold text-slate-900 font-mono text-lg">+{totalEntradas} uds</span>
            </div>
          </div>
        </div>

        <div className="bento-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Salidas</span>
              <span className="font-bold text-slate-900 font-mono text-lg">-{totalSalidas} uds</span>
            </div>
          </div>
        </div>

        <div className="bento-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 font-medium block">En Reserva</span>
              <span className="font-bold text-slate-900 font-mono text-lg">{totalReservas} uds</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar - Bento Card */}
      <div className="bento-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar responsable, material, obs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Tipo */}
          <div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="all">Todos los tipos (Entrada, Salida, Reserva)</option>
              <option value="entrada">Solo Entradas</option>
              <option value="salida">Solo Salidas</option>
              <option value="reserva">Solo Reservas</option>
            </select>
          </div>

          {/* Proyecto */}
          <div>
            <select
              value={filterProyecto}
              onChange={(e) => setFilterProyecto(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
            >
              <option value="all">Todos los proyectos / Almacén</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Desde */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
            <span className="text-[10px] text-slate-500 font-medium">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-transparent text-slate-800 text-xs focus:outline-hidden"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1">
            <span className="text-[10px] text-slate-500 font-medium">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-transparent text-slate-800 text-xs focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      {filteredMovements.length === 0 ? (
        <div className="bento-card p-12 text-center text-slate-500">
          <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-800 text-base">Sin movimientos encontrados</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No hay registros que coincidan con los filtros de búsqueda y fechas seleccionados.
          </p>
        </div>
      ) : (
        <div className="bento-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Fecha & Hora</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Producto / Material</th>
                  <th className="py-3.5 px-4 text-right">Cantidad</th>
                  <th className="py-3.5 px-4">Proyecto / Cliente</th>
                  <th className="py-3.5 px-4">Responsable</th>
                  <th className="py-3.5 px-4">Observaciones</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => {
                  const isEntrada = m.tipo === 'entrada';
                  const isSalida = m.tipo === 'salida';
                  const isReserva = m.tipo === 'reserva';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <div className="font-medium text-slate-700">
                          {new Date(m.fecha).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isEntrada && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> Entrada
                          </span>
                        )}
                        {isSalida && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Salida
                          </span>
                        )}
                        {isReserva && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            <Bookmark className="w-3.5 h-3.5" /> Reserva
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => onSelectProduct(m.producto_id)}
                          className="text-left group focus:outline-hidden"
                        >
                          <div className="font-semibold text-slate-900 group-hover:text-[#EA1D24] transition-colors text-sm">
                            {m.producto_nombre}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            {m.producto_codigo} • {m.producto_categoria}
                          </div>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-sm whitespace-nowrap">
                        <span
                          className={
                            isEntrada
                              ? 'text-emerald-700'
                              : isSalida
                              ? 'text-rose-700'
                              : 'text-amber-700'
                          }
                        >
                          {isEntrada ? `+${m.cantidad}` : isSalida ? `-${m.cantidad}` : m.cantidad}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {m.proyecto_nombre ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded-md">
                            <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{m.proyecto_nombre}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Almacén central</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{m.usuario_nombre}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {m.observaciones || '-'}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setMovementToUndo(m);
                            setUndoError(null);
                          }}
                          title="Deshacer este movimiento y revertir el stock"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Deshacer</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Deshacer Movimiento */}
      {movementToUndo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">¿Deshacer movimiento?</h3>
                  <span className="text-[11px] text-slate-400">ID: {movementToUndo.id}</span>
                </div>
              </div>
              <button
                onClick={() => setMovementToUndo(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {undoError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{undoError}</span>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Producto:</span>
                <span className="font-bold text-slate-900">{movementToUndo.producto_nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo:</span>
                <span className="font-semibold capitalize">{movementToUndo.tipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cantidad:</span>
                <span className="font-bold font-mono">{movementToUndo.cantidad}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span>{new Date(movementToUndo.fecha).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Al deshacer este movimiento se revertirá automáticamente el stock disponible del producto y se eliminará el registro del historial.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMovementToUndo(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isUndoing}
                onClick={handleConfirmUndo}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isUndoing ? 'Deshaciendo...' : 'Confirmar y Deshacer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
