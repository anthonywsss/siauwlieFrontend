"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/Auth/auth-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEFAULT_ROUTE_BY_ROLE: Record<string, string> = {
  driver: "/submit-movement",
  security: "/submit-movement",
  supervisor: "/",
  admin: "/",
};

function getDefaultRouteForRole(role?: string): string {
  if (!role) return "/";
  return DEFAULT_ROUTE_BY_ROLE[role] ?? "/";
}

function sanitizeInternalPath(p?: string | null): string | null {
  if (!p) return null;
  if (p.startsWith("/") && !p.startsWith("//")) return p;
  return null;
}

function isAllowedForRole(_path: string, _role?: string): boolean {
  return true;
}

export default function SigninWithPassword() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const auth: any = useAuth();
  const { signIn } = auth;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const hasRedirected = useRef(false);

  // Compute the preferred destination: ?next (if internal) else role default, else "/"
  const desiredNext = useMemo(() => {
    const nextParam = sanitizeInternalPath(searchParams?.get("next"));
    const role: string | undefined = auth?.user?.role; // Remove auth?.role as it doesn't exist
    const roleDefault = getDefaultRouteForRole(role);

    console.log("SigninWithPassword - desiredNext calculation:", {
      nextParam,
      role,
      roleDefault,
      hasUser: !!auth?.user
    });

    if (nextParam && isAllowedForRole(nextParam, role)) return nextParam;
    return roleDefault || "/";
  }, [searchParams, auth?.user?.role]);

  const isAuthed: boolean = Boolean(
    auth?.isAuthenticated ?? auth?.user ?? auth?.token
  );

  // Prefer explicit ready/initialized flags; default to true if none provided
  const isReady: boolean = Boolean(
    auth?.initialized ?? auth?.ready ?? true
  );

  // Avoid loops: don't redirect if target is the current page
  const safeReplace = (to: string) => {
    if (!to || to === pathname) return;
    // guard multiple calls within the same render/mount
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    router.replace(to);
  };

  // If already authenticated (e.g., refreshed and landed on login), go to desiredNext
  useEffect(() => {
    console.log("SigninWithPassword - redirect effect:", {
      isReady,
      isAuthed,
      desiredNext,
      pathname,
      hasRedirected: hasRedirected.current
    });

    if (isReady && isAuthed) {
      // Prevent redirecting back to history pages that might cause loops
      // Instead, redirect supervisors to dashboard
      if (desiredNext.startsWith("/history/") && auth?.user?.role === "supervisor") {
        console.log("Preventing history redirect loop, going to dashboard");
        safeReplace("/");
      } else {
        safeReplace(desiredNext);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, isAuthed, desiredNext, pathname]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(username, password);
      const role: string | undefined = auth?.user?.role ?? auth?.role;
      const nextParam = sanitizeInternalPath(searchParams?.get("next"));
      const target =
        (nextParam && isAllowedForRole(nextParam, role) && nextParam) ||
        getDefaultRouteForRole(role) ||
        "/";
      safeReplace(target);
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.meta?.message ||
        err?.response?.data?.message ||
        err?.message;
      const msg = serverMsg ?? "Login failed — check your credentials.";
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