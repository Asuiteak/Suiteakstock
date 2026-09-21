import React, { useState, useEffect } from 'react';
import {
  X,
  PackageCheck,
  Building2,
  Package,
  FolderGit2,
  AlertCircle,
  FileCheck,
  Check,
  Loader2,
  PlusCircle,
  Hash
} from 'lucide-react';
import { Order, Product, Category } from '../types';
import { api } from '../lib/api';

interface ReceiveOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  products: Product[];
  categoriesList?: Category[];
  onSuccess: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_CATEGORIES = [
  'Materiales',
  'Herramientas',
  'Fontanería',
  'Electricidad',
  'Pintura',
  'Muebles y Carpintería',
  'Protección y Seguridad',
  'Ferretería General'
];

export const ReceiveOrderModal: React.FC<ReceiveOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  products,
  categoriesList = [],
  onSuccess,
  onShowToast,
}) => {
  const [catalogMode, setCatalogMode] = useState<'existing' | 'new'>('new');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cantidadRecibida, setCantidadRecibida] = useState('1');
  const [albaran, setAlbaran] = useState('');
  const [notasRecepcion, setNotasRecepcion] = useState('');

  // Fields for new product cataloging
  const [codigoProducto, setCodigoProducto] = useState('');
  const [nombreProducto, setNombreProducto] = useState('');
  const [categoriaProducto, setCategoriaProducto] = useState('Materiales');
  const [stockMinimo, setStockMinimo] = useState('5');
  const [descripcionProducto, setDescripcionProducto] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allCategories = Array.from(
    new Set([
      ...DEFAULT_CATEGORIES,
      ...categoriesList.map((c) => c.nombre),
      ...products.map((p) => p.categoria).filter(Boolean),
    ])
  );

  useEffect(() => {
    if (!isOpen || !order) return;

    setCantidadRecibida(String(order.cantidad));
    setAlbaran('');
    setNotasRecepcion('');
    setError(null);

    // If order is already linked to a catalog product
    if (order.producto_id) {
      setCatalogMode('existing');
      setSelectedProductId(order.producto_id);
    } else {
      // Check if product with same name exists
      const foundProduct = products.find(
        (p) => p.nombre.toLowerCase() === order.nombre_material.toLowerCase()
      );
      if (foundProduct) {
        setCatalogMode('existing');
        setSelectedProductId(foundProduct.id);
      } else {
        setCatalogMode('new');
        setSelectedProductId('');
      }
    }

    // Prepare default values for cataloging as new product
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    setCodigoProducto(`MAT-${randomSuffix}`);
    setNombreProducto(order.nombre_material);
    setCategoriaProducto('Materiales');
    setStockMinimo('5');
    setDescripcionProducto(order.notas ? `Catalogado a partir del pedido ${order.numero_pedido}. Notas: ${order.notas}` : '');
  }, [isOpen, order, products]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numCant = Number(cantidadRecibida);
    if (isNaN(numCant) || numCant <= 0) {
      setError('La cantidad recibida debe ser mayor a 0');
      return;
    }

    if (catalogMode === 'existing' && !selectedProductId) {
      setError('Selecciona el producto del inventario al que sumar el stock.');
      return;
    }

    if (catalogMode === 'new') {
      if (!codigoProducto.trim()) {
        setError('El código del producto a catalogar es obligatorio.');
        return;
      }
      if (!nombreProducto.trim()) {
        setError('El nombre del producto a catalogar es obligatorio.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        cantidad_recibida: numCant,
        albaran: albaran.trim() || undefined,
        notas: notasRecepcion.trim() || undefined,
      };

      if (catalogMode === 'existing') {
        payload.producto_id = selectedProductId;
      } else {
        payload.codigo_producto = codigoProducto.trim().toUpperCase();
        payload.nombre_producto = nombreProducto.trim();
        payload.categoria_producto = categoriaProducto;
        payload.stock_minimo = Number(stockMinimo) || 5;
        payload.descripcion_producto = descripcionProducto.trim() || undefined;
      }

      await api.receiveOrder(order.id, payload);
      onShowToast(`Pedido ${order.numero_pedido} recibido con éxito y stock catalogado`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al recepcionar el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Recepción y Entrada de Material
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Recepcionar Pedido {order.numero_pedido}
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

        {/* Info Banner */}
        <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span>Proveedor: <strong>{order.proveedor_nombre || 'Distribuidor externo'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-700" />
            <span>Pedido original: <strong>{order.cantidad} unidades</strong> ({order.nombre_material})</span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Albarán y Cantidad Real Recibida */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cantidad Real Recibida *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={cantidadRecibida}
                onChange={(e) => setCantidadRecibida(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono font-bold bg-slate-50 focus:bg-white"
              />
              <span className="text-[10px] text-slate-500">Unidades que entran físicamente en stock</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Nº Albarán / Factura</span>
              </label>
              <input
                type="text"
                placeholder="Ej. ALB-2026-9821"
                value={albaran}
                onChange={(e) => setAlbaran(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono bg-slate-50 focus:bg-white"
              />
              <span className="text-[10px] text-slate-500">Para control contable y trazabilidad</span>
            </div>
          </div>

          {/* Cataloging Section Toggle */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Catalogación en Inventario de Almacén
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setCatalogMode('new')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  catalogMode === 'new'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dar de Alta Nuevo Producto</span>
              </button>
              <button
                type="button"
                onClick={() => setCatalogMode('existing')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  catalogMode === 'existing'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-blue-600" />
                <span>Asociar a Producto Existente</span>
              </button>
            </div>
          </div>

          {/* Cataloging as New Product */}
          {catalogMode === 'new' ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Código Interno / SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={codigoProducto}
                    onChange={(e) => setCodigoProducto(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono font-bold uppercase bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Familia / Categoría *
                  </label>
                  <select
                    value={categoriaProducto}
                    onChange={(e) => setCategoriaProducto(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Oficial en Catálogo *
                </label>
                <input
                  type="text"
                  required
                  value={nombreProducto}
                  onChange={(e) => setNombreProducto(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Stock Mínimo de Alerta
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Descripción / Especificaciones
                  </label>
                  <input
                    type="text"
                    value={descripcionProducto}
                    onChange={(e) => setDescripcionProducto(e.target.value)}
                    placeholder="Detalles técnicos..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Assign to Existing Product */
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 animate-in fade-in">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Selecciona el producto del inventario *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Elige un artículo existente --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.codigo}] {p.nombre} (Stock actual: {p.stock_actual})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Observaciones de Recepción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notas de Recepción / Estado del Paquete
            </label>
            <textarea
              rows={2}
              value={notasRecepcion}
              onChange={(e) => setNotasRecepcion(e.target.value)}
              placeholder="Estado de bultos, transportista, firma de conformidad..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white"
            />
          </div>

          {/* Modal Footer */}
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Procesando entrada...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar Recepción y Entrada</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
