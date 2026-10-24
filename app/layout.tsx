import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { htmlLanguage, normalizeLanguage } from "@/lib/auth";
import { PostMediaProvider } from "@/components/PostImage";
import { mediaReadsAvailable } from "@/lib/post-media-policy";

export const metadata: Metadata = {
  title: "KCNY | China × Korea Community",
  description: "A community connecting Chinese and Korean people."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const language = normalizeLanguage(requestHeaders.get("x-kcny-language"));
  return (
    <html lang={htmlLanguage(language)}>
      <body><PostMediaProvider available={mediaReadsAvailable(process.env)}>{children}</PostMediaProvider></body>
    </html>
  );
}
