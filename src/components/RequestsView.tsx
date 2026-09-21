import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  Sparkles,
  AlertTriangle,
  Building2,
  User as UserIcon,
  PackageCheck,
  Calendar,
  XCircle,
  ArrowRight,
  PlusCircle,
  Check,
  ShoppingBag,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  Trash2,
  X,
  History,
  Edit3
} from 'lucide-react';
import {
  MaterialRequest,
  RequestStatus,
  RequestType,
  RequestPriority,
  User,
  Project,
  Product
} from '../types';
import { api } from '../lib/api';

interface RequestsViewProps {
  requests: MaterialRequest[];
  currentUser: User;
  projects: Project[];
  products: Product[];
  onRefresh: () => void;
  onNewRequest: () => void;
  onNewProductFromRequest?: (initialData: Partial<Product>) => void;
  onEditRequest?: (request: MaterialRequest) => void;
  onOpenHistory?: (request: MaterialRequest) => void;
  onCreateOrderFromRequest?: (request: MaterialRequest) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RequestsView: React.FC<RequestsViewProps> = ({
  requests,
  currentUser,
  projects,
  products,
  onRefresh,
  onNewRequest,
  onNewProductFromRequest,
  onEditRequest,
  onOpenHistory,
  onCreateOrderFromRequest,
  onShowToast
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Status Action Modal state
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<MaterialRequest | null>(null);
  const [targetStatus, setTargetStatus] = useState<RequestStatus>('en_preparacion');
  const [actionNotes, setActionNotes] = useState('');
  const [registerMovement, setRegisterMovement] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Request state
  const [requestToDelete, setRequestToDelete] = useState<MaterialRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteRequest = async () => {
    if (!requestToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteRequest(requestToDelete.id);
      onShowToast(res.message || 'Solicitud eliminada correctamente', 'success');
      setRequestToDelete(null);
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'Error al eliminar la solicitud', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAdmin = currentUser.rol === 'admin';

  // Quick stats
  const metrics = useMemo(() => {
    const pendientes = requests.filter((r) => r.estado === 'pendiente').length;
    const enPreparacion = requests.filter((r) => r.estado === 'en_preparacion').length;
    const preparadas = requests.filter((r) => r.estado === 'preparado').length;
    const pedidos = requests.filter((r) => r.estado === 'pedido_realizado').length;
    const entregadas = requests.filter((r) => r.estado === 'entregado').length;
    const urgentes = requests.filter((r) => r.prioridad === 'urgente' && r.estado !== 'entregado' && r.estado !== 'rechazado').length;

    return {
      total: requests.length,
      pendientes,
      enPreparacion,
      preparadas,
      pedidos,
      entregadas,
      urgentes
    };
  }, [requests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'activas') {
          if (r.estado === 'entregado' || r.estado === 'rechazado') return false;
        } else if (r.estado !== statusFilter) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && r.tipo_solicitud !== typeFilter) return false;

      // Priority filter
      if (priorityFilter !== 'all' && r.prioridad !== priorityFilter) return false;

      // Project filter
      if (projectFilter !== 'all' && r.proyecto_id !== projectFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.material_nombre.toLowerCase().includes(q);
        const matchDesc = (r.material_descripcion || '').toLowerCase().includes(q);
        const matchNotes = (r.notas || '').toLowerCase().includes(q);
        const matchUser = (r.usuario_nombre || '').toLowerCase().includes(q);
        const matchProject = (r.proyecto_nombre || '').toLowerCase().includes(q);
        const matchCode = (r.producto_codigo || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchNotes && !matchUser && !matchProject && !matchCode) {
          return false;
        }
      }

      return true;
    });
  }, [requests, statusFilter, typeFilter, priorityFilter, projectFilter, searchQuery]);

  // Open action modal
  const openActionModal = (request: MaterialRequest, nextStatus: RequestStatus) => {
    setSelectedRequestForAction(request);
    setTargetStatus(nextStatus);
    setActionNotes(request.resolucion_notas || '');
    setRegisterMovement(Boolean(request.producto_id));
  };

  // Submit action modal
  const handleExecuteStatusChange = async () => {
    if (!selectedRequestForAction) return;

    setActionLoading(true);
    try {
      const res = await api.updateRequestStatus(selectedRequestForAction.id, {
        estado: targetStatus,
        resolucion_notas: actionNotes,
        registrar_movimiento: registerMovement && Boolean(selectedRequestForAction.producto_id),
        tipo_movimiento: 'salida'
      });

      let msg = `Solicitud actualizada a "${getStatusLabel(targetStatus)}"`;
      if (res.movimientoCreado) {
        msg += ` y se descontó la salida de stock automáticamente.`;
      }
      onShowToast(msg, 'success');
      setSelectedRequestForAction(null);
      onRefresh();
    } catch (err: any) {
      console.error('Error al actualizar solicitud:', err);
      onShowToast(err.message || 'Error al cambiar estado de la solicitud', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Direct cancel for operator
  const handleCancelRequest = async (id: string) => {
    const confirmCancel = window.confirm('¿Seguro que deseas cancelar esta solicitud?');
    if (!confirmCancel) return;

    try {
      await api.updateRequestStatus(id, {
        estado: 'rechazado',
        resolucion_notas: 'Cancelada por el operario'
      });
      onShowToast('Solicitud cancelada', 'info');
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'Error al cancelar solicitud', 'error');
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" /> Pendiente
          </span>
        );
      case 'en_preparacion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Truck className="w-3.5 h-3.5" /> En Preparación
          </span>
        );
      case 'preparado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Listo para Cargar
          </span>
        );
      case 'pedido_realizado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <ShoppingBag className="w-3.5 h-3.5" /> Pedido a Proveedor
          </span>
        );
      case 'entregado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
            <Check className="w-3.5 h-3.5" /> Entregado / Cargado
          </span>
        );
      case 'rechazado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Rechazada
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusLabel = (status: RequestStatus) => {
    switch (status) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_preparacion':
        return 'En Preparación';
      case 'preparado':
        return 'Listo para Cargar';
      case 'pedido_realizado':
        return 'Pedido a Proveedor';
      case 'entregado':
        return 'Entregado a Obra';
      case 'rechazado':
        return 'Rechazada / Cancelada';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Call to Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-[#EA1D24]/10 text-[#EA1D24] border border-[#EA1D24]/20">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Solicitudes de Material & Cargas
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl">
            Peticiones directas entre operarios y almacén: pide preparar cargas de productos en stock
            o solicita nuevos materiales no catalogados para que administración tramite los pedidos.
          </p>
        </div>

        <button
          id="btn-nueva-solicitud"
          onClick={onNewRequest}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-red-600/25 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Solicitud</span>
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'all'
              ? 'bg-neutral-800 border-neutral-600 ring-1 ring-neutral-500'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-neutral-400">Total</div>
          <div className="text-2xl font-black text-white mt-0.5">{metrics.total}</div>
        </button>

        <button
          onClick={() => setStatusFilter('pendiente')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'pendiente'
              ? 'bg-amber-950/40 border-amber-600 ring-1 ring-amber-500'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-400 flex items-center justify-between">
            <span>Pendientes</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-0.5">{metrics.pendientes}</div>
        </button>

        <button
          onClick={() => setStatusFilter('en_preparacion')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'en_preparacion'
              ? 'bg-blue-950/40 border-blue-600 ring-1 ring-blue-500'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-400 flex items-center justify-between">
            <span>En Preparación</span>
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-blue-400 mt-0.5">{metrics.enPreparacion}</div>
        </button>

        <button
          onClick={() => setStatusFilter('preparado')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'preparado'
              ? 'bg-emerald-950/40 border-emerald-600 ring-1 ring-emerald-500'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-400 flex items-center justify-between">
            <span>Listas para Cargar</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">{metrics.preparadas}</div>
        </button>

        <button
          onClick={() => setStatusFilter('pedido_realizado')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'pedido_realizado'
              ? 'bg-purple-950/40 border-purple-600 ring-1 ring-purple-500'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-purple-400 flex items-center justify-between">
            <span>Pedidos Tramitados</span>
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-0.5">{metrics.pedidos}</div>
        </button>

        <button
          onClick={() => setStatusFilter('entregado')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'entregado'
              ? 'bg-neutral-800 border-neutral-600 ring-1 ring-neutral-500'
              : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-neutral-400 flex items-center justify-between">
            <span>Entregadas</span>
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-white mt-0.5">{metrics.entregadas}</div>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por material, descripción, notas, operario o código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24]"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-[#EA1D24]"
            >
              <option value="all">Todos los Tipos de Solicitud</option>
              <option value="preparar_carga">🚚 Preparar Carga de Almacén</option>
              <option value="pedido_material">✨ Material Nuevo / Compra</option>
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-[#EA1D24]"
            >
              <option value="all">Todas las Obras / Proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-neutral-800/80 text-xs">
          <span className="text-neutral-500 text-[11px] font-medium mr-1">Filtrar por estado:</span>
          {[
            { id: 'all', label: 'Todas' },
            { id: 'activas', label: 'Activas (No finalizadas)' },
            { id: 'pendiente', label: 'Pendientes' },
            { id: 'en_preparacion', label: 'En Preparación' },
            { id: 'preparado', label: 'Listas para Cargar' },
            { id: 'pedido_realizado', label: 'Pedidos a Proveedor' },
            { id: 'entregado', label: 'Entregadas' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[#EA1D24] text-white font-bold'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPriorityFilter(priorityFilter === 'urgente' ? 'all' : 'urgente')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                priorityFilter === 'urgente'
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span>Solo Urgentes ({metrics.urgentes})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-white">
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400 mb-3">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No se encontraron solicitudes</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
            No hay solicitudes que coincidan con los filtros seleccionados o todavía no se ha registrado
            ninguna petición.
          </p>
          <button
            onClick={onNewRequest}
            className="px-4 py-2 bg-[#EA1D24] hover:bg-[#d61920] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Solicitud</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isUrgent = req.prioridad === 'urgente';
            const isNewMaterial = req.es_material_nuevo;
            const isOwner = currentUser.id === req.usuario_id;
            const hasCatalogProduct = Boolean(req.producto_id);

            return (
              <div
                key={req.id}
                className={`bg-neutral-900 border rounded-2xl p-4 sm:p-5 transition-all text-white shadow-xs ${
                  isUrgent && req.estado !== 'entregado' && req.estado !== 'rechazado'
                    ? 'border-red-900/60 bg-red-950/10'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left info column */}
                  <div className="flex-1 space-y-2.5">
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(req.estado)}

                      {/* Type Badge */}
                      {req.tipo_solicitud === 'preparar_carga' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
                          <Truck className="w-3 h-3 text-red-400" /> Carga de Almacén
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-800/40">
                          <Sparkles className="w-3 h-3 text-indigo-400" /> Material Nuevo / Pedido
                        </span>
                      )}

                      {/* Urgency Badge */}
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-black bg-red-950 text-red-400 border border-red-800/60 animate-pulse">
                          <AlertTriangle className="w-3 h-3" /> URGENTE
                        </span>
                      )}

                      {/* Destination Project */}
                      {req.proyecto_nombre && (
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded-lg border border-neutral-800">
                          <Building2 className="w-3 h-3 text-neutral-500" />
                          <span className="font-semibold text-neutral-200">{req.proyecto_nombre}</span>
                        </span>
                      )}
                    </div>

                    {/* Material Title & Quantity */}
                    <div>
                      <div className="flex items-baseline gap-2.5">
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                          {req.material_nombre}
                        </h3>
                        <span className="text-sm sm:text-base font-black text-[#EA1D24] bg-[#EA1D24]/10 px-2 py-0.5 rounded-lg border border-[#EA1D24]/20">
                          {req.cantidad} {req.unidad}
                        </span>
                      </div>

                      {/* Catalog code or category */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                        {req.producto_codigo && (
                          <span className="font-mono bg-neutral-950 px-1.5 py-0.5 rounded-md border border-neutral-800 text-neutral-300">
                            Cód: {req.producto_codigo}
                          </span>
                        )}
                        {req.material_categoria && (
                          <span>Categoría: <strong className="text-neutral-300">{req.material_categoria}</strong></span>
                        )}
                        {req.proveedor_sugerido && (
                          <span>• Proveedor sugerido: <strong className="text-neutral-300">{req.proveedor_sugerido}</strong></span>
                        )}
                      </div>
                    </div>

                    {/* Detailed description if any */}
                    {req.material_descripcion && (
                      <p className="text-xs text-neutral-300 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800/80">
                        {req.material_descripcion}
                      </p>
                    )}

                    {/* Operator Notes */}
                    {req.notas && (
                      <div className="text-xs text-amber-200/90 bg-amber-950/20 border border-amber-800/30 p-2.5 rounded-xl flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-400">Indicaciones del operario:</strong> {req.notas}
                        </div>
                      </div>
                    )}

                    {/* Resolution Notes from Admin */}
                    {req.resolucion_notas && (
                      <div className="text-xs text-blue-200/90 bg-blue-950/20 border border-blue-800/30 p-2.5 rounded-xl flex items-start gap-2">
                        <PackageCheck className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-blue-400">Respuesta de almacén:</strong> {req.resolucion_notas}
                        </div>
                      </div>
                    )}

                    {/* Meta: Requester & Dates */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400 pt-1">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-neutral-500" />
                        Solicitado por: <strong className="text-neutral-200">{req.usuario_nombre || 'Operario'}</strong>
                      </span>
                      <span>
                        Fecha: {new Date(req.fecha_solicitud).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {req.fecha_necesidad && (
                        <span className="text-amber-400 font-semibold flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Necesario para:{' '}
                          {new Date(req.fecha_necesidad).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    </div>
                  </div>

                    {/* Right Actions Column */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-800">
                      {/* Secondary Buttons: Audit History & Edit */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {onOpenHistory && (
                          <button
                            type="button"
                            onClick={() => onOpenHistory(req)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-purple-300 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/50 rounded-lg border border-purple-800/50 transition-colors flex items-center gap-1"
                            title="Ver auditoría y trazabilidad de cambios sufridos por la petición"
                          >
                            <History className="w-3 h-3 text-purple-400" />
                            <span>Historial</span>
                          </button>
                        )}

                        {onEditRequest && (isAdmin || (isOwner && req.estado === 'pendiente')) && req.estado !== 'entregado' && (
                          <button
                            type="button"
                            onClick={() => onEditRequest(req)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-lg border border-neutral-700/60 transition-colors flex items-center gap-1"
                            title="Editar petición (se registrará motivo del cambio)"
                          >
                            <Edit3 className="w-3 h-3 text-blue-400" />
                            <span>Editar</span>
                          </button>
                        )}
                      </div>

                      {/* Admin Workflow Buttons */}
                      {isAdmin && (
                        <div className="flex flex-wrap lg:flex-col items-stretch gap-2 w-full lg:w-auto">
                          {/* Direct Order to Distributor Button */}
                          {onCreateOrderFromRequest && req.tipo_solicitud === 'pedido_material' && req.estado !== 'entregado' && req.estado !== 'rechazado' && (
                            <button
                              onClick={() => onCreateOrderFromRequest(req)}
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                              title="Tramitar orden de compra formal a distribuidor"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>Tramitar Pedido a Distribuidor</span>
                            </button>
                          )}

                          {/* Pending -> In preparation */}
                          {req.estado === 'pendiente' && req.tipo_solicitud === 'preparar_carga' && (
                            <button
                              onClick={() => openActionModal(req, 'en_preparacion')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Preparar Carga</span>
                            </button>
                          )}

                        {/* Pending -> Order to supplier */}
                        {req.estado === 'pendiente' && req.tipo_solicitud === 'pedido_material' && (
                          <button
                            onClick={() => openActionModal(req, 'pedido_realizado')}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Hacer Pedido Proveedor</span>
                          </button>
                        )}

                        {/* In Preparation -> Ready to load */}
                        {req.estado === 'en_preparacion' && (
                          <button
                            onClick={() => openActionModal(req, 'preparado')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Marcar Listo para Cargar</span>
                          </button>
                        )}

                        {/* Order done -> Material arrived or prepared */}
                        {req.estado === 'pedido_realizado' && (
                          <button
                            onClick={() => openActionModal(req, 'preparado')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Material Recibido / Preparado</span>
                          </button>
                        )}

                        {/* Ready to load -> Delivered */}
                        {req.estado === 'preparado' && (
                          <button
                            onClick={() => openActionModal(req, 'entregado')}
                            className="px-3 py-1.5 bg-[#EA1D24] hover:bg-[#d61920] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Carga Entregada</span>
                          </button>
                        )}

                        {/* Create Product in Catalog (for uncatalogued materials) */}
                        {isNewMaterial && onNewProductFromRequest && (
                          <button
                            onClick={() =>
                              onNewProductFromRequest({
                                nombre: req.material_nombre,
                                descripcion: req.material_descripcion || '',
                                categoria: req.material_categoria || 'Materiales',
                                stock_minimo: 5,
                                proyecto_id: req.proyecto_id || undefined
                              })
                            }
                            title="Dar de alta este material en el catálogo de inventario"
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Añadir a Catálogo</span>
                          </button>
                        )}

                        {/* Reject / Cancel for Admin */}
                        {req.estado !== 'entregado' && req.estado !== 'rechazado' && (
                          <button
                            onClick={() => openActionModal(req, 'rechazado')}
                            className="px-3 py-1 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg text-xs font-medium transition-colors"
                          >
                            Rechazar
                          </button>
                        )}

                        {/* Permanent Delete for Admin or Owner */}
                        <button
                          onClick={() => setRequestToDelete(req)}
                          title="Eliminar solicitud permanentemente"
                          className="px-3 py-1 text-neutral-400 hover:text-rose-500 hover:bg-neutral-800 rounded-lg text-xs font-medium transition-colors inline-flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    )}

                    {/* Operator quick cancel if still pending */}
                    {!isAdmin && isOwner && (
                      <div className="flex items-center gap-1.5">
                        {req.estado === 'pendiente' && (
                          <button
                            onClick={() => handleCancelRequest(req.id)}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-300 rounded-xl text-xs font-semibold transition-colors border border-neutral-700"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          onClick={() => setRequestToDelete(req)}
                          title="Eliminar solicitud"
                          className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-neutral-800 rounded-lg text-xs transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action / Resolution Modal */}
      {selectedRequestForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Actualizar Solicitud #{selectedRequestForAction.id}
                </h3>
                <p className="text-xs text-neutral-400">
                  {selectedRequestForAction.material_nombre} ({selectedRequestForAction.cantidad}{' '}
                  {selectedRequestForAction.unidad})
                </p>
              </div>
              <button
                onClick={() => setSelectedRequestForAction(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Nuevo Estado
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as RequestStatus)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-semibold text-white focus:outline-hidden focus:border-[#EA1D24]"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_preparacion">En Preparación (Almacén preparando carga)</option>
                  <option value="preparado">Listo para Cargar (Palé o lote preparado en muelle)</option>
                  <option value="pedido_realizado">Pedido Realizado a Proveedor</option>
                  <option value="entregado">Entregado / Retirado a Obra</option>
                  <option value="rechazado">Rechazado / Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Notas de Almacén / Resolución para el Operario
                </label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Ej: Preparado en palé #3 junto al portón. / Tramitado pedido a BricoPro con albarán #9812..."
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24] resize-none"
                />
              </div>

              {/* Automatic Stock Deduction Switch for Catalog Products */}
              {selectedRequestForAction.producto_id &&
                (targetStatus === 'preparado' || targetStatus === 'entregado') && (
                  <div className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={registerMovement}
                        onChange={(e) => setRegisterMovement(e.target.checked)}
                        className="mt-0.5 rounded-sm border-neutral-700 text-[#EA1D24] focus:ring-[#EA1D24]"
                      />
                      <div className="text-xs">
                        <span className="font-bold text-white block">
                          Registrar Salida de Almacén Automática
                        </span>
                        <span className="text-neutral-400 block text-[11px] mt-0.5">
                          Descontará automáticamente {selectedRequestForAction.cantidad} {selectedRequestForAction.unidad} de stock y creará el movimiento asignado a{' '}
                          {selectedRequestForAction.proyecto_nombre || 'la obra'}.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedRequestForAction(null)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-action"
                  onClick={handleExecuteStatusChange}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Guardando...' : 'Confirmar Cambio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Confirmar Eliminación de Solicitud */}
      {requestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">
              ¿Eliminar solicitud?
            </h3>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente la solicitud de{' '}
              <strong className="text-white">
                {requestToDelete.material_nombre} ({requestToDelete.cantidad} {requestToDelete.unidad})
              </strong>
              ? Esta acción no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestToDelete(null)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteRequest}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Eliminar Solicitud'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
