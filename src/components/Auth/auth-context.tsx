"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import API from "@/lib/api";
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

  useEffect(() => {
    // hydrate from localStorage
    try {
      if (typeof window !== "undefined") {
        const rawUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (token) {
          API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }
        if (rawUser) setUser(JSON.parse(rawUser));
      }
    } catch (e) {
      console.warn("Auth hydration failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const persist = (token: string | null, userObj: User | null) => {
    if (token) {
      localStorage.setItem("token", token);
      API.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      localStorage.removeItem("token");
      delete API.defaults.headers.common["Authorization"];
    }

    if (userObj) {
      const clone = { ...userObj };
      if ("token" in clone) delete clone.token;
      localStorage.setItem("user", JSON.stringify(clone));
    } else {
      localStorage.removeItem("user");
    }

    setUser(userObj ? (userObj as User) : null);
  };

  const extractTokenAndUser = (resData: any): { token: string | null; userObj: User | null } => {
    const dataArray = resData?.data;
    const token =
      Array.isArray(dataArray) && dataArray[0]?.token
        ? dataArray[0].token
        : resData?.token ?? null;

    let userObj: any = null;
    if (Array.isArray(dataArray) && dataArray[0]) {
      userObj = { ...dataArray[0] };
      if (userObj.token) delete userObj.token;
    } else if (resData?.data && typeof resData.data === "object") {
      userObj = { ...resData.data };
      if (userObj.token) delete userObj.token;
    }
    return { token, userObj };
  };

  const signIn: AuthContextType["signIn"] = async (username, password) => {
    setLoading(true);
    try {
      const res = await API.post("/login", { username, password });
      const { token, userObj } = extractTokenAndUser(res.data);
      if (!token) throw new Error("Token missing from login response");
      persist(token, userObj);
      return userObj;
    } finally {
      setLoading(false);
    }
  };

  const signUp: AuthContextType["signUp"] = async (payload) => {
    setLoading(true);
    try {
      const res = await API.post("/register", payload);
      const { token, userObj } = extractTokenAndUser(res.data);
      if (!token) throw new Error("Token missing from signup response");
      persist(token, userObj);
      return userObj;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    persist(null, null);
    try {
      router.push("/auth/sign-in");
    } catch (e) {}
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
