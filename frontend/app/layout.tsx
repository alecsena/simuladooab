import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OAB Simulado",
  description: "Sistema de simulado para o Exame de Ordem",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
