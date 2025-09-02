"use client";

import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { SetStateActionType } from "@/types/set-state-action-type";
import { createPortal } from "react-dom";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
} from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  type Placement,
} from "@floating-ui/react";

type DropdownContextType = {
  isOpen: boolean;
  handleOpen: () => void;
  handleClose: () => void;
  refs: ReturnType<typeof useFloating>["refs"];
  floatingStyles: ReturnType<typeof useFloating>["floatingStyles"];
};

const DropdownContext = createContext<DropdownContextType | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdownContext must be used within a Dropdown");
  }
  return context;
}

type DropdownProps = {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: SetStateActionType<boolean>;
};

export function Dropdown({ children, isOpen, setIsOpen }: DropdownProps) {
  const { refs, floatingStyles } = useFloating({
    placement: "bottom-end",
    middleware: [offset(6), flip(), shift()],
  });

  function handleClose() {
    setIsOpen(false);
  }

  function handleOpen() {
    setIsOpen(true);
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <DropdownContext.Provider
      value={{ isOpen, handleOpen, handleClose, refs, floatingStyles }}
    >
      {children}
    </DropdownContext.Provider>
  );
}

type DropdownContentProps = {
  align?: "start" | "end" | "center";
  className?: string;
  children: React.ReactNode;
};

export function DropdownContent({
  children,
  className,
}: DropdownContentProps) {
  const { isOpen, handleClose, refs, floatingStyles } = useDropdownContext();

  const contentRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) handleClose();
  });

  if (!isOpen) return null;

  const dropdown = (
    <div
      ref={(node) => {
        refs.setFloating(node);
        (contentRef as any).current = node;
      }}
      role="menu"
      aria-orientation="vertical"
      style={floatingStyles}
      className={cn(
        "fade-in-0 zoom-in-95 pointer-events-auto z-[99999] min-w-[8rem] rounded-lg border border-stroke bg-white shadow-md",
        className,
      )}
    >
      {children}
    </div>
  );

  return createPortal(dropdown, document.body);
}

type DropdownTriggerProps = React.HTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function DropdownTrigger({
  children,
  className,
}: DropdownTriggerProps) {
  const { handleOpen, isOpen, refs } = useDropdownContext();

  return (
    <button
      ref={refs.setReference}
      className={className}
      onClick={handleOpen}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      data-state={isOpen ? "open" : "closed"}
    >
      {children}
    </button>
  );
}

export function DropdownClose({ children }: PropsWithChildren) {
  const { handleClose } = useDropdownContext();
  return <div onClick={handleClose}>{children}</div>;
}
