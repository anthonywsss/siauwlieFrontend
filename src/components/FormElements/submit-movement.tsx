"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { safeGet, safePost } from "@/lib/fetcher";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import { Camera, MapPin, Check, ArrowLeft, ArrowRight, X, Scan, RotateCcw, AlertTriangle } from "lucide-react";
import { useModalWatch } from "@/components/ModalContext";

type BerhasilModal = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  message?: string;
};

export function BerhasilModal({ open, onClose, onCreated, message = "Berhasil dirubah" }: BerhasilModal) {
  useModalWatch(open);
  React.useEffect(() => {
    if (open) {
      try {
        onCreated();
      } catch (err) {

        console.error("BerhasilModal.onCreated error:", err);
      }
    }
  }, [open, onCreated]);

  if (!open) return null;

  return <SuccessPopup message={message} onClose={onClose} />;
}

const AccessDeniedModal = ({ open, onClose, message }: { open: boolean; onClose: () => void; message: string }) => {
  useModalWatch(open);
  
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Akses Ditolak</h3>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">{message}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const parseAssetId = (raw: string): string => {
  const s = String(raw || "").trim();
  if (!s) return s;

  // Try JSON structure
  try {
    const obj = JSON.parse(s);
    const candidate = obj?.asset_id ?? obj?.assetId ?? obj?.id ?? obj?.code ?? obj?.qr ?? null;
    if (candidate && typeof candidate === 'string') return candidate.trim();
  } catch (_) {}

  try {
    const url = new URL(s);
    const byParam = url.searchParams.get("asset_id") || url.searchParams.get("id") || url.searchParams.get("code");
    if (byParam) return byParam.trim();
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length) return segments[segments.length - 1].trim();
  } catch (_) {}

  return s;
};

const STATUS_LABELS: Record<string, string> = {
  outbound_from_factory: "Perjalanan Ke Pabrik",
  outbound_from_client:  "Perjalanan ke Pelanggan",
  outbound_to_client:    "Perjalanan ke Pelanggan",
  outbound_to_factory:   "Perjalanan Ke Pabrik",
  inbound_at_client:     "Digunakan Pelanggan",
  inbound_at_factory:    "Di Pabrik",
};

const formatStatus = (status: string | null | undefined): string => {
  if (!status) return "Unknown";
  if (STATUS_LABELS[status]) return STATUS_LABELS[status];
  return String(status)
    .split("_")
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
};


type Client = { id: number; name: string };

type MovementConfig = {
  value: string;
  label: string;
  icon: string;
  requiresQuantity: boolean;
  clientPolicy: "required" | "forbidden" | "optional";
};

const MOVEMENT_TYPES: MovementConfig[] = [
  { value: "outbound_from_client", label: "Perjalanan ke Pelanggan", icon: "📤", requiresQuantity: true, clientPolicy: "required" },
  { value: "outbound_to_client", label: "Perjalanan ke Pelanggan", icon: "📤", requiresQuantity: true, clientPolicy: "required" },
  { value: "inbound_at_client",  label: "Digunakan Pelanggan",  icon: "📥", requiresQuantity: true, clientPolicy: "required" },
  { value: "outbound_to_factory", label: "Perjalanan Ke Pabrik", icon: "🏭", requiresQuantity: false, clientPolicy: "optional" },
  { value: "outbound_from_factory", label: "Perjalanan Ke Pabrik", icon: "🏭", requiresQuantity: false, clientPolicy: "optional" },
  { value: "inbound_at_factory", label: "Di Pabrik", icon: "🏭", requiresQuantity: false, clientPolicy: "optional" },
];
const USE_PLACEHOLDER_FOR_NON_REQUIRED_CLIENT = false;
const CLIENT_PLACEHOLDER = "-";


const STEPS = [
  { id: 0, title: "Pindai Asset", description: "Scan Kode QR" },
  { id: 1, title: "Pergerakan", description: "Tipe & Informasi lain" },
  { id: 2, title: "Konfirmasi", description: "Kirimkan data" },
];

const SuccessPopup = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Berhasil!</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SubmitMovement() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [assetId, setAssetId] = useState("");
  const [movementType, setMovementType] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [photoBase64, setPhotoBase64] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const scanningRef = useRef(false);

  const [assetCurrentStatus, setAssetCurrentStatus] = useState<string | null>(null);
  const [fetchingAssetStatus, setFetchingAssetStatus] = useState(false);
  const [assetValid, setAssetValid] = useState(false);

  // Access control
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  // QR Scanner
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scanIntervalRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const scanStartTimeRef = useRef<number | null>(null);

  // Photo captur
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showPhotoCamera, setShowPhotoCamera] = useState(false);
  const [photoFacingMode, setPhotoFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  // Authentication check
  useEffect(() => {
    if (!user) router.push("/auth/sign-in");
  }, [user, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await safeGet<{ data: Client[] }>("/clients");
        const list = res?.data ?? [];
        setClients(Array.isArray(list) ? list : []);
      } catch (err) {
      } finally {
        setLoadingClients(false);
      }
    })();
  }, []);

  useEffect(() => {
    const cfg = MOVEMENT_TYPES.find(t => t.value === movementType);
    if (!cfg) return;
    if (cfg.clientPolicy === "required") {
      if (!clientId || !clients.some(c => c.id === clientId)) {
        if (clients[0]) setClientId(clients[0].id);
      }
    } else if (cfg.clientPolicy === "forbidden") {
      if (clientId !== null) setClientId(null);
    }
  }, [movementType, clients]);

  const fileToBase64 = useCallback((file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) { 
        reject(new Error("File terlalu besar (max 10MB)"));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("gagal baca file"));
      reader.readAsDataURL(file);
    }), []);


  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setPhotoBase64(base64);
        setSuccess("Foto berhasil diupload!");
      } catch (err: any) {
        setError(err.message || "Foto gagal diupload");
      }
    } else {
      setPhotoBase64("");
    }
  };

  const startScanner = async () => {
    setScanError(null);
    setShowScanner(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        scanningRef.current = true;
        startScanLoop();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setScanError("Camera access denied or unavailable. Please enable camera permissions.");
      setShowScanner(false);
    }
  };

  const stopScanner = useCallback(() => {
    if (scanIntervalRef.current) {
      cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    scanningRef.current = false;
    setShowScanner(false);
  }, []);

  const toggleCamera = async () => {
    stopScanner();
    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
    setTimeout(startScanner, 300);
  };

  // Photo camera controls
  const startPhotoCamera = async () => {
    try {
      setShowPhotoCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: photoFacingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      });
      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
        photoVideoRef.current.setAttribute('playsinline', 'true');
        await photoVideoRef.current.play();
      }
    } catch (err: any) {
      console.error('Photo camera error:', err);
      setError('Camera access denied or unavailable. Please enable camera permissions.');
      setShowPhotoCamera(false);
    }
  };

  const stopPhotoCamera = useCallback(() => {
    if (photoVideoRef.current?.srcObject) {
      (photoVideoRef.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
      photoVideoRef.current.srcObject = null;
    }
    setShowPhotoCamera(false);
  }, []);

  const togglePhotoCamera = async () => {
    stopPhotoCamera();
    setPhotoFacingMode(photoFacingMode === 'environment' ? 'user' : 'environment');
    setTimeout(startPhotoCamera, 300);
  };

  const capturePhoto = async () => {
    try {
      const video = photoVideoRef.current;
      const canvas = photoCanvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setPhotoBase64(dataUrl);
      setSuccess('Foto berhasil diambil!');
      stopPhotoCamera();
    } catch (err: any) {
      console.error('Capture photo error:', err);
      setError('Gagal mengambil foto. Coba lagi.');
    }
  };

  const startScanLoop = useCallback(() => {
    const scanFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !overlayRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastScanTimeRef.current < 250) {
        scanIntervalRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      lastScanTimeRef.current = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      
      const ctx = canvas.getContext("2d");
      const overlayCtx = overlay.getContext("2d");
      
      if (!ctx || !overlayCtx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        scanIntervalRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      // Record scan start time when we first start actively scanning
      if (!scanStartTimeRef.current) {
        scanStartTimeRef.current = Date.now();
        console.log("QR Scan detection started at:", new Date(scanStartTimeRef.current).toISOString());
      }

      const scale = 0.5;
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      try {
        const { default: jsQR } = await import("jsqr");
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

        if (code && code.data) {
          if (scanStartTimeRef.current) {
            const scanEndTime = Date.now();
            const scanDuration = scanEndTime - scanStartTimeRef.current;
            const scanDurationSeconds = (scanDuration / 1000).toFixed(3);
            
            console.log("QR Code Successfully Detected!");
            console.log(`Detection Speed: ${scanDuration}ms (${scanDurationSeconds} seconds)`);
            console.log(`QR Code Data: ${code.data}`);

            scanStartTimeRef.current = null;
          }

          const scaleUp = 1 / scale;
          
          overlayCtx.strokeStyle = "#00ff00";
          overlayCtx.lineWidth = 4;
          overlayCtx.beginPath();
          overlayCtx.moveTo(code.location.topLeftCorner.x * scaleUp, code.location.topLeftCorner.y * scaleUp);
          overlayCtx.lineTo(code.location.topRightCorner.x * scaleUp, code.location.topRightCorner.y * scaleUp);
          overlayCtx.lineTo(code.location.bottomRightCorner.x * scaleUp, code.location.bottomRightCorner.y * scaleUp);
          overlayCtx.lineTo(code.location.bottomLeftCorner.x * scaleUp, code.location.bottomLeftCorner.y * scaleUp);
          overlayCtx.closePath();
          overlayCtx.stroke();

          const parsedId = parseAssetId(String(code.data));
          setAssetId(parsedId);
          setSuccess(`QR Code detected: ${parsedId}`);
          stopScanner();
          return;
        }
      } catch (err) {
        console.error("QR scan error:", err);
      }

      if (scanningRef.current) {
        scanIntervalRef.current = requestAnimationFrame(scanFrame);
      }
    };

    scanFrame();
  }, [stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
      stopPhotoCamera();
    };
  }, [stopScanner, stopPhotoCamera]);

  const takeLocation = () => {
    return new Promise<void>((resolve) => {
      if (!navigator.geolocation) {
        setError("Geolocation not supported by browser");
        resolve();
        return;
      }

      setBusy(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setSuccess("Location captured successfully");
          setBusy(false);
          resolve();
        },
        (err) => {
          setError(`Location error: ${err.message}`);
          setBusy(false);
          resolve();
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000,
          maximumAge: 300000
        }
      );
    });
  };

  const getCurrentMovementConfig = () => {
    return MOVEMENT_TYPES.find(t => t.value === movementType);
  };

  const deriveMovementFromCurrentStatus = (status: string | null): string => {
    switch (status) {
      case "inbound_at_factory":
        return "outbound_to_client";
      case "outbound_from_client":
        return "inbound_at_client";
      case "outbound_to_client":
        return "inbound_at_client";
      case "inbound_at_client":
        return "outbound_to_factory";
      case "outbound_from_factory":
        return "inbound_at_factory";
      case "outbound_to_factory":
        return "inbound_at_factory";
      default:
        return "outbound_to_client";
    }
  };

  // Role-based access control function
  const checkRoleAccess = (userRole: string | undefined, nextMovementType: string): { allowed: boolean; message?: string } => {
    if (!userRole) {
      return { allowed: false, message: "Role pengguna tidak ditemukan. Silakan login ulang." };
    }

    switch (userRole.toLowerCase()) {
      case "driver":
        if (nextMovementType !== "inbound_at_client" && nextMovementType !== "outbound_to_factory") {
          return { 
            allowed: false, 
            message: "Aset ini belum dapat Anda scan. Silakan minta bantuan Security untuk melakukan scan terlebih dahulu." 
          };
        }
        break;
      
      case "security":
        if (nextMovementType !== "outbound_to_client" && nextMovementType !== "inbound_at_factory") {
          return { 
            allowed: false, 
            message: "Aset ini belum dapat Anda scan. Silakan minta bantuan Driver untuk melakukan scan terlebih dahulu." 
          };
        }
        break;
      
      case "supervisor":
        // Supervisor can submit all movement types
        break;
      
      default:
        return { 
          allowed: false, 
          message: "Role pengguna tidak dikenali. Silakan hubungi administrator." 
        };
    }

    return { allowed: true };
  };

  useEffect(() => {
    if (!assetId || assetId.trim() === "") {
      setAssetCurrentStatus(null);
      setMovementType(null);
      setAssetValid(false);
      return;
    }

    let mounted = true;
    (async () => {
      setFetchingAssetStatus(true);
      setError(null);
      try {
        const rawId = String(assetId).trim();
        const id = encodeURIComponent(rawId);

        let currentStatus: string | null = null;
        let found = false;

        try {
          const resA = await safeGet<{ data: { status: string } }>(`/check-status?asset_id=${encodeURIComponent(rawId)}`);
          currentStatus = resA?.data?.status ?? null;
          found = true;
        } catch (_eA: any) {
          try {
            const resB = await safeGet<{ data: { status: string } }>(`/check-status?id=${encodeURIComponent(rawId)}`);
            currentStatus = resB?.data?.status ?? null;
            found = true;
          } catch (_eB: any) {
            try {
              const resC = await safePost<{ data: { status: string } }>(`/check-status`, { asset_id: rawId });
              currentStatus = resC?.data?.status ?? null;
              found = true;
            } catch (_eC: any) {
              // will fallback to asset lookup next
            }
          }
        }

        // Fallback: fetch asset and read status
        if (currentStatus == null) {
          let asset: any = null;
          try {
            const res1 = await safeGet<{ data: any }>(`/assets/${id}`);
            asset = res1?.data ?? null;
          } catch (e1: any) {
            try {
              const res2 = await safeGet<{ data: any }>(`/asset/${id}`);
              asset = res2?.data ?? null;
            } catch (e2: any) {
              try {
                const res3 = await safeGet<{ data: any[] }>(`/assets?id=${encodeURIComponent(rawId)}`);
                const list = res3?.data;
                asset = Array.isArray(list) ? list.find((a: any) => a?.id === rawId) ?? list[0] ?? null : null;
              } catch (e3: any) {
                // ignore; keep currentStatus null
              }
            }
          }
          if (asset) found = true;
          currentStatus = asset?.status ?? null;
        }

        if (!mounted) return;
        if (!found) {
          setError("QR Tidak Valid");
          setAssetCurrentStatus(null);
          setMovementType(null);
          setAssetValid(false);
          return;
        }
        setAssetCurrentStatus(currentStatus);
        const derived = deriveMovementFromCurrentStatus(currentStatus ?? null);
        
        // Check role-based access control
        const accessCheck = checkRoleAccess(user?.role, derived);
        if (!accessCheck.allowed) {
          setAccessDeniedMessage(accessCheck.message || "Akses ditolak");
          setShowAccessDeniedModal(true);
          setAssetCurrentStatus(null);
          setMovementType(null);
          setAssetValid(false);
          setAssetId(""); // Clear the scanned asset ID
          return;
        }
        
        setMovementType(derived);
        setAssetValid(true);
        setStep(1);

      } catch (err: any) {
        console.error("Failed to fetch asset status:", err);
        // If the API responded with 404/invalid, show a helpful message
        const msg = err?.response?.data?.meta?.message ?? err?.response?.data?.message ?? err?.message ?? "Failed to fetch asset status";
        const statusCode = err?.response?.status;
        const isInvalid = statusCode === 404 || statusCode === 400 || /not\s*found/i.test(String(msg));
        setError(isInvalid ? "QR Tidak Valid" : msg);
        setAssetCurrentStatus(null);
        setMovementType(null);
        setAssetValid(false);
      } finally {
        if (mounted) setFetchingAssetStatus(false);
      }
    })();

    return () => { mounted = false; };
  }, [assetId]);

  useEffect(() => {
    if (!assetCurrentStatus) {
      setWarning(null);
      return;
    }
    const allowed = deriveMovementFromCurrentStatus(assetCurrentStatus);
    if (movementType && movementType !== allowed) {
      setWarning(`Perhatian: Anda hanya dapat mengubah status dari "${assetCurrentStatus}" menjadi "${allowed}".`);
    } else {
      setWarning(null);
    }
  }, [assetCurrentStatus, movementType]);

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 0:
        if (!assetId.trim()) {
          setError("Asset ID is required");
          return false;
        }
        break;

      case 1: {
        if (!movementType) {
          setError("Movement type is required");
          return false;
        }

        const config = getCurrentMovementConfig();

        if (config?.clientPolicy === "required") {
          if (loadingClients) {
            setError("Please wait for clients to load");
            return false;
          }
          const valid = clients.some(c => c.id === clientId);
          if (!valid) {
            setError("Client selection is required for this movement type");
            return false;
          }
        }

        if (config?.requiresQuantity && quantity < 1) {
          setError("Quantity must be at least 1");
          return false;
        }

        // Validate photo
        if (!photoBase64.trim()) {
          setError("Foto bukti wajib diupload sebelum melanjutkan");
          return false;
        }

        // Validate location
        if (!latitude || !longitude) {
          setError("Lokasi wajib direkam sebelum melanjutkan");
          return false;
        }
        break;
      }

      case 2: {
        break;
      }
    }
    return true;
  };


  const handleNext = async () => {
    if (step === 0) {
      if (!validateStep(0)) return;

      if (fetchingAssetStatus) {
        setError("Please wait while we determine the movement type for this asset");
        return;
      }
      if (!assetValid) {
        setError("QR Tidak Valid");
        return;
      }
      setStep(1);
      return;
    }

    if (validateStep(step)) {
      setStep(Math.min(step + 1, 2));
    }
  };

  const handlePrev = () => {
    setStep(Math.max(step - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return;

    setBusy(true);
    setError(null);

    try {
      let finalPhoto = photoBase64;
      if (finalPhoto.startsWith("data:image")) {
        finalPhoto = finalPhoto.split(",")[1];
      }

      const config = getCurrentMovementConfig();

      if (config?.clientPolicy === "required" && !(typeof clientId === 'number' && Number.isFinite(clientId) && clients.some(c => c.id === clientId))) {
        setError("Client selection is required for this movement type");
        setBusy(false);
        return;
      }

      const body: any = {
        asset_id: assetId.trim(),
        movement_type: movementType,
        ...(Number.isFinite(Number(latitude)) ? { latitude: clamp(Number(latitude), -90, 90) } : {}),
        ...(Number.isFinite(Number(longitude)) ? { longitude: clamp(Number(longitude), -180, 180) } : {}),
        photo: finalPhoto || "",
        notes: notes.trim() || ""
      };

      if (config?.requiresQuantity) {
        body.quantity = clamp(Math.trunc(Number(quantity) || 0), 1, 32767);
      }
      if (config?.clientPolicy === "required") {
        if (typeof clientId === 'number' && Number.isFinite(clientId)) {
          body.client_id = clientId;
          if (movementType === 'inbound_at_factory') {
            (body as any).factory_id = body.client_id;
          }
        } else {
          throw new Error("Client is required but missing");
        }
      } else {
        if (USE_PLACEHOLDER_FOR_NON_REQUIRED_CLIENT) {
          body.client_id = CLIENT_PLACEHOLDER;
        } else {
          if ('client_id' in body) delete (body as any).client_id;
        }
      }

      if (body.client_id == null || body.client_id === "") {
        delete (body as any).client_id;
      }

      console.log("Submitting movement (payload):", JSON.stringify(body));
      const res = await safePost<{ data: any }>("/movements", body);

      // Show success popup
      setShowSuccessPopup(true);

      // Reset form
      setAssetId("");
      setMovementType(null);
      setClientId(null);
      setQuantity(1);
      setLatitude(null);
      setLongitude(null);
      setPhotoBase64("");
      setNotes("");
      setStep(0);

    } catch (err: any) {
      console.error("Submit error details:", {
        response: err.response?.data,
        status: err.response?.status,
        message: err.message
      });

      const msg = err?.response?.data?.error ||
                  err?.response?.data?.message ||
                  err?.response?.data?.meta?.message ||
                  err?.message ||
                  "Submission failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };


  if (!user) return null;

  const currentConfig = getCurrentMovementConfig();

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6">
      {/* Success Popup */}
      <BerhasilModal
        open={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        onCreated={() => {
          console.log("Movement created — show success UI");
        }}
      />

      {/* Access Denied Modal */}
      <AccessDeniedModal
        open={showAccessDeniedModal}
        onClose={() => setShowAccessDeniedModal(false)}
        message={accessDeniedMessage}
      />

      
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 animate-fadeIn">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Laporan Pergerakan</h1>
          <p className="text-sm sm:text-base text-gray-600">Rekam jejak asset dengan memindai kode QR</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex justify-center w-full">
            <div className="flex items-center justify-between max-w-xl sm:max-w-2xl mx-auto w-full sm:mr-0 sm:pr-8">
              {STEPS.map((s, index) => (
                <div key={s.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center text-center min-w-0">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base md:text-lg transition-all duration-300 ${
                      step >= s.id 
                        ? 'bg-blue-600 text-white scale-110' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step > s.id ? <Check className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" /> : s.id + 1}
                    </div>
                    <div className="mt-1 sm:mt-2 md:mt-3">
                      <div className={`text-xs sm:text-sm md:text-base lg:text-lg font-semibold transition-colors duration-300 whitespace-nowrap ${step >= s.id ? 'text-blue-600' : 'text-gray-500'}`}>
                        {s.title}
                      </div>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 sm:mx-3 md:mx-4 lg:mx-6 transition-colors duration-300 ${
                      step > s.id ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 sm:mb-6 animate-fadeIn">
            <div className="flex items-start">
              <X className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-red-800 text-sm sm:text-base">{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 sm:mb-6 animate-fadeIn">
            <div className="flex items-start">
              <Check className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-green-800 text-sm sm:text-base">{success}</div>
            </div>
          </div>
        )}

        {warning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 sm:mb-6 animate-fadeIn">
            <div className="flex items-start">
              <X className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-yellow-800 text-sm sm:text-base">{warning}</div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          {step === 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Pindai kode QR</h2>
              
              {/* QR Scanner */}
              <div className="flex justify-center">
                <div className={`transition-all duration-1000 ease-out transform ${
                  showScanner 
                    ? 'w-full max-w-none scale-100 opacity-100' 
                    : 'w-full max-w-md scale-95 opacity-100'
                }`}>
                  {showScanner ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-3 sm:p-4 md:p-6 relative overflow-hidden animate-expandScanner bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-lg shadow-lg"
                          playsInline
                          muted
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <canvas
                          ref={overlayRef}
                          className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg"
                        />
                        
                        {/* Scanner frame overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64 border-4 border-blue-500 rounded-2xl relative animate-scannerFrame shadow-lg">
                            {/* Corner */}
                            <div className="absolute -top-1 -left-1 sm:-top-2 sm:-left-2 w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 border-t-4 border-l-4 border-blue-400 animate-cornerPulse rounded-tl-lg"></div>
                            <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 border-t-4 border-r-4 border-blue-400 animate-cornerPulse rounded-tr-lg"></div>
                            <div className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 border-b-4 border-l-4 border-blue-400 animate-cornerPulse rounded-bl-lg"></div>
                            <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 border-b-4 border-r-4 border-blue-400 animate-cornerPulse rounded-br-lg"></div>
                            
                            {/*  line */}
                            <div className="absolute top-0 left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scanMobile rounded-full shadow-lg"></div>
                            
                            {/* Scanning grid overlay */}
                            <div className="absolute inset-2 border border-blue-300 rounded-xl opacity-30 animate-gridPulse"></div>
                            <div className="absolute inset-4 border border-blue-200 rounded-lg opacity-20 animate-gridPulse" style={{animationDelay: '0.5s'}}></div>
                          </div>
                        </div>
                        
                        <button
                          onClick={stopScanner}
                          className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 p-1.5 sm:p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-300 animate-fadeInDelay shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        </button>
                        
                        <button
                          onClick={toggleCamera}
                          className="absolute top-8 right-2 sm:top-12 sm:right-3 md:top-16 md:right-4 p-1.5 sm:p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all duration-300 animate-fadeInDelay shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        </button>
                        
                        <div className="absolute bottom-2 left-2 right-2 text-center animate-fadeInDelay">
                          <div className="bg-black bg-opacity-70 text-white px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm rounded-lg animate-textPulse backdrop-blur-sm shadow-lg">
                            Posisikan QR dalam frame
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer hover:border-blue-500 transition-all duration-700 hover:scale-[1.03] hover:shadow-lg w-full animate-contractScanner bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50"
                      onClick={startScanner}
                    >
                      <div className="bg-gradient-to-br from-blue-100 to-indigo-200 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-6 animate-iconPulse shadow-lg">
                        <Scan className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-base sm:text-lg md:text-xl mb-2 sm:mb-3 text-gray-800">Pindai kode QR</h3>
                      <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-3 sm:mb-4 leading-relaxed">Gunakan kamera untuk memindai kode QR asset</p>
                      <div className="text-xs text-gray-500 flex items-center justify-center">
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {scanError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 animate-fadeIn">
                  <div className="text-yellow-800 text-sm sm:text-base">{scanError}</div>
                </div>
              )}

              <div className="flex justify-end pt-3 sm:pt-4">
                <button
                  onClick={handleNext}
                  disabled={!assetId.trim() || busy}
                  className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-all duration-300 hover:scale-[1.02] text-sm sm:text-base"
                >
                  Selanjutnya
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Pergerakan</h2>
              
              {/* Asset ID Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex justify-between items-center animate-fadeIn">
                <div>
                  <div className="text-sm sm:text-base text-blue-700">ID Asset</div>
                  <div className="font-medium text-blue-900 text-base sm:text-lg">{assetId}</div>
                </div>
                <button 
                  onClick={() => setStep(0)}
                  className="text-blue-600 hover:text-blue-800 text-sm sm:text-base font-medium transition-colors"
                >
                  Ubah
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* MOVEMENT TYPE */}
                <div className="md:col-span-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700 mb-3">
                    Pergerakan (Sistem Otomatis)
                  </label>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Current status card */}
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 min-w-0 flex-1">
                      <div className="text-sm text-gray-500">Status Pergerakan Saat ini</div>
                      <div className="font-medium text-base mt-1">{formatStatus(assetCurrentStatus)}</div>
                    </div>

                    {/* Arrow between cards */}
                    <div className="flex items-center justify-center">
                      <div
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm transform md:rotate-0 rotate-90"
                        aria-hidden="true"
                        title="Next status"
                      >
                        <ArrowRight className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>

                    {/* Next status card */}
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 min-w-0 flex-1">
                      <div className="text-sm text-blue-700">Status Pergerakan Selanjutnya</div>
                      <div className="font-medium text-base mt-1">
                        {movementType ? formatStatus(movementType) : (fetchingAssetStatus ? "Determining..." : "Unknown")}
                      </div>
                      {fetchingAssetStatus && <div className="text-sm text-gray-500 mt-1">Please wait — fetching asset info...</div>}
                    </div>
                  </div>


                  <div className="text-sm text-gray-500 mt-2">
                    Status pergerakan ini diisi oleh sistem secara otomatis.
                  </div>
                </div>

                {/* Client*/}
                {currentConfig?.clientPolicy === "required" && (
                  <div className="md:col-span-2 animate-fadeIn">
                  </div>
                )}

                {/* Quantity*/}
                {currentConfig?.requiresQuantity && (
                  <div className="animate-fadeIn">
                    <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                      Kuantitas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                    Catatan
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                    placeholder="Tambahkan catatan mengenai pergerakan ini ..."
                  />
                </div>

                {/* Photo Capture */}
                <div className="md:col-span-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                    Bukti Foto <span className="text-red-500">*</span>
                  </label>

                  {showPhotoCamera ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-3 sm:p-4 md:p-6 relative overflow-hidden animate-expandScanner bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="relative">
                        <video
                          ref={photoVideoRef}
                          className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-lg shadow-lg"
                          playsInline
                          muted
                        />
                        <canvas ref={photoCanvasRef} className="hidden" />

                      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6">
                        {/* Close button */}
                        <button
                          onClick={stopPhotoCamera}
                          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all duration-300 hover:shadow-xl transform hover:scale-105 active:scale-95"
                        >
                          <X className="w-6 h-6 text-gray-700" />
                        </button>
                        
                        {/* Capture button */}
                        <button
                          onClick={capturePhoto}
                          className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-xl flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 hover:shadow-2xl"
                          title="Ambil Foto"
                        >
                          <Camera className="w-7 h-7 text-white" />
                        </button>
                        
                        {/* Switch camera button */}
                        <button
                          onClick={togglePhotoCamera}
                          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all duration-300 hover:shadow-xl"
                        >
                          <RotateCcw className="w-6 h-6 text-gray-700" />
                        </button>
                      </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                      <button
                        type="button"
                        onClick={startPhotoCamera}
                        className={`flex-1 border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 ${
                          photoBase64 
                            ? 'border-green-300 bg-green-50 hover:border-green-400' 
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <Camera className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 transition-colors ${
                          photoBase64 ? 'text-green-500' : 'text-gray-400'
                        }`} />
                        <div className={`text-sm sm:text-base transition-colors ${
                          photoBase64 ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {photoBase64 ? 'Ambil Ulang Foto' : 'Ambil Foto *'}
                        </div>
                      </button>

                      {photoBase64 && (
                        <div className="flex-1">
                          <img
                            src={photoBase64}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-lg border shadow-sm"
                          />
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={startPhotoCamera}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Ambil Ulang
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Location Capture */}
                <div className="md:col-span-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                    Lokasi <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={takeLocation}
                      disabled={busy}
                      className={`group relative overflow-hidden flex items-center justify-center px-6 py-3 rounded-xl font-medium text-base sm:text-lg transition-all duration-500 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                        latitude && longitude
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                      }`}
                    >
                      {/* Animated background */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="absolute inset-0 rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-white/30 rounded-full scale-0 group-active:scale-100 transition-transform duration-300 origin-center"></div>
                      </div>
                      
                      <div className="relative flex items-center">
                        <div className={`mr-3 transition-all duration-300 ${busy ? 'animate-spin' : 'group-hover:scale-110'}`}>
                          <MapPin className={`w-5 h-5 transition-all duration-300 ${
                            latitude && longitude 
                              ? 'text-white drop-shadow-sm' 
                              : 'text-white drop-shadow-sm'
                          }`} />
                        </div>
                        
                        <span className="relative transition-all duration-300 group-hover:tracking-wide">
                          {busy 
                            ? "Mengambil Lokasi..." 
                            : latitude && longitude 
                              ? "Perbarui Lokasi" 
                              : "Rekam Lokasi *"
                          }
                        </span>
                      </div>
                      
                      {/* Success indicator */}
                      {latitude && longitude && (
                        <div>
                          <div className="w-full h-full bg-emerald-400 rounded-full animate-ping"></div>
                        </div>
                      )}
                    </button>
                    
                    {latitude && longitude && (
                      <div className="flex items-center space-x-2 animate-fadeIn">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <div className="text-sm sm:text-base text-green-700 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-200">
                          📍 {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 sm:pt-6">
                <button
                  onClick={handlePrev}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 text-base sm:text-lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                  Kembali
                </button>
                <button
                  onClick={handleNext}
                  disabled={busy || (currentConfig?.clientPolicy === "required" && !clients.some(c => c.id === clientId))}
                  className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-base sm:text-lg"
                >
                  Selanjutnya
                  <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3 sm:mb-4">Konfirmasi Laporan</h2>
              
              {/* Summary Card */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <h3 className="font-medium text-xl mb-3 sm:mb-4">Rangkuman Pergerakan</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-base sm:text-lg">ID Asset:</span>
                    <span className="font-medium text-base sm:text-lg">{assetId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-base sm:text-lg">Status Pergerakan:</span>
                    <span className="font-medium text-base sm:text-lg">
                      {MOVEMENT_TYPES.find(t => t.value === movementType)?.label}
                    </span>
                  </div>
                  {currentConfig?.clientPolicy === "required" && clientId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-base sm:text-lg">Klien:</span>
                      <span className="font-medium text-base sm:text-lg">
                        {clients.find(c => c.id === clientId)?.name}
                      </span>
                    </div>
                  )}
                  {currentConfig?.requiresQuantity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-base sm:text-lg">Kuantitas:</span>
                      <span className="font-medium text-base sm:text-lg">{quantity}</span>
                    </div>
                  )}
                  {notes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-base sm:text-lg">Catatan:</span>
                      <span className="font-medium text-base sm:text-lg">{notes}</span>
                    </div>
                  )}
                  {latitude && longitude && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-base sm:text-lg">Lokasi:</span>
                      <span className="font-medium text-base sm:text-lg">
                        {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Preview */}
              {photoBase64 && (
                <div>
                  <h3 className="font-medium text-xl mb-3 sm:mb-4">Bukti Foto</h3>
                  <img
                    src={photoBase64}
                    alt="Movement evidence"
                    className="w-full max-w-md rounded-lg border"
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 sm:pt-6">
                <button
                  onClick={handlePrev}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 text-base sm:text-lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                  Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={busy || (currentConfig?.clientPolicy === "required" && !clients.some(c => c.id === clientId))}
                  className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-base sm:text-lg"
                >
                  {busy ? "Mengirim ..." : "Konfirmasi Laporan"}
                  <Check className="w-4 h-4 ml-1 sm:ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes expandScanner {
          0% { 
            transform: scale(0.85) rotateY(-5deg);
            opacity: 0;
            filter: blur(2px);
          }
          50% {
            transform: scale(0.95) rotateY(0deg);
            opacity: 0.7;
            filter: blur(1px);
          }
          100% { 
            transform: scale(1) rotateY(0deg);
            opacity: 1;
            filter: blur(0px);
          }
        }
        @keyframes contractScanner {
          0% { 
            transform: scale(1.05) rotateX(2deg);
            opacity: 0.9;
          }
          100% { 
            transform: scale(1) rotateX(0deg);
            opacity: 1;
          }
        }
        @keyframes scannerFrame {
          0% { 
            transform: scale(0.8) rotate(-2deg);
            opacity: 0;
            filter: brightness(0.8);
          }
          50% {
            transform: scale(0.95) rotate(-1deg);
            opacity: 0.5;
            filter: brightness(0.9);
          }
          100% { 
            transform: scale(1) rotate(0deg);
            opacity: 1;
            filter: brightness(1);
          }
        }
        @keyframes fadeInDelay {
          0% { 
            opacity: 0;
            transform: translateY(15px) scale(0.9);
          }
          60% { 
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          100% { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes scanMobile {
          0% { 
            top: 0%; 
            opacity: 0;
            transform: scaleX(0.5);
          }
          10% {
            opacity: 1;
            transform: scaleX(1);
          }
          50% { 
            top: 100%; 
            opacity: 1;
            transform: scaleX(1);
          }
          90% {
            opacity: 1;
            transform: scaleX(0.8);
          }
          100% { 
            top: 0%; 
            opacity: 0;
            transform: scaleX(0.3);
          }
        }
        @keyframes cornerPulse {
          0%, 100% { 
            opacity: 0.6;
            transform: scale(1);
            filter: brightness(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.1);
            filter: brightness(1.2);
          }
        }
        @keyframes gridPulse {
          0%, 100% { 
            opacity: 0.2;
            transform: scale(1);
          }
          50% { 
            opacity: 0.4;
            transform: scale(1.02);
          }
        }
        @keyframes iconPulse {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
          }
          50% { 
            transform: scale(1.05) rotate(2deg);
            filter: brightness(1.1);
          }
        }
        @keyframes textPulse {
          0%, 100% { 
            opacity: 0.9;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.02);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.4s ease-out forwards;
        }
        .animate-expandScanner {
          animation: expandScanner 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-contractScanner {
          animation: contractScanner 0.5s ease-out forwards;
        }
        .animate-scannerFrame {
          animation: scannerFrame 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s forwards;
          opacity: 0;
        }
        .animate-fadeInDelay {
          animation: fadeInDelay 1.2s ease-out forwards;
          opacity: 0;
        }
        .animate-scanMobile {
          animation: scanMobile 3s ease-in-out infinite;
        }
        .animate-cornerPulse {
          animation: cornerPulse 2s ease-in-out infinite;
        }
        .animate-gridPulse {
          animation: gridPulse 3s ease-in-out infinite;
        }
        .animate-iconPulse {
          animation: iconPulse 2.5s ease-in-out infinite;
        }
        .animate-textPulse {
          animation: textPulse 2s ease-in-out infinite;
        }

        @media (max-width: 640px) {
          .animate-expandScanner {
            animation-duration: 0.6s;
          }
          .animate-scannerFrame {
            animation-duration: 0.8s;
            animation-delay: 0.3s;
          }
          .animate-fadeInDelay {
            animation-duration: 1s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-expandScanner,
          .animate-contractScanner,
          .animate-scannerFrame,
          .animate-fadeInDelay,
          .animate-scanMobile,
          .animate-cornerPulse,
          .animate-gridPulse,
          .animate-iconPulse,
          .animate-textPulse {
            animation-duration: 0.3s;
            animation-iteration-count: 1;
          }
        }

      `}</style>
    </div>
  );
}
