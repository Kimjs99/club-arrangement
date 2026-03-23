import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "화접중학교 창체동아리 배정 관리 시스템",
  description: "화접중학교 창의적 체험활동 동아리 배정 관리 웹 애플리케이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
