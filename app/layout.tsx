import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KCNY | China × Korea Community",
  description: "A community connecting Chinese and Korean people."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
