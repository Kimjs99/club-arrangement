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
      <body className="min-h-full flex flex-col">
        <main className="flex-1">{children}</main>
        <footer className="mt-8 py-5 border-t border-gray-100 bg-white">
          <div className="max-w-5xl mx-auto px-4 text-center space-y-1">
            <p className="text-xs text-gray-500">
              © 2026 화접중학교 · 이 시스템은 교내 창의적 체험활동 동아리 배정 업무에만 사용됩니다. · v1.0.0
            </p>
            <p className="text-xs text-gray-400">
              수집된 학생 정보(학년·반·번호·이름)는 동아리 배정 목적으로만 이용되며, 외부에 제공되지 않습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
