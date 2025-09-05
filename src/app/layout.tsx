// app/layout.tsx
import "@/css/satoshi.css";
import "@/css/style.css";

import { Sidebar } from "@/components/Layouts/sidebar";
import { Header } from "@/components/Layouts/header";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";

import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";
import { AuthProvider } from "@/components/Auth/auth-context";
import LayoutWrapper from "./layout-wrapper"; 

export const metadata: Metadata = {
  title: {
    template: "%s | Siauw Pabrik Tahu",
    default: "Siauw Pabrik Tahu",
  },
  description: "p",
};

import { ModalProvider } from "@/components/ModalContext";

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ModalProvider>            {/* <-- wrap here */}
            <AuthProvider>
              <NextTopLoader color="#5750F1" showSpinner={false} />
              <LayoutWrapper>{children}</LayoutWrapper>
            </AuthProvider>
          </ModalProvider>
        </Providers>
      </body>
    </html>
  );
}


