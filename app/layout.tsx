import type { Metadata } from "next";

import { WeChatShareSetup } from "./components/WeChatShareSetup";
import "./globals.css";

const siteUrl = "https://wereadnotes.tedxiong.com";
const siteTitle = "WeRead Notes｜微信读书笔记工作台";
const siteDescription =
  "连接微信读书官方 API，整理、回顾和导出你的划线与想法。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "WeRead Notes",
  title: siteTitle,
  description: siteDescription,
  authors: [{ name: "WeRead Notes" }],
  creator: "WeRead Notes",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [
      { url: "/share-cover.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "WeRead Notes",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/share-cover.png",
        width: 512,
        height: 512,
        alt: "WeRead Notes 书页标志",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/share-cover.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <WeChatShareSetup />
        {children}
      </body>
    </html>
  );
}
