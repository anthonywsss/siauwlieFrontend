"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import { Camera, Upload, MapPin, Check, ArrowLeft, ArrowRight, X, QrCode, Scan, RotateCcw } from "lucide-react";
import jsQR from "jsqr";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// Robustly parse asset ID from various QR contents (plain text, URL, or JSON)
const parseAssetId = (raw: string): string => {
  const s = String(raw || "").trim();
  if (!s) return s;

  // Try JSON structure
  try {
    const obj = JSON.parse(s);
    const candidate = obj?.asset_id ?? obj?.assetId ?? obj?.id ?? obj?.code ?? obj?.qr ?? null;
    if (candidate && typeof candidate === 'string') return candidate.trim();
  } catch (_) {}

  // Try URL with params or path
  try {
    const url = new URL(s);
    const byParam = url.searchParams.get("asset_id") || url.searchParams.get("id") || url.searchParams.get("code");
    if (byParam) return byParam.trim();
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length) return segments[segments.length - 1].trim();
  } catch (_) {}

  // Fallback to raw
  return s;
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
  { value: "outbound_to_client", label: "Outbound to Client", icon: "📤", requiresQuantity: true, clientPolicy: "required" },
  { value: "inbound_at_client",  label: "Inbound at Client",  icon: "📥", requiresQuantity: true, clientPolicy: "required" },
  { value: "outbound_to_factory", label: "Outbound to Factory", icon: "🏭", requiresQuantity: false, clientPolicy: "optional" },
  { value: "inbound_at_factory", label: "Inbound at Factory", icon: "🏭", requiresQuantity: false, clientPolicy: "optional" },
];
const USE_PLACEHOLDER_FOR_NON_REQUIRED_CLIENT = false;
const CLIENT_PLACEHOLDER = "-";

const STEPS = [
  { id: 0, title: "Scan Asset", description: "QR Code or Manual Entry" },
  { id: 1, title: "Movement Details", description: "Type, Client & Info" },
  { id: 2, title: "Confirm & Submit", description: "Review & Send" },
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

  // NEW: track current asset status (from server) so we can derive movementType
  const [assetCurrentStatus, setAssetCurrentStatus] = useState<string | null>(null);
  const [fetchingAssetStatus, setFetchingAssetStatus] = useState(false);

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

  // Auto-clear messages
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

  // Authentication check
  useEffect(() => {
    if (!user) router.push("/auth/sign-in");
  }, [user, router]);

  // Load clients
  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/clients");
        const list = res?.data?.data ?? [];
        setClients(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to fetch clients", err);
        setError("Failed to load clients");
      } finally {
        setLoadingClients(false);
      }
    })();
  }, []);

  // When movement type changes, reconcile client selection based on policy
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

  // Enhanced file conversion with error handling
  const fileToBase64 = useCallback((file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error("File too large (max 10MB)"));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    }), []);

  // Enhanced photo upload
  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setPhotoBase64(base64);
        setSuccess("Photo uploaded successfully");
      } catch (err: any) {
        setError(err.message || "Failed to upload photo");
      }
    } else {
      setPhotoBase64("");
    }
  };

  // Enhanced QR image processing with better jsQR handling
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
      const maxSize = 800; // Limit canvas size for better performance
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Load jsQR dynamically
      const { default: jsQR } = await import("jsqr");
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert", // Improve performance
      });
      
      if (code && code.data) {
        const parsedId = parseAssetId(String(code.data));
        setAssetId(parsedId);
        setSuccess(`QR Code detected: ${parsedId}`);
        setStep(1);
      } else {
        setScanError("No QR code found in image. Try with better lighting or positioning.");
      }
    } catch (err: any) {
      setScanError(err.message || "Failed to process QR image");
    } finally {
      setBusy(false);
    }
  };

  // Enhanced camera scanner with throttling
  const startScanner = async () => {
    setScanError(null);
    setShowScanner(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 640, max: 1280 }, // Reduce resolution for better performance
          height: { ideal: 480, max: 720 },
        },
      });
      
      setCameraPermission('granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setScanning(true);
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
    setShowScanner(false);
  }, []);

  const toggleCamera = async () => {
    stopScanner();
    setFacingMode(facingMode === 'environment' ? 'user' : 'environment');
    setTimeout(startScanner, 300);
  };

  // Optimized scan loop with throttling and better error handling
  const startScanLoop = useCallback(() => {
    const scanFrame = async () => {
      if (!videoRef.current || !canvasRef.current || !overlayRef.current || !scanning) {
        return;
      }

      const now = Date.now();
      // Throttle scanning to every 250ms for better performance
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

      // Use smaller canvas for QR detection to improve performance
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
          inversionAttempts: "dontInvert", // Better performance
        });

        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

        if (code && code.data) {
          // Scale coordinates back up for overlay
          const scaleUp = 1 / scale;
          
          // Draw detection box
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
          setStep(1);
          return;
        }
      } catch (err) {
        console.error("QR scan error:", err);
      }

      if (scanning) {
        scanIntervalRef.current = requestAnimationFrame(scanFrame);
      }
    };

    scanFrame();
  }, [scanning, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Enhanced geolocation
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

  // Get current movement type config
  const getCurrentMovementConfig = () => {
    return MOVEMENT_TYPES.find(t => t.value === movementType);
  };

  // Derive next movement from current asset status
  const deriveMovementFromCurrentStatus = (status: string | null): string => {
    switch (status) {
      case "inbound_at_factory":
        return "outbound_to_factory";
      case "inbound_at_client":
        return "outbound_to_client";
      case "outbound_to_factory":
        return "inbound_at_factory";
      case "outbound_to_client":
        return "inbound_at_client";
      default:
        return "outbound_to_client"; // reasonable default
    }
  };

  // Fetch asset current status when assetId changes, and auto-select movementType
  useEffect(() => {
    if (!assetId || assetId.trim() === "") {
      setAssetCurrentStatus(null);
      setMovementType(null);
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

        // Prefer dedicated status endpoint first
        try {
          const resA = await API.get(`/check-status`, { params: { asset_id: rawId } });
          currentStatus = resA?.data?.data?.status ?? resA?.data?.status ?? null;
        } catch (_eA: any) {
          try {
            const resB = await API.get(`/check-status`, { params: { id: rawId } });
            currentStatus = resB?.data?.data?.status ?? resB?.data?.status ?? null;
          } catch (_eB: any) {
            try {
              const resC = await API.post(`/check-status`, { asset_id: rawId });
              currentStatus = resC?.data?.data?.status ?? resC?.data?.status ?? null;
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
          currentStatus = asset?.status ?? null;
        }

        if (!mounted) return;
        setAssetCurrentStatus(currentStatus);
        const derived = deriveMovementFromCurrentStatus(currentStatus ?? null);
        setMovementType(derived);

        // If derived movement requires client and we already have a matching client, keep it;
        // otherwise, let the client reconcile effect populate a default.
      } catch (err: any) {
        console.error("Failed to fetch asset status:", err);
        // If the API responded with 404/invalid, show a helpful message
        const msg = err?.response?.data?.meta?.message ?? err?.response?.data?.message ?? err?.message ?? "Failed to fetch asset status";
        setError(msg);
        setAssetCurrentStatus(null);
        // Fallback to a reasonable default so user can proceed
        setMovementType(deriveMovementFromCurrentStatus(null));
      } finally {
        if (mounted) setFetchingAssetStatus(false);
      }
    })();

    return () => { mounted = false; };
  }, [assetId]);

  // Enhanced form validation
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


  // Navigation handlers
  const handleNext = async () => {
    // If moving from step 0 to 1, ensure we've fetched asset status and set movementType
    if (step === 0) {
      if (!validateStep(0)) return;

      // If we are still fetching status, wait for it
      if (fetchingAssetStatus) {
        setError("Please wait while we determine the movement type for this asset");
        return;
      }
      if (!movementType) {
        // Fallback to a reasonable default so the user can proceed
        const fallback = deriveMovementFromCurrentStatus(null);
        setMovementType(fallback);
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

  // Enhanced submit handler with conditional fields
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
        // include lat/lng only when they are real numbers
        ...(Number.isFinite(Number(latitude)) ? { latitude: clamp(Number(latitude), -90, 90) } : {}),
        ...(Number.isFinite(Number(longitude)) ? { longitude: clamp(Number(longitude), -180, 180) } : {}),
        photo: finalPhoto || "",
        notes: notes.trim() || ""
      };

      // quantity when required
      if (config?.requiresQuantity) {
        body.quantity = clamp(Math.trunc(Number(quantity) || 0), 1, 32767);
      }

      // attach client_id ONLY when the current movement expects a client and we actually have one
      if (config?.clientPolicy === "required") {
        if (typeof clientId === 'number' && Number.isFinite(clientId)) {
          body.client_id = clientId;
          // Defensive mapping: some backends expect factory_id for inbound_at_factory
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

      // final safety: never send null/undefined/empty client_id
      if (body.client_id == null || body.client_id === "") {
        delete (body as any).client_id;
      }

      // Good: log exact JSON that will be sent (not the live object)
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Submit Movement</h1>
          <p className="text-sm sm:text-base text-gray-600">Track and record asset movements dengan scan QR</p>
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

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          {step === 0 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Scan Asset QR Code</h2>
              
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
                        Posisikan QR code di dalam frame
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
                    <h3 className="font-medium text-base sm:text-lg mb-1 sm:mb-2">Scan QR Code</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Pake camera untuk scan QR</p>
                  </div>

                  {/* Upload QR Image Option */}
                  <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 text-center cursor-pointer hover:border-blue-500 transition-all duration-300 hover:scale-[1.02]">
                    <div className="bg-blue-100 w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-base sm:text-lg mb-1 sm:mb-2">Upload QR Image</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Upload an image containing a QR code</p>
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
                  Or enter manually
                </h3>
                <input
                  type="text"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  placeholder="Enter Asset ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                />
              </div>

              <div className="flex justify-end pt-3 sm:pt-4">
                <button
                  onClick={handleNext}
                  disabled={!assetId.trim() || busy}
                  className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-all duration-300 hover:scale-[1.02] text-sm sm:text-base"
                >
                  Next
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Movement Details</h2>
              
              {/* Asset ID Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 flex justify-between items-center animate-fadeIn">
                <div>
                  <div className="text-xs sm:text-sm text-blue-700">Asset ID</div>
                  <div className="font-medium text-blue-900 text-sm sm:text-base">{assetId}</div>
                </div>
                <button 
                  onClick={() => setStep(0)}
                  className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium transition-colors"
                >
                  Change
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* MOVEMENT TYPE: read-only (auto-picked) */}
                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-3">
                    Movement Type (automatically selected)
                  </label>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 min-w-0 flex-1">
                      <div className="text-xs text-gray-500">Current Asset Status</div>
                      <div className="font-medium text-sm mt-1">{assetCurrentStatus ?? "Unknown"}</div>
                    </div>

                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 min-w-0 flex-1">
                      <div className="text-xs text-blue-700">Selected Movement</div>
                      <div className="font-medium text-sm mt-1">
                        {MOVEMENT_TYPES.find(t => t.value === movementType)?.label ?? (fetchingAssetStatus ? "Determining..." : "Unknown")}
                      </div>
                      {fetchingAssetStatus && <div className="text-xs text-gray-500 mt-1">Please wait — fetching asset info...</div>}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    The movement type is chosen automatically based on this asset's current status. Users cannot change it manually.
                  </div>
                </div>

                {/* Client Selection - Only show for client-related movements */}
                {currentConfig?.clientPolicy === "required" && (
                  <div className="md:col-span-2 animate-fadeIn">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    {loadingClients ? (
                      <div className="text-gray-500 text-sm sm:text-base">Loading clients...</div>
                    ) : (
                      <select
                        value={clientId || ""}
                        onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                      >
                        <option value="">Select a client</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Quantity Input - Only show if required */}
                {currentConfig?.requiresQuantity && (
                  <div className="animate-fadeIn">
                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                      Quantity *
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
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Additional information about this movement..."
                  />
                </div>

                {/* Photo Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2">
                    Photo Evidence
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
                          {photoBase64 ? "Change photo" : "Upload photo"}
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
                    Location
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={takeLocation}
                      disabled={busy}
                      className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm sm:text-base"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      {latitude && longitude ? "Update Location" : "Capture Location"}
                    </button>
                    {latitude && longitude && (
                      <div className="text-xs sm:text-sm text-gray-600">
                        Captured: {latitude.toFixed(6)}, {longitude.toFixed(6)}
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
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={busy || (currentConfig?.clientPolicy === "required" && !clients.some(c => c.id === clientId))}
                  className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Confirm Movement</h2>
              
              {/* Summary Card */}
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <h3 className="font-medium text-lg mb-3 sm:mb-4">Movement Summary</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Asset ID:</span>
                    <span className="font-medium text-sm sm:text-base">{assetId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm sm:text-base">Movement Type:</span>
                    <span className="font-medium text-sm sm:text-base">
                      {MOVEMENT_TYPES.find(t => t.value === movementType)?.label}
                    </span>
                  </div>
                  {currentConfig?.clientPolicy === "required" && clientId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Client:</span>
                      <span className="font-medium text-sm sm:text-base">
                        {clients.find(c => c.id === clientId)?.name}
                      </span>
                    </div>
                  )}
                  {currentConfig?.requiresQuantity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Quantity:</span>
                      <span className="font-medium text-sm sm:text-base">{quantity}</span>
                    </div>
                  )}
                  {notes && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Notes:</span>
                      <span className="font-medium text-sm sm:text-base">{notes}</span>
                    </div>
                  )}
                  {latitude && longitude && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm sm:text-base">Location:</span>
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
                  <h3 className="font-medium text-lg mb-3 sm:mb-4">Photo Evidence</h3>
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
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={busy || (currentConfig?.clientPolicy === "required" && !clients.some(c => c.id === clientId))}
                  className="flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm sm:text-base"
                >
                  {busy ? "Submitting..." : "Confirm Movement"}
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
          0% { transform: translateY(-100%); }
          100% { transform: translateY(400%); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
