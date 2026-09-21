import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  AlertCircle,
  FileText,
  Clock,
  Send,
  Loader2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { MaterialRequest, RequestPriority, Project, User } from '../types';
import { api } from '../lib/api';

interface RequestEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MaterialRequest | null;
  currentUser: User;
  projects: Project[];
  onSuccess: () => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RequestEditModal: React.FC<RequestEditModalProps> = ({
  isOpen,
  onClose,
  request,
  currentUser,
  projects,
  onSuccess,
  onShowToast,
}) => {
  const [cantidad, setCantidad] = useState<string>('1');
  const [materialNombre, setMaterialNombre] = useState<string>('');
  const [prioridad, setPrioridad] = useState<RequestPriority>('media');
  const [proyectoId, setProyectoId] = useState<string>('');
  const [fechaNecesidad, setFechaNecesidad] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [motivoCambio, setMotivoCambio] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && request) {
      setCantidad(String(request.cantidad));
      setMaterialNombre(request.material_nombre);
      setPrioridad(request.prioridad);
      setProyectoId(request.proyecto_id || '');
      setFechaNecesidad(
        request.fecha_necesidad ? request.fecha_necesidad.substring(0, 16) : ''
      );
      setNotas(request.notas || '');
      setMotivoCambio('');
      setError(null);
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoCambio.trim()) {
      setError('Debes especificar un motivo o justificación del cambio para el historial de auditoría.');
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
        cantidad: numCantidad,
        prioridad,
        proyecto_id: proyectoId || null,
        fecha_necesidad: fechaNecesidad ? new Date(fechaNecesidad).toISOString() : null,
        notas: notas.trim(),
        motivo_cambio: motivoCambio.trim(),
      };

      if (request.tipo_solicitud === 'pedido_material') {
        payload.nombre_material_personalizado = materialNombre.trim();
      }

      await api.updateRequest(request.id, payload);
      onShowToast('Solicitud actualizada y cambio registrado en el historial', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Edición de Petición
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                Modificar Solicitud #{request.id.slice(0, 8)}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Material Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Material Solicitado
            </label>
            {request.tipo_solicitud === 'pedido_material' ? (
              <input
                type="text"
                required
                value={materialNombre}
                onChange={(e) => setMaterialNombre(e.target.value)}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
              />
            ) : (
              <div className="px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-300">
                {request.material_nombre}
                <span className="text-[10px] text-neutral-500 ml-2">(Material de almacén catalogado)</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cantidad */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Cantidad Requerida *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white font-mono font-bold focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Prioridad
              </label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as RequestPriority)}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">🔥 Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Proyecto */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Proyecto / Obra
              </label>
              <select
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="">-- Sin asignar a obra específica --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} ({p.cliente})
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha necesidad */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Fecha Necesidad en Obra
              </label>
              <input
                type="datetime-local"
                value={fechaNecesidad}
                onChange={(e) => setFechaNecesidad(e.target.value)}
                className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Indicaciones u Observaciones
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones para el operario o almacén..."
              className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Motivo del cambio (Audit trail requirement) */}
          <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Motivo del cambio (Registro de Auditoría) *</span>
            </label>
            <p className="text-[11px] text-neutral-400">
              Explica por qué se modifica la petición original del operario (ej. corrección de unidades, ajuste de obra, cambio de marca solicitada por dirección).
            </p>
            <input
              type="text"
              required
              placeholder="Ej: Se ajusta cantidad a 25 sacos por replanteo de obra de albañilería..."
              value={motivoCambio}
              onChange={(e) => setMotivoCambio(e.target.value)}
              className="w-full px-3.5 py-2 bg-neutral-950 border border-amber-800/60 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Guardar y Registrar Cambio</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
