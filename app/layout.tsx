import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RifaGO - Plataforma de Rifas e Eventos",
  description:
    "Escolha seus pontos, pague via Pix com confirmação automática e participe da nossa rifa!",
  keywords: ["rifa", "sorteio", "rifago", "pontos", "pix"],
  authors: [{ name: "RifaGO" }],
  openGraph: {
    title: "RifaGO - Escolha seus pontos!",
    description: "Reserve seus números e pague com praticidade via Pix.",
    url: "https://rifago.vercel.app",
    siteName: "RifaGO",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Footer />
      </body>
    </html>
  );
}
