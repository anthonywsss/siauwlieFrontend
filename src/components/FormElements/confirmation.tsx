"use client";

import { useState, useEffect } from "react";

type Props = {
  onValidityChange?: (valid: boolean) => void;
};

export default function ConfirmationStep({ onValidityChange }: Props) {
  const [input, setInput] = useState("");

  const isValid = input === "Konfirmasi Laporan";

  useEffect(() => {
    onValidityChange?.(isValid);
  }, [isValid, onValidityChange]);

  return (
    <div className="space-y-4 text-left">
      <p>
        Ketik: <b>Konfirmasi Laporan</b>
      </p>
      <input
        type="text"
        className="border p-2 rounded w-full"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {isValid ? (
        <p className="text-green-600 font-medium">✅ Laporan Terkonfirmasi</p>
      ) : (
        <p className="text-red-500 text-sm">❌ Masukan Konfirmasi yang sesuai</p>
      )}
    </div>
  );
}
