import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';

export type TimeMode = 'auto' | 'manual';

interface TimeContextType {
  mode: TimeMode;
  currentDate: Date;
  isoDate: string; // YYYY-MM-DD
  formattedDate: string; // "miércoles, 16 de septiembre de 2026"
  formattedTime: string; // "12:30:45"
  formattedShort: string; // "16 sep · 12:30"
  formattedBadge: string; // "12:30"
  timeZone: string; // "Europe/Madrid"
  isManual: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  serverOffsetMs: number;
  syncWithServer: () => Promise<void>;
  setManualDateTime: (dateTimeStringOrTimestamp: string | number) => void;
  resetToAuto: () => void;
  openTimeModal: () => void;
  closeTimeModal: () => void;
  isTimeModalOpen: boolean;
}

const STORAGE_MODE_KEY = 'suiteak_time_mode';
const STORAGE_MANUAL_ANCHOR_KEY = 'suiteak_manual_anchor';
const STORAGE_MANUAL_BASE_KEY = 'suiteak_manual_base';

const TimeContext = createContext<TimeContextType | null>(null);

export const TimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<TimeMode>(() => {
    const saved = localStorage.getItem(STORAGE_MODE_KEY);
    return saved === 'manual' ? 'manual' : 'auto';
  });

  // Server offset relative to client system clock (ms)
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isTimeModalOpen, setIsTimeModalOpen] = useState<boolean>(false);

  // Manual anchor: base manual timestamp + elapsed since it was set
  const [manualBase, setManualBase] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_MANUAL_BASE_KEY);
    return saved ? Number(saved) : Date.now();
  });
  const [manualAnchor, setManualAnchor] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_MANUAL_ANCHOR_KEY);
    return saved ? Number(saved) : Date.now();
  });

  // Live ticking state (updates every 1 second)
  const [tick, setTick] = useState<number>(Date.now());

  // Fetch world/server exact time
  const syncWithServer = useCallback(async () => {
    setIsSyncing(true);
    try {
      const startTime = Date.now();
      const res = await api.getTime();
      const endTime = Date.now();
      const roundTrip = (endTime - startTime) / 2;
      const targetTime = res.timestamp + roundTrip;
      const offset = targetTime - endTime;

      setServerOffsetMs(offset);
      setLastSync(new Date());
    } catch (err) {
      console.warn('Could not sync with /api/time, using local system clock with Europe/Madrid timezone:', err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial sync on mount
  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  // Clock ticker every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate current active date
  const currentDate = useMemo(() => {
    if (mode === 'manual') {
      const elapsed = tick - manualAnchor;
      return new Date(manualBase + elapsed);
    } else {
      return new Date(tick + serverOffsetMs);
    }
  }, [mode, tick, manualAnchor, manualBase, serverOffsetMs]);

  // Formatters in Europe/Madrid timezone
  const { formattedDate, formattedTime, formattedShort, formattedBadge, isoDate } = useMemo(() => {
    try {
      const dateStr = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(currentDate);

      const timeStr = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(currentDate);

      const dayMonth = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: 'numeric',
        month: 'short'
      }).format(currentDate);

      const hourMinute = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit'
      }).format(currentDate);

      // YYYY-MM-DD in Europe/Madrid
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(currentDate);

      return {
        formattedDate: dateStr,
        formattedTime: timeStr,
        formattedShort: `${dayMonth} · ${hourMinute}`,
        formattedBadge: hourMinute,
        isoDate: parts // Format is YYYY-MM-DD
      };
    } catch (e) {
      // Fallback
      return {
        formattedDate: currentDate.toLocaleDateString('es-ES'),
        formattedTime: currentDate.toLocaleTimeString('es-ES'),
        formattedShort: currentDate.toLocaleDateString('es-ES'),
        formattedBadge: currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isoDate: currentDate.toISOString().split('T')[0]
      };
    }
  }, [currentDate]);

  // Set manual date and time
  const setManualDateTime = useCallback((dateTimeStringOrTimestamp: string | number) => {
    let targetTimestamp: number;
    if (typeof dateTimeStringOrTimestamp === 'number') {
      targetTimestamp = dateTimeStringOrTimestamp;
    } else {
      targetTimestamp = new Date(dateTimeStringOrTimestamp).getTime();
    }

    if (isNaN(targetTimestamp)) return;

    const now = Date.now();
    setManualBase(targetTimestamp);
    setManualAnchor(now);
    setMode('manual');

    localStorage.setItem(STORAGE_MODE_KEY, 'manual');
    localStorage.setItem(STORAGE_MANUAL_BASE_KEY, String(targetTimestamp));
    localStorage.setItem(STORAGE_MANUAL_ANCHOR_KEY, String(now));
  }, []);

  // Reset to auto mode
  const resetToAuto = useCallback(() => {
    setMode('auto');
    localStorage.setItem(STORAGE_MODE_KEY, 'auto');
    localStorage.removeItem(STORAGE_MANUAL_BASE_KEY);
    localStorage.removeItem(STORAGE_MANUAL_ANCHOR_KEY);
    syncWithServer();
  }, [syncWithServer]);

  return (
    <TimeContext.Provider
      value={{
        mode,
        currentDate,
        isoDate,
        formattedDate,
        formattedTime,
        formattedShort,
        formattedBadge,
        timeZone: 'Europe/Madrid',
        isManual: mode === 'manual',
        isSyncing,
        lastSync,
        serverOffsetMs,
        syncWithServer,
        setManualDateTime,
        resetToAuto,
        openTimeModal: () => setIsTimeModalOpen(true),
        closeTimeModal: () => setIsTimeModalOpen(false),
        isTimeModalOpen
      }}
    >
      {children}
    </TimeContext.Provider>
  );
};

export const useAppTime = () => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useAppTime must be used within a TimeProvider');
  }
  return context;
};
