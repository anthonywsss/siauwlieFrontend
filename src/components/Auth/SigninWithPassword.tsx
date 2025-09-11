"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/Auth/auth-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import LoginFailModal from "@/components/LoginModal"

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
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const auth: any = useAuth();
  const { signIn } = auth;

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const hasRedirected = useRef(false);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const desiredNext = useMemo(() => {
    const nextParam = sanitizeInternalPath(searchParams?.get("next"));
    const role: string | undefined = auth?.user?.role;
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

  const isReady: boolean = Boolean(
    auth?.initialized ?? auth?.ready ?? true
  );

  const safeReplace = (to: string) => {
    if (!to || to === pathname) return;
    if (hasRedirected.current) return;
    hasRedirected.current = true;
    router.replace(to);
  };

  useEffect(() => {
    console.log("SigninWithPassword - redirect effect:", {
      isReady,
      isAuthed,
      desiredNext,
      pathname,
      hasRedirected: hasRedirected.current
    });

    if (isReady && isAuthed) {
      if (desiredNext.startsWith("/history/") && auth?.user?.role === "supervisor") {
        console.log("Preventing history redirect loop, going to dashboard");
        safeReplace("/");
      } else {
        safeReplace(desiredNext);
      }
    }
  }, [isReady, isAuthed, desiredNext, pathname]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
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
      setError(msg);
       setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (error && (username || password)) {
      setError(null);
    }
  }, [username, password, error]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8 sm:p-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Selamat Datang
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Sign in ke akun anda untuk lanjut
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="space-y-6">
          {/* Username Field */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={loading}
              >
                {showPassword ? (
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg text-sm sm:text-base"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <span>Sign In</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            )}
          </button>
        </form>
      </div>
        {isModalOpen && (
          <LoginFailModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
        )}
    </div>
  );
}