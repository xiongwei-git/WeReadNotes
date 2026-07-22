import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "WeRead Notes",
  description: "把微信读书的划线与想法，整理成可回顾的个人阅读地图。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
