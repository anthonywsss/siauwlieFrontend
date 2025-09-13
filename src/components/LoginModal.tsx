"use client";

import React from "react";

type LoginFailModal = {
  open: boolean;
  onClose: () => void;
};

export default function LoginFailModal({ open, onClose }: LoginFailModal) {
  if (!open) return null; // 🔹 don't render unless open is true
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full h-40 flex items-center justify-center">
        {/* Close button pinned top-right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ✕
        </button>

        {/* Centered text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 text-left">
            Failed to Login
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 text-left">
            Make sure your username and password are valid.
          </p>
        </div>
      </div>
    </div>
  );

}
