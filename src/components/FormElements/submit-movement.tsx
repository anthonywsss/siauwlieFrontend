"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { safeGet, safePost } from "@/lib/fetcher";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import { Camera, MapPin, Check, ArrowLeft, ArrowRight, X, Scan, RotateCcw, AlertTriangle, ChevronDown, Search } from "lucide-react";
import { useModalWatch } from "@/components/ModalContext";
import Resizer from "react-image-file-resizer";

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
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Akses Ditolak</h3>
          <p className="text-gray-600 mb-4 text-lg leading-relaxed">{message}</p>
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
  requiresReturnQuantity: boolean;
  clientPolicy: "required" | "forbidden" | "optional";
};

const MOVEMENT_TYPES: MovementConfig[] = [
  { value: "outbound_to_client", label: "Perjalanan ke Pelanggan", icon: "📤", requiresQuantity: true, requiresReturnQuantity: false, clientPolicy: "required" },
  { value: "inbound_at_client",  label: "Digunakan Pelanggan",  icon: "📥", requiresQuantity: true, requiresReturnQuantity: false, clientPolicy: "required" },
  { value: "outbound_to_factory", label: "Perjalanan Ke Pabrik", icon: "🏭", requiresQuantity: true, requiresReturnQuantity: true, clientPolicy: "required" },
  { value: "inbound_at_factory", label: "Di Pabrik", icon: "🏭", requiresQuantity: true, requiresReturnQuantity: true, clientPolicy: "required" },
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
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Berhasil!</h3>
          <p className="text-gray-600 mb-4 text-lg">{message}</p>
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

const WarningModal = ({ open, onClose, message }: { open: boolean; onClose: () => void; message: string }) => {
  useModalWatch(open);
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 animate-scaleIn">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Peringatan</h3>
          <p className="text-gray-600 mb-4 text-lg leading-relaxed">{message}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// --- CHANGE 1: Define a type for the data we fetch and store ---
type FetchedAssetData = {
  quantity: number;
  return_quantity: number;
  client_id: number;
};

export default function SubmitMovement() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [assetId, setAssetId] = useState("");
  const [movementType, setMovementType] = useState<string | null>(null);

  // States for form inputs
  const [clientId, setClientId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [returnQuantity, setReturnQuantity] = useState<number | null>(null);

  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningModalMessage, setWarningModalMessage] = useState("");
  const scanningRef = useRef(false);

  // States for asset status validation
  const [assetCurrentStatus, setAssetCurrentStatus] = useState<string | null>(null);
  const [fetchingAssetStatus, setFetchingAssetStatus] = useState(false);
  const [assetValid, setAssetValid] = useState(false);

  // --- CHANGE 2: Create a state to explicitly STORE the fetched asset data ---
  // This object holds the data from the API for the currently scanned asset.
  const [fetchedAssetData, setFetchedAssetData] = useState<FetchedAssetData | null>(null);


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

  // Photo capture
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showPhotoCamera, setShowPhotoCamera] = useState(false);
  const [photoFacingMode, setPhotoFacingMode] = useState<'environment' | 'user'>('environment');

  // Searchable dropdown state
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement | null>(null);

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
    }
  }, [movementType, clients]);

  const compressImage = useCallback((file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) {  
        reject(new Error("File terlalu besar (max 10MB)"));
        return;
      }

      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        
        img.onload = () => {
          try {
            Resizer.imageFileResizer(
              file,
              img.width,
              img.height,
              "JPEG",  
              55, // quality
              0,
              (uri) => {
                resolve(uri as string);
              },
              "base64" // outputType
            );
          } catch (err) {
            reject(new Error("Gagal mengkompresi gambar"));
          }
        };
        
        img.onerror = () => {
          reject(new Error("Gagal membaca dimensi gambar"));
        };
      };
      
      reader.onerror = () => {
        reject(new Error("Gagal membaca file"));
      };
      
      reader.readAsDataURL(file);
    }), []);

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
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
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
      if (photos.length >= 3) {
        setError('Maksimal 3 foto. Hapus foto yang ada untuk menambah foto baru.');
        return;
      }

      const video = photoVideoRef.current;
      const canvas = photoCanvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob, then compress
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setError('Gagal mengambil foto. Coba lagi.');
          return;
        }
        
        try {
          // Convert blob to file for compression
          const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
          const compressedBase64 = await compressImage(file);
          setPhotos(prev => [...prev, compressedBase64]);
          setSuccess(`Foto ${photos.length + 1} berhasil diambil dan dikompres!`);
          stopPhotoCamera();
        } catch (err: any) {
          console.error('Compress photo error:', err);
          // Fallback to uncompressed if compression fails
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setPhotos(prev => [...prev, dataUrl]);
          setSuccess(`Foto ${photos.length + 1} berhasil diambil!`);
          stopPhotoCamera();
        }
      }, 'image/jpeg', 0.92);
    } catch (err: any) {
      console.error('Capture photo error:', err);
      setError('Gagal mengambil foto. Coba lagi.');
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setSuccess('Foto berhasil dihapus');
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

      if (!scanStartTimeRef.current) {
        scanStartTimeRef.current = Date.now();
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false);
      }
    };

    if (isClientDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isClientDropdownOpen]);

  // Filter clients based on search query
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const takeLocation = () => {
    return new Promise<{ success: boolean; error?: string; latitude?: number; longitude?: number }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ success: false, error: "Geolocation not supported by browser" });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setLatitude(lat);
          setLongitude(lng);
          resolve({ success: true, latitude: lat, longitude: lng });
        },
        (err) => {
          resolve({ success: false, error: err.message });
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
      case "outbound_to_client":
        return "inbound_at_client";
      case "inbound_at_client":
        return "outbound_to_factory";
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
    setQuantity(null);
    setReturnQuantity(null);
    setClientId(null);
    setFetchedAssetData(null);
    return;
  }

  let mounted = true;
  (async () => {
    setFetchingAssetStatus(true);
    setError(null);
    try {
      const rawId = String(assetId).trim();

      const res = await safePost<{ 
        data: { 
          status: string;
          quantity?: number;
          return_quantity?: number;
          client_id?: number;
        } 
      }>(`/check-status`, { asset_id: rawId });
      
      if (!mounted) return;

      if (!res?.data) {
        throw new Error("Asset not found or invalid response from server.");
      }

      const { status, quantity, return_quantity, client_id } = res.data;
      
      // STORE the fetched data
      const assetData: FetchedAssetData = {
        quantity: Number(quantity || 0),
        return_quantity: Number(return_quantity || 0),
        client_id: Number(client_id || 0),
      };
      setFetchedAssetData(assetData);
      setAssetCurrentStatus(status ?? null);
      const derivedMovement = deriveMovementFromCurrentStatus(status ?? null);

      // Check role-based access
      const accessCheck = checkRoleAccess(user?.role, derivedMovement);
      if (!accessCheck.allowed) {
        setAccessDeniedMessage(accessCheck.message || "Akses ditolak");
        setShowAccessDeniedModal(true);
        setAssetValid(false);
        setAssetId("");
        return;
      }
      
      setMovementType(derivedMovement);
      setAssetValid(true);

      // PERBAIKAN: Konsisten dalam pengaturan form fields berdasarkan status saat ini
      switch (status) {
        case "inbound_at_factory":
          // Asset di pabrik - reset semua untuk siklus baru
          setQuantity(null);
          setReturnQuantity(null);
          setClientId(null);
          break;
        
        case "outbound_to_client":
          // Asset dalam perjalanan ke klien - tampilkan data dari pabrik
          setQuantity(assetData.quantity);
          setReturnQuantity(null);
          // Pastikan client_id ada sebelum diset
          setClientId(assetData.client_id && assetData.client_id > 0 ? assetData.client_id : null);
          break;
        
        case "inbound_at_client":
          // Asset di klien - tampilkan semua data saat ini
          setQuantity(assetData.quantity);
          setReturnQuantity(assetData.return_quantity);
          // Pastikan client_id ada sebelum diset
          setClientId(assetData.client_id && assetData.client_id > 0 ? assetData.client_id : null);
          break;
        
        case "outbound_to_factory":
          // Asset di klien - tampilkan semua data saat ini
          setQuantity(assetData.quantity);
          setReturnQuantity(assetData.return_quantity);
          // Pastikan client_id ada sebelum diset
          setClientId(assetData.client_id && assetData.client_id > 0 ? assetData.client_id : null);
          break;
        
        default:
          // Fallback - gunakan data dari API
          setQuantity(assetData.quantity);
          setReturnQuantity(assetData.return_quantity);
          setClientId(assetData.client_id && assetData.client_id > 0 ? assetData.client_id : null);
      }

      console.log("Stored data from /check-status:", { status, ...assetData });
      setStep(1);

    } catch (err: any) {
      console.error("Failed to fetch asset status via POST:", err);
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
}, [assetId, user?.role]);


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

        if (config?.requiresQuantity && (quantity === null || quantity < 0)) {
          setError("Quantity must be at least 0");
          return false;
        }

        if (config?.requiresReturnQuantity && (returnQuantity === null || returnQuantity < 0)) {
          setError("Return quantity must be at least 0");
          return false;
        }

        if (photos.length === 0) {
          setWarningModalMessage("Minimal 1 foto bukti wajib diupload sebelum melanjutkan");
          setShowWarningModal(true);
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
    const newStep = Math.max(step - 1, 0);
    setStep(newStep);
    
    // Reset relevant state when going back to step 0
    if (newStep === 0) {
      setAssetId("");
      setMovementType(null);
      setAssetCurrentStatus(null);
      setAssetValid(false);
      setError(null);
      setSuccess(null);
      setWarning(null);
      setPhotos([]);
      setQuantity(null);
      setReturnQuantity(null);
      // --- CHANGE 6: Reset the stored data when going back to the scan step ---
      setFetchedAssetData(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return;
  
    setBusy(true);
    setError(null);
  
    try {
      // 1. Get Location (Required for all submissions)
      let finalLatitude = latitude;
      let finalLongitude = longitude;
      if (!finalLatitude || !finalLongitude) {
        const locationResult = await takeLocation();
        if (!locationResult.success) {
          throw new Error(`Location is required. ${locationResult.error || 'Please enable location services.'}`);
        }
        finalLatitude = locationResult.latitude!;
        finalLongitude = locationResult.longitude!;
      }
  
      // 2. Process Photos
      if (photos.length === 0) {
        throw new Error("At least one photo is required for submission.");
      }
      const processedPhotos = photos.map(photo => {
        return photo.startsWith("data:image") ? photo.split(",")[1] : photo;
      });
  
      // 3. Build the core submission payload
      const body: any = {
        asset_id: assetId.trim(),
        movement_type: movementType,
        latitude: clamp(Number(finalLatitude), -90, 90),
        longitude: clamp(Number(finalLongitude), -180, 180),
        notes: notes.trim() || "",
        photo: processedPhotos[0],
      };
  
      // 4. Add fields EXACTLY as per the validation rules
      switch (movementType) {
        case 'outbound_to_client':
          // Rule: client_id=R, quantity=R, return_quantity=F
          if (!clientId) throw new Error("Client selection is required.");
          body.client_id = Number(clientId);
          body.quantity = clamp(Math.trunc(Number(quantity) || 0), 0, 32767);
          break;
  
        case 'inbound_at_client':
          // Rule: client_id=R, quantity=R, return_quantity=F
          if (!clientId) throw new Error("Client information is missing.");
          body.client_id = Number(clientId);
          body.quantity = clamp(Math.trunc(Number(quantity) || 0), 0, 32767);
          break;
  
        case 'outbound_to_factory':
          // Rule: client_id=F, quantity=F, return_quantity=R
          body.return_quantity = clamp(Math.trunc(Number(returnQuantity) || 0), 0, 32767);
          break;
  
        case 'inbound_at_factory':
          // Rule: client_id=F, quantity=F, return_quantity=F
          break;
  
        default:
          throw new Error(`Invalid movement type: ${movementType}`);
      }
  
      // 5. Submit the data
      console.log("Submitting movement (payload):", JSON.stringify(body, null, 2));
      await safePost<{ data: any }>("/movements", body);
      
      setShowSuccessPopup(true);
  
      // 6. Reset the form
      setAssetId("");
      setMovementType(null);
      setClientId(null);
      setQuantity(null);
      setReturnQuantity(null);
      setLatitude(null);
      setLongitude(null);
      setPhotos([]);
      setNotes("");
      setStep(0);
  
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Submission failed";
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

      {/* Warning Modal */}
      <WarningModal
        open={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        message={warningModalMessage}
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
            <div className="flex items-center justify-between max-w-55 sm:max-w-[25rem] w-full mx-auto">
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
              <div className={`${showScanner ? '-mx-4 sm:-mx-6' : 'flex justify-center'}`}>
                <div className={`transition-all duration-1000 ease-out transform ${
                  showScanner 
                    ? 'w-full max-w-none scale-100 opacity-100' 
                    : 'w-full max-w-md scale-95 opacity-100'
                }`}>
                  {showScanner ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-none sm:rounded-xl p-0 relative overflow-hidden animate-expandScanner bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          className="w-full h-[50vh] xsm:h-[55vh] sm:h-[60vh] md:h-96 lg:h-[500px] object-cover rounded-none sm:rounded-lg shadow-lg"
                          playsInline
                          muted
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <canvas
                          ref={overlayRef}
                          className="absolute top-0 left-0 w-full h-full pointer-events-none rounded-lg"
                        />
                        
                        {/* Scanner frame overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 xsm:w-56 xsm:h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 border-4 sm:border-[5px] border-blue-500 rounded-2xl sm:rounded-3xl relative animate-scannerFrame shadow-2xl">
                            {/* Corner accents */}
                            <div className="absolute -top-2 -left-2 sm:-top-3 sm:-left-3 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 border-t-[5px] border-l-[5px] sm:border-t-[6px] sm:border-l-[6px] border-blue-400 animate-cornerPulse rounded-tl-xl"></div>
                            <div className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 border-t-[5px] border-r-[5px] sm:border-t-[6px] sm:border-r-[6px] border-blue-400 animate-cornerPulse rounded-tr-xl"></div>
                            <div className="absolute -bottom-2 -left-2 sm:-bottom-3 sm:-left-3 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 border-b-[5px] border-l-[5px] sm:border-b-[6px] sm:border-l-[6px] border-blue-400 animate-cornerPulse rounded-bl-xl"></div>
                            <div className="absolute -bottom-2 -right-2 sm:-bottom-3 sm:-right-3 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 border-b-[5px] border-r-[5px] sm:border-b-[6px] sm:border-r-[6px] border-blue-400 animate-cornerPulse rounded-br-xl"></div>
                            
                            {/* Scanning line */}
                            <div className="absolute top-0 left-0 right-0 h-1 sm:h-1.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-scanMobile rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                            
                            {/* Scanning grid overlay */}
                            <div className="absolute inset-3 sm:inset-4 border-2 border-blue-300 rounded-xl opacity-30 animate-gridPulse"></div>
                            <div className="absolute inset-6 sm:inset-8 border border-blue-200 rounded-lg opacity-20 animate-gridPulse" style={{animationDelay: '0.5s'}}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex items-center justify-center gap-4 sm:gap-6 px-4">
                        <button
                          onClick={stopScanner}
                          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all duration-300 hover:shadow-xl transform hover:scale-105 active:scale-95 touch-manipulation"
                        >
                          <X className="w-6 h-6 sm:w-5 sm:h-5 text-gray-700" />
                        </button>
                        
                        <button
                          onClick={toggleCamera}
                          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all duration-300 hover:shadow-xl transform hover:scale-105 active:scale-95 touch-manipulation"
                        >
                          <RotateCcw className="w-6 h-6 sm:w-5 sm:h-5 text-gray-700" />
                        </button>
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
                {/* MOVEMENT TYPE DISPLAY (READ-ONLY) */}
                <div className="md:col-span-2">
                  <label className="block text-base sm:text-lg font-medium text-gray-700 mb-3">
                    Pergerakan (Sistem Otomatis)
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 min-w-0 flex-1">
                      <div className="text-sm text-gray-500">Status Pergerakan Saat ini</div>
                      <div className="font-medium text-base mt-1">{formatStatus(assetCurrentStatus)}</div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div
                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm transform md:rotate-0 rotate-90"
                        aria-hidden="true"
                        title="Next status"
                      >
                        <ArrowRight className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
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

                {/* Case 1: Asset is AT THE FACTORY. User needs to SUBMIT Client and Quantity. */}
                {assetCurrentStatus === "inbound_at_factory" && (
                  <>
                    {/* Client Dropdown - Searchable and Editable */}
                    <div className="md:col-span-2">
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Pilih Klien <span className="text-red-500">*</span>
                      </label>
                      {loadingClients ? (
                        <div className="w-full px-4 py-3 border border-white-300 rounded-lg bg-white text-gray-500">
                          Loading clients...
                        </div>
                      ) : (
                        <div className="relative" ref={clientDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg bg-white text-left flex items-center justify-between hover:border-gray-400 transition-colors"
                          >
                            <span className={clientId ? "text-gray-900" : "text-gray-500"}>
                              {clientId ? clients.find(c => c.id === clientId)?.name : "-- Pilih Klien --"}
                            </span>
                            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isClientDropdownOpen ? 'transform rotate-180' : ''}`} />
                          </button>
                          {isClientDropdownOpen && (
                            <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                              <div className="p-2 border-b border-gray-200 relative bg-white">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="text"
                                    value={clientSearchQuery}
                                    onChange={(e) => setClientSearchQuery(e.target.value)}
                                    placeholder="Cari klien..."
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {filteredClients.length > 0 ? (
                                  filteredClients.map((client) => (
                                    <button
                                      key={client.id}
                                      type="button"
                                      onClick={() => {
                                        setClientId(client.id);
                                        setIsClientDropdownOpen(false);
                                        setClientSearchQuery("");
                                      }}
                                      className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors ${clientId === client.id ? 'bg-blue-100 text-blue-900 font-medium' : 'text-gray-900'}`}
                                    >
                                      {client.name}
                                      {clientId === client.id && (
                                        <Check className="inline-block w-4 h-4 ml-2 text-blue-600" />
                                      )}
                                    </button>
                                  ))
                                ) : (
                                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                    Tidak ada klien yang cocok
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submit Quantity from Factory - Editable */}
                    <div>
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Kuantitas dari Pabrik <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={quantity === null ? "" : quantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          setQuantity(value ? parseInt(value, 10) : 0);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                      />
                    </div>
                  </>
                )}

                {/* Case 2: Asset is ON THE WAY TO CLIENT. User just needs to SHOW Client and Quantity. */}
                {assetCurrentStatus === "outbound_to_client" && (
                  <>
                    {/* Client - Read-only */}
                    <div className="md:col-span-2">
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Klien
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base sm:text-lg text-gray-700">
                        {clients.find(c => c.id == clientId)?.name || "N/A"}
                      </div>
                    </div>
                    {/* Quantity from Factory - Read-only */}
                    <div>
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Kuantitas dari Pabrik
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base sm:text-lg text-gray-700">
                        {quantity || 0}
                      </div>
                    </div>
                  </>
                )}

                {/* Case 3: Asset is AT THE CLIENT. User needs to SHOW Client/Quantity and SUBMIT Return Quantity. */}
                {assetCurrentStatus === "inbound_at_client" && (
                  <>
                    {/* Client - Read-only */}
                    <div className="md:col-span-2">
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Klien
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base sm:text-lg text-gray-700">
                        {clients.find(c => c.id === clientId)?.name || "N/A"}
                      </div>
                    </div>
                    {/* Quantity from Factory - Read-only */}
                    <div>
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Kuantitas dari Pabrik
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base sm:text-lg text-gray-700">
                        {quantity || 0}
                      </div>
                    </div>
                    {/* Return Quantity from Client - Editable */}
                    <div>
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Kuantitas dari Klien (Return) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={returnQuantity === null ? "" : returnQuantity}
                        onChange={(e) => {
                          const value = e.target.value;
                          setReturnQuantity(value ? parseInt(value, 10) : 0);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg"
                      />
                    </div>
                  </>
                )}

                {/* Case 4: Asset is ON THE WAY TO FACTORY. User just needs to SHOW quantities and client. */}
                {assetCurrentStatus === "outbound_to_factory" && (
                  <>
                    {/* Quantity from Factory - Read-only */}
                    <div>
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Kuantitas dari Pabrik
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base sm:text-lg text-gray-700">
                        {quantity || 0}
                      </div>
                    </div>

                    {/* Return Quantity from Client - Read-only */}
                    <div>
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Kuantitas dari Klien (Return)
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base sm:text-lg text-gray-700">
                        {returnQuantity || 0}
                      </div>
                    </div>
                  </>
                )}

                {assetCurrentStatus === "outbound_from_factory" && (
                  <>
                    {/* Quantity from Factory - Read-only */}
                    <div>
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Kuantitas dari Pabrik
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base sm:text-lg text-gray-700">
                        {quantity || 0}
                      </div>
                    </div>

                    {/* Return Quantity from Client - Read-only */}
                    <div>
                      <label className="block text-base sm:text-lg font-medium text-gray-700 mb-2">
                        Kuantitas dari Klien (Return)
                      </label>
                      <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-base sm:text-lg text-gray-700">
                        {returnQuantity || 0}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Notes (Always editable) */}
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
                <div className={`md:col-span-2 ${showPhotoCamera ? '-mx-4 sm:-mx-6' : ''}`}>
                  <label className={`block text-base sm:text-lg font-medium text-gray-700 mb-2 ${showPhotoCamera ? 'mx-4 sm:mx-6' : ''}`}>
                    Bukti Foto <span className="text-red-500">*</span> (Maks 3 foto)
                  </label>

                  {showPhotoCamera ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-none sm:rounded-xl p-0 relative overflow-hidden animate-expandScanner bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="relative">
                        <video
                          ref={photoVideoRef}
                          className="w-full h-[50vh] xsm:h-[55vh] sm:h-[60vh] md:h-96 lg:h-[500px] object-cover rounded-none sm:rounded-lg shadow-lg"
                          playsInline
                          muted
                        />
                        <canvas ref={photoCanvasRef} className="hidden" />

                        {/* Photo frame overlay - simple gridlines */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-64 h-48 xsm:w-72 xsm:h-54 sm:w-80 sm:h-60 md:w-96 md:h-72 lg:w-[450px] lg:h-80 relative animate-photoFrame">
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
                              <div className="border-r border-b border-white"></div>
                              <div className="border-r border-b border-white"></div>
                              <div className="border-b border-white"></div>
                              <div className="border-r border-b border-white"></div>
                              <div className="border-r border-b border-white"></div>
                              <div className="border-b border-white"></div>
                              <div className="border-r border-white"></div>
                              <div className="border-r border-white"></div>
                              <div></div>
                            </div>
                          </div>
                        </div>

                      <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex items-center justify-center gap-4 sm:gap-6 px-4">
                        <button
                          onClick={stopPhotoCamera}
                          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all duration-300 hover:shadow-xl transform hover:scale-105 active:scale-95 touch-manipulation"
                        >
                          <X className="w-6 h-6 sm:w-5 sm:h-5 text-gray-700" />
                        </button>
                        
                        <button
                          onClick={capturePhoto}
                          className="w-20 h-20 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 shadow-xl flex items-center justify-center hover:from-green-600 hover:to-emerald-700 transition-all duration-300 hover:shadow-2xl transform hover:scale-105 active:scale-95 touch-manipulation ring-4 ring-white"
                          title="Ambil Foto"
                        >
                          <Camera className="w-9 h-9 sm:w-7 sm:h-7 text-white" />
                        </button>
                        
                        <button
                          onClick={togglePhotoCamera}
                          className="w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-100 transition-all duration-300 hover:shadow-xl transform hover:scale-105 active:scale-95 touch-manipulation"
                        >
                          <RotateCcw className="w-6 h-6 sm:w-5 sm:h-5 text-gray-700" />
                        </button>
                      </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Photo Grid */}
                      {photos.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {photos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Foto ${index + 1}`}
                                className="w-full h-40 object-cover rounded-lg border shadow-sm"
                              />
                              <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                                Foto {index + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
                                title="Hapus foto"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Photo Button */}
                      {photos.length < 3 && (
                        <button
                          type="button"
                          onClick={startPhotoCamera}
                          className={`w-full border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 ${
                            photos.length > 0
                              ? 'border-green-300 bg-green-50 hover:border-green-400' 
                              : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          <Camera className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 transition-colors ${
                            photos.length > 0 ? 'text-green-500' : 'text-gray-400'
                          }`} />
                          <div className={`text-sm sm:text-base transition-colors ${
                            photos.length > 0 ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {photos.length > 0 ? `Tambah Foto (${photos.length}/3)` : 'Ambil Foto *'}
                          </div>
                        </button>
                      )}

                      {photos.length >= 3 && (
                        <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          Maksimal 3 foto telah tercapai. Hapus foto untuk menambah yang baru.
                        </div>
                      )}
                    </div>
                  )}
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
                      <span className="text-gray-600 text-base sm:text-lg">Kuantitas dari Pabrik:</span>
                      <span className="font-medium text-base sm:text-lg">{quantity}</span>
                    </div>
                  )}
                  {currentConfig?.requiresReturnQuantity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-base sm:text-lg">Kuantitas dari Klien:</span>
                      <span className="font-medium text-base sm:text-lg">{returnQuantity}</span>
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
              {photos.length > 0 && (
                <div>
                  <h3 className="font-medium text-xl mb-3 sm:mb-4">Bukti Foto ({photos.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border shadow-sm"
                        />
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Foto {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
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
                  disabled={busy}
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
        .animate-scanMobile {
            animation: scanMobile 2.5s ease-in-out infinite;
        }
        .animate-cornerPulse {
            animation: cornerPulse 2s ease-in-out infinite;
        }
        .animate-photoFrame {
            animation: photoFrame 0.5s ease-out forwards;
        }
        .animate-gridPulse {
            animation: gridPulse 3s ease-in-out infinite;
        }
        .animate-iconPulse {
            animation: iconPulse 2.5s ease-in-out infinite;
        }
        @keyframes expandScanner {
            from { transform: scale(0.85); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        @keyframes contractScanner {
            from { transform: scale(1.05); }
            to { transform: scale(1); }
        }
        @keyframes scannerFrame {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes scanMobile {
            0% { top: 0%; opacity: 0.8; }
            50% { top: 100%; opacity: 1; }
            100% { top: 0%; opacity: 0.8; }
        }
        @keyframes cornerPulse {
            0%, 100% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes photoFrame {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
        }
        @keyframes gridPulse {
            0%, 100% { opacity: 0.25; }
            50% { opacity: 0.45; }
        }
        @keyframes iconPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
