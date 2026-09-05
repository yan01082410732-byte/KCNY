import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { htmlLanguage, normalizeLanguage } from "@/lib/auth";

export const metadata: Metadata = {
  title: "KCNY | China × Korea Community",
  description: "A community connecting Chinese and Korean people."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const language = normalizeLanguage(requestHeaders.get("x-kcny-language"));
  return (
    <html lang={htmlLanguage(language)}>
      <body>{children}</body>
    </html>
  );
}
