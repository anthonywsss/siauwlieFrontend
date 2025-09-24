"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Step } from "@/components/FormElements/step";
import ConfirmationStep from "@/components/FormElements/confirmation";
import { safeGet, safePost } from "@/lib/fetcher";
import { useAuth } from "@/components/Auth/auth-context";
import { Camera, X, RotateCcw } from "lucide-react";
import { useModalWatch } from "@/components/ModalContext";

type CreateNewAssetProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type Client = { id: number; name: string };
type RawType = { id: number; name: string };

export default function CreateNewAsset({ open, onClose, onCreated }: CreateNewAssetProps) {
  useModalWatch(open);
  const { signOut } = useAuth();

  const [newAsset, setNewAsset] = useState<any | null>(null);
  const [status, setStatus] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [base64Photo, setBase64Photo] = useState<string | null>(null);
  
  const [client, setClient] =useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | null>(null);
  const [loadingClients, setLoadingClients] = useState(true);

  const [type, setType] =useState<RawType[]>([]);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [loadingType, setLoadingType] = useState(true);

  const [qrData, setQrData] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo camera controls
  const photoVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showPhotoCamera, setShowPhotoCamera] = useState(false);
  const [photoFacingMode, setPhotoFacingMode] = useState<'environment' | 'user'>('environment');

  // Handle QR code image source properly
  function buildQRSrc(qrCode?: string | null): string | null {
    if (!qrCode) return null;
    const trimmed = qrCode.trim();
    
    // If complete URL return as is
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    
    // If base64 image data treat it as such
    if (/^data:image\//i.test(trimmed)) return trimmed;
    
    // If plain base64 == PNG
    if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length > 50) {
      return `data:image/png;base64,${trimmed}`;
    }
    
    // else, return as is
    return trimmed;
  }

// fetch client
  useEffect(() => {
    (async () => {
      try {
        const res = await safeGet<{ data: Client[] }>("/clients");
        const list = res?.data ?? [];
        setClient(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to fetch clients", err);
        setError("Failed to load clients");
      } finally {
        setLoadingClients(false);
      }
    })();
  }, []);

  // fetch asset type
  useEffect(() => {
    (async () => {
      try {
        const res = await safeGet<{ data: RawType[] }>("/asset-type");
        const list = res?.data ?? [];
        setType(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to fetch asset type", err);
        setError("Failed to load asset type");
      } finally {
        setLoadingType(false);
      }
    })();
  }, []);

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
  
      const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setPhoto(file);

        if (file) {
          try {
            const base64 = await fileToBase64(file);
            setBase64Photo(base64); // store the base64 version
          } catch (err: any) {
            setError(err.message || "Failed to upload photo");
            setBase64Photo(null);
          }
        } else {
          setBase64Photo(null);
        }
      };

  // Photo camera
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
      setBase64Photo(dataUrl);
      setPhoto(null); // Clear file input since we're using camera
      stopPhotoCamera();
    } catch (err: any) {
      console.error('Capture photo error:', err);
      setError('Gagal mengambil foto. Coba lagi.');
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopPhotoCamera();
    };
  }, [stopPhotoCamera]);

  if (!open) return null;

async function handleSubmit() {
  setSubmitting(true);
  try {
    let finalPhoto = base64Photo;

    if (photo && !base64Photo) {
      finalPhoto = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(photo);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
    }

    if (!finalPhoto) {
      alert("Photo is required");
      setSubmitting(false);
      return;
    }
    finalPhoto = finalPhoto.replace(/\s/g, "");

    // Build payload conditionally
    const payload: any = {
      status: status.trim(),
      asset_type_id: typeId,
      photo: finalPhoto,
      ...(clientId !== null && clientId !== undefined ? { current_client: clientId } : {}),
    };

    console.log("The payload submitted:", payload)


    const res = await safePost<{ data: any }>("/asset", payload);
    
    // If result is null, it means we were unauthorized and handled by the safePost function
    if (res === null) {
      setSubmitting(false);
      return;
    }

    const created = res?.data ?? null;
    setNewAsset(created);  
    const qrUrl = created?.qr_code ?? created?.qr ?? null;
    setQrData(qrUrl);
    setCurrentStep(3);

  } catch (err: any) {
    console.error("add asset error:", err);
    alert(
      "Gagal mengirim data: " +
        (err?.response?.data?.meta?.message ??
          err?.message ??
          "Create failed")
    );
    setError(
      err?.response?.data?.meta?.message ??
        err?.message ??
        "Create failed"
    );
  } finally {
    setSubmitting(false);
  }
}


const handleOpenModal = () => {
  resetForm(); 
  setOpened(true);
};

const resetForm = () => {
  setStatus("");
  setTypeId(null);
  setClientId(null);
  setPhoto(null);
  setBase64Photo(null);
  setQrData(null);
  setCurrentStep(0);
  setIsConfirmed(false);
  setError(null);
  stopPhotoCamera(); // Clean up camera when resetting

  onClose();
};



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Buat Asset Baru</h2>
            <button
              onClick={() => {
                resetForm(); // reset semua state ke awal
                onClose();   // panggil parent untuk close modal
              }}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
          </div>

            <div className="step-content">
              {currentStep === 0 && (
                <div>
                  {/* Step 1: Status, Type, Client */}
                  <div className="space-y-6 rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
                    <div>
                      <label className="block mb-2 font-medium appearance-none">Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                      >
                        <option value="">Pilih Status</option>
                        <option value="inbound_at_factory">At Factory</option>
                        <option value="inbound_at_client">At Client</option>
                        <option value="outbound_from_factory">In Transit to Factory</option>
                        <option value="outbound_from_client">In Transit to Client</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 font-medium">Asset Type</label>
                      <select
                        value={typeId || ""}
                        onChange={(e) => setTypeId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Asset Type</option>
                        {type.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {(status === "inbound_at_client" || status === "outbound_from_client") && (
                      <div>
                        <label className="block mb-2 font-medium">Client</label>
                        <select
                          value={clientId || ""}
                          onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        >
                          <option value="">Select Client</option>
                          {client.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div>
                  {/* Step 2: Photo Capture */}
                  <label className="block mb-2 font-medium">Foto Asset <span className="text-red-500">*</span></label>

                  {showPhotoCamera ? (
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-3 sm:p-4 md:p-6 relative overflow-hidden animate-expandScanner bg-gradient-to-br from-blue-50 to-indigo-50">
                      <div className="relative">
                        <video
                          ref={photoVideoRef}
                          className="w-full h-[60vh] sm:h-72 md:h-80 lg:h-96 object-cover rounded-lg shadow-lg"
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
                          base64Photo 
                            ? 'border-green-300 bg-green-50 hover:border-green-400' 
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}
                      >
                        <Camera className={`w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 transition-colors ${
                          base64Photo ? 'text-green-500' : 'text-gray-400'
                        }`} />
                        <div className={`text-sm sm:text-base transition-colors ${
                          base64Photo ? 'text-green-700' : 'text-gray-600'
                        }`}>
                          {base64Photo ? 'Ambil Ulang Foto' : 'Ambil Foto *'}
                        </div>
                      </button>

                      {base64Photo && (
                        <div className="flex-1">
                          <img
                            src={base64Photo}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-lg border shadow-sm"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={startPhotoCamera}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Ambil Ulang
                            </button>
                            <button
                              type="button"
                              onClick={() => setBase64Photo(null)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  {/* Step 3: Konfirmasi */}
                  <div className="space-y-4 text-left">
                    <h2 className="text-xl font-semibold">Konfirmasi</h2>
                    <p className="mb-10">Are you sure you want to create this new asset?</p>
                    <button
                      onClick={() => {
                      resetForm();
                      onClose();
                    }}
                    className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition-colors mr-5"
                    >
                      Cancel
                    </button>
                    <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      Ok
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="flex flex-col items-center justify-center space-y-6 p-6">
                  {/* Step 4: Tampilkan QR */}
                  <div className="text-center space-y-4"> 
                    <h2 className="text-xl font-semibold">QR Asset</h2>
                    <p className="text-sm text-gray-7 mt-1">
                      ID: <span className="font-mono text-primary">{newAsset?.id ?? "-"}</span>
                    </p>
                    {qrData ? (
                      <>
                        <img src={buildQRSrc(qrData) || qrData} alt="Asset QR" className="mx-auto w-40 h-40 object-contain" />
                        {buildQRSrc(qrData) && (
                          <a
                            href={buildQRSrc(qrData)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Open in new tab
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-600">QR code not available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-4">
              {currentStep > 0 && currentStep < 2 && (
                <button
                  onClick={() => setCurrentStep(s => s - 1)}
                  className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400 transition-colors"
                >
                  Kembali
                </button>
              )}

              {currentStep < 1 && (
                <button
                  onClick={() => setCurrentStep(s => s + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Lanjut
                </button>
              )}

              {currentStep === 1 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`px-4 py-2 rounded text-white transition-colors ${
                     submitting
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {submitting ? "Mengirim..." : "Submit"}
                </button>
              )}

              {currentStep === 3 && (
                <div className="w-full flex justify-end">
                  <button
                    onClick={() => {
                      resetForm();
                      onClose();
                      onCreated();
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  >
                    Okay
                  </button>
                </div>
              )}
            </div>


          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>
      </div>
    </div>
  );
}
