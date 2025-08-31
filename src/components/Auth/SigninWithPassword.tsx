"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter } from "next/navigation";
import { showToast } from "../Toast/Toast";

export default function SigninWithPassword() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(username, password);
      showToast("success", "Signed in successfully! Redirecting...");
      setTimeout(() => router.push("/"), 500);
    } catch (err: any) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.meta?.message ||
        err?.response?.data?.message ||
        err?.message;
      const msg = serverMsg ?? "Login failed — check your credentials.";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 max-w-sm mx-auto mt-10">
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border p-2 rounded"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2 rounded"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white py-2 rounded disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
