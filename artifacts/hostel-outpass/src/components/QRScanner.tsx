import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RotateCw, AlertTriangle, X, ShieldAlert, CheckCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface CameraDevice {
  id: string;
  label: string;
}

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");
  const [scannerState, setScannerState] = useState<"idle" | "loading" | "scanning" | "permission-denied" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const startScanner = async (cameraId: string) => {
    setScannerState("loading");
    setErrorMessage("");
    try {
      // If an instance is already scanning, stop it
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      // Initialize Html5Qrcode if it doesn't exist
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-target");
      }

      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 15,
          qrbox: (width, height) => {
            const minDim = Math.min(width, height);
            const size = Math.floor(minDim * 0.7);
            return { width: size, height: size };
          },
        },
        (decodedText) => {
          // Success! Provide instant feedback
          setIsSuccess(true);
          onScanSuccess(decodedText);
          
          // Stop scanning and close dialog after a brief delay
          if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(console.error);
          }
          
          setTimeout(() => {
            onClose();
          }, 800);
        },
        () => {
          // Ignore verbose scanner errors (like "no QR code detected in this frame")
        }
      );
      setScannerState("scanning");
      setActiveCameraId(cameraId);
    } catch (err: any) {
      console.error("Error starting QR scanner:", err);
      setScannerState("error");
      setErrorMessage(err.message || "Failed to start camera. Please ensure camera access is granted.");
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsSuccess(false);

    if (isOpen) {
      const initScanner = async () => {
        setScannerState("loading");
        setErrorMessage("");
        try {
          const devices = await Html5Qrcode.getCameras();
          if (!isMounted) return;

          if (devices && devices.length > 0) {
            setCameras(devices);
            // Look for a rear/back camera
            const backCamera = devices.find(device => 
              device.label.toLowerCase().includes("back") || 
              device.label.toLowerCase().includes("environment") ||
              device.label.toLowerCase().includes("rear")
            );
            const defaultId = backCamera ? backCamera.id : devices[0].id;
            await startScanner(defaultId);
          } else {
            setScannerState("error");
            setErrorMessage("No camera devices found on this device.");
          }
        } catch (err: any) {
          if (!isMounted) return;
          console.error("Failed to list cameras:", err);
          setScannerState("permission-denied");
          setErrorMessage(
            err.message || 
            "Camera permission denied or camera is unavailable. Please allow access in browser settings."
          );
        }
      };

      initScanner();
    }

    return () => {
      isMounted = false;
      const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          try {
            await html5QrCodeRef.current.stop();
          } catch (e) {
            console.error("Error stopping scanner on cleanup:", e);
          }
        }
      };
      stopScanner();
    };
  }, [isOpen]);

  const handleCameraChange = async (newCameraId: string) => {
    if (newCameraId === activeCameraId) return;
    await startScanner(newCameraId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white p-6 rounded-2xl">
        <style>{`
          @keyframes scan {
            0%, 100% { top: 8%; }
            50% { top: 92%; }
          }
          .animate-scanner-line {
            animation: scan 2.5s linear infinite;
          }
        `}</style>
        
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <Camera className="w-5 h-5 text-emerald-400" /> Verify with QR Code
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            Position the student outpass QR code in the viewfinder center to scan automatically.
          </DialogDescription>
        </DialogHeader>

        {/* Viewfinder and Camera Frame */}
        <div className="relative w-full aspect-square max-w-sm mx-auto overflow-hidden rounded-2xl bg-black border border-slate-800 flex items-center justify-center">
          <div id="qr-reader-target" className="w-full h-full object-cover" />

          {/* Scanner Overlay UI */}
          {scannerState === "scanning" && !isSuccess && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
              {/* Instructions */}
              <div className="bg-slate-950/80 backdrop-blur-sm px-3 py-1 rounded-full text-slate-300 text-2xs font-medium self-center text-center">
                Center QR Code in box
              </div>
              
              {/* Target Square */}
              <div className="relative w-56 h-56 border border-emerald-500/30 rounded-2xl self-center flex items-center justify-center overflow-hidden bg-slate-950/10">
                {/* Neon Corners */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-emerald-400 -mt-[1px] -ml-[1px] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-emerald-400 -mt-[1px] -mr-[1px] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-emerald-400 -mb-[1px] -ml-[1px] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-emerald-400 -mb-[1px] -mr-[1px] rounded-br-lg" />
                
                {/* Laser scanning bar */}
                <div className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_10px_#34d399,0_0_20px_#10b981] animate-scanner-line" />
              </div>

              {/* Status footer inside camera screen */}
              <div className="text-slate-400 text-3xs font-mono self-center text-center">
                Autodetect Active · 15 FPS
              </div>
            </div>
          )}

          {/* Success Overlay */}
          {isSuccess && (
            <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-bounce">
                <CheckCircle className="w-9 h-9 text-emerald-400" />
              </div>
              <p className="text-emerald-400 font-semibold text-sm">QR Code Decoded ✓</p>
            </div>
          )}

          {/* Loading View */}
          {scannerState === "loading" && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2">
              <Spinner className="w-8 h-8 text-emerald-400" />
              <p className="text-slate-400 text-xs mt-1">Starting camera interface…</p>
            </div>
          )}

          {/* Error and Permission Denied Views */}
          {(scannerState === "error" || scannerState === "permission-denied") && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                {scannerState === "permission-denied" ? (
                  <ShieldAlert className="w-6 h-6 text-rose-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-rose-400 text-sm">
                  {scannerState === "permission-denied" ? "Camera Access Blocked" : "Camera Interface Error"}
                </p>
                <p className="text-slate-400 text-xs mt-1 max-w-[240px] leading-relaxed mx-auto">
                  {errorMessage}
                </p>
              </div>
              {scannerState === "permission-denied" && (
                <div className="text-2xs text-slate-500 bg-slate-900/60 p-2 rounded-lg max-w-[240px] mt-1">
                  Click the camera icon in your browser address bar and choose "Allow".
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera Selector and Close */}
        <div className="flex flex-col gap-3">
          {cameras.length > 1 && scannerState === "scanning" && (
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-800 rounded-xl px-3 py-2">
              <RotateCw className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={activeCameraId}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="bg-transparent text-xs text-slate-300 font-medium flex-1 outline-none border-none cursor-pointer"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id} className="bg-slate-900 text-white">
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
