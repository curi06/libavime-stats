import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dirección pública del sitio, para armar enlaces e imágenes absolutos
// al compartir (WhatsApp, Instagram…).
const SITIO = process.env.NEXT_PUBLIC_SITIO_URL?.trim() || "https://libavime.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITIO),
  openGraph: { siteName: "Quinteto Pro", locale: "es_DO", type: "website" },
  twitter: { card: "summary_large_image" },
  title: "Quinteto Pro",
  description: "Plataforma de estadísticas para ligas de baloncesto",
  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        type: "image/png",
      },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}