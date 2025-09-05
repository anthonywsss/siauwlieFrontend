"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import { Camera, Upload, MapPin, Check, ArrowLeft, ArrowRight, X, QrCode, Scan, RotateCcw } from "lucide-react";
import jsQR from "jsqr";

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
  { value: "outbound_to_client", label: "Perjalanan ke Pelanggan", icon: "📤", requiresQuantity: true, clientPolicy: "required" },
  { value: "inbound_at_client",  label: "Digunakan Pelanggan",  icon: "📥", requiresQuantity: true, clientPolicy: "required" },
  { value: "outbound_to_factory", label: "Perjalanan Ke Pabrik", icon: "🏭", requiresQuantity: false, clientPolicy: "optional" },
  { value: "inbound_at_factory", label: "Di Pabrik", icon: "🏭", requiresQuantity: false, clientPolicy: "optional" },
];
const USE_PLACEHOLDER_FOR_NON_REQUIRED_CLIENT = false;
const CLIENT_PLACEHOLDER = "-";


const STEPS = [
  { id: 0, title: "Pindai Asset", description: "Kode QR atau Input Manual" },
  { id: 1, title: "Pergerakan", description: "Tipe & Informasi lain" },
  { id: 2, title: "Konfirmasi", description: "Kirimkan data" },
];

// Success Popup Component
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

  // QR Scanner state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [showScanner, setShowScanner] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scanIntervalRef = useRef<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);

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
        const res = await API.get("/clients");
        const list = res?.data?.data ?? [];
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

  const onQrImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    setBusy(true);
    setScanError(null);

    try {
      const dataUrl = await fileToBase64(file);
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Invalid image file"));
        img.src = dataUrl;
      });

      const canvas = document.createElement("canvas");
      const maxSize = 800;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const { default: jsQR } = await import("jsqr");
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code && code.data) {
        const parsedId = parseAssetId(String(code.data));
        setAssetId(parsedId);
        setSuccess(`QR Code detected: ${parsedId}`);
      } else {
        setScanError("No QR code found in image. Try with better lighting or positioning.");
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to process QR image");
    } finally {
      setBusy(false);
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
      
      setCameraPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setScanning(true);
        scanningRef.current = true;
        startScanLoop();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraPermission('denied');
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
    setScanning(false);
    scanningRef.current = false;
    setShowScanner(false);
  }, []);

  const toggleCamera = async () => {
    stopScanner();
    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
    setTimeout(startScanner, 300);
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
    };
  }, [stopScanner]);

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
      case "inbound_at_client":
        return "outbound_to_factory";
      case "outbound_from_factory":
        return "inbound_at_factory";
      default:
        return "outbound_to_client";
    }
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
          const resA = await API.get(`/check-status`, { params: { asset_id: rawId } });
          currentStatus = resA?.data?.data?.status ?? resA?.data?.status ?? null;
          found = true;
        } catch (_eA: any) {
          try {
            const resB = await API.get(`/check-status`, { params: { id: rawId } });
            currentStatus = resB?.data?.data?.status ?? resB?.data?.status ?? null;
            found = true;
          } catch (_eB: any) {
            try {
              const resC = await API.post(`/check-status`, { asset_id: rawId });
              currentStatus = resC?.data?.data?.status ?? resC?.data?.status ?? null;
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
            const res1 = await API.get(`/assets/${id}`);
            asset = res1?.data?.data ?? null;
          } catch (e1: any) {
            try {
              const res2 = await API.get(`/asset/${id}`);
              asset = res2?.data?.data ?? null;
            } catch (e2: any) {
              try {
                const res3 = await API.get(`/assets`, { params: { id: rawId } });
                const list = res3?.data?.data;
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
      const res = await API.post("/movements", body);

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
      {showSuccessPopup && (
        <SuccessPopup 
          message="Berhasil dirubah" 
          onClose={() => setShowSuccessPopup(false)} 
        />
      )}
      
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 animate-fadeIn">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Laporan Pergerakan</h1>
          <p className="text-sm sm:text-base text-gray-600">Rekam jejak asset dengan memindai kode QR</p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max">
            {STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                    step >= s.id 
                      ? 'bg-blue-600 text-white scale-110' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step > s.id ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : s.id + 1}
                  </div>
                  <div className="ml-2 sm:ml-3">
                    <div className={`text-sm sm:text-base font-medium transition-colors duration-300 ${step >= s.id ? 'text-blue-600' : 'text-gray-500'}`}>
                      {s.title}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-500 hidden sm:block">{s.description}</div>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors duration-300 ${
                    step > s.id ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
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
              {showScanner ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 relative overflow-hidden">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full max-h-64 sm:max-h-96 object-cover rounded-lg"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <canvas
                      ref={overlayRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                    
                    {/* Scanner frame overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 sm:w-64 sm:h-64 border-4 border-blue-500 rounded-xl relative">
                        {/* Corner indicators */}
                        <div className="absolute -top-2 -left-2 w-4 h-4 sm:w-6 sm:h-6 border-t-4 border-l-4 border-blue-500 animate-pulse"></div>
                        <div className="absolute -top-2 -right-2 w-4 h-4 sm:w-6 sm:h-6 border-t-4 border-r-4 border-blue-500 animate-pulse"></div>
                        <div className="absolute -bottom-2 -left-2 w-4 h-4 sm:w-6 sm:h-6 border-b-4 border-l-4 border-blue-500 animate-pulse"></div>
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 sm:w-6 sm:h-6 border-b-4 border-r-4 border-blue-500 animate-pulse"></div>
                        
                        {/* Scanning line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-scan rounded-full"></div>
                      </div>
                    </div>
                    
                    <button
                      onClick={stopScanner}
                      className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    <button
                      onClick={toggleCamera}
                      className="absolute top-12 right-2 sm:top-16 sm:right-4 p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    <div className="absolute bottom-2 left-2 right-2 text-center">
                      <div className="bg-black bg-opacity-50 text-white px-3 py-1 text-xs sm:text-sm rounded-lg animate-pulse">
                        Posisikan QR dalam frame
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* QR Scanner Option */}
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:border-blue-500 transition-all duration-300 hover:scale-[1.02]"
                    onClick={startScanner}
                  >
                    <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-pulse">
                      <Scan className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-base sm:text-lg mb-1 sm:mb-2">Pindai kode QR</h3>
                    <p className="text-xs sm:text-sm text-gray-500"> Gunakan kamera untuk memindai kode QR</p>
                  </div>

                  {/* Upload QR Image Option */}
                  <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:border-blue-500 transition-all duration-300 hover:scale-[1.02]">
                    <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-base sm:text-lg mb-1 sm:mb-2">Unggah QR Image</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Unggah kode QR</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onQrImage}
                      disabled={busy}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {scanError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 animate-fadeIn">
                  <div className="text-yellow-800 text-sm sm:text-base">{scanError}</div>
                </div>
              )}

              {/* Manual Entry */}
              <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
                <h3 className="font-medium text-base sm:text-lg mb-3 sm:mb-4 flex items-center">
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Atau isi ID Asset secara manual
                </h3>
                <input
                  type="text"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="Masukan ID Asset"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                />
              </div>

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
              <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Pergerakan</h2>
              
              {/* Asset ID Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex justify-between items-center animate-fadeIn">
                <div>
                  <div className="text-xs sm:text-sm text-blue-700">ID Asset</div>
                  <div className="font-medium text-blue-900 text-sm sm:text-base">{assetId}</div>
                </div>
                <button 
                  onClick={() => setStep(0)}
                  className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium transition-colors"
                >
                  Ubah
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* MOVEMENT TYPE: read-only (auto-picked) */}
                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3">
                    Pergerakan (Sistem Otomatis)
                  </label>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Current status card */}
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 min-w-0 flex-1">
                      <div className="text-xs text-gray-500">Status Pergerakan Saat ini</div>
                      <div className="font-medium text-sm mt-1">{formatStatus(assetCurrentStatus)}</div>
                    </div>

                    {/* Arrow between cards (rotates for stacked mobile) */}
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
                      <div className="text-xs text-blue-700">Status Pergerakan Selanjutnya</div>
                      <div className="font-medium text-sm mt-1">
                        {movementType ? formatStatus(movementType) : (fetchingAssetStatus ? "Determining..." : "Unknown")}
                      </div>
                      {fetchingAssetStatus && <div className="text-xs text-gray-500 mt-1">Please wait — fetching asset info...</div>}
                    </div>
                  </div>


                  <div className="text-xs text-gray-500 mt-2">
                    Status pergerakan ini diisi oleh sistem secara otomatis. User tidak bisa mengganti status pergerakan secara manual.
                  </div>
                </div>

                {/* Client Selection - Only show for client-related movements */}
                {currentConfig?.clientPolicy === "required" && (
                  <div className="md:col-span-2 animate-fadeIn">
                  </div>
                )}

                {/* Quantity Input - Only show if required */}
                {currentConfig?.requiresQuantity && (
                  <div className="animate-fadeIn">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Kuantitas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                )}

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Catatan
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Tambahkan catatan mengenai pergerakan ini ..."
                  />
                </div>

                {/* Photo Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Bukti Foto
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onPhotoChange}
                        className="hidden"
                      />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                        <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-xs sm:text-sm text-gray-600">
                          {photoBase64 ? "Change photo" : "Unggah Foto"}
                        </div>
                      </div>
                    </label>
                    {photoBase64 && (
                      <div className="flex-1">
                        <img
                          src={photoBase64}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Capture */}
                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Lokasi
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={takeLocation}
                      disabled={busy}
                      className="flex items-center px-4 py-2 bg-green-100 text-gray-700 rounded-lg hover:bg-green-200 disabled:opacity-50 text-sm sm:text-base"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      {latitude && longitude ? "Perbarui Lokasi" : "Rekam Lokasi"}
                    </button>
                    {latitude && longitude && (
                      <div className="text-xs sm:text-sm text-gray-600">
                        Rekaman: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 sm:pt-6">
                <button
                  onClick={handlePrev}
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base"
                >
                  <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                  Kembali
                </button>
                <button
                  onClick={handleNext}
                  disabled={busy || (currentConfig?.clientPolicy === "required" && !clients.some(c => c.id === clientId))}
                  className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  Selanjutnya
                  <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Konfirmasi Laporan</h2>
              
              {/* Summary Card */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <h3 className="font-medium text-lg mb-3 sm:mb-4">Rangkuman Pergerakan</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">ID Asset:</span>
                    <span className="font-medium text-sm sm:text-base">{assetId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Status Pergerakan:</span>
                    <span className="font-medium text-sm sm:text-base">
                      {MOVEMENT_TYPES.find(t => t.value === movementType)?.label}
                    </span>
                  </div>
                  {currentConfig?.clientPolicy === "required" && clientId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Klien:</span>
                      <span className="font-medium text-sm sm:text-base">
                        {clients.find(c => c.id === clientId)?.name}
                      </span>
                    </div>
                  )}
                  {currentConfig?.requiresQuantity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Kuantitas:</span>
                      <span className="font-medium text-sm sm:text-base">{quantity}</span>
                    </div>
                  )}
                  {notes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Catatan:</span>
                      <span className="font-medium text-sm sm:text-base">{notes}</span>
                    </div>
                  )}
                  {latitude && longitude && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Lokasi:</span>
                      <span className="font-medium text-sm sm:text-base">
                        {latitude.toFixed(6)}, {longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Preview */}
              {photoBase64 && (
                <div>
                  <h3 className="font-medium text-lg mb-3 sm:mb-4">Bukti Foto</h3>
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
                  className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 text-sm sm:text-base"
                >
                  <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                  Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={busy || (currentConfig?.clientPolicy === "required" && !clients.some(c => c.id === clientId))}
                  className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  {busy ? "Mengirim ..." : "Konfirmasi Laporan"}
                  <Check className="w-4 h-4 ml-1 sm:ml-2" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add custom animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes scan {
          0%   { top: 0%; }
          50%  { top: 80%; }
          100% { top: 0%; }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        .animate-scan {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50px;
          background: linear-gradient(to top, rgba(59,130,246,0.8) 0%, rgba(59,130,246,0) 100%);
          animation: scan 2.5s ease-in-out infinite; /* slower, 3s per cycle */
          border-radius: 0px;
        }

      `}</style>
    </div>
  );
}
