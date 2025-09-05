// src/components/ModalBodyWatcher.tsx
"use client";

import { useEffect } from "react";

const DEFAULT_MODAL_SELECTORS = [
  '[role="dialog"]',
  '[aria-modal="true"]',
  ".modal",
  "[data-modal]",
  ".react-modal",     // common libs: react-modal
  ".chakra-modal",    // chakra-ui
  ".mantine-Modal",   // mantine
  ".ant-modal",       // antd
];

function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;

  // respect aria-hidden explicitly
  if (el.getAttribute("aria-hidden") === "true") return false;

  // computed style checks (robust for fixed/absolute elements)
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity || "1") === 0) {
    return false;
  }

  // bounding rect checks (works for fixed/positioned/portal modals)
  const rects = el.getClientRects();
  if (rects && rects.length > 0) {
    // some tiny rects might be offscreen; ensure reasonable area
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return true;
  }

  // fallback: check offset sizes (works in many cases)
  if (el.offsetWidth > 0 || el.offsetHeight > 0) return true;

  return false;
}

export default function ModalBodyWatcher({
  extraSelectors = [],
}: { extraSelectors?: string[] } = {}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const selectors = Array.from(new Set([...DEFAULT_MODAL_SELECTORS, ...extraSelectors]));

    const query = selectors.join(", ");

    const checkAndToggle = () => {
      try {
        const nodes = Array.from(document.querySelectorAll(query));
        const anyOpen = nodes.some((el) => isElementVisible(el));
        document.body.classList.toggle("modal-open", anyOpen);
      } catch (err) {
        // safe fallback: if query fails, remove class
        document.body.classList.remove("modal-open");
        console.error("ModalBodyWatcher query error:", err);
      }
    };

    // run once immediately
    checkAndToggle();

    // observer for DOM changes that affect modals
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(checkAndToggle);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "aria-hidden", "aria-modal"],
    });

    // also check on resize/visibility change
    window.addEventListener("resize", checkAndToggle);
    window.addEventListener("orientationchange", checkAndToggle);
    document.addEventListener("visibilitychange", checkAndToggle);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", checkAndToggle);
      window.removeEventListener("orientationchange", checkAndToggle);
      document.removeEventListener("visibilitychange", checkAndToggle);
      document.body.classList.remove("modal-open");
    };
  }, []);

  return null;
}
