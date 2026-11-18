import type { Metadata, Viewport } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Lacoster Stock",
  description: "Gestão simples de estoque — Lacoster Stock",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#186a43",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${body.variable} ${display.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
