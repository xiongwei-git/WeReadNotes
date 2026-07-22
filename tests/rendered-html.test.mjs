import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the WeRead Notes connection experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>WeRead Notes｜微信读书笔记工作台<\/title>/i);
  assert.match(html, /让划线离开书页/);
  assert.match(html, /微信读书 API Key/);
  assert.match(html, /aria-label="在此浏览器保存 API Key"/);
  assert.match(html, /<span>在此浏览器保存<\/span>/);
  assert.match(html, /type="checkbox"/);
  assert.doesNotMatch(html, /type="checkbox"[^>]*\schecked(?:=""|\s|>)/);
  assert.doesNotMatch(html, /仅建议在私人设备上开启/);
  assert.match(html, /密钥只保留在当前页面会话/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
  assert.doesNotMatch(html, /wrk-[A-Za-z0-9_-]{12,}/);
});

test("publishes complete social sharing metadata and brand assets", async () => {
  const response = await render();
  const html = await response.text();
  const [favicon, shareCover] = await Promise.all([
    readFile(new URL("../public/favicon.svg", import.meta.url)),
    readFile(new URL("../public/share-cover.png", import.meta.url)),
  ]);

  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/wereadnotes\.tedxiong\.com\/"/i,
  );
  assert.match(html, /<meta property="og:type" content="website"/i);
  assert.match(
    html,
    /<meta property="og:url" content="https:\/\/wereadnotes\.tedxiong\.com\/"/i,
  );
  assert.match(
    html,
    /<meta property="og:title" content="WeRead Notes｜微信读书笔记工作台"/i,
  );
  assert.match(
    html,
    /<meta property="og:description" content="连接微信读书官方 API，整理、回顾和导出你的划线与想法。"/i,
  );
  assert.match(
    html,
    /<meta property="og:image" content="https:\/\/wereadnotes\.tedxiong\.com\/share-cover\.png"/i,
  );
  assert.match(html, /<meta property="og:image:width" content="512"/i);
  assert.match(html, /<meta property="og:image:height" content="512"/i);
  assert.match(html, /<meta name="twitter:card" content="summary"/i);
  assert.match(
    html,
    /<meta name="twitter:image" content="https:\/\/wereadnotes\.tedxiong\.com\/share-cover\.png"/i,
  );
  assert.match(
    html,
    /<link rel="icon" href="https:\/\/wereadnotes\.tedxiong\.com\/favicon\.svg"/i,
  );
  assert.match(
    html,
    /<link rel="apple-touch-icon" href="https:\/\/wereadnotes\.tedxiong\.com\/share-cover\.png"/i,
  );
  assert.match(html, /<meta name="robots" content="index, follow"/i);
  assert.match(favicon.toString("utf8"), /<svg[\s\S]+WeRead Notes/);
  assert.deepEqual(
    [...shareCover.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
  );
});

test("keeps the finished workspace UI and accessible chart interactions", async () => {
  const [packageJson, page, layout, app, styles] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/WeReadApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(page, /_sites-preview|codex-preview/);
  assert.match(layout, /lang="zh-CN"/);
  assert.match(app, /同步数据/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /最近阅读/);
  assert.match(app, /笔记最多/);
  assert.match(app, /书名排序/);
  assert.match(app, /全部书架/);
  assert.match(app, /有笔记/);
  assert.match(app, /电子书/);
  assert.match(app, /有声书/);
  assert.match(app, /文章收藏/);
  assert.match(app, /数据看板/);
  assert.match(app, /<WeReadMark \/>/);
  assert.match(app, /仅建议在私人设备上开启/);
  assert.match(app, /readSavedApiKey\(getBrowserApiKeyStorage\(\)\)/);
  assert.match(app, /clearSavedApiKey\(getBrowserApiKeyStorage\(\)\)/);
  assert.match(app, /connectWithApiKey\(savedApiKey, true\)/);
  assert.match(app, /aria-busy=\{connection === "connecting"\}/);
  assert.equal(
    (app.match(/disabled=\{connection === "connecting"\}/g) || []).length,
    3,
  );
  assert.match(app, /本周/);
  assert.match(app, /本月/);
  assert.match(app, /今年/);
  assert.match(app, /全部/);
  assert.match(app, /className="chart-tooltip"/);
  assert.match(app, /tabIndex=\{0\}/);
  assert.match(styles, /\.data-category-row > div span[\s\S]*font-size: 14px/);
  assert.match(styles, /\.data-category-card \.data-card-heading > span[\s\S]*font-size: 13px/);
  assert.match(styles, /\.key-row \{[\s\S]*grid-template-areas:[\s\S]*"key submit"[\s\S]*"remember \."/);
  assert.match(styles, /\.key-row button \{[\s\S]*height: 50px/);
  assert.match(styles, /\.connect-card \.remember-key-option[\s\S]*white-space: nowrap/);
  assert.match(styles, /\.library-scope-controls/);
  assert.match(styles, /\.wordmark \{[\s\S]*font-size: 21px/);
  assert.match(styles, /\.wordmark-symbol/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../public/favicon.svg", import.meta.url));
  await access(new URL("../public/share-cover.png", import.meta.url));
  await access(projectRoot);
});

test("keeps all visible pixel-based typography at 12px or larger", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const undersizedFontSizes = [...styles.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)]
    .map((match) => Number(match[1]))
    .filter((fontSize) => fontSize < 12);

  assert.deepEqual(undersizedFontSizes, []);
});
