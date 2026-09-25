import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FolderGit2,
  Edit2,
  Trash2,
  PackageCheck,
  Phone,
  Mail,
  History,
  ArrowRight,
  User as UserIcon,
  AlertTriangle,
  Package,
  Boxes,
  Bookmark,
  Ban,
  AlertCircle,
  Truck
} from 'lucide-react';
import { Order, OrderStatus, Provider, Project, User, Product, MaterialRequest } from '../types';
import { api } from '../lib/api';

interface OrdersViewProps {
  orders: Order[];
  currentUser: User;
  providers: Provider[];
  projects: Project[];
  products: Product[];
  requests: MaterialRequest[];
  onRefresh: () => void;
  onNewOrder: () => void;
  onEditOrder: (order: Order) => void;
  onReceiveOrder: (order: Order) => void;
  onOpenRequestHistory: (requestId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToProducts?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  currentUser,
  providers,
  projects,
  products,
  requests,
  onRefresh,
  onNewOrder,
  onEditOrder,
  onReceiveOrder,
  onOpenRequestHistory,
  onShowToast,
  onNavigateToProducts,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser.rol === 'admin';

  // Normalize legacy and new statuses for consistent filtering
  const normalizeStatus = (estado: string): OrderStatus => {
    if (estado === 'por_tramitar') {
      return 'por_tramitar';
    }
    if (estado === 'pendiente' || estado === 'en_camino' || estado === 'pendiente_recibir') {
      return 'pendiente_recibir';
    }
    if (estado === 'recibido_tienda_obra') {
      return 'recibido_tienda_obra';
    }
    if (estado === 'recibido' || estado === 'disponible') {
      return 'recibido';
    }
    if (estado === 'cancelado' || estado === 'descatalogado') {
      return 'cancelado';
    }
    return 'por_tramitar';
  };

  // Metrics by requested statuses
  const metrics = useMemo(() => {
    const total = orders.length;
    let porTramitar = 0;
    let pendienteRecibir = 0;
    let recibido = 0;
    let recibidoTiendaObra = 0;
    let cancelado = 0;

    orders.forEach((o) => {
      const norm = normalizeStatus(o.estado);
      if (norm === 'por_tramitar') porTramitar++;
      else if (norm === 'pendiente_recibir') pendienteRecibir++;
      else if (norm === 'recibido') recibido++;
      else if (norm === 'recibido_tienda_obra') recibidoTiendaObra++;
      else if (norm === 'cancelado') cancelado++;
    });

    return {
      total,
      porTramitar,
      pendienteRecibir,
      recibido,
      recibidoTiendaObra,
      cancelado,
      disponible: recibido,
      sinExistencias: 0,
      reservado: 0,
      descatalogado: cancelado
    };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const norm = normalizeStatus(o.estado);
      if (statusFilter !== 'all') {
        if (statusFilter === 'pendiente_recibir' && norm !== 'pendiente_recibir') return false;
        if (statusFilter === 'por_tramitar' && norm !== 'por_tramitar') return false;
        if (statusFilter === 'recibido' && norm !== 'recibido') return false;
        if (statusFilter === 'recibido_tienda_obra' && norm !== 'recibido_tienda_obra') return false;
        if (statusFilter === 'cancelado' && norm !== 'cancelado') return false;
        if (statusFilter !== norm && o.estado !== statusFilter) return false;
      }

      if (providerFilter !== 'all' && o.proveedor_id !== providerFilter) return false;
      if (projectFilter !== 'all' && o.proyecto_id !== projectFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNumber = o.numero_pedido.toLowerCase().includes(query);
        const matchesMaterial = (o.nombre_material || o.producto_nombre || '').toLowerCase().includes(query);
        const matchesRef = o.referencia?.toLowerCase().includes(query);
        const matchesProvider = o.proveedor_nombre?.toLowerCase().includes(query);
        const matchesProject = o.proyecto_nombre?.toLowerCase().includes(query);
        const matchesAlbaran = o.albaran?.toLowerCase().includes(query);
        return matchesNumber || matchesMaterial || matchesRef || matchesProvider || matchesProject || matchesAlbaran;
      }

      return true;
    });
  }, [orders, statusFilter, providerFilter, projectFilter, searchQuery]);

  // Split into Pending Orders and Completed / Other History
  const { pendingOrders, historyOrders } = useMemo(() => {
    const pending: Order[] = [];
    const history: Order[] = [];

    filteredOrders.forEach((o) => {
      const norm = normalizeStatus(o.estado);
      if (norm === 'pendiente_recibir') {
        pending.push(o);
      } else {
        history.push(o);
      }
    });

    return { pendingOrders: pending, historyOrders: history };
  }, [filteredOrders]);

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteOrder(orderToDelete.id);
      onShowToast(`Pedido ${orderToDelete.numero_pedido} eliminado correctamente`, 'success');
      setOrderToDelete(null);
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'Error al eliminar el pedido', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await api.updateOrder(orderId, { estado: newStatus });
      onShowToast('Estado del pedido actualizado', 'success');
      onRefresh();
    } catch (err: any) {
      onShowToast(err.message || 'Error al actualizar el estado', 'error');
    }
  };

  const getStatusBadge = (estado: string) => {
    const norm = normalizeStatus(estado);
    switch (norm) {
      case 'por_tramitar':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100/90 border border-blue-300 px-2.5 py-0.5 rounded-full">
            <Clock className="w-3.5 h-3.5 text-blue-700" />
            <span>Por tramitar</span>
          </span>
        );
      case 'disponible':
      case 'recibido':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2.5 py-0.5 rounded-full shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>Recibido</span>
          </span>
        );
      case 'recibido_tienda_obra':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-100/90 border border-indigo-300 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-700" />
            <span>Recibido en tienda/obra</span>
          </span>
        );
      case 'descatalogado':
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-full">
            <Ban className="w-3.5 h-3.5 text-slate-500" />
            <span>Cancelado</span>
          </span>
        );
      case 'sin_existencias':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100/90 border border-rose-300 px-2.5 py-0.5 rounded-full">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Sin existencias</span>
          </span>
        );
      case 'pendiente_recibir':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-900 bg-amber-200/90 border border-amber-400 px-3 py-1 rounded-full animate-pulse shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-800" />
            <span>Pendiente de recibir</span>
          </span>
        );
      case 'reservado':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-100/90 border border-purple-300 px-2.5 py-0.5 rounded-full">
            <Bookmark className="w-3.5 h-3.5 text-purple-700" />
            <span>Reservado</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Action */}
      <div className="bento-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Pedidos a Distribuidores y Compras
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-[#EA1D24] border border-red-200">
              {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Historial de pedidos realizados a distribuidores y seguimiento prioritario de pedidos pendientes de recepción.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onNavigateToProducts && (
            <button
              onClick={onNavigateToProducts}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs border border-neutral-800"
            >
              <Boxes className="w-4 h-4 text-[#EA1D24]" />
              <span>Pedir producto existente</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onNewOrder}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-red-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Pedir producto nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Info notice about ordering from products */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold">Realización de Pedidos:</span> Los pedidos se tramitan directamente desde el apartado de{' '}
            <button
              onClick={onNavigateToProducts}
              className="underline font-bold hover:text-amber-950"
            >
              Productos
            </button>
            . Selecciona cualquier artículo de tu inventario para emitir una reposición con su código y referencia asignados.
          </div>
        </div>
        {onNavigateToProducts && (
          <button
            onClick={onNavigateToProducts}
            className="self-start sm:self-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-colors shrink-0 flex items-center gap-1.5"
          >
            <span>Ir a Catálogo de Productos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Metrics Cards with the 5 exact requested states */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`bento-card p-3.5 text-left transition-all ${
            statusFilter === 'all' ? 'ring-2 ring-[#EA1D24] bg-red-50/10' : ''
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total</div>
          <div className="text-xl font-black text-slate-900 mt-1 font-mono">{metrics.total}</div>
        </button>

        {/* A la espera de recibirlo (highlighted) */}
        <button
          onClick={() => setStatusFilter('pendiente_recibir')}
          className={`bento-card p-3.5 text-left transition-all border-amber-300 bg-amber-50/60 ${
            statusFilter === 'pendiente_recibir' ? 'ring-2 ring-amber-500 bg-amber-100/60' : ''
          }`}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center justify-between">
            <span>A la espera</span>
            <Clock className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="text-xl font-black text-amber-950 mt-1 font-mono">{metrics.pendienteRecibir}</div>
        </button>

        {/* Recibido */}
        <button
          onClick={() => setStatusFilter('recibido')}
          className={`bento-card p-3.5 text-left transition-all border-emerald-200 bg-emerald-50/30 ${
            statusFilter === 'recibido' ? 'ring-2 ring-emerald-500' : ''
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Recibido</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-800 mt-1 font-mono">{metrics.recibido}</div>
        </button>

        {/* Recibido en tienda/obra */}
        <button
          onClick={() => setStatusFilter('recibido_tienda_obra')}
          className={`bento-card p-3.5 text-left transition-all border-indigo-200 bg-indigo-50/30 ${
            statusFilter === 'recibido_tienda_obra' ? 'ring-2 ring-indigo-500' : ''
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center justify-between">
            <span>Tienda / obra</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-800 mt-1 font-mono">{metrics.recibidoTiendaObra}</div>
        </button>

        {/* Cancelado */}
        <button
          onClick={() => setStatusFilter('cancelado')}
          className={`bento-card p-3.5 text-left transition-all border-rose-200 bg-rose-50/30 ${
            statusFilter === 'cancelado' ? 'ring-2 ring-rose-500' : ''
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center justify-between">
            <span>Cancelado</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-800 mt-1 font-mono">{metrics.cancelado}</div>
        </button>

        {/* Por tramitar */}
        <button
          onClick={() => setStatusFilter('por_tramitar')}
          className={`bento-card p-3.5 text-left transition-all border-purple-200 bg-purple-50/30 ${
            statusFilter === 'por_tramitar' ? 'ring-2 ring-purple-500' : ''
          }`}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center justify-between">
            <span>Por tramitar</span>
            <Bookmark className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-800 mt-1 font-mono">{metrics.porTramitar}</div>
        </button>

      </div>

      {/* Filters Bar */}
      <div className="bento-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nº pedido, material, referencia, distribuidor o albarán..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#EA1D24] font-semibold"
          >
            <option value="all">Todos los estados</option>
            <option value="por_tramitar">🔵 Por tramitar</option>
            <option value="pendiente_recibir">🟡 A la espera de recibirlo</option>
            <option value="recibido_tienda_obra">🔵 Recibido en tienda/obra</option>
            <option value="recibido">🟢 Recibido</option>
            <option value="cancelado">⚪ Cancelado</option>
          </select>

          {/* Provider filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#EA1D24]"
          >
            <option value="all">Todos los distribuidores</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>

          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#EA1D24]"
          >
            <option value="all">Todas las obras / almacén</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: PEDIDOS PENDIENTES DE RECIBIR (HIGH PROMINENCE) */}
      {(statusFilter === 'all' || statusFilter === 'pendiente_recibir') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Pedidos Pendientes de Recibir</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono font-bold">
                  {pendingOrders.length}
                </span>
              </h2>
            </div>
            {pendingOrders.length > 0 && (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                Atención prioritaria de recepción
              </span>
            )}
          </div>

          {pendingOrders.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
              No hay pedidos pendientes de recibir actualmente. Todo el material solicitado se encuentra disponible o recepcionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingOrders.map((order) => {
                const matchedRequest = requests.find((r) => r.id === order.solicitud_id);
                return (
                  <div
                    key={order.id}
                    className="bento-card p-5 flex flex-col justify-between group transition-all relative border-2 border-amber-400/90 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 shadow-md hover:shadow-lg ring-1 ring-amber-300"
                  >
                    {/* Top alert ribbon */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-amber-300 shadow-2xs">
                          {order.numero_pedido}
                        </span>
                        {getStatusBadge(order.estado)}
                      </div>

                      <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 bg-amber-100/80 px-2 py-0.5 rounded-lg">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" />
                        <span>Pedido: {new Date(order.fecha_pedido).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>

                    <div>
                      {/* Material Name, Code & Reference */}
                      <div className="mb-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#EA1D24] transition-colors leading-snug">
                            {order.producto_nombre || order.nombre_material}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {order.producto_codigo && (
                            <span className="font-mono text-xs font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-300">
                              Cód: {order.producto_codigo}
                            </span>
                          )}
                          {order.referencia && (
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Ref: {order.referencia}
                            </span>
                          )}
                          <span className="text-xs font-black text-amber-950 bg-amber-200/90 px-2.5 py-0.5 rounded-md font-mono border border-amber-300">
                            Cantidad: {order.cantidad} {order.unidad || 'uds'}
                          </span>
                        </div>
                      </div>

                      {/* Distributor Info */}
                      <div className="p-3 bg-white/90 rounded-xl border border-amber-200/80 space-y-2 mb-3 text-xs shadow-2xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 overflow-hidden">
                              {order.proveedor_logo_url ? (
                                <img
                                  src={order.proveedor_logo_url}
                                  alt={order.proveedor_nombre || ''}
                                  className="w-full h-full object-contain p-0.5"
                                />
                              ) : (
                                order.proveedor_nombre?.charAt(0).toUpperCase() || 'P'
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">
                                {order.proveedor_nombre || 'Distribuidor no especificado'}
                              </div>
                              {order.proveedor_contacto && (
                                <div className="text-[11px] text-slate-500">
                                  Contacto: {order.proveedor_contacto}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick contact buttons */}
                          <div className="flex items-center gap-1">
                            {order.proveedor_telefono && (
                              <a
                                href={`tel:${order.proveedor_telefono}`}
                                title={`Llamar (${order.proveedor_telefono})`}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {order.proveedor_email && (
                              <a
                                href={`mailto:${order.proveedor_email}?subject=Consulta%20Pedido%20${order.numero_pedido}&body=Hola,%20les%20escribimos%20en%20relación%20al%20pedido%20${order.numero_pedido}...`}
                                title={`Enviar email (${order.proveedor_email})`}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>

                        {order.fecha_estimada_entrega && (
                          <div className="flex items-center gap-1.5 text-amber-900 font-bold bg-amber-100/50 p-1.5 rounded-lg border border-amber-200/60">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Entrega prevista: {order.fecha_estimada_entrega}</span>
                          </div>
                        )}
                      </div>

                      {/* Project assigned */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
                        <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{order.proyecto_nombre ? `Destino Obra: ${order.proyecto_nombre}` : 'Destino: Almacén central'}</span>
                      </div>

                      {order.solicitud_id && (
                        <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between gap-2 mb-3 text-xs">
                          <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-purple-600 shrink-0" />
                            <span className="text-purple-900 font-medium">
                              Petición original {matchedRequest ? `de ${matchedRequest.usuario_nombre}` : ''}
                            </span>
                          </div>
                          <button
                            onClick={() => onOpenRequestHistory(order.solicitud_id!)}
                            className="px-2 py-1 bg-white text-purple-700 rounded-lg font-bold border border-purple-200 text-[11px] hover:bg-purple-100 transition-colors"
                          >
                            Ver Petición
                          </button>
                        </div>
                      )}

                      {order.notas && (
                        <p className="text-xs text-slate-600 italic bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 mb-3">
                          "{order.notas}"
                        </p>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-amber-200/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => onReceiveOrder(order)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>Recepcionar en Almacén</span>
                          </button>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditOrder(order)}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                            title="Editar pedido"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setOrderToDelete(order)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar pedido"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: HISTORIAL DE ÚLTIMOS PEDIDOS REALIZADOS */}
      {(statusFilter === 'all' || statusFilter !== 'pendiente_recibir') && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Historial de Últimos Pedidos Realizados</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                {historyOrders.length}
              </span>
            </h2>
          </div>

          {historyOrders.length === 0 ? (
            <div className="bento-card py-12 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No hay registros en el historial de pedidos</p>
              <p className="text-xs text-slate-500">
                Los pedidos completados, disponibles o archivados aparecerán listados aquí.
              </p>
            </div>
          ) : (
            <div className="bento-card overflow-hidden w-full max-w-full">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Pedido / Fecha</th>
                      <th className="py-3.5 px-4">Material & Referencia</th>
                      <th className="py-3.5 px-4 text-center">Cantidad</th>
                      <th className="py-3.5 px-4">Distribuidor</th>
                      <th className="py-3.5 px-4">Destino</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900">{order.numero_pedido}</div>
                          <div className="text-[11px] text-slate-400">
                            {new Date(order.fecha_pedido).toLocaleDateString('es-ES')}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 leading-tight">
                            {order.producto_nombre || order.nombre_material}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {order.producto_codigo && (
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {order.producto_codigo}
                              </span>
                            )}
                            {order.referencia && (
                              <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                Ref: {order.referencia}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 whitespace-nowrap">
                          {order.cantidad} {order.unidad || 'uds'}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-600 shrink-0 overflow-hidden">
                              {order.proveedor_logo_url ? (
                                <img
                                  src={order.proveedor_logo_url}
                                  alt=""
                                  className="w-full h-full object-contain p-0.5"
                                />
                              ) : (
                                order.proveedor_nombre?.charAt(0).toUpperCase() || 'P'
                              )}
                            </div>
                            <span className="text-slate-800 font-medium">
                              {order.proveedor_nombre || 'No especificado'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {order.proyecto_nombre ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              <FolderGit2 className="w-3 h-3 text-[#EA1D24]" />
                              <span>{order.proyecto_nombre}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Almacén central</span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(order.estado)}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => onEditOrder(order)}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Editar pedido"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setOrderToDelete(order)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Eliminar pedido"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">¿Eliminar pedido?</h3>
              <p className="text-xs text-slate-500 mt-1">
                ¿Estás seguro de que deseas eliminar el pedido <strong>{orderToDelete.numero_pedido}</strong> ({orderToDelete.producto_nombre || orderToDelete.nombre_material})? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
