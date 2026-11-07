"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  CameraOff,
  Check,
  Flashlight,
  QrCode,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

export interface ScannedQrData {
  alias: string;
  amount?: number;
  note?: string;
  symbol?: string;
}

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: ScannedQrData) => void;
  title?: string;
  subtitle?: string;
}

const DEMO_QR_PRESETS: Array<{
  label: string;
  alias: string;
  displayName: string;
  amount: number;
  note: string;
  avatar: string;
}> = [
  {
    label: "Café Central",
    alias: "$cafe",
    displayName: "Café Central",
    amount: 2450,
    note: "Café con 2 medialunas",
    avatar: "CC",
  },
  {
    label: "Kiosco Esquina",
    alias: "$kiosco",
    displayName: "Kiosco La Esquina",
    amount: 1200,
    note: "Golosinas y bebida",
    avatar: "KE",
  },
  {
    label: "Fotocopias Norte",
    alias: "$foto",
    displayName: "Fotocopias Norte",
    amount: 3800,
    note: "Anillado y copias A4",
    avatar: "FN",
  },
  {
    label: "Panadería La Unión",
    alias: "$panaderia",
    displayName: "Panadería La Unión",
    amount: 4500,
    note: "Kilo de pan y facturas",
    avatar: "PU",
  },
];

export function QrScannerModal({
  isOpen,
  onClose,
  onScan,
  title = "Escanear Código QR",
  subtitle = "Apuntá la cámara al QR de cobro o comercio local",
}: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedSuccess, setScannedSuccess] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  // Iniciar cámara web / móvil
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScannedSuccess(null);
      return;
    }

    let isMounted = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setHasCameraPermission(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setHasCameraPermission(true);

        // Si el navegador soporta la API nativa de BarcodeDetector
        if ("BarcodeDetector" in window) {
          try {
            // @ts-expect-error BarcodeDetector experimental API
            const barcodeDetector = new window.BarcodeDetector({
              formats: ["qr_code"],
            });
            const scanInterval = setInterval(async () => {
              if (!videoRef.current || !isOpen) {
                clearInterval(scanInterval);
                return;
              }
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  clearInterval(scanInterval);
                  handleRawPayload(barcodes[0].rawValue);
                }
              } catch {
                // frame no decodificable en este tick
              }
            }, 300);
          } catch {
            // fallback
          }
        }
      } catch {
        setHasCameraPermission(false);
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        // @ts-expect-error torch capability
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      } catch {
        // Antorcha no soportada
      }
    }
  };

  const handleRawPayload = (raw: string) => {
    setScannedSuccess(raw);
    try {
      // Formato localito://pay?to=$alias&amount=100&note=abc
      if (raw.startsWith("localito://") || raw.startsWith("lemon://")) {
        const url = new URL(raw);
        const to = url.searchParams.get("to") || "$cafe";
        const amount = parseFloat(url.searchParams.get("amount") || "0") || undefined;
        const note = url.searchParams.get("note") || undefined;
        setTimeout(() => {
          onScan({ alias: to, amount, note });
          onClose();
        }, 500);
        return;
      }

      // JSON payload
      if (raw.startsWith("{") && raw.endsWith("}")) {
        const parsed = JSON.parse(raw);
        setTimeout(() => {
          onScan({
            alias: parsed.alias || parsed.to || "$cafe",
            amount: parsed.amount ? Number(parsed.amount) : undefined,
            note: parsed.note,
          });
          onClose();
        }, 500);
        return;
      }

      // Alias directo ($alias o alias)
      const cleanAlias = raw.startsWith("$") ? raw : `$${raw}`;
      setTimeout(() => {
        onScan({ alias: cleanAlias });
        onClose();
      }, 500);
    } catch {
      setTimeout(() => {
        onScan({ alias: raw.startsWith("$") ? raw : `$${raw}` });
        onClose();
      }, 500);
    }
  };

  const handleSelectPreset = (preset: (typeof DEMO_QR_PRESETS)[0]) => {
    setScannedSuccess(`${preset.alias} · $${preset.amount}`);
    setTimeout(() => {
      onScan({
        alias: preset.alias,
        amount: preset.amount,
        note: preset.note,
      });
      onClose();
    }, 450);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="relative w-full max-w-sm rounded-[32px] bg-[#11141C] border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00DF1A] animate-ping" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  {title}
                </h3>
              </div>
              <p className="text-[11px] font-mono text-zinc-400">
                {subtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Viewport Cámara / Scanner */}
          <div className="relative mx-5 rounded-[24px] overflow-hidden bg-black aspect-square border border-white/10 flex items-center justify-center">
            {hasCameraPermission === true ? (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-[#151923] to-[#0A0D14] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1C202C] border border-white/10 flex items-center justify-center mb-3">
                  <Camera className="w-8 h-8 text-[#00DF1A]" />
                </div>
                <span className="text-xs font-semibold text-zinc-200">
                  Visor de Escaneo QR Activo
                </span>
                <span className="text-[11px] font-mono text-zinc-400 mt-1 max-w-[210px]">
                  Apuntá tu cámara o seleccioná uno de los comercios rápidos debajo
                </span>
              </div>
            )}

            {/* Guías de Encuadre QR */}
            <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-2 border-l-2 border-[#00DF1A] rounded-tl-lg shadow-[0_0_8px_#00DF1A]" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-[#00DF1A] rounded-tr-lg shadow-[0_0_8px_#00DF1A]" />
              </div>

              {/* Láser de Escaneo Animado */}
              <motion.div
                animate={{ y: [-70, 70] }}
                transition={{
                  repeat: Infinity,
                  repeatType: "reverse",
                  duration: 1.8,
                  ease: "easeInOut",
                }}
                className="w-full h-[2px] bg-gradient-to-r from-transparent via-[#00DF1A] to-transparent shadow-[0_0_12px_#00DF1A]"
              />

              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-2 border-l-2 border-[#00DF1A] rounded-bl-lg shadow-[0_0_8px_#00DF1A]" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-[#00DF1A] rounded-br-lg shadow-[0_0_8px_#00DF1A]" />
              </div>
            </div>

            {/* Success Overlay */}
            {scannedSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-[#00DF1A]/20 backdrop-blur-xs flex flex-col items-center justify-center"
              >
                <div className="w-14 h-14 rounded-full bg-[#00DF1A] text-[#090D0A] flex items-center justify-center shadow-[0_0_24px_rgba(0,223,26,0.6)]">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <span className="mt-2 text-xs font-mono font-bold text-white bg-black/60 px-3 py-1 rounded-full border border-white/20">
                  {scannedSuccess}
                </span>
              </motion.div>
            )}

            {/* Controles de cámara flotantes */}
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
              <button
                type="button"
                onClick={toggleTorch}
                title="Linterna"
                className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                  torchOn
                    ? "bg-[#CFFF2E] text-black border-[#CFFF2E]"
                    : "bg-black/60 text-white/80 border-white/20 hover:text-white"
                }`}
              >
                <Flashlight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Presets Rápidos de Comercios (Simulación instantánea con un tap) */}
          <div className="p-5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
              <span>O tocar un QR de prueba:</span>
              <span className="text-[#00DF1A] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Red Localito
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DEMO_QR_PRESETS.map((p) => (
                <button
                  key={p.alias}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-3 py-2 rounded-2xl bg-[#171A24] hover:bg-[#1E2330] border border-white/[0.07] hover:border-white/20 flex items-center gap-2.5 text-left transition-all active:scale-95 cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-[#0F1117] border border-white/10 flex items-center justify-center font-mono text-xs font-bold text-[#00DF1A] shrink-0">
                    {p.avatar}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {p.label}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 truncate">
                      $ {p.amount.toLocaleString("es-AR")} ARS
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
