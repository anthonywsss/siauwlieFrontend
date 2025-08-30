"use client";

import { useState, ReactNode } from "react";
import { Select } from "@/components/FormElements/select";
import ConfirmationStep from "@/components/FormElements/confirmation";

// Simple MultiStepForm & Step implementation
type StepProps = { children: ReactNode };
function Step({ children }: StepProps) {
  return <>{children}</>;
}

export default function MultiStepFormPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState("");
  const [client, setClient] = useState("");
  const [assetType, setAssetType] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const steps = [
    <Step key={0}>
      {/* Step 1: Selects */}
      <div className="space-y-6 rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
        <Select
          items={[
            { label: "Dropdown Status", value: "" },
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
            { label: "Dropdown Klien", value: "" },
            { label: "Klien01", value: "klien01" },
          ]}
          label="Klien"
          value={client}
          onChange={setClient}
          required
          className="mb-5"
        />

        <Select
          items={[
            { label: "Dropdown Tipe Asset", value: "" },
            { label: "Kontainer", value: "kontainer" },
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
      <label className="block mb-2 font-medium">Take a photo</label>
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
        <h2 className="text-xl font-semibold">Confirm Your Details</h2>
        <p className="text-gray-600">Please review your information before submitting.</p>
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
      const response = await fetch("https://your-api.com/endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to submit");
      const result = await response.json();
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
            Back
          </button>
        )}
        {currentStep < steps.length - 1 ? (
          <button
            onClick={nextStep}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white "
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-green-600 text-white"
          >
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
