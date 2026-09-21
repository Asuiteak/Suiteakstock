import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, Volume2, Search, AlertCircle } from 'lucide-react';
import { playScanSuccessBeep } from '../lib/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
  description?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras / QR',
  description = 'Apunta con la cámara al código del producto o usa un lector USB.',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-viewport';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setCameraError(null);
    let isMounted = true;

    async function initCamera() {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          // Prefer back camera for scanning physical products
          const backCam = devices.find((d) =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('environment')
          );
          const camId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(camId);
          startScannerWithCamera(camId);
        } else {
          setCameraError('No se detectó ninguna cámara en este dispositivo. Puedes introducir el código manualmente.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error obteniendo cámaras:', err);
        setCameraError(
          'No se pudo acceder a la cámara (comprueba los permisos de tu navegador o usa el buscador manual de códigos).'
        );
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const startScannerWithCamera = async (cameraId: string) => {
    try {
      await stopScanner();
      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 160 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          playScanSuccessBeep();
          stopScanner();
          onScan(decodedText.trim());
          onClose();
        },
        () => {
          // Frame read callback without detection, ignore to keep console clean
        }
      );

      setIsScanning(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Error iniciando escáner:', err);
      setCameraError('Error al iniciar la cámara. Comprueba los permisos o ingresa el código manualmente.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playScanSuccessBeep();
      stopScanner();
      onScan(manualCode.trim().toUpperCase());
      onClose();
    }
  };

  // Keyboard shortcut listener for physical barcode USB guns
  useEffect(() => {
    if (!isOpen) return;

    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 200) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          e.preventDefault();
          playScanSuccessBeep();
          stopScanner();
          onScan(buffer.trim().toUpperCase());
          onClose();
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="barcode-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-xs animate-in fade-in"
    >
      <div
        id="barcode-scanner-dialog"
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-900 text-white border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#EA1D24] rounded-lg text-white">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">{title}</h3>
              <p className="text-xs text-neutral-400">{description}</p>
            </div>
          </div>
          <button
            id="btn-close-scanner"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="p-4 space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden min-h-[260px] flex items-center justify-center">
            <div id={containerId} className="w-full h-full" />

            {cameraError && (
              <div className="absolute inset-0 bg-neutral-900/95 flex flex-col items-center justify-center p-6 text-center text-slate-300">
                <AlertCircle className="w-10 h-10 text-[#EA1D24] mb-2" />
                <p className="text-sm font-medium text-white mb-1">Cámara no disponible</p>
                <p className="text-xs text-slate-400 mb-4">{cameraError}</p>
                <p className="text-xs text-red-300 bg-red-950/60 px-3 py-1.5 rounded-md border border-red-800/60">
                  Introduce el código o escanea con lector USB abajo
                </p>
              </div>
            )}
          </div>

          {/* Camera switcher if multiple cameras */}
          {availableCameras.length > 1 && !cameraError && (
            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
              <span className="font-medium">Cámara:</span>
              <select
                id="camera-select-dropdown"
                value={selectedCameraId}
                onChange={(e) => {
                  setSelectedCameraId(e.target.value);
                  startScannerWithCamera(e.target.value);
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs focus:ring-1 focus:ring-[#EA1D24] focus:outline-hidden"
              >
                {availableCameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Cámara ${cam.id.slice(0, 5)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manual input / USB barcode gun listener */}
          <form onSubmit={handleManualSubmit} className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              O introducir código manual / Lector USB
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="scanner-manual-code-input"
                  type="text"
                  placeholder="Ej: MAT-001, HER-010, 8412345..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full px-3 py-2 pl-9 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#EA1D24] focus:border-[#EA1D24] focus:outline-hidden"
                  autoFocus
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button
                id="btn-confirm-manual-code"
                type="submit"
                className="px-4 py-2 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] text-white font-medium rounded-lg text-sm transition-colors shadow-xs shadow-red-600/20"
              >
                Buscar
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              Los lectores de pistola USB o Bluetooth funcionan automáticamente al disparar.
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            id="btn-cancel-scanner"
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
