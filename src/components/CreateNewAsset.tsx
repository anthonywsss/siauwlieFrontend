"use client";

import { useState, ReactNode, useEffect } from "react";
import { Select } from "@/components/FormElements/select";
import ConfirmationStep from "@/components/FormElements/confirmation";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";

// Simple MultiStepForm & Step implementation
type StepProps = { children: ReactNode };
function Step({ children }: StepProps) {
  return <>{children}</>;
}

type RawClient = {
  id: string;
  name: string;
};

type AssetType = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};


export default function CreateNewAsset({ open, onClose, onCreated }: Props) {

  if (!open) return null;
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [assetType, setAssetType] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [base64Photo, setBase64Photo] = useState<string | null>(null);
  
  const [allClients, setAllClients] = useState<RawClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [submittedData, setSubmittedData] = useState<any | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const { signOut } = useAuth();
  const router = useRouter();

  //fetching APIs
  
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await API.get("/clients");
        const clients: RawClient[] = res?.data?.data ?? res?.data ?? [];
        if (!mounted) return;
        setAllClients(Array.isArray(clients) ? clients : []);
      } catch (err: any) {
        console.error("fetch clients error:", err);
        if (err?.response?.status === 401) {
          signOut();
          try {
            router.push("/auth/sign-in");
          } catch {}
          return;
        }
        setError(err?.response?.data?.meta?.message ?? err?.message ?? "Failed to fetch clients");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const [alltype, setAllType] = useState<AssetType[]>([]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await API.get("/asset-type");
        const type: AssetType[] = res?.data?.data ?? res?.data ?? [];
        if (!mounted) return;
        setAllType(Array.isArray(type) ? type : []);
      } catch (err: any) {
        console.error("fetch asset type error:", err);
        if (err?.response?.status === 401) {
          signOut();
          try {
            router.push("/auth/sign-in");
          } catch {}
          return;
        }
        setError(err?.response?.data?.meta?.message ?? err?.message ?? "Failed to fetch asset type");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

   //base64 image converter
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);

    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => setBase64Photo(reader.result as string);
      reader.onerror = (err) => console.error("Error reading file:", err);
    } else {
      setBase64Photo(null);
    }
  };
  
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);

  if (!status) return alert("Status tidak boleh kosong");
  if (!client) return alert("Client tidak boleh kosong");
  if (!assetType) return alert("Tipe Asset tidak boleh kosong");

  let finalPhoto = base64Photo;

  if (photo && !base64Photo) {
    finalPhoto = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(photo);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  }

  setSubmitting(true);
  try {
    const res = await API.post("/asset", {
      status: status.trim(),
      asset_type_id: Number(assetType),
      current_client: Number(client),
      photo: finalPhoto ?? null,
    });

    // Success popup
    alert("Data berhasil dikirim!\nAsset ID: " + res.data?.data?.id);

    // reset
    setStatus("");
    setClient("");
    setAssetType("");
    setPhoto(null);
    setBase64Photo(null);
  } catch (err: any) {
    console.error("add asset error:", err);
    if (err?.response?.status === 401) {
      signOut();
      window.location.href = "/auth/sign-in";
      return;
    }

    // Error popup
    alert("Gagal mengirim data: " + (err?.response?.data?.meta?.message ?? err?.message ?? "Create failed"));
    setError(err?.response?.data?.meta?.message ?? err?.message ?? "Create failed");
  } finally {
    setSubmitting(false);
  }
}


  // multi step form
  const steps = [
      <Step key={0}>
        {/* Step 1: Selects */}
        <div className="space-y-6 rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
          <Select
            items={[
              { label: "Pilih Status", value: "" },
              { label: "Di Pabrik", value: "inbound_at_factory" },
              { label: "Perjalanan ke Pabrik", value: "outbound_to_factory" },
              { label: "Di Klien", value: "inbound_at_client" },
              { label: "Perjalanan ke Klien", value: "outbound_to_client" },
            ]}
            label="Status"
            value={status}
            onChange={setStatus}
            required
            className="mb-5"
          />
  
          <Select
            items={[
                { label: "Pilih Klien", value: "" },
                ...allClients.map((c) => ({ label: c.name, value: c.id })),
                ]}
            label="Klien"
            value={client}
            onChange={setClient}
            required
            className="mb-5"
          />
  
          <Select
            items={[
                { label: "Pilih Tipe Aset", value: "" },
                ...alltype.map((c) => ({ label: c.name, value: c.id })),
                ]}
            label="Tipe Asset"
            value={assetType}
            onChange={setAssetType}
            required
            className="mb-5"
          />
        </div>
      </Step>,
  
      <Step key={1}>
        {/* Step 2: Photo input */}
        <label className="block mb-2 font-medium">Ambil foto QR yang tertempel pada asset</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full rounded-lg border px-3 py-2"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </Step>,
  
      <Step key={2}>
        {/* Step 3: Confirmation */}
        <div className="space-y-4 text-left">
          <h2 className="text-xl font-semibold">Konfirmasi</h2>
          <ConfirmationStep onValidityChange={(valid) => setIsConfirmed(valid)}/>
        </div>
      </Step>
    ];

    
  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  
  return (
    <form onSubmit={handleSubmit}>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-4">
      <div className="relative w-full md:w-[640px] max-h-[95vh] overflow-auto rounded-t-lg md:rounded-lg bg-white p-5 md:p-6">
      
        <button
          onClick={() => {
            onCreated?.(); 
            onClose();
          }}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl leading-none"
          aria-label="Close"
        >
          &times;
        </button>

        <>
          {/* Steps */}
          <div>{steps[currentStep]}</div>

          {/* Navigation */}
          <div className="flex justify-between mt-4">
      {currentStep > 0 && (
        <button
          type="button"
          onClick={prevStep}
          className="px-4 py-2 rounded-lg border bg-gray-100"
        >
          Kembali
        </button>
      )}

      {currentStep === steps.length - 1 ? (
        <button
          type="submit"
          disabled={!isConfirmed}
          className="px-4 py-2 rounded-lg bg-green-600 text-white"
        >
          Kirim
        </button>
      ) : (
        <button
          type="button"
          onClick={nextStep}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
        >
          Berikutnya
        </button>
      )}
    </div>
        </>
      </div>
  </div>
  </form>
  );
}
