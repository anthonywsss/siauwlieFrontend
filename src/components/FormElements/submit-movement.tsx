// Multi Step: Submit Movement
"use client";

import { useState, ReactNode, useEffect } from "react";
import { Select } from "@/components/FormElements/select";
import API from "@/lib/api";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import { TextAreaGroup } from "./InputGroup/text-area";

// Simple MultiStepForm & Step implementation
type StepProps = { children: ReactNode };
function Step({ children }: StepProps) {
  return <>{children}</>;
}

type RawClient = {
  id: string;
  name: string;
};

type AllAsset = {
  id: string;
  status: string;
};

export default function MultiStepFormPage() {
  const [currentStep, setCurrentStep] = useState(0);

  // body states
  const [asset_id, setAssetId] = useState("");
  const [client_id, setClientId] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [quantity, setQuantity] = useState<number>(0);
  const [movement_type] = useState("OUT");
  const [notes, setNotes] = useState("");
  
  const [photo, setPhoto] = useState<File | null>(null);
  const [base64Photo, setBase64Photo] = useState<string | null>(null);

  // data states
  const [allClients, setAllClients] = useState<RawClient[]>([]);
  const [allAssets, setAllAssets] = useState<AllAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AllAsset | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { signOut } = useAuth();
  const router = useRouter();

  // ambil lokasi
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAccuracy(pos.coords.accuracy);
      },
      (err) => {
        console.error("Error getting location:", err);
        alert("Failed to get location");
      }
    );
  };

  // fetch clients
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
        setError(
          err?.response?.data?.meta?.message ??
            err?.message ??
            "Failed to fetch clients"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, signOut]);

  // Fetch all assets
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await API.get("/asset");
        const list: AllAsset[] = res?.data?.data ?? [];
        if (!mounted) return;
        setAllAssets(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("fetch assets error:", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Input asset ID
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAssetId(value);

    const found = allAssets.find((a) => a.id === value);
    setSelectedAsset(found || null);
  };

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

  //status sekarang
  const status_sekarang = (() => {
    if (!selectedAsset) return "Belum ada";

    if (selectedAsset.status.trim() === "outbound_to_client") {
      return "Perjalanan ke pelanggan";
    } else if (selectedAsset.status.trim() === "inbount_at_client") {
      return "Digunakan pelanggan";
    } else if (selectedAsset.status.trim() === "outbound_to_factory") {
      return "Perjalanan ke pabrik";
    } else if (selectedAsset.status.trim() === "inbound_at_factory") {
      return "Di pabrik";
    } else {
      return "-";
    }
  })();
  // status selanjutnya
  const status_selanjutnya = (() => {
    if (!status_sekarang) return "Belum ada";

    if (status_sekarang.trim() === "Di pabrik") {
      return "Perjalanan ke pelanggan";
    } else if (status_sekarang.trim() === "Perjalanan ke pelanggan") {
      return "Digunakan pelanggan";
    } else if (status_sekarang.trim() === "Digunakan pelanggan") {
      return "Perjalanan ke pabrik";
    } else if (status_sekarang.trim() === "Perjalanan ke pabrik") {
      return "Di pabrik";
    } else {
      return "-";
    }
  })();

  const movement_type_api = (() => {
  switch (status_selanjutnya) {
    case "Perjalanan ke pelanggan": return "outbound_to_client";
    case "Digunakan pelanggan": return "inbound_at_client";
    case "Perjalanan ke pabrik": return "outbound_to_factory";
    case "Di pabrik": return "inbound_at_factory";
    default: return "outbound_to_client";
  }
})();


  // submit movement
  const handleSubmit = async (e: React.FormEvent) => {
    
    e.preventDefault();

    if (!asset_id) return alert("Asset ID tidak boleh kosong");
    if (!client_id) return alert("Pilih Klien terlebih dahulu");
    if (quantity <= 0) return alert("Masukkan kuantitas yang valid");
    if (latitude === null || longitude === null || accuracy === null) {
      return alert("Lokasi belum diambil, izinkan akses lokasi");
    }

    let finalPhoto = base64Photo;

    if (photo && !base64Photo) {
      finalPhoto = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(photo);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
    }

    const body = {
      asset_id,
      movement_type: movement_type_api,
      client_id: Number(client_id),
      quantity,
      notes,
      latitude,
      longitude,
      accuracy,
      photo: finalPhoto,
    };

    console.log("Submitting body:", body);

    try {
    const res = await API.post("/movements", body);
    console.log("Success:", res.data);
    alert("Data berhasil dikirim!");
  } catch (err: any) {
    console.error("Error submitting:", err);

    if (err?.response?.status === 400) {
      alert("Data tidak valid, periksa input Anda");
    } else if (err?.response?.status === 500) {
      alert("Terjadi kesalahan server, coba lagi nanti");
    } else {
      alert("Gagal mengirim data: " + err.message);
    }
  }
  };

  // steps
  const steps = [
    <Step key={0}>
      {/* Step 1: Scan QR */}
      <div className="space-y-6 rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
        <label className="block text-body-md font-medium text-dark">
          Scan kode QR pada Asset
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full rounded-lg border px-3 py-2"
        />
        <p>atau</p>

        <input
          type="text"
          placeholder="Masukan Asset ID secara manual"
          className="w-full rounded-lg border px-3 py-2"
          value={asset_id}
          onChange={handleIdChange}
        />

      </div>
    </Step>,

    <Step key={1}>
      {/* tampilkan hasil pencarian */}
        <div className="mt-4 text-md text-black">
          <p className="text-lg font-medium">Keterangan Asset</p>
          <p>ID: {selectedAsset?.id || "Belum ada"}</p>
          <p>Status Sekarang: {status_sekarang}</p>
          <p>Kirim Status: {status_selanjutnya}</p>
        </div>
        
      {/* Step 2: Klien dan Kuantitas */}
      <Select
        items={[
          { label: "Pilih Klien", value: "" },
          ...allClients.map((c) => ({ label: c.name, value: c.id })),
        ]}
        label="Lengkapi Data Dibawah"
        value={client_id}
        onChange={setClientId}
        required
        className="mb-5 mt-5"
      />
      <p>Selected Client ID: {client_id}</p>
      <input
        type="number"
        placeholder="Kuantitas"
        className="w-full rounded-lg border px-3 py-2"
        onChange={(e) => setQuantity(Number(e.target.value))}
      />
    </Step>,

    <Step key={2}>
      {/* Step 3: Ambil foto Asset */}
      <div className="space-y-6 rounded-2xl px-5 py-4 sm:px-6 sm:py-5">
        <label className="block text-body-md font-medium text-dark">
          Ambil Foto Asset
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full rounded-lg border px-3 py-2"
          onChange={handlePhotoChange}
        />
        <TextAreaGroup
          label="Tambahkan Catatan (Opsional)"
          placeholder="Deskripsikan kondisi asset"
          onChange={(e) => setNotes(e.target.value)}
        />

        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          onClick={handleGetLocation}
        >
          Izinkan Ambil Lokasi Anda
        </button>
        <div className="mt-4">
          <p>Latitude: {latitude !== null ? latitude : "-"}</p>
          <p>Longitude: {longitude !== null ? longitude : "-"}</p>
          <p>Accuracy: {accuracy !== null ? accuracy : "-" }</p>
        </div>
      </div>
    </Step>,
  ];

  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  return (
    <form onSubmit={handleSubmit}>
      <div>{steps[currentStep]}</div>
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
        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white "
          >
            Berikutnya
          </button>
        ) : (
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-green-600 text-white"
          >
            Kirim
          </button>
        )}
      </div>
    </form>
  );
}
