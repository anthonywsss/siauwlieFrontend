"use client";

import { useState, useEffect, useCallback } from "react";
import { Step } from "@/components/FormElements/step";
import ConfirmationStep from "@/components/FormElements/confirmation";
import { safeGet, safePost } from "@/lib/fetcher";
import { useAuth } from "@/components/Auth/auth-context";
import { Camera } from "lucide-react";
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
        setPhoto(file); // keep the file itself in state

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

  if (!open) return null;

  // steps defined as functions (not JSX directly)
  const steps = [
    // Step 1: Status, Asset Type, Client
    () => (
      <Step>
        <div className="space-y-6 rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <label className="block mb-2 font-medium">Status</label>
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

          <div>
            <label className="block mb-2 font-medium">Client</label>
            <select
              value={clientId || ""}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            >
              <option value="">Select Client</option>
              {client.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Step>
    ),

    // Step 2: Photo Upload
    () => (
      <Step>
        <label className="block mb-2 font-medium">Upload Foto QR Asset</label>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <label className="flex-1 cursor-pointer">
            <input type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
              <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-xs sm:text-sm text-gray-600">
                {base64Photo ? "Change photo" : "Unggah Foto"}
              </div>
            </div>
          </label>
          {base64Photo && (
            <div className="flex-1">
              <img src={base64Photo} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
            </div>
          )}
        </div>
      </Step>
    ),

    // Step 3: Confirmation
    () => (
      <Step>
        <div className="space-y-4 text-left">
          <h2 className="text-xl font-semibold">Konfirmasi</h2>
          <ConfirmationStep onValidityChange={setIsConfirmed} />
        </div>
      </Step>
    ),

    // Step 4: Display QR
    () => (
      <Step>
        <div className="space-y-4 text-center">
          <h2 className="text-xl font-semibold">QR Asset</h2>
          {qrData ? (
            <img src={qrData} alt="Asset QR" className="mx-auto w-40 h-40" />
          ) : (
            <p>Loading QR...</p>
          )}
        </div>
      </Step>
    ),
  ];


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
                      <label className="block mb-2 font-medium">Status</label>
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
                  {/* Step 2: Upload Foto */}
                  <label className="block mb-2 font-medium">Upload Foto QR Asset</label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                    <label className="flex-1 cursor-pointer">
                      <input type="file" accept="image/*" onChange={onPhotoChange} className="hidden" />
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                        <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                        <div className="text-xs sm:text-sm text-gray-600">
                          {base64Photo ? "Change photo" : "Unggah Foto"}
                        </div>
                      </div>
                    </label>
                    {base64Photo && (
                      <>
                        <div className="flex-1">
                          <img src={base64Photo} alt="Preview" className="w-full h-32 object-cover rounded-lg border" />
                        </div>
                      </>
                    )}
                  </div>
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
                    {qrData ? (
                      <>
                        <img src={qrData} alt="Asset QR" className="mx-auto w-40 h-40 object-contain" />
                        <a
                          href={qrData}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Open in new tab
                        </a>
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
