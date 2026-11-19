import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&family=Space+Grotesk:wght@300..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full antialiased" suppressHydrationWarning>
        <style>{`
button,[type=button],[type=submit]{cursor:pointer!important}
button:disabled{cursor:not-allowed!important}
.stock-names-only table thead th:not(:first-child),
.stock-names-only table tbody td:not(:first-child),
.stock-names-only .stock-sensitive{display:none!important}
.stock-names-only table thead th:first-child,
.stock-names-only table tbody td:first-child{border-right:none;width:100%}
.stock-table th,.stock-table td{border-color:#6f8076!important}
.stock-table tbody tr{border-top:1px solid #6f8076}
.stock-modal-backdrop{position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.55)}
.stock-modal-panel{width:100%;max-width:32rem;background:#fff;border:1px solid #6f8076;border-radius:24px;padding:24px;box-shadow:0 16px 36px rgba(18,32,24,0.18)}
`}</style>
        {children}
      </body>
    </html>
  );
}
