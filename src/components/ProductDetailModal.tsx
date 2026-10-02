import React, { useEffect, useState } from 'react';
import {
  X,
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Bookmark,
  Calendar,
  Building2,
  FolderGit2,
  Clock,
  Edit2,
  CheckCircle2,
  Truck,
  Trash2,
  MoreVertical,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import { Product, Movement, User, Provider, Project } from '../types';
import { api } from '../lib/api';

interface ProductDetailModalProps {
  product: Product | null;
  currentUser: User;
  providers?: Provider[];
  projects: Project[];
  onClose: () => void;
  onOpenNewMovement: (type: 'entrada' | 'salida' | 'reserva', productId: string) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
  onOpenRequest?: (productId: string) => void;
  onOrderProduct?: (product: Product) => void;
  onProductUpdated?: (message?: string) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  currentUser,
  providers = [],
  projects,
  onClose,
  onOpenNewMovement,
  onEditProduct,
  onDeleteProduct,
  onOpenRequest,
  onOrderProduct,
  onProductUpdated,
}) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingProvider, setIsEditingProvider] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [savingProvider, setSavingProvider] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<Movement | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [reservationEditQuantity, setReservationEditQuantity] = useState('');
  const [reservationEditProject, setReservationEditProject] = useState('');
  const [savingReservation, setSavingReservation] = useState(false);
  const [reservationEditError, setReservationEditError] = useState<string | null>(null);
  const [newReservationQuantity, setNewReservationQuantity] = useState('1');
  const [newReservationProject, setNewReservationProject] = useState('');
  const [creatingReservation, setCreatingReservation] = useState(false);
  const [newReservationError, setNewReservationError] = useState<string | null>(null);
  const [deletingReservation, setDeletingReservation] = useState(false);
  const [reservationDeleteError, setReservationDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;
    setIsMenuOpen(false);
    setShowDeleteConfirm(false);
    setIsEditingProvider(false);
    setSelectedProviderId(product.proveedor_id || '');
    setProviderError(null);
    setLoadingMoves(true);
    api.getMovements({ producto_id: product.id })
      .then((moves) => setMovements(moves))
      .catch((err) => console.error('Error cargando movimientos del producto:', err))
      .finally(() => setLoadingMoves(false));
  }, [product]);

  const handleStatusChange = async (newEstado: 'activo' | 'disponible' | 'bajo_pedido' | 'descatalogado') => {
    if (!product) return;
    setUpdatingStatus(true);
    try {
      await api.updateProduct(product.id, { estado: newEstado });
      onProductUpdated?.();
    } catch (err: any) {
      console.error('Error actualizando estado del producto:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveProvider = async () => {
    if (!product) return;
    setSavingProvider(true);
    setProviderError(null);
    try {
      await api.updateProduct(product.id, {
        proveedor_id: selectedProviderId || null,
      });
      setIsEditingProvider(false);
      onProductUpdated?.();
    } catch (err: any) {
      setProviderError(err.message || 'Error al actualizar el proveedor');
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!reservationToDelete) return;
    setDeletingReservation(true);
    setReservationDeleteError(null);
    try {
      const result = await api.undoMovement(reservationToDelete.id);
      setMovements((current) => current.filter((movement) => movement.id !== reservationToDelete.id));
      setReservationToDelete(null);
      onProductUpdated?.(result.message || 'Reserva eliminada y unidades liberadas.');
    } catch (err: any) {
      setReservationDeleteError(err.message || 'No se pudo eliminar la reserva.');
    } finally {
      setDeletingReservation(false);
    }
  };

  const handleSaveReservation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingReservationId) return;
    setSavingReservation(true);
    setReservationEditError(null);
    try {
      const result = await api.updateReservation(editingReservationId, {
        cantidad: Number(reservationEditQuantity),
        proyecto_id: reservationEditProject,
      });
      setMovements((current) =>
        current.map((movement) => movement.id === result.movement.id ? result.movement : movement)
      );
      setEditingReservationId(null);
      onProductUpdated?.(result.message);
    } catch (err: any) {
      setReservationEditError(err.message || 'No se pudo actualizar la reserva.');
    } finally {
      setSavingReservation(false);
    }
  };

  const handleCreateReservation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!product) return;
    setCreatingReservation(true);
    setNewReservationError(null);
    try {
      const result = await api.createMovement({
        producto_id: product.id,
        tipo: 'reserva',
        cantidad: Number(newReservationQuantity),
        proyecto_id: newReservationProject,
        usuario_id: currentUser.id,
      });
      setMovements((current) => [result.movement, ...current]);
      setNewReservationQuantity('1');
      setNewReservationProject('');
      onProductUpdated?.(result.message);
    } catch (err: any) {
      setNewReservationError(err.message || 'No se pudo crear la reserva.');
    } finally {
      setCreatingReservation(false);
    }
  };

  if (!product) return null;

  const isAdmin = currentUser.rol === 'admin';
  const reservationsByProject = movements
    .filter((movement) => movement.tipo === 'reserva')
    .reduce<Record<string, { projectName: string; total: number; movements: Movement[] }>>((groups, movement) => {
      const key = movement.proyecto_id || 'sin-proyecto';
      const group = groups[key] || {
        projectName: movement.proyecto_nombre || 'Sin proyecto',
        total: 0,
        movements: [],
      };
      group.total += Number(movement.cantidad) || 0;
      group.movements.push(movement);
      groups[key] = group;
      return groups;
    }, {});
  const reservationGroups = Object.keys(reservationsByProject).map((projectId) => ({
    projectId,
    ...reservationsByProject[projectId],
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EA1D24] text-white flex items-center justify-center font-bold">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold bg-neutral-800 text-red-300 px-2 py-0.5 rounded-sm">
                  {product.codigo}
                </span>
                {product.referencia && (
                  <span className="font-mono text-xs text-neutral-300 bg-neutral-800/80 px-2 py-0.5 rounded-sm border border-neutral-700">
                    Ref: {product.referencia}
                  </span>
                )}
                <span className="text-xs text-neutral-400">{product.categoria}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {product.nombre}
                </h2>
                {isAdmin ? (
                  <select
                    disabled={updatingStatus}
                    value={product.estado || 'activo'}
                    onChange={(e) => handleStatusChange(e.target.value as any)}
                    className="ml-2 bg-neutral-800 border border-neutral-700 text-white rounded-md text-[11px] font-semibold px-2 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-[#EA1D24] cursor-pointer"
                  >
                    <option value="activo">🟢 Activo</option>
                    <option value="disponible">🔵 Disponible</option>
                    <option value="bajo_pedido">🟡 Bajo Pedido</option>
                    <option value="descatalogado">⚪ Descatalogado</option>
                  </select>
                ) : (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    product.estado === 'bajo_pedido'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-500/30'
                      : product.estado === 'descatalogado'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {product.estado || 'activo'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="relative">
                <button
                  id="btn-product-detail-options"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                  title="Opciones de producto"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-slate-700 animate-in fade-in">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onEditProduct(product);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Editar</span>
                    </button>
                    {onDeleteProduct && (
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Borrar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Stock Metrics Balance Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                En almacén
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {product.stock_actual}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Unidades físicas en almacén</div>
            </div>

            <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-center">
              <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
                Reservado
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">
                {product.stock_reservado}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">Comprometido</div>
            </div>

            <div
              className={`p-3.5 border rounded-xl text-center ${
                product.en_alerta
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider">
                Disponible ahora
              </div>

              {(product.es_reutilizable || product.unidades_pendientes_recibir > 0 || product.stock_fuera_almacen > 0) && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs text-slate-600">
                  {product.es_reutilizable && (
                    <span><strong className="text-indigo-800">{product.stock_en_obras}</strong> uds reutilizables en obras</span>
                  )}
                  {product.stock_fuera_almacen > 0 && (
                    <span><strong className="text-slate-800">{product.stock_fuera_almacen}</strong> uds fuera del almacén</span>
                  )}
                  {product.unidades_pendientes_recibir > 0 && (
                    <span><strong className="text-blue-800">{product.unidades_pendientes_recibir}</strong> uds pendientes de recibir</span>
                  )}
                </div>
              )}
              <div className="text-2xl font-bold mt-1 font-mono">
                {product.stock_disponible}
              </div>
              <div className="text-[10px] font-medium mt-0.5">
                Mínimo: {product.stock_minimo}
              </div>
            </div>
          </div>

          {/* Alert Status Banner */}
          {product.en_alerta ? (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-rose-800">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Nivel de Stock Crítico / Bajo</div>
                  <div className="text-[11px] text-rose-700">
                    El stock libre ({product.stock_disponible}) está en o por debajo del umbral mínimo configurado ({product.stock_minimo}).
                  </div>
                </div>
              </div>
              <button
                onClick={() => onOpenNewMovement('entrada', product.id)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs"
              >
                Reponer Ahora
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Stock en niveles óptimos de seguridad.</span>
            </div>
          )}

          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Reservas por proyecto</h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Consulta las unidades asignadas a cada proyecto y gestiona sus reservas.
                </p>
              </div>
              <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                Total: {product.stock_reservado} uds
              </span>
            </div>
            <form onSubmit={handleCreateReservation} className="mb-3 grid grid-cols-1 gap-2 rounded-xl border border-amber-200 bg-white p-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
              <label className="text-[11px] font-semibold text-slate-700">
                Unidades reservadas
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  max={product.stock_disponible}
                  value={newReservationQuantity}
                  onChange={(event) => setNewReservationQuantity(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs"
                  disabled={creatingReservation || product.stock_disponible <= 0}
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-700">
                Proyecto
                <select
                  required
                  value={newReservationProject}
                  onChange={(event) => setNewReservationProject(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                  disabled={creatingReservation}
                >
                  <option value="">-- Seleccionar proyecto --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.nombre}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={creatingReservation || product.stock_disponible <= 0}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-amber-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Bookmark className="h-3.5 w-3.5" />
                {creatingReservation ? 'Reservando...' : 'Reservar'}
              </button>
            </form>
            {newReservationError && <p role="alert" className="mb-3 text-xs text-rose-700">{newReservationError}</p>}
            {product.stock_disponible <= 0 && (
              <p className="mb-3 text-[11px] text-slate-500">No hay unidades disponibles para reservar.</p>
            )}
            {reservationGroups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-amber-200 bg-white/70 px-3 py-4 text-center text-xs text-slate-500">
                No hay unidades reservadas para proyectos.
              </p>
            ) : (
              <div className="space-y-2">
                {reservationGroups.map((group) => (
                  <div key={group.projectId} className="rounded-xl border border-amber-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-slate-800">
                        <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                        <span className="truncate">{group.projectName}</span>
                      </span>
                      <span className="font-mono text-sm font-extrabold text-amber-900">{group.total} uds</span>
                    </div>
                    {group.movements.map((reservation) => {
                      const canManage = isAdmin || reservation.usuario_id === currentUser.id;
                      const isEditing = editingReservationId === reservation.id;
                      return (
                        <div key={reservation.id} className="mt-2 border-t border-slate-100 pt-2">
                          {isEditing ? (
                            <form onSubmit={handleSaveReservation} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
                              <label className="text-[11px] font-semibold text-slate-700">
                                Unidades reservadas
                                <input
                                  type="number"
                                  min="0.1"
                                  step="any"
                                  required
                                  value={reservationEditQuantity}
                                  onChange={(event) => setReservationEditQuantity(event.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 font-mono text-xs"
                                  disabled={savingReservation}
                                />
                              </label>
                              <label className="text-[11px] font-semibold text-slate-700">
                                Proyecto
                                <select
                                  required
                                  value={reservationEditProject}
                                  onChange={(event) => setReservationEditProject(event.target.value)}
                                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
                                  disabled={savingReservation}
                                >
                                  <option value="">-- Seleccionar proyecto --</option>
                                  {projects.map((project) => (
                                    <option key={project.id} value={project.id}>{project.nombre}</option>
                                  ))}
                                </select>
                              </label>
                              <div className="flex gap-1.5">
                                <button type="submit" disabled={savingReservation} className="rounded-lg bg-blue-600 px-2.5 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                                  {savingReservation ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  type="button"
                                  disabled={savingReservation}
                                  onClick={() => {
                                    setEditingReservationId(null);
                                    setReservationEditError(null);
                                  }}
                                  className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                >
                                  Cancelar
                                </button>
                              </div>
                              {reservationEditError && <p role="alert" className="text-xs text-rose-700 sm:col-span-3">{reservationEditError}</p>}
                            </form>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-500">
                                {reservation.cantidad} uds · {reservation.usuario_nombre || 'Responsable sin nombre'}
                              </span>
                              {canManage && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingReservationId(reservation.id);
                                      setReservationEditQuantity(String(reservation.cantidad));
                                      setReservationEditProject(reservation.proyecto_id || '');
                                      setReservationEditError(null);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReservationDeleteError(null);
                                      setReservationToDelete(reservation);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Borrar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Details & Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {product.descripcion && (
              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                <span className="font-semibold block text-slate-900 mb-1">Descripción:</span>
                <p className="text-slate-600 leading-relaxed">{product.descripcion}</p>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-500 block text-[10px]">Proveedor Habitual</span>
                    {!isEditingProvider ? (
                      <span className="font-semibold text-slate-800 block truncate">
                        {product.proveedor_nombre || 'Sin proveedor asignado'}
                      </span>
                    ) : (
                      <div className="mt-1.5 space-y-1.5">
                        <select
                          value={selectedProviderId}
                          onChange={(e) => setSelectedProviderId(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#EA1D24]"
                        >
                          <option value="">-- Sin proveedor --</option>
                          {providers.map((pr) => (
                            <option key={pr.id} value={pr.id}>
                              {pr.nombre}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={savingProvider}
                            onClick={handleSaveProvider}
                            className="px-2.5 py-1 bg-[#EA1D24] text-white rounded-lg text-xs font-bold hover:bg-[#d61920] transition-colors disabled:opacity-50"
                          >
                            {savingProvider ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingProvider(false);
                              setSelectedProviderId(product.proveedor_id || '');
                            }}
                            className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-300 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                        {providerError && (
                          <span className="text-[10px] text-rose-600 block">{providerError}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {!isEditingProvider && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProviderId(product.proveedor_id || '');
                      setIsEditingProvider(true);
                    }}
                    className="text-[11px] text-[#EA1D24] hover:text-[#c4141a] font-semibold flex items-center gap-1 px-2 py-0.5 rounded hover:bg-red-50 transition-colors shrink-0"
                    title="Editar proveedor del producto"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
              <FolderGit2 className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-medium text-slate-500 block text-[10px]">Proyecto Específico</span>
                <span className="font-semibold text-slate-800">
                  {product.proyecto_nombre || 'Material de uso general'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mr-2">
              Registrar Acción:
            </span>
            <button
              onClick={() => onOpenNewMovement('entrada', product.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <ArrowDownLeft className="w-4 h-4" /> Entrada
            </button>
            <button
              onClick={() => onOpenNewMovement('salida', product.id)}
              disabled={product.stock_disponible <= 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" /> Salida
            </button>
            <button
              onClick={() => onOpenNewMovement('reserva', product.id)}
              disabled={product.stock_disponible <= 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-semibold transition-colors"
            >
              <Bookmark className="w-4 h-4" /> Reservar
            </button>
            {onOpenRequest && (
              <button
                id="modal-btn-solicitar-preparacion"
                onClick={() => onOpenRequest(product.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-colors border border-neutral-800 ml-auto"
              >
                <Truck className="w-4 h-4 text-red-400" /> Solicitar Preparación
              </button>
            )}
          </div>

          {/* Movements History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="font-bold text-slate-900 text-sm">Historial de Movimientos de este Producto</h3>
              </div>
              <span className="text-xs text-slate-500">
                {movements.length} registro(s)
              </span>
            </div>

            {loadingMoves ? (
              <div className="py-6 text-center text-xs text-slate-500">Cargando histórico...</div>
            ) : movements.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No hay movimientos registrados para este producto todavía.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-56 rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 sticky top-0 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3 text-right">Cant.</th>
                      <th className="py-2.5 px-3">Proyecto</th>
                      <th className="py-2.5 px-3">Responsable</th>
                      <th className="py-2.5 px-3">Observaciones</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500">
                          {new Date(m.fecha).toLocaleDateString()} {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 px-3">
                          {m.tipo === 'entrada' && (
                            <span className="text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-sm">
                              Entrada
                            </span>
                          )}
                          {m.tipo === 'salida' && (
                            <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded-sm">
                              Salida
                            </span>
                          )}
                          {m.tipo === 'reserva' && (
                            <span className="text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded-sm">
                              Reserva
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {m.tipo === 'entrada' ? `+${m.cantidad}` : m.tipo === 'salida' ? `-${m.cantidad}` : m.cantidad}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {m.proyecto_nombre || '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{m.usuario_nombre}</td>
                        <td className="py-2 px-3 text-slate-500 italic truncate max-w-[150px]">
                          {m.observaciones || '-'}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div>
            {onOrderProduct && (
              <button
                onClick={() => {
                  onClose();
                  onOrderProduct(product);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Pedir a Distribuidor</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in">
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">¿Eliminar producto?</h3>
                <p className="text-[11px] text-slate-500">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente el producto{' '}
              <strong className="text-slate-900">{product.nombre}</strong> (código:{' '}
              <span className="font-mono font-bold text-slate-800">{product.codigo}</span>)?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  if (onDeleteProduct) {
                    onDeleteProduct(product);
                  }
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      {reservationToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in">
            <div className="flex items-center gap-3 mb-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">¿Eliminar esta reserva?</h3>
                <p className="text-[11px] text-slate-500">Las unidades volverán a estar disponibles.</p>
              </div>
            </div>
            <div className="p-3 mb-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div><strong>Producto:</strong> {product.nombre}</div>
              <div><strong>Cantidad:</strong> {reservationToDelete.cantidad}</div>
              <div><strong>Proyecto:</strong> {reservationToDelete.proyecto_nombre || 'Sin proyecto'}</div>
            </div>
            {reservationDeleteError && (
              <p role="alert" className="mb-3 text-xs text-rose-700">{reservationDeleteError}</p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deletingReservation}
                onClick={() => setReservationToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingReservation}
                onClick={handleDeleteReservation}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {deletingReservation ? 'Eliminando...' : 'Sí, eliminar reserva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
