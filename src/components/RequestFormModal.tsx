import React, { useState } from 'react';
import {
  X,
  PackageCheck,
  Sparkles,
  AlertCircle,
  Clock,
  Building2,
  Calendar,
  Layers,
  FileText,
  Truck
} from 'lucide-react';
import { Product, Project, User, MaterialRequest, RequestType, RequestPriority } from '../types';
import { api } from '../lib/api';

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: MaterialRequest) => void;
  products: Product[];
  projects: Project[];
  currentUser: User;
  defaultType?: RequestType;
  defaultProductId?: string;
  defaultProjectId?: string;
}

export const RequestFormModal: React.FC<RequestFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products,
  projects,
  currentUser,
  defaultType = 'preparar_carga',
  defaultProductId,
  defaultProjectId,
}) => {
  const [requestType, setRequestType] = useState<RequestType>(defaultType);
  const [productId, setProductId] = useState<string>(defaultProductId || '');
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [productSearch, setProductSearch] = useState('');

  // New material fields
  const [materialNombre, setMaterialNombre] = useState('');
  const [materialDescripcion, setMaterialDescripcion] = useState('');
  const [materialCategoria, setMaterialCategoria] = useState('Materiales');
  const [proveedorSugerido, setProveedorSugerido] = useState('');

  // Common fields
  const [cantidad, setCantidad] = useState<number | ''>(1);
  const [unidad, setUnidad] = useState('uds');
  const [prioridad, setPrioridad] = useState<RequestPriority>('normal');
  const [fechaNecesidad, setFechaNecesidad] = useState('');
  const [notas, setNotas] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filtered products for quick picker
  const filteredProducts = products.filter((p) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      p.codigo.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q)
    );
  });

  const selectedProduct = products.find((p) => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = Number(cantidad);
    if (!qty || qty <= 0) {
      setError('Por favor indica una cantidad válida mayor a 0');
      return;
    }

    if (requestType === 'preparar_carga') {
      if (!productId) {
        setError('Debes seleccionar un producto del catálogo para preparar la carga');
        return;
      }
    } else {
      if (!materialNombre.trim()) {
        setError('Debes indicar el nombre del nuevo material o producto');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Partial<MaterialRequest> = {
        tipo_solicitud: requestType,
        es_material_nuevo: requestType === 'pedido_material',
        producto_id: requestType === 'preparar_carga' ? productId : undefined,
        material_nombre:
          requestType === 'preparar_carga' && selectedProduct
            ? selectedProduct.nombre
            : materialNombre.trim(),
        material_descripcion:
          requestType === 'pedido_material'
            ? materialDescripcion.trim()
            : selectedProduct?.descripcion,
        material_categoria:
          requestType === 'pedido_material'
            ? materialCategoria
            : selectedProduct?.categoria,
        proveedor_sugerido:
          requestType === 'pedido_material' ? proveedorSugerido.trim() || undefined : undefined,
        cantidad: qty,
        unidad: unidad.trim() || 'uds',
        proyecto_id: projectId || undefined,
        usuario_id: currentUser.id,
        prioridad,
        fecha_necesidad: fechaNecesidad ? new Date(fechaNecesidad).toISOString() : undefined,
        notas: notas.trim() || undefined,
      };

      const created = await api.createRequest(payload);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Error al crear solicitud:', err);
      setError(err.message || 'Error al registrar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 text-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EA1D24]/10 text-[#EA1D24] border border-[#EA1D24]/20">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nueva Solicitud de Operario</h2>
              <p className="text-xs text-neutral-400">
                Pide preparar una carga de almacén o solicita material nuevo no catalogado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selection Tabs */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-950/40">
          <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
            ¿Qué necesitas solicitar?
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tab 1: Preparar Carga */}
            <button
              type="button"
              id="btn-tab-preparar-carga"
              onClick={() => {
                setRequestType('preparar_carga');
                setError(null);
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                requestType === 'preparar_carga'
                  ? 'bg-neutral-800/90 border-[#EA1D24] ring-1 ring-[#EA1D24]'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  requestType === 'preparar_carga'
                    ? 'bg-[#EA1D24] text-white'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Preparar Carga de Almacén</div>
                <div className="text-xs text-neutral-400 leading-snug mt-0.5">
                  Material existente en stock para que el almacén lo tenga listo y cargado
                </div>
              </div>
            </button>

            {/* Tab 2: Material Nuevo / Compra */}
            <button
              type="button"
              id="btn-tab-pedido-material"
              onClick={() => {
                setRequestType('pedido_material');
                setError(null);
              }}
              className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                requestType === 'pedido_material'
                  ? 'bg-neutral-800/90 border-[#EA1D24] ring-1 ring-[#EA1D24]'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  requestType === 'pedido_material'
                    ? 'bg-[#EA1D24] text-white'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Material Nuevo / Pedido</div>
                <div className="text-xs text-neutral-400 leading-snug mt-0.5">
                  Artículo no contemplado en catálogo que el administrador debe comprar o pedir
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode 1: Existing Catalog Product */}
          {requestType === 'preparar_carga' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Seleccionar Producto del Catálogo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Filtrar por código, nombre o categoría..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24] mb-2"
                />
                <select
                  id="select-product-request"
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    const sel = products.find((p) => p.id === e.target.value);
                    if (sel) {
                      // set suggested unit if discernible
                      if (sel.categoria.toLowerCase().includes('pintura')) setUnidad('botes');
                      else if (sel.nombre.toLowerCase().includes('placa')) setUnidad('placas');
                      else if (sel.nombre.toLowerCase().includes('saco')) setUnidad('sacos');
                      else setUnidad('uds');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#EA1D24]"
                  required
                >
                  <option value="">-- Elige un producto --</option>
                  {filteredProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.codigo}] {p.nombre} — Disp: {p.stock_disponible} (Físico: {p.stock_actual})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-neutral-400">Stock actual en almacén:</span>{' '}
                    <span className="font-bold text-white">{selectedProduct.stock_actual} uds</span>{' '}
                    <span className="text-neutral-500 text-[11px]">
                      (Disponible: {selectedProduct.stock_disponible} uds, Reservado:{' '}
                      {selectedProduct.stock_reservado} uds)
                    </span>
                  </div>
                  {selectedProduct.stock_disponible <= 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-red-950 text-red-400 font-semibold border border-red-800/40 text-[10px]">
                      Sin disponibilidad inmediata
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 font-semibold border border-emerald-800/40 text-[10px]">
                      Disponible para preparar
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: New Material Fields */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Nombre del Material o Producto Nuevo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="input-material-nombre"
                  placeholder="Ej: Grifo Monomando Ducha Negro Mate Termostático"
                  value={materialNombre}
                  onChange={(e) => setMaterialNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Categoría Sugerida
                  </label>
                  <select
                    value={materialCategoria}
                    onChange={(e) => setMaterialCategoria(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#EA1D24]"
                  >
                    <option value="Materiales">Materiales y Construcción</option>
                    <option value="Fontanería">Fontanería y Saneamiento</option>
                    <option value="Electricidad">Electricidad e Iluminación</option>
                    <option value="Pintura">Pintura y Acabados</option>
                    <option value="Herramientas">Herramientas y Maquinaria</option>
                    <option value="Carpintería">Carpintería y Madera</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Proveedor o Referencia Sugerida
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: BricoPro, Leroy, Roca Ref: 4501A"
                    value={proveedorSugerido}
                    onChange={(e) => setProveedorSugerido(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Descripción Técnica / Medidas / Especificaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles técnicos, dimensiones, acabado (ej: acabado mate antihuellas, cartucho cerámico 35mm, rociador 25cm)..."
                  value={materialDescripcion}
                  onChange={(e) => setMaterialDescripcion(e.target.value)}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24] resize-none"
                />
              </div>
            </div>
          )}

          {/* Common Fields: Cantidad, Unidad, Proyecto, Prioridad */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Cantidad Solicitada <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                id="input-cantidad-request"
                min="1"
                step="any"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-bold text-white focus:outline-hidden focus:border-[#EA1D24]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Unidad de Medida
              </label>
              <input
                type="text"
                placeholder="uds, sacos, m², metros, botes..."
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as RequestPriority)}
                className={`w-full px-3.5 py-2.5 bg-neutral-950 border rounded-xl text-sm font-semibold focus:outline-hidden ${
                  prioridad === 'urgente'
                    ? 'text-red-400 border-red-800 bg-red-950/30'
                    : 'text-neutral-200 border-neutral-800'
                }`}
              >
                <option value="normal">Normal (Plazo estándar)</option>
                <option value="urgente">⚠️ Urgente (Paraliza obra)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Destino: Obra / Reforma
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-hidden focus:border-[#EA1D24]"
              >
                <option value="">-- Sin obra específica (Almacén / Taller) --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.nombre} ({proj.cliente})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Fecha / Hora requerida en obra
              </label>
              <input
                type="datetime-local"
                value={fechaNecesidad}
                onChange={(e) => setFechaNecesidad(e.target.value)}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-[#EA1D24]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Indicaciones del Operario para el Almacén
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Cargar mañana en la furgoneta 2 a primera hora. Incluir tornillería y tacos si hay..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-submit-request"
              disabled={loading}
              className="px-5 py-2.5 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-600/20 disabled:opacity-50"
            >
              {loading ? 'Enviando solicitud...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
