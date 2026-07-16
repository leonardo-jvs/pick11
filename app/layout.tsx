import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastViewport } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Pick11",
  description: "Draft. Escale. Vença. Um jogo multiplayer de estratégia de futebol.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A0F0D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-base text-text-primary antialiased">
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
