import type { Metadata } from "next";

import { WeReadApp } from "./WeReadApp";

export const metadata: Metadata = {
  title: "WeRead Notes｜微信读书笔记工作台",
  description:
    "连接微信读书官方 API，整理、回顾和导出你的划线与想法。",
};

export default function Home() {
  return <WeReadApp />;
}
