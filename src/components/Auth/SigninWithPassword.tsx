// src/components/Auth/SigninWithPassword.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

type ToastType = "success" | "error";

function Toast({ type, message, onClose }: { type: ToastType; message: string; onClose?: () => void; }) {
  return (
    <div role="status" aria-live="polite" className="w-full max-w-sm rounded-lg shadow-lg bg-white">
      <div className="flex items-start gap-3 p-3">
        <div className={`p-2 rounded-full ${type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {type === "success" ? "✓" : "!"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{type === "success" ? "Success" : "Error"}</p>
          <p className="text-xs text-gray-600">{message}</p>
        </div>
        <button onClick={onClose} aria-label="Close" className="ml-2 p-1">✕</button>
      </div>
    </div>
  );
}

export default function SigninWithPassword() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<ToastType>("success");

  const showToast = (type: ToastType, message: string, autoClose = true) => {
    setToastType(type);
    setToastMessage(message);
    setToastVisible(true);
    if (autoClose) setTimeout(() => setToastVisible(false), 3000);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(username, password);
      showToast("success", "Signed in successfully! Redirecting...");
      setTimeout(() => router.push("/"), 800);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message ?? "Login failed — check your credentials / server.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={submit} className="max-w-md">
        <div className="mb-3">
          <label className="block text-sm font-medium">Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1 block w-full rounded border px-3 py-2" autoComplete="username" />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 block w-full rounded border px-3 py-2" autoComplete="current-password" />
        </div>

        <button type="submit" disabled={loading} className="inline-flex items-center justify-center rounded bg-primary px-4 py-2 text-white disabled:opacity-60">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="fixed top-4 right-4 z-50 pointer-events-none">
        {toastVisible && <Toast type={toastType} message={toastMessage} onClose={() => setToastVisible(false)} />}
      </div>
    </>
  );
}
