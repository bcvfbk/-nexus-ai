import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "НЕХУС — помощник при любых делах",
  description: "Универсальный ИИ-помощник с глубоким анализом интернета, поиском товаров, цен и прямых ссылок.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
