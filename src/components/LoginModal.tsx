"use client";

import React from "react";

type LoginFailModal = {
  open: boolean;
  onClose: () => void;
  onTryAgain: () => void; // Added Try Again handler
};

export default function LoginFailModal({ open, onClose, onTryAgain }: LoginFailModal) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-sm w-full">
        {/* Close button pinned top-right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold text-red-600 text-left">
          Failed to Login
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 text-left">
          Make sure your username and password are valid.
        </p>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            onClick={onTryAgain}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
