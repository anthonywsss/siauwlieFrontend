// Multi Step: Create New Asset Flow
"use client";

import { useState, ReactNode, useEffect } from "react";
import { Select } from "@/components/FormElements/select";
import ConfirmationStep from "@/components/FormElements/confirmation";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import { safePost } from "@/lib/fetcher";

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

export default function MultiStepFormPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [assetType, setAssetType] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [allClients, setAllClients] = useState<RawClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { signOut } = useAuth();
  const router = useRouter();

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
        <ConfirmationStep />
      </div>
    </Step>,

    <Step key={3}>
      {/* Step 4: QR placeholder */}
      <p className="text-gray-600">QR Asset</p>
    </Step>,
  ];

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    const formData = { status, client, assetType, photo };
    try {
      const result = await safePost<any>("/assets", formData);
      if (!result) throw new Error("Unauthorized");
      console.log("✅ Submitted successfully:", result);
    } catch (error) {
      console.error("❌ Error submitting form:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div>{steps[currentStep]}</div>

      <div className="flex justify-between mt-4">
        {currentStep > 0 && (
          <button
            onClick={prevStep}
            className="px-4 py-2 rounded-lg border bg-gray-100"
          >
            Kembali
          </button>
        )}
        {currentStep < steps.length - 1 ? (
          <button
            onClick={nextStep}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white "
          >
            Berikutnya
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-green-600 text-white"
          >
            Kirim
          </button>
        )}
      </div>
    </div>
  );
}
