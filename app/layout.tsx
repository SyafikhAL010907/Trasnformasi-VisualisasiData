import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard Analisis Data Penjualan | Kelompok 8",
  description:
    "Aplikasi web analisis data penjualan dengan visualisasi interaktif. Implementasi Tema 9 - Transformasi Data menggunakan Python (Pandas & NumPy).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-(family-name:--font-inter)">
        {children}
      </body>
    </html>
  );
}
