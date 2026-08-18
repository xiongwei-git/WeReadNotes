import type { Metadata } from "next";
import Link from "next/link";

import { WeReadMark } from "../components/WeReadMark";

const wereadSkillsUrl = "https://weread.qq.com/r/weread-skills";

export const metadata: Metadata = {
  title: "获取微信读书 API Key｜WeRead Notes",
  description: "在微信读书官方页面获取 API Key，并连接 WeRead Notes。",
  robots: {
    index: false,
    follow: true,
  },
};

export default function GetApiKeyPage() {
  return (
    <main className="api-key-guide-page">
      <header className="guide-brand-bar">
        <Link className="wordmark" href="/" aria-label="返回 WeRead Notes 首页">
          <WeReadMark />
          <span>WeRead Notes</span>
        </Link>
        <Link className="guide-back-link" href="/">
          返回连接页
        </Link>
      </header>

      <section className="api-key-guide-content" aria-labelledby="api-key-guide-title">
        <div className="api-key-guide-copy">
          <p className="eyebrow">官方页面操作指引</p>
          <h1 id="api-key-guide-title">获取微信读书 API Key</h1>
          <p className="api-key-guide-lead">
            WeRead Notes 只需要你的 API Key。进入官方页面后，直接操作右侧的“获取 API Key”卡片即可。
          </p>
          <aside className="api-key-guide-notice">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A8.5 8.5 0 0 0 12 3.5Zm0 4.2v.2m0 3.2v5" />
            </svg>
            <p>
              <strong>不需要复制或安装左侧的 Skill 指令。</strong>
              那是给 AI 助手使用的可选安装方式，不是连接 WeRead Notes 的必要步骤。
            </p>
          </aside>
        </div>

        <figure className="api-key-guide-figure">
          {/* Official UI screenshot: load directly to avoid requiring an image-optimization service. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/weread-api-key-guide.png"
            alt="微信读书官方页面示意：箭头指向右侧的获取 API Key 卡片；左侧复制 Skill 安装指令无需操作。"
            width={1555}
            height={1012}
          />
          <figcaption>
            在官方页面中，点击右侧“获取 API Key”卡片的按钮；示意图已隐去 Key 和使用信息。
          </figcaption>
        </figure>

        <div className="api-key-guide-actions">
          <a
            className="api-key-guide-primary-action"
            href={wereadSkillsUrl}
            target="_blank"
            rel="noreferrer"
          >
            马上去获取 API Key
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 17 17 7m-7 0h7v7" />
            </svg>
          </a>
          <Link className="api-key-guide-secondary-action" href="/">
            已获取，返回粘贴 API Key
          </Link>
          <p>将打开微信读书官方页面。</p>
        </div>
      </section>
    </main>
  );
}
