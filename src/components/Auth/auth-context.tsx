"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { safePost } from "@/lib/fetcher";
import { useRouter } from "next/navigation";

type User = {
  name?: string;
  email?: string;
  img?: string;
  role?: string;
  [k: string]: any;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<User | null>;
  signUp: (payload: Record<string, any>) => Promise<User | null>;
  signOut: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Hydrate user + token from localStorage
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      const rawToken = localStorage.getItem("token");
      if (rawUser) setUser(JSON.parse(rawUser));
      if (rawToken) setToken(rawToken);
    } catch (e) {
      console.warn("Auth hydration failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Persist user + token to localStorage
  const persist = (token: string | null, userObj: User | null) => {
    if (token) {
      localStorage.setItem("token", token);
      setToken(token);
    } else {
      localStorage.removeItem("token");
      setToken(null);
    }

    if (userObj) {
      localStorage.setItem("user", JSON.stringify(userObj));
      setUser(userObj);
    } else {
      localStorage.removeItem("user");
      setUser(null);
    }
  };

  // Extract token + user from API response
  const extractTokenAndUser = (resData: any): { token: string | null; userObj: User | null } => {
    const dataArray = resData?.data;
    const token =
      Array.isArray(dataArray) && dataArray[0]?.token
        ? dataArray[0].token
        : resData?.token ?? null;

    let userObj: any = null;
    if (Array.isArray(dataArray) && dataArray[0]) {
      userObj = { ...dataArray[0] };
      delete userObj.token;
    } else if (resData?.data && typeof resData.data === "object") {
      userObj = { ...resData.data };
      delete userObj.token;
    }
    return { token, userObj };
  };

  // Login
  const signIn: AuthContextType["signIn"] = async (username, password) => {
  setLoading(true);
  try {
    const res = await safePost("/login", { username, password });
    
    if (!res) throw new Error("No response from server");

    // Assuming your API returns a status or success flag
    if (res?.status === "error" || !res?.data?.[0]?.token) {
      const msg = res?.message || "Invalid username or password";
      throw new Error(msg);
    }

    const { token, userObj } = extractTokenAndUser(res);
    persist(token, userObj);
    return userObj;
  } finally {
    setLoading(false);
  }
};

  // Register
  const signUp: AuthContextType["signUp"] = async (payload) => {
    setLoading(true);
    try {
      const res = await safePost("/register", payload); // ✅ changed from /SigninWithPassword
      if (res === null) return null;

      const { token, userObj } = extractTokenAndUser(res);
      if (!token) throw new Error("Token missing from signup response");
      persist(token, userObj);
      return userObj;
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = () => {
    persist(null, null);
    router.push("/auth/sign-in");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
