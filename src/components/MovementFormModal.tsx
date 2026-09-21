import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Bookmark,
  Package,
  AlertCircle,
  FolderGit2,
  User as UserIcon,
  Camera,
  Search,
  CheckCircle2
} from 'lucide-react';
import { Product, Project, User, MovementType } from '../types';
import { api } from '../lib/api';

interface MovementFormModalProps {
  isOpen: boolean;
  defaultType?: MovementType;
  defaultProductId?: string;
  products: Product[];
  projects: Project[];
  users: User[];
  currentUser: User;
  onClose: () => void;
  onSuccess: () => void;
  onOpenScanner: () => void;
}

export const MovementFormModal: React.FC<MovementFormModalProps> = ({
  isOpen,
  defaultType = 'entrada',
  defaultProductId,
  products,
  projects,
  users,
  currentUser,
  onClose,
  onSuccess,
  onOpenScanner,
}) => {
  const [tipo, setTipo] = useState<MovementType>(defaultType);
  const [selectedProductId, setSelectedProductId] = useState<string>(defaultProductId || '');
  const [productSearch, setProductSearch] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [proyectoId, setProyectoId] = useState('');
  const [usuarioId, setUsuarioId] = useState(currentUser.id);
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser.rol === 'admin';

  useEffect(() => {
    if (defaultType) setTipo(defaultType);
    if (defaultProductId) {
      setSelectedProductId(defaultProductId);
      const prod = products.find((p) => p.id === defaultProductId);
      if (prod && prod.proyecto_id) {
        setProyectoId(prod.proyecto_id);
      }
    }
    setUsuarioId(currentUser.id);
    setError(null);
  }, [defaultType, defaultProductId, isOpen, currentUser, products]);

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Filter products for dropdown
  const filteredProducts = products.filter((p) =>
    !productSearch ||
    p.codigo.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.nombre.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Debes seleccionar un producto.');
      return;
    }

    const qty = Number(cantidad);
    if (isNaN(qty) || qty <= 0) {
      setError('La cantidad debe ser un número entero mayor que cero.');
      return;
    }

    if ((tipo === 'salida' || tipo === 'reserva') && !proyectoId) {
      setError(`Debes asignar un proyecto/cliente obligatorio para registrar una ${tipo}.`);
      return;
    }

    if (selectedProduct) {
      if (tipo === 'salida' && qty > selectedProduct.stock_actual) {
        setError(
          `Stock insuficiente para salida. Stock físico en almacén: ${selectedProduct.stock_actual}, solicitado: ${qty}.`
        );
        return;
      }
      if (tipo === 'reserva' && qty > selectedProduct.stock_disponible) {
        setError(
          `Stock insuficiente para reservar. Stock libre disponible: ${selectedProduct.stock_disponible}, solicitado: ${qty}.`
        );
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      await api.createMovement({
        producto_id: selectedProductId,
        tipo,
        cantidad: qty,
        proyecto_id: proyectoId || undefined,
        usuario_id: isAdmin ? usuarioId : currentUser.id,
        observaciones: observaciones.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar el movimiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                tipo === 'entrada'
                  ? 'bg-emerald-500 text-slate-950'
                  : tipo === 'salida'
                  ? 'bg-rose-500 text-white'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              {tipo === 'entrada' ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : tipo === 'salida' ? (
                <ArrowUpRight className="w-5 h-5" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Registrar Movimiento de Material</h2>
              <p className="text-xs text-neutral-400">Control de entradas, salidas y reservas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Tipo de Operación *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="btn-type-entrada"
                onClick={() => setTipo('entrada')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  tipo === 'entrada'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Entrada</span>
              </button>

              <button
                type="button"
                id="btn-type-salida"
                onClick={() => setTipo('salida')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  tipo === 'salida'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Salida</span>
              </button>

              <button
                type="button"
                id="btn-type-reserva"
                onClick={() => setTipo('reserva')}
                className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  tipo === 'reserva'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>Reserva</span>
              </button>
            </div>
          </div>

          {/* Product Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">Producto / Material *</label>
              <button
                type="button"
                onClick={onOpenScanner}
                className="text-[11px] font-bold text-[#EA1D24] hover:text-[#d61920] flex items-center gap-1"
              >
                <Camera className="w-3 h-3" />
                Escanear código
              </button>
            </div>

            <select
              id="select-movement-product"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                const prod = products.find((p) => p.id === e.target.value);
                if (prod && prod.proyecto_id && !proyectoId) {
                  setProyectoId(prod.proyecto_id);
                }
              }}
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            >
              <option value="">-- Seleccionar producto del catálogo --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.codigo}] {p.nombre} (Disp: {p.stock_disponible} / Físico: {p.stock_actual})
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Stock Info for selected product */}
          {selectedProduct && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-800 text-xs">
                  {selectedProduct.nombre}
                </span>
                <span className="font-mono text-[11px] font-bold bg-white px-2 py-0.5 rounded-sm border border-slate-200">
                  {selectedProduct.codigo}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-1.5 rounded-md border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Stock Físico</span>
                  <span className="font-bold font-mono text-slate-800">{selectedProduct.stock_actual}</span>
                </div>
                <div className="bg-amber-50/70 p-1.5 rounded-md border border-amber-200">
                  <span className="text-[10px] text-amber-700 block">Reservado</span>
                  <span className="font-bold font-mono text-amber-800">{selectedProduct.stock_reservado}</span>
                </div>
                <div
                  className={`p-1.5 rounded-md border ${
                    selectedProduct.en_alerta
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <span className="text-[10px] block">Libre Disp.</span>
                  <span className="font-bold font-mono">{selectedProduct.stock_disponible}</span>
                </div>
              </div>

              {tipo === 'salida' && selectedProduct.stock_actual <= 0 && (
                <div className="mt-2 text-rose-600 text-[11px] flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  No hay stock físico para dar salida. Debes registrar una entrada primero.
                </div>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="mov-cantidad">
              Cantidad a mover *
            </label>
            <div className="flex items-center gap-2">
              <input
                id="mov-cantidad"
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              />
              {/* Quick helper buttons */}
              <div className="flex gap-1">
                {[1, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCantidad(String(n))}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono font-semibold"
                  >
                    +{n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project / Client Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Proyecto / Obra / Cliente {(tipo === 'salida' || tipo === 'reserva') ? '*' : '(Opcional)'}</span>
              </span>
              {(tipo === 'salida' || tipo === 'reserva') && (
                <span className="text-[10px] text-rose-600 font-bold uppercase">Requerido</span>
              )}
            </label>
            <select
              id="select-movement-project"
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              required={tipo === 'salida' || tipo === 'reserva'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            >
              <option value="">
                {tipo === 'entrada' ? '-- Almacén central (sin proyecto asignado) --' : '-- Seleccionar proyecto destino --'}
              </option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.nombre} • Cliente: {proj.cliente} ({proj.estado.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Responsible User (Pre-filled, editable by admin only) */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Responsable de la Operación</span>
              </span>
              {!isAdmin && (
                <span className="text-[10px] text-slate-400">Autocompletado con tu usuario</span>
              )}
            </label>

            {isAdmin ? (
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.rol.toUpperCase()})
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-medium">
                {currentUser.nombre} ({currentUser.rol})
              </div>
            )}
          </div>

          {/* Observations */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1" htmlFor="mov-obs">
              Observaciones / Albarán / Motivo (Opcional)
            </label>
            <textarea
              id="mov-obs"
              rows={2}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Albarán nº 4390, material para cuarto de baño, entrega proveedor..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-submit-movement"
              type="submit"
              disabled={loading}
              className={`px-5 py-2 font-bold rounded-xl text-xs transition-colors shadow-xs ${
                tipo === 'entrada'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : tipo === 'salida'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              } disabled:opacity-50`}
            >
              {loading
                ? 'Registrando...'
                : `Confirmar ${tipo.toUpperCase()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
