"use client";

import { useState } from "react";
import { Step } from "@/components/FormElements/step";
import ConfirmationStep from "@/components/FormElements/confirmation";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";

type CreateNewAssetProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateNewAsset({ open, onClose, onCreated }: CreateNewAssetProps) {
  const { signOut } = useAuth();

  const [status, setStatus] = useState("");
  const [assetType, setAssetType] = useState("");
  const [client, setClient] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [base64Photo, setBase64Photo] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  // steps defined as functions (not JSX directly)
  const steps = [
    () => (
      <Step>
        {/* Step 1: Status, Asset Type, Client */}
        <div className="space-y-6 rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Pilih Status</option>
              <option value="inbound_at_factory">Inbound at Factory</option>
              <option value="inbound_at_client">Inbound at Client</option>
              <option value="outbound_from_factory">Outbound from Factory</option>
              <option value="outbound_from_client">Outbound from Client</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">Jenis Asset</label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Pilih Jenis Asset</option>
              <option value="1">Container</option>
              <option value="2">Pallet</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">Client</label>
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

          </div>
        </div>
      </Step>
    ),
    () => (
      <Step>
        {/* Step 2: Photo input */}
        <label className="block mb-2 font-medium">
          Ambil foto QR yang tertempel pada asset
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full rounded-lg border px-3 py-2"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </Step>
    ),
    () => (
      <Step>
        {/* Step 3: Confirmation */}
        <div className="space-y-4 text-left">
          <h2 className="text-xl font-semibold">Konfirmasi</h2>
          <ConfirmationStep onValidityChange={setIsConfirmed} />
        </div>
      </Step>
    ),
  ];

  const handleSubmit = async () => {
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

      alert("Data berhasil dikirim!\nAsset ID: " + res.data?.data?.id);

      // reset form
      setStatus("");
      setClient("");
      setAssetType("");
      setPhoto(null);
      setBase64Photo(null);

      onCreated();
      onClose();
    } catch (err: any) {
      console.error("add asset error:", err);

      if (err?.response?.status === 401) {
        signOut();
        window.location.href = "/auth/sign-in";
        return;
      }

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
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-4">Buat Asset Baru</h2>

          {/* Step content */}
          <div>{steps[currentStep]()}</div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-4">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-4 py-2 bg-gray-300 text-sm text-black rounded"
              >
                Kembali
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="px-4 py-2 bg-primary text-sm text-white rounded"
              >
                Lanjut
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !isConfirmed}
                className="px-4 py-2 bg-primary text-sm text-white rounded disabled:opacity-50"
              >
                {submitting ? "Mengirim..." : "Submit"}
              </button>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>
      </div>
    </div>
  );
}
