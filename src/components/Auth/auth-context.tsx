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
  loading: boolean;
  signIn: (username: string, password: string) => Promise<User | null>;
  signUp: (payload: Record<string, any>) => Promise<User | null>;
  signOut: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Hydrate user dari localStorage saat pertama kali load
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch (e) {
      console.warn("Auth hydration failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Persist user + token ke localStorage
  const persist = (token: string | null, userObj: User | null) => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }

    if (userObj) {
      localStorage.setItem("user", JSON.stringify(userObj));
    } else {
      localStorage.removeItem("user");
    }

    setUser(userObj);
  };

  // Extract token + user dari API response
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
      // If result is null, it means we were unauthorized and handled by the safePost function
      if (res === null) {
        return null;
      }
      const { token, userObj } = extractTokenAndUser(res);
      if (!token) throw new Error("Token missing from login response");
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
      const res = await safePost("/register", payload);
      // If result is null, it means we were unauthorized and handled by the safePost function
      if (res === null) {
        return null;
      }
      const { token, userObj } = extractTokenAndUser(res);
      if (!token) throw new Error("Token missing from signup response");
      persist(token, userObj);
      return userObj;
    } finally {
      setLoading(false);
    }
  };

  // Manual sign out
  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/auth/sign-in");
  };


  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
