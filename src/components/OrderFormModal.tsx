import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Building2,
  FolderGit2,
  Calendar,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  User as UserIcon,
  Check,
  Loader2
} from 'lucide-react';
import { Order, OrderStatus, Provider, Project, MaterialRequest, Product } from '../types';
import { api } from '../lib/api';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderToEdit?: Order | null;
  initialFromRequest?: MaterialRequest | null;
  fromRequest?: MaterialRequest | null;
  initialProduct?: Product | null;
  providers: Provider[];
  projects: Project[];
  products: Product[];
  currentUser?: any;
  onSuccess: (order: Order) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const OrderFormModal: React.FC<OrderFormModalProps> = ({
  isOpen,
  onClose,
  orderToEdit,
  initialFromRequest,
  fromRequest,
  initialProduct,
  providers,
  projects,
  products,
  currentUser,
  onSuccess,
  onShowToast,
}) => {
  const reqSource = initialFromRequest || fromRequest;
  const [nombreMaterial, setNombreMaterial] = useState('');
  const [referencia, setReferencia] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [proveedorId, setProveedorId] = useState('');
  const [proyectoId, setProyectoId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [solicitudId, setSolicitudId] = useState('');
  const [fechaEstimadaEntrega, setFechaEstimadaEntrega] = useState('');
  const [precioEstimado, setPrecioEstimado] = useState('');
  const [notas, setNotas] = useState('');
  const [estado, setEstado] = useState<OrderStatus>('pendiente_recibir');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (orderToEdit) {
      setNombreMaterial(orderToEdit.producto_nombre || orderToEdit.nombre_material || '');
      setReferencia(orderToEdit.referencia || '');
      setCantidad(String(orderToEdit.cantidad));
      setProveedorId(orderToEdit.proveedor_id || '');
      setProyectoId(orderToEdit.proyecto_id || '');
      setProductoId(orderToEdit.producto_id || '');
      setSolicitudId(orderToEdit.solicitud_id || '');
      setFechaEstimadaEntrega(orderToEdit.fecha_estimada_entrega ? orderToEdit.fecha_estimada_entrega.substring(0, 10) : '');
      setPrecioEstimado(orderToEdit.precio_estimado ? String(orderToEdit.precio_estimado) : '');
      setNotas(orderToEdit.notas || '');
      setEstado(orderToEdit.estado || 'pendiente_recibir');
    } else if (initialProduct) {
      setNombreMaterial(initialProduct.nombre || '');
      setReferencia(initialProduct.referencia || '');
      setCantidad('1');
      setProveedorId(initialProduct.proveedor_id || '');
      setProyectoId(initialProduct.proyecto_id || '');
      setProductoId(initialProduct.id || '');
      setSolicitudId('');
      setFechaEstimadaEntrega('');
      setPrecioEstimado(initialProduct.precio ? String(initialProduct.precio) : '');
      setNotas(`Pedido de reposición para el producto: ${initialProduct.nombre} (Cód: ${initialProduct.codigo})`);
      setEstado('pendiente_recibir');
    } else if (reqSource) {
      setNombreMaterial(reqSource.nombre_material_personalizado || reqSource.producto_nombre || reqSource.material_nombre || '');
      setReferencia('');
      setCantidad(String(reqSource.cantidad));
      setProveedorId(reqSource.proveedor_sugerido_id || '');
      setProyectoId(reqSource.proyecto_id || '');
      setProductoId(reqSource.producto_id || '');
      setSolicitudId(reqSource.id);
      setFechaEstimadaEntrega('');
      setPrecioEstimado('');
      setNotas(reqSource.notas ? `Petición operario (${reqSource.usuario_nombre}): ${reqSource.notas}` : '');
      setEstado('pendiente_recibir');
    } else {
      setNombreMaterial('');
      setReferencia('');
      setCantidad('1');
      setProveedorId('');
      setProyectoId('');
      setProductoId('');
      setSolicitudId('');
      setFechaEstimadaEntrega('');
      setPrecioEstimado('');
      setNotas('');
      setEstado('pendiente_recibir');
    }
    setError(null);
  }, [isOpen, orderToEdit, initialProduct, reqSource]);

  if (!isOpen) return null;

  const selectedProvider = providers.find((p) => p.id === proveedorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreMaterial.trim()) {
      setError('El nombre del material o descripción del pedido es obligatorio');
      return;
    }

    const numCantidad = Number(cantidad);
    if (isNaN(numCantidad) || numCantidad <= 0) {
      setError('La cantidad debe ser mayor que 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        nombre_material: nombreMaterial.trim(),
        producto_nombre: nombreMaterial.trim(),
        referencia: referencia.trim() || null,
        cantidad: numCantidad,
        proveedor_id: proveedorId || null,
        proyecto_id: proyectoId || null,
        producto_id: productoId || null,
        solicitud_id: solicitudId || null,
        fecha_estimada_entrega: fechaEstimadaEntrega || null,
        precio_estimado: precioEstimado ? Number(precioEstimado) : null,
        notas: notas.trim() || null,
        estado,
      };

      let result: Order;
      if (orderToEdit) {
        result = await api.updateOrder(orderToEdit.id, payload);
        if (onShowToast) onShowToast(`Pedido ${result.numero_pedido} actualizado`, 'success');
      } else {
        result = await api.createOrder(payload);
        if (onShowToast) onShowToast(`Pedido ${result.numero_pedido} creado con éxito`, 'success');
      }

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EA1D24] text-white flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                Gestión de Compras a Distribuidores
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {orderToEdit ? `Editar Pedido ${orderToEdit.numero_pedido}` : 'Nuevo Pedido a Distribuidor'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Material Name & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Material o Producto a Pedir <span className="text-[#EA1D24]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Cable unipolar libre de halógenos 2.5mm 100m"
                value={nombreMaterial}
                onChange={(e) => setNombreMaterial(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Referencia
              </label>
              <input
                type="text"
                placeholder="Ej: REF-8823"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] font-mono bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cantidad */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cantidad Pedida <span className="text-[#EA1D24]">*</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] font-mono font-bold bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Estado del Pedido */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Estado del Pedido
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as OrderStatus)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 focus:bg-white font-semibold"
              >
                <option value="disponible">Disponible</option>
                <option value="descatalogado">Descatalogado</option>
                <option value="sin_existencias">Sin existencias</option>
                <option value="pendiente_recibir">Pendiente de recibir</option>
                <option value="reservado">Reservado</option>
              </select>
            </div>
          </div>

          {/* Supplier Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Distribuidor o Proveedor Asignado</span>
            </label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 focus:bg-white"
            >
              <option value="">-- Seleccionar proveedor del directorio --</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.contacto ? `(${p.contacto})` : ''}
                </option>
              ))}
            </select>

            {/* Provider Quick Preview Card */}
            {selectedProvider && (
              <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0">
                    {selectedProvider.logo_url ? (
                      <img
                        src={selectedProvider.logo_url}
                        alt={selectedProvider.nombre}
                        className="w-full h-full object-contain p-0.5 rounded-lg"
                      />
                    ) : (
                      selectedProvider.nombre.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{selectedProvider.nombre}</div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      {selectedProvider.telefono && (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Phone className="w-3 h-3 text-[#EA1D24]" /> {selectedProvider.telefono}
                        </span>
                      )}
                      {selectedProvider.email && (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Mail className="w-3 h-3 text-slate-400" /> {selectedProvider.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Proyecto Destino */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Obra o Proyecto Destino</span>
              </label>
              <select
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 focus:bg-white"
              >
                <option value="">-- Almacén central (General) --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.nombre} ({proj.cliente})
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha estimada de entrega */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Fecha Estimada de Entrega</span>
              </label>
              <input
                type="date"
                value={fechaEstimadaEntrega}
                onChange={(e) => setFechaEstimadaEntrega(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Notas y Observaciones del Pedido</span>
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Número de presupuesto, condiciones de entrega, horario del transportista..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#EA1D24] bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{orderToEdit ? 'Actualizar Pedido' : 'Confirmar y Crear Pedido'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
