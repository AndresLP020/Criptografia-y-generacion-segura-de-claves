import type { Metadata } from "next";
import { JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Laboratorio de claves seguras | Ciberseguridad",
  description:
    "Generador educativo de claves AES, pares RSA, contraseñas y hashes. Web Crypto API y buenas prácticas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${orbitron.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen font-mono">{children}</body>
    </html>
  );
}
