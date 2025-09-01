"use client";

import { useState } from "react";

export default function ConfirmationStep() {
  const [input, setInput] = useState("");

  const isValid = input === "Konfirmasi Laporan";

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
        <p className="text-red-500 text-sm">❌ Masukan Konfirmasi yang sesuai </p>
      )}
    </div>
  );
}
