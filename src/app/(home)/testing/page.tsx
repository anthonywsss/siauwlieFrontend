"use client";

import { useState } from "react";

export default function AssetInput() {
  const [photo, setPhoto] = useState<File | null>(null);
  const [base64Photo, setBase64Photo] = useState<string | null>(null);

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

  return (
    <div>
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
      {base64Photo && (
        <p className="break-all mt-2">{base64Photo}</p>
      )}
    </div>
  );
}
