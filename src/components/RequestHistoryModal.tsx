import React, { useEffect, useState } from 'react';
import {
  X,
  History,
  Clock,
  User,
  AlertCircle,
  FileText,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Calendar
} from 'lucide-react';
import { MaterialRequest, RequestHistoryEntry } from '../types';
import { api } from '../lib/api';

interface RequestHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MaterialRequest | null;
}

export const RequestHistoryModal: React.FC<RequestHistoryModalProps> = ({
  isOpen,
  onClose,
  request,
}) => {
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && request) {
      setLoading(true);
      setError(null);
      api.getRequestHistory(request.id)
        .then((data) => setHistory(data))
        .catch((err: any) => setError(err.message || 'Error al cargar el historial de cambios'))
        .finally(() => setLoading(false));
    } else {
      setHistory([]);
    }
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Auditoría y Trazabilidad
                </span>
                <span className="text-[11px] text-neutral-400">
                  ID: #{request.id.slice(0, 8)}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                Historial de Cambios: {request.material_nombre}
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

        {/* Sub-header context banner */}
        <div className="px-6 py-3 bg-neutral-950/50 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <User className="w-3.5 h-3.5 text-neutral-400" />
            <span>Creador Original: <strong className="text-white">{request.usuario_nombre || 'Operario'}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-neutral-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Fecha creación: {new Date(request.fecha_solicitud).toLocaleString('es-ES')}</span>
          </div>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-purple-500" />
              <span className="text-xs font-medium">Cargando registro histórico de modificaciones...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 space-y-2">
              <History className="w-10 h-10 mx-auto text-neutral-600 mb-2" />
              <p className="text-sm font-semibold text-neutral-300">Sin modificaciones registradas</p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Esta solicitud no ha sufrido cambios desde su emisión original por parte del operario ({request.usuario_nombre}).
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-800">
              {history.map((entry) => (
                <div key={entry.id} className="relative group">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-neutral-900 border-2 border-purple-500 flex items-center justify-center ring-4 ring-neutral-950">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>

                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3.5 space-y-2 hover:border-neutral-700 transition-colors">
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">
                          {entry.usuario_nombre || 'Usuario del sistema'}
                        </span>
                        <span className="text-neutral-500">•</span>
                        <span className="text-purple-400 font-semibold uppercase tracking-wider text-[10px] bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/40">
                          {entry.accion}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(entry.fecha).toLocaleString('es-ES')}</span>
                      </div>
                    </div>

                    {/* Field changed */}
                    {entry.campo_modificado && (
                      <div className="text-xs text-neutral-300 bg-neutral-900/90 p-2.5 rounded-lg border border-neutral-800 flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="font-semibold text-neutral-400 shrink-0">
                          Campo ({entry.campo_modificado}):
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px] overflow-x-auto">
                          <span className="line-through text-rose-400 bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-900/40">
                            {entry.valor_anterior || '(vacío)'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span className="text-emerald-400 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/40 font-bold">
                            {entry.valor_nuevo || '(vacío)'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Change justification */}
                    {entry.motivo_cambio && (
                      <div className="text-xs bg-amber-950/20 border border-amber-800/30 text-amber-200/90 p-2.5 rounded-lg flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-400">Motivo declarado del cambio:</strong>{' '}
                          {entry.motivo_cambio}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            <span>Registro inmutable de auditoría para evitar discrepancias operario/administrador</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
