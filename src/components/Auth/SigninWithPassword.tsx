"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/Auth/auth-context";
import { useRouter, useSearchParams } from "next/navigation";

export default function SigninWithPassword() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // We don't know exact shape of the auth context beyond signIn.
  // Use a flexible reference to detect authenticated state without breaking types.
  const auth: any = useAuth();
  const { signIn } = auth;

  const router = useRouter();
  const searchParams = useSearchParams();

  // Only allow internal redirects to avoid open-redirect issues.
  const redirectTo = useMemo(() => {
    const nextParam = searchParams?.get("next");
    if (nextParam && nextParam.startsWith("/")) return nextParam;
    return "/";
  }, [searchParams]);

  // Derive "authenticated" and "ready" states best-effort based on common patterns.
  const isAuthed: boolean = Boolean(auth?.isAuthenticated ?? auth?.user ?? auth?.token);
  const isReady: boolean = Boolean(auth?.initialized ?? auth?.ready ?? true);

  // If the user is already authenticated (e.g., refresh sent them to login),
  // immediately send them back to the original destination or home.
  useEffect(() => {
    if (isReady && isAuthed) {
      router.replace(redirectTo);
    }
  }, [isReady, isAuthed, redirectTo, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(username, password);
      // showToast("success", "Signed in successfully! Redirecting...");
      router.replace(redirectTo);
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.meta?.message ||
        err?.response?.data?.message ||
        err?.message;
      const msg = serverMsg ?? "Login failed — check your credentials.";
      // showToast("error", msg);
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