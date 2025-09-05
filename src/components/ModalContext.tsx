// src/contexts/ModalContext.tsx
"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ModalContextType = {
  openCount: number;
  registerOpen: () => void;
  registerClose: () => void;
};

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [openCount, setOpenCount] = useState<number>(0);

  const registerOpen = useCallback(() => setOpenCount((c) => c + 1), []);
  const registerClose = useCallback(() => setOpenCount((c) => Math.max(0, c - 1)), []);

  // Sync body.modal-open
  useEffect(() => {
    if (openCount > 0) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }, [openCount]);

  // ensure cleanup on unmount (just in case)
  useEffect(() => {
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  return (
    <ModalContext.Provider value={{ openCount, registerOpen, registerClose }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModalManager() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModalManager must be used under ModalProvider");
  return ctx;
}

/**
 * Minimal hook to declare "this modal is open" to the manager.
 * Usage: useModalWatch(open);
 */
export function useModalWatch(open: boolean | undefined | null) {
  const { registerOpen, registerClose } = useModalManager();
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    const isOpen = Boolean(open);
    if (isOpen && !wasOpenRef.current) {
      registerOpen();
      wasOpenRef.current = true;
    } else if (!isOpen && wasOpenRef.current) {
      registerClose();
      wasOpenRef.current = false;
    }

    return () => {
      // cleanup on unmount if it was still open
      if (wasOpenRef.current) {
        registerClose();
        wasOpenRef.current = false;
      }
    };
  }, [open, registerOpen, registerClose]);
}
