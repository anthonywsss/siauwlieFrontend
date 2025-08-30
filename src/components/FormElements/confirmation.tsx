"use client";

import { useState } from "react";

export default function ConfirmationStep() {
  const [input, setInput] = useState("");

  const isValid = input === "Confirm my request";

  return (
    <div className="space-y-4 text-left">
      <p>
        Type exactly: <b>Confirm my request</b>
      </p>
      <input
        type="text"
        className="border p-2 rounded w-full"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {isValid ? (
        <p className="text-green-600 font-medium">✅ Confirmation ready</p>
      ) : (
        <p className="text-red-500 text-sm">❌ Input doesn’t match</p>
      )}
    </div>
  );
}
