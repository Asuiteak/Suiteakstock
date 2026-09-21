import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Globe,
  RotateCcw,
  Check,
  X,
  Sparkles,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { useAppTime } from '../context/TimeContext';

interface DateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const DateTimeModal: React.FC<DateTimeModalProps> = ({
  isOpen,
  onClose,
  onShowToast
}) => {
  const {
    mode,
    currentDate,
    formattedDate,
    formattedTime,
    timeZone,
    isManual,
    isSyncing,
    lastSync,
    syncWithServer,
    setManualDateTime,
    resetToAuto
  } = useAppTime();

  // Local form state for manual input
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>(mode);

  // Initialize input fields with current date & time formatted
  useEffect(() => {
    if (isOpen) {
      setActiveTab(mode);
      const pad = (n: number) => String(n).padStart(2, '0');
      const year = currentDate.getFullYear();
      const month = pad(currentDate.getMonth() + 1);
      const day = pad(currentDate.getDate());
      const hours = pad(currentDate.getHours());
      const minutes = pad(currentDate.getMinutes());

      setSelectedDate(`${year}-${month}-${day}`);
      setSelectedTime(`${hours}:${minutes}`);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleApplyManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      onShowToast?.('Por favor, selecciona fecha y hora válidas', 'error');
      return;
    }

    const isoString = `${selectedDate}T${selectedTime}:00`;
    const targetDate = new Date(isoString);

    if (isNaN(targetDate.getTime())) {
      onShowToast?.('Formato de fecha u hora no válido', 'error');
      return;
    }

    setManualDateTime(targetDate.getTime());
    onShowToast?.('Fecha y hora del sistema fijadas manualmente', 'success');
    onClose();
  };

  const handleQuickPreset = (daysOffset: number, setHour?: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    if (setHour !== undefined) {
      d.setHours(setHour, 0, 0, 0);
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    setSelectedDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setSelectedTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  const handleResetToAuto = () => {
    resetToAuto();
    setActiveTab('auto');
    onShowToast?.('Sincronización automática de hora restablecida (España: Europe/Madrid)', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-neutral-100">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/10 text-red-400 border border-red-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Fecha y Hora del Sistema
              </h2>
              <p className="text-xs text-neutral-400">
                Ajuste y configuración de fecha y hora del sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Main Live Clock Card */}
          <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 relative overflow-hidden flex flex-col items-center justify-center text-center">
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {isManual ? (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <SlidersHorizontal className="w-3 h-3" />
                  Modo Manual
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sincronizado
                </span>
              )}
            </div>

            <div className="text-xs uppercase tracking-widest text-neutral-400 font-semibold mb-1 flex items-center gap-1.5 justify-center">
              <Globe className="w-3.5 h-3.5 text-red-400" />
              <span>Madrid (UTC+1 / UTC+2)</span>
            </div>

            {/* Big Digital Clock */}
            <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-wider my-2 text-glow">
              {formattedTime}
            </div>

            {/* Date Display */}
            <div className="text-sm sm:text-base font-semibold text-neutral-200 capitalize flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4 text-red-400" />
              <span>{formattedDate}</span>
            </div>

            {lastSync && !isManual && (
              <div className="text-[11px] text-neutral-500 mt-2">
                Última sincronización con reloj de red: {lastSync.toLocaleTimeString('es-ES')}
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveTab('auto')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'auto'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Automático (Oficial España)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'manual'
                  ? 'bg-neutral-800 text-white shadow-xs border border-neutral-700'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Determinar Fecha y Hora</span>
            </button>
          </div>

          {/* Content for Auto Tab */}
          {activeTab === 'auto' && (
            <div className="space-y-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 text-xs">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-neutral-300 leading-relaxed">
                  <p className="font-semibold text-white mb-1">
                    Sincronización Automática con la Hora Oficial de España
                  </p>
                  <p>
                    Cada vez que se inicia la herramienta o se registra cualquier movimiento, la app consulta la hora mundial oficial en España (CET/CEST - Europe/Madrid).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={async () => {
                    await syncWithServer();
                    onShowToast?.('Hora sincronizada con el servidor mundial', 'success');
                  }}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-red-400' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
                </button>

                {isManual && (
                  <button
                    type="button"
                    onClick={handleResetToAuto}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aplicar y Activar Auto</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Content for Manual Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleApplyManual} className="space-y-4 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
              <div className="flex items-start gap-2.5 text-xs text-amber-300/90 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Al determinar una fecha y hora manual, los movimientos, solicitudes y calendarios operarán con este punto temporal de referencia.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Fecha deseada
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Hora y Minuto
                  </label>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <div className="text-[11px] font-semibold text-neutral-400 mb-1.5">Atajos rápidos:</div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(0, 8)}
                    className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200"
                  >
                    Hoy 08:00 (Inicio jornada)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(0, 14)}
                    className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200"
                  >
                    Hoy 14:00 (Mediodía)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(1, 9)}
                    className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200"
                  >
                    Mañana 09:00
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset(-1, 12)}
                    className="px-2 py-1 text-[11px] bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-200"
                  >
                    Ayer 12:00
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                {isManual && (
                  <button
                    type="button"
                    onClick={handleResetToAuto}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Volver a Hora Automática</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Fijar Fecha y Hora</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="text-xs text-neutral-400">
            {isManual ? 'Fecha fijada por usuario' : 'Sincronizado con huso horario España (UTC+1/UTC+2)'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
