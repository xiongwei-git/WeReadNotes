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
  assert.match(html, /密钥只保留在当前页面会话/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|Building your site/i);
  assert.doesNotMatch(html, /wrk-[A-Za-z0-9_-]{12,}/);
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
  assert.match(app, /数据看板/);
  assert.match(app, /本周/);
  assert.match(app, /本月/);
  assert.match(app, /今年/);
  assert.match(app, /全部/);
  assert.match(app, /className="chart-tooltip"/);
  assert.match(app, /tabIndex=\{0\}/);
  assert.match(styles, /\.data-category-row > div span[\s\S]*font-size: 14px/);
  assert.match(styles, /\.data-category-card \.data-card-heading > span[\s\S]*font-size: 13px/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await assert.rejects(access(new URL("../public/favicon.svg", import.meta.url)));
  await access(projectRoot);
});

test("keeps all visible pixel-based typography at 12px or larger", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const undersizedFontSizes = [...styles.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)]
    .map((match) => Number(match[1]))
    .filter((fontSize) => fontSize < 12);

  assert.deepEqual(undersizedFontSizes, []);
});
