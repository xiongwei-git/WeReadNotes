"use client";

import { FormEvent, useMemo, useState } from "react";

import {
  buildBookMarkdown,
  buildWeReadNotebookReaderUrl,
  filterAndSortNotebooks,
  formatDuration,
  formatReadingBucketLabel,
  getBookNoteTotal,
  groupBookNotes,
  mergeShelfReadingMetadata,
  type BookSortMode,
  type NoteGroup,
  type ReadStatsMode,
  validateApiKey,
} from "./lib/weread-core";
import { refreshWeReadData } from "./lib/weread-sync";

type BookInfo = {
  bookId: string;
  title: string;
  author?: string;
  cover?: string;
  category?: string;
  readUpdateTime?: number;
};

type Notebook = {
  bookId: string;
  book: BookInfo;
  reviewCount?: number;
  noteCount?: number;
  bookmarkCount?: number;
  readingProgress?: number;
  markedStatus?: number;
  sort?: number;
};

type NotebookResponse = {
  errcode?: number;
  errmsg?: string;
  totalBookCount?: number;
  totalNoteCount?: number;
  hasMore?: number;
  books?: Notebook[];
  upgrade_info?: { message?: string };
};

type ShelfResponse = {
  errcode?: number;
  errmsg?: string;
  books?: Array<BookInfo & { readUpdateTime?: number }>;
};

type ReadLongestItem = {
  book?: BookInfo;
  albumInfo?: {
    albumId?: string;
    name?: string;
    authorName?: string;
    cover?: string;
  };
  readTime?: number;
  tags?: string[];
};

type ReadData = {
  errcode?: number;
  errmsg?: string;
  totalReadTime?: number;
  dayAverageReadTime?: number;
  readDays?: number;
  compare?: number;
  readTimes?: Record<string, number>;
  readLongest?: ReadLongestItem[];
  readStat?: Array<{ stat?: string; counts?: string }>;
  preferCategory?: Array<{
    categoryTitle?: string;
    val?: number;
    readingTime?: number;
  }>;
  preferCategoryWord?: string;
  preferTime?: number[];
  preferTimeWord?: string;
  upgrade_info?: { message?: string };
};

type BookmarkResponse = Parameters<typeof groupBookNotes>[0] & {
  errcode?: number;
  errmsg?: string;
};

type ChapterInfoResponse = {
  errcode?: number;
  errmsg?: string;
  chapters?: NonNullable<BookmarkResponse["chapters"]>;
};

type ReviewResponse = Parameters<typeof groupBookNotes>[1] & {
  errcode?: number;
  errmsg?: string;
  hasMore?: number;
  synckey?: number;
};

type ConnectionState = "idle" | "connecting" | "connected";
type SyncState = "idle" | "syncing" | "success" | "warning" | "error";
type MainView = "overview" | "notes" | "data";

const statsPeriods: Array<{ mode: ReadStatsMode; label: string }> = [
  { mode: "weekly", label: "本周" },
  { mode: "monthly", label: "本月" },
  { mode: "annually", label: "今年" },
  { mode: "overall", label: "全部" },
];

async function callGateway<T extends { errcode?: number; errmsg?: string }>(
  apiKey: string,
  apiName: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch("/api/weread", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-weread-key": apiKey,
    },
    body: JSON.stringify({ api_name: apiName, ...params }),
    cache: "no-store",
  });
  const data = (await response.json()) as T & {
    upgrade_info?: { message?: string };
  };

  if (data.upgrade_info?.message) {
    throw new Error(data.upgrade_info.message);
  }
  if (!response.ok || (typeof data.errcode === "number" && data.errcode !== 0)) {
    throw new Error(data.errmsg || "微信读书数据暂时不可用");
  }
  return data;
}

async function loadAllNotebooks(apiKey: string) {
  const books: Notebook[] = [];
  let lastSort: number | undefined;
  let totalBookCount = 0;

  for (let page = 0; page < 50; page += 1) {
    const response = await callGateway<NotebookResponse>(
      apiKey,
      "/user/notebooks",
      lastSort === undefined ? { count: 100 } : { count: 100, lastSort },
    );
    const pageBooks = response.books || [];
    books.push(...pageBooks);
    totalBookCount = response.totalBookCount || totalBookCount;
    if (!response.hasMore || pageBooks.length === 0) break;

    const nextSort = Number(pageBooks.at(-1)?.sort);
    if (!Number.isSafeInteger(nextSort) || nextSort === lastSort) break;
    lastSort = nextSort;
  }

  return { books, totalBookCount: totalBookCount || books.length };
}

async function loadWorkspaceNotebooks(apiKey: string) {
  const [notebookResult, shelfResult] = await Promise.allSettled([
    loadAllNotebooks(apiKey),
    callGateway<ShelfResponse>(apiKey, "/shelf/sync"),
  ]);

  if (notebookResult.status === "rejected") throw notebookResult.reason;

  return {
    ...notebookResult.value,
    books:
      shelfResult.status === "fulfilled"
        ? mergeShelfReadingMetadata(
            notebookResult.value.books,
            shelfResult.value.books || [],
          )
        : notebookResult.value.books,
  };
}

async function loadAllReviews(apiKey: string, bookId: string) {
  const reviews: NonNullable<ReviewResponse["reviews"]> = [];
  let synckey = 0;

  for (let page = 0; page < 50; page += 1) {
    const response = await callGateway<ReviewResponse>(
      apiKey,
      "/review/list/mine",
      { bookid: bookId, count: 100, synckey },
    );
    reviews.push(...(response.reviews || []));
    if (!response.hasMore) break;

    const nextSynckey = Number(response.synckey);
    if (!Number.isSafeInteger(nextSynckey) || nextSynckey === synckey) break;
    synckey = nextSynckey;
  }

  return { reviews };
}

async function loadBookNoteGroups(apiKey: string, bookId: string) {
  const [bookmarks, chapterInfo, reviews] = await Promise.all([
    callGateway<BookmarkResponse>(apiKey, "/book/bookmarklist", { bookId }),
    callGateway<ChapterInfoResponse>(apiKey, "/book/chapterinfo", { bookId }),
    loadAllReviews(apiKey, bookId),
  ]);

  return groupBookNotes(
    {
      ...bookmarks,
      chapters: bookmarks.chapters?.length
        ? bookmarks.chapters
        : chapterInfo.chapters || [],
    },
    reviews,
  );
}

function BookCover({ book, compact = false }: { book: BookInfo; compact?: boolean }) {
  return (
    <span className={`book-cover ${compact ? "book-cover-compact" : ""}`}>
      <span aria-hidden="true" className="book-cover-fallback">
        {book.title.slice(0, 2)}
      </span>
      {book.cover ? (
        // WeRead supplies the remote cover URL. A plain image avoids proxying private
        // reading data through the framework image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={book.cover}
          alt={`${book.title}封面`}
          src={book.cover}
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      ) : null}
    </span>
  );
}

function ReadingDataDashboard({
  stats,
  statsMode,
  statsLoading,
  statsError,
  statsWarning,
  timeline,
  timeDistribution,
  totalNotes,
  notebookCount,
  onStatsModeChange,
}: {
  stats: ReadData | null;
  statsMode: ReadStatsMode;
  statsLoading: boolean;
  statsError: string;
  statsWarning: string;
  timeline: Array<{
    timestamp: string;
    seconds: number;
    height: number;
  }>;
  timeDistribution: Array<{
    hour: number;
    seconds: number;
    height: number;
  }>;
  totalNotes: number;
  notebookCount: number;
  onStatsModeChange: (mode: ReadStatsMode) => void;
}) {
  const periodLabel =
    statsPeriods.find((period) => period.mode === statsMode)?.label || "本月";
  const readStatValue = (name: string, fallback: string) =>
    stats?.readStat?.find((item) => item.stat?.includes(name))?.counts || fallback;
  const rankedBooks = stats?.readLongest || [];
  const maxBookReadTime = Math.max(
    1,
    ...rankedBooks.map((item) => Number(item.readTime) || 0),
  );

  return (
    <div className="data-view" aria-busy={statsLoading}>
      <div className="data-heading">
        <div>
          <span className="section-index">READING DATA</span>
          <h1>你的阅读数据</h1>
          <p>按周期查看阅读节奏、偏好、时段和读得最多的书。</p>
        </div>
        <div className="period-switch" aria-label="阅读数据统计周期">
          {statsPeriods.map((period) => (
            <button
              key={period.mode}
              type="button"
              className={statsMode === period.mode ? "active" : ""}
              aria-pressed={statsMode === period.mode}
              disabled={statsLoading}
              onClick={() => onStatsModeChange(period.mode)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {statsLoading ? (
        <div className="data-loading" role="status">
          <span />正在获取{periodLabel}数据…
        </div>
      ) : null}
      {statsError ? <p className="inline-warning error" role="alert">{statsError}</p> : null}
      {statsWarning ? <p className="inline-warning">{statsWarning}</p> : null}

      <div className="data-metric-grid">
        <article className="data-metric-card data-metric-primary">
          <span>{periodLabel}阅读时长</span>
          <strong>{formatDuration(stats?.totalReadTime)}</strong>
          <small>
            {stats?.readDays
              ? `${stats.readDays} 个有效阅读日`
              : "单日阅读满 1 分钟计入"}
          </small>
        </article>
        <article className="data-metric-card">
          <span>自然日均</span>
          <strong>{formatDuration(stats?.dayAverageReadTime)}</strong>
          <small>
            {typeof stats?.compare === "number"
              ? `较上期${stats.compare >= 0 ? "增长" : "下降"} ${Math.abs(Math.round(stats.compare * 100))}%`
              : "按周期内自然日计算"}
          </small>
        </article>
        <article className="data-metric-card">
          <span>读过书目</span>
          <strong>{readStatValue("读过", `${notebookCount} 本`)}</strong>
          <small>来自官方阅读统计口径</small>
        </article>
        <article className="data-metric-card">
          <span>笔记总数</span>
          <strong>{readStatValue("笔记", `${totalNotes} 条`)}</strong>
          <small>划线、想法与书签</small>
        </article>
      </div>

      <div className="data-dashboard-grid">
        <article className="data-card data-rhythm-card">
          <div className="data-card-heading">
            <div>
              <span className="section-index">READING RHYTHM</span>
              <h2>阅读节奏</h2>
            </div>
            <span>{periodLabel}</span>
          </div>
          {timeline.length ? (
            <div className="data-chart-scroll">
              <div
                className="data-timeline-chart"
                style={{ gridTemplateColumns: `repeat(${timeline.length}, minmax(34px, 1fr))` }}
                aria-label={`${periodLabel}阅读时长分布`}
              >
                {timeline.map((item) => {
                  const label = formatReadingBucketLabel(item.timestamp, statsMode);
                  const tooltip = `${label} · ${formatDuration(item.seconds)}`;
                  return (
                    <div
                      className="data-timeline-column"
                      key={item.timestamp}
                      aria-label={tooltip}
                      tabIndex={0}
                    >
                      <strong>{item.seconds ? `${Math.max(1, Math.round(item.seconds / 60))}分` : "0"}</strong>
                      <span className="data-timeline-track">
                        <i style={{ height: `${item.height}%` }}>
                          <span className="chart-tooltip" role="tooltip">{tooltip}</span>
                        </i>
                      </span>
                      <small>{label}</small>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="data-empty">{periodLabel}暂无阅读节奏数据。</p>
          )}
        </article>

        <article className="data-card data-category-card">
          <div className="data-card-heading">
            <div>
              <span className="section-index">PREFERENCE</span>
              <h2>分类偏好</h2>
            </div>
            <span>{stats?.preferCategoryWord || "阅读分类"}</span>
          </div>
          {(stats?.preferCategory || []).slice(0, 8).map((category, index) => (
            <div className="data-category-row" key={`${category.categoryTitle}-${index}`}>
              <div>
                <span>{category.categoryTitle || "其他"}</span>
                <small>{formatDuration(category.readingTime)}</small>
              </div>
              <span className="data-progress-track">
                <i style={{ width: `${Math.max(4, Math.min(100, Number(category.val) * 100 || 0))}%` }} />
              </span>
            </div>
          ))}
          {!stats?.preferCategory?.length ? (
            <p className="data-empty">阅读数据积累后，这里会出现分类偏好。</p>
          ) : null}
        </article>

        <article className="data-card data-time-card">
          <div className="data-card-heading">
            <div>
              <span className="section-index">TIME OF DAY</span>
              <h2>阅读时段</h2>
            </div>
            <span>{stats?.preferTimeWord || "24 小时分布"}</span>
          </div>
          {timeDistribution.length ? (
            <div className="time-distribution" aria-label="24 小时阅读时段分布">
              {timeDistribution.map((item) => (
                <div
                  key={item.hour}
                  className="time-distribution-column"
                  title={`${item.hour}:00，${formatDuration(item.seconds)}`}
                >
                  <span><i style={{ height: `${item.height}%` }} /></span>
                  <small>{item.hour % 6 === 0 ? `${item.hour}时` : ""}</small>
                  <span className="sr-only">{item.hour}:00，{formatDuration(item.seconds)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="data-empty">当前周期暂无阅读时段数据。</p>
          )}
        </article>

        <article className="data-card data-top-books-card">
          <div className="data-card-heading">
            <div>
              <span className="section-index">TOP BOOKS</span>
              <h2>读得最多</h2>
            </div>
            <span>最多 10 本</span>
          </div>
          {rankedBooks.length ? (
            <ol className="top-books-list">
              {rankedBooks.map((item, index) => {
                const title = item.book?.title || item.albumInfo?.name || "未命名书籍";
                const author = item.book?.author || item.albumInfo?.authorName || "作者未知";
                const cover = item.book?.cover || item.albumInfo?.cover;
                const readTime = Number(item.readTime) || 0;
                return (
                  <li key={item.book?.bookId || item.albumInfo?.albumId || `${title}-${index}`}>
                    <span className="top-book-rank">{String(index + 1).padStart(2, "0")}</span>
                    <span className="top-book-cover" aria-hidden="true">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
                      ) : title.slice(0, 1)}
                    </span>
                    <span className="top-book-copy">
                      <strong>{title}</strong>
                      <small>{author}</small>
                      <span className="data-progress-track">
                        <i style={{ width: `${Math.max(3, (readTime / maxBookReadTime) * 100)}%` }} />
                      </span>
                    </span>
                    <span className="top-book-time">{formatDuration(readTime)}</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="data-empty">当前周期暂无 Top 书籍数据。</p>
          )}
        </article>
      </div>
    </div>
  );
}

export function WeReadApp() {
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [error, setError] = useState("");
  const [statsWarning, setStatsWarning] = useState("");
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [stats, setStats] = useState<ReadData | null>(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<BookSortMode>("recent");
  const [view, setView] = useState<MainView>("overview");
  const [selectedBook, setSelectedBook] = useState<Notebook | null>(null);
  const [noteGroups, setNoteGroups] = useState<NoteGroup[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [copyLabel, setCopyLabel] = useState("复制 Markdown");
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [statsMode, setStatsMode] = useState<ReadStatsMode>("monthly");
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");

  const displayedBooks = useMemo(
    () => filterAndSortNotebooks(notebooks, query, sortMode),
    [notebooks, query, sortMode],
  );

  const totalNotes = useMemo(
    () => notebooks.reduce((sum, book) => sum + getBookNoteTotal(book), 0),
    [notebooks],
  );

  const readerUrl = buildWeReadNotebookReaderUrl(selectedBook);

  const statsPeriodLabel =
    statsPeriods.find((period) => period.mode === statsMode)?.label || "本月";

  const timeline = useMemo(() => {
    const entries = Object.entries(stats?.readTimes || {})
      .sort(([a], [b]) => Number(a) - Number(b));
    const max = Math.max(1, ...entries.map(([, seconds]) => Number(seconds) || 0));
    return entries.map(([timestamp, seconds]) => ({
      timestamp,
      seconds: Number(seconds) || 0,
      height: Math.max(5, Math.round(((Number(seconds) || 0) / max) * 100)),
    }));
  }, [stats]);

  const overviewTimeline = timeline.slice(-14);

  const timeDistribution = useMemo(() => {
    const values = stats?.preferTime || [];
    const max = Math.max(1, ...values.map((seconds) => Number(seconds) || 0));
    return values.map((seconds, index) => ({
      hour: (index + 6) % 24,
      seconds: Number(seconds) || 0,
      height: Math.max(4, Math.round(((Number(seconds) || 0) / max) * 100)),
    }));
  }, [stats]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const key = apiKey.trim();
    setError("");
    setStatsWarning("");

    if (!validateApiKey(key)) {
      setError("API Key 格式不正确，请检查后重试。");
      return;
    }

    setConnection("connecting");
    const [notebookResult, statsResult] = await Promise.allSettled([
      loadWorkspaceNotebooks(key),
      callGateway<ReadData>(key, "/readdata/detail", { mode: "monthly" }),
    ]);

    if (notebookResult.status === "rejected") {
      setConnection("idle");
      setError(
        notebookResult.reason instanceof Error
          ? notebookResult.reason.message
          : "连接失败，请检查 API Key。",
      );
      return;
    }

    setNotebooks(notebookResult.value.books);
    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      setStats(null);
      setStatsWarning("笔记已连接，但本月阅读统计暂时没有取到。");
    }
    setApiKey(key);
    setConnection("connected");
    setSyncState("idle");
    setSyncMessage("");
    setStatsMode("monthly");
    setStatsError("");
  }

  async function openBook(notebook: Notebook) {
    setSelectedBook(notebook);
    setView("notes");
    setNotesLoading(true);
    setNotesError("");
    setNoteGroups([]);
    setCopyLabel("复制 Markdown");

    try {
      setNoteGroups(await loadBookNoteGroups(apiKey, notebook.bookId));
    } catch (reason) {
      setNotesError(
        reason instanceof Error ? reason.message : "这本书的笔记暂时没有取到。",
      );
    } finally {
      setNotesLoading(false);
    }
  }

  function disconnect() {
    setApiKey("");
    setConnection("idle");
    setNotebooks([]);
    setStats(null);
    setSelectedBook(null);
    setNoteGroups([]);
    setError("");
    setSyncState("idle");
    setSyncMessage("");
    setStatsMode("monthly");
    setStatsLoading(false);
    setStatsError("");
  }

  async function changeStatsMode(mode: ReadStatsMode) {
    if (mode === statsMode || statsLoading || syncState === "syncing") return;

    const previousMode = statsMode;
    setStatsMode(mode);
    setStatsLoading(true);
    setStatsError("");
    setStatsWarning("");

    try {
      setStats(
        await callGateway<ReadData>(apiKey, "/readdata/detail", { mode }),
      );
    } catch (reason) {
      setStatsMode(previousMode);
      setStatsError(
        reason instanceof Error
          ? reason.message
          : "阅读数据暂时无法获取，请稍后再试。",
      );
    } finally {
      setStatsLoading(false);
    }
  }

  async function syncData() {
    if (syncState === "syncing" || statsLoading) return;

    const bookToRefresh = selectedBook;
    setSyncState("syncing");
    setSyncMessage("正在获取微信读书最新数据…");

    try {
      const result = await refreshWeReadData({
        loadNotebooks: () => loadWorkspaceNotebooks(apiKey),
        loadStats: () =>
          callGateway<ReadData>(apiKey, "/readdata/detail", { mode: statsMode }),
        loadSelectedNotes: () =>
          bookToRefresh
            ? loadBookNoteGroups(apiKey, bookToRefresh.bookId)
            : Promise.resolve<NoteGroup[] | null>(null),
      });

      setNotebooks(result.notebooks.books);
      if (bookToRefresh) {
        const refreshedBook = result.notebooks.books.find(
          (book) => book.bookId === bookToRefresh.bookId,
        );
        if (refreshedBook) setSelectedBook(refreshedBook);
      }

      let hasPartialFailure = false;
      if (result.stats.status === "fulfilled") {
        setStats(result.stats.value);
        setStatsWarning("");
      } else {
        hasPartialFailure = true;
        setStatsWarning(`书目已同步，但${statsPeriodLabel}阅读统计暂时没有更新。`);
      }

      if (result.selectedNotes.status === "fulfilled") {
        if (result.selectedNotes.value) {
          setNoteGroups(result.selectedNotes.value);
          setNotesError("");
        }
      } else {
        hasPartialFailure = true;
      }

      setSyncState(hasPartialFailure ? "warning" : "success");
      setSyncMessage(
        hasPartialFailure ? "主体数据已同步，部分内容暂未更新" : "刚刚已同步",
      );
    } catch (reason) {
      setSyncState("error");
      setSyncMessage(
        reason instanceof Error ? reason.message : "同步失败，请稍后重试。",
      );
    }
  }

  async function copyMarkdown() {
    if (!selectedBook) return;
    await navigator.clipboard.writeText(
      buildBookMarkdown(selectedBook.book, noteGroups),
    );
    setCopyLabel("已复制");
    window.setTimeout(() => setCopyLabel("复制 Markdown"), 1600);
  }

  function downloadMarkdown() {
    if (!selectedBook) return;
    const markdown = buildBookMarkdown(selectedBook.book, noteGroups);
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedBook.book.title.replace(/[\\/:*?"<>|]/g, "-")}-读书笔记.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (connection !== "connected") {
    return (
      <main className="connect-page">
        <header className="brand-bar">
          <a className="wordmark" href="#top" aria-label="WeRead Notes 首页">
            <span className="wordmark-mark" aria-hidden="true">W</span>
            <span>WeRead Notes</span>
          </a>
          <span className="brand-meta">微信读书笔记工作台</span>
        </header>

        <section className="connect-layout" id="top">
          <div className="connect-copy">
            <p className="eyebrow">READ · THINK · RETURN</p>
            <h1>
              让划线离开书页，
              <span>重新参与思考。</span>
            </h1>
            <p className="connect-lead">
              连接微信读书，把散落在不同书里的划线与想法，整理成一张可搜索、可回顾、可导出的个人阅读地图。
            </p>

            <form className="connect-card" onSubmit={connect}>
              <div className="connect-card-heading">
                <div>
                  <span className="step-kicker">01 / 连接账号</span>
                  <h2>从你的阅读数据开始</h2>
                </div>
                <span className="status-pill">官方 API</span>
              </div>
              <label htmlFor="api-key">微信读书 API Key</label>
              <div className="key-row">
                <input
                  id="api-key"
                  name="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="wrk-xxxxxxxx"
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby="key-help key-error"
                />
                <button type="submit" disabled={connection === "connecting"}>
                  {connection === "connecting" ? "连接中…" : "进入工作台"}
                </button>
              </div>
              <div className="key-help" id="key-help">
                <span>密钥只保留在当前页面会话，不写入数据库或浏览器存储。</span>
                <a
                  href="https://weread.qq.com/r/weread-skills"
                  target="_blank"
                  rel="noreferrer"
                >
                  获取 API Key
                </a>
              </div>
              <p className="form-error" id="key-error" role="alert" aria-live="polite">
                {error}
              </p>
            </form>
          </div>

          <div className="product-preview" aria-label="产品界面预览">
            <div className="preview-topline">
              <span>本月阅读</span>
              <span>2026.07</span>
            </div>
            <div className="preview-stat">
              <strong>18</strong>
              <span>个阅读日</span>
              <div className="preview-rule" />
              <strong>146</strong>
              <span>条笔记</span>
            </div>
            <div className="preview-quote-card">
              <span className="preview-book-label">《系统之美》 · 第二章</span>
              <blockquote>
                真正重要的不是预测未来，而是理解系统如何创造它自己的行为。
              </blockquote>
              <p>想法：读系统，不只看结果，要回到反馈回路。</p>
            </div>
            <div className="preview-books" aria-hidden="true">
              <span className="sample-cover cover-one">系统<br />之美</span>
              <span className="sample-cover cover-two">深度<br />工作</span>
              <span className="sample-cover cover-three">置身<br />事内</span>
              <span className="sample-cover cover-four">原则</span>
            </div>
            <p className="preview-caption">不是收藏更多，而是回来得更频繁。</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <button
          className="wordmark wordmark-button"
          onClick={() => {
            setView("overview");
            setSelectedBook(null);
          }}
          aria-label="返回阅读总览"
        >
          <span className="wordmark-mark" aria-hidden="true">W</span>
          <span>WeRead Notes</span>
        </button>
        <nav className="workspace-nav" aria-label="主导航">
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            阅读总览
          </button>
          <button
            className={view === "notes" ? "active" : ""}
            onClick={() => setView("notes")}
          >
            笔记
          </button>
          <button
            className={view === "data" ? "active" : ""}
            onClick={() => setView("data")}
          >
            数据看板
          </button>
        </nav>
        <div className="workspace-account">
          <div className="sync-control">
            <button
              className={`sync-button ${syncState === "syncing" ? "syncing" : ""}`}
              type="button"
              onClick={() => void syncData()}
              disabled={syncState === "syncing" || statsLoading}
            >
              <span className="sync-glyph" aria-hidden="true">↻</span>
              {syncState === "syncing"
                ? "同步中…"
                : syncState === "success"
                  ? "已同步"
                  : syncState === "warning"
                    ? "部分同步"
                    : syncState === "error"
                      ? "重试同步"
                      : "同步数据"}
            </button>
            <span
              className={`sync-message ${syncState}`}
              aria-live="polite"
              title={syncMessage}
            >
              {syncMessage}
            </span>
          </div>
          <span className="connection-badge"><i />已连接</span>
          <button
            className="disconnect-button"
            onClick={disconnect}
            disabled={syncState === "syncing" || statsLoading}
          >
            断开
          </button>
        </div>
      </header>

      <div className="workspace-shell">
        <aside className="library-panel">
          <div className="library-heading">
            <div>
              <span className="section-index">LIBRARY</span>
              <h2>有笔记的书</h2>
            </div>
            <strong>{notebooks.length}</strong>
          </div>
          <label className="book-search">
            <span className="sr-only">搜索书名或作者</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索书名、作者…"
              type="search"
            />
          </label>
          <div className="book-sort-controls" aria-label="书目排序方式">
            {(
              [
                ["recent", "最近阅读"],
                ["notes", "笔记最多"],
                ["title", "书名排序"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                className={sortMode === mode ? "active" : ""}
                aria-pressed={sortMode === mode}
                onClick={() => setSortMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="book-list">
            {displayedBooks.map((notebook) => (
              <button
                key={notebook.bookId}
                className={`book-list-item ${selectedBook?.bookId === notebook.bookId ? "selected" : ""}`}
                onClick={() => void openBook(notebook)}
              >
                <BookCover book={notebook.book} compact />
                <span className="book-list-copy">
                  <strong>{notebook.book.title}</strong>
                  <span>{notebook.book.author || "作者未知"}</span>
                  <small>{getBookNoteTotal(notebook)} 条记录</small>
                </span>
              </button>
            ))}
            {displayedBooks.length === 0 ? (
              <div className="empty-list">
                <p>没有找到匹配的书。</p>
                <button type="button" onClick={() => setQuery("")}>清空搜索</button>
              </div>
            ) : null}
          </div>
        </aside>

        <section className="content-panel">
          {view === "overview" ? (
            <div className="overview-view">
              <div className="overview-intro">
                <div>
                  <span className="section-index">MONTHLY OVERVIEW</span>
                  <h1>{statsPeriodLabel}，阅读留下了什么？</h1>
                  <p>从数量回到内容，看看最近的阅读节奏与思考密度。</p>
                </div>
                <span className="month-stamp">
                  {statsPeriodLabel}
                </span>
              </div>

              {statsWarning ? <p className="inline-warning">{statsWarning}</p> : null}

              <div className="metric-grid">
                <article className="metric-card metric-card-primary">
                  <span>{statsPeriodLabel}阅读</span>
                  <strong>{formatDuration(stats?.totalReadTime)}</strong>
                  <small>
                    {typeof stats?.compare === "number"
                      ? `较上期${stats.compare >= 0 ? "增长" : "下降"} ${Math.abs(Math.round(stats.compare * 100))}%`
                      : "来自微信读书官方统计"}
                  </small>
                </article>
                <article className="metric-card">
                  <span>阅读天数</span>
                  <strong>{stats?.readDays ?? "—"}<em> 天</em></strong>
                  <small>单日阅读满 1 分钟计入</small>
                </article>
                <article className="metric-card">
                  <span>笔记总数</span>
                  <strong>{totalNotes}<em> 条</em></strong>
                  <small>划线、想法与书签的统计合计</small>
                </article>
                <article className="metric-card">
                  <span>笔记书目</span>
                  <strong>{notebooks.length}<em> 本</em></strong>
                  <small>点击左侧书目进入笔记</small>
                </article>
              </div>

              <div className="overview-grid">
                <article className="insight-card rhythm-card">
                  <div className="card-heading-row">
                    <div>
                      <span className="section-index">READING RHYTHM</span>
                      <h2>阅读节奏</h2>
                    </div>
                    <span>{stats?.preferTimeWord || "按日统计"}</span>
                  </div>
                  {overviewTimeline.length ? (
                    <div className="timeline-chart" aria-label="最近阅读时长图表">
                      {overviewTimeline.map((item) => {
                        const label = formatReadingBucketLabel(item.timestamp, statsMode);
                        const tooltip = `${label} · ${formatDuration(item.seconds)}`;
                        return (
                          <div
                            className="timeline-column"
                            key={item.timestamp}
                            aria-label={tooltip}
                            tabIndex={0}
                          >
                            <span
                              className="timeline-bar"
                              style={{ height: `${item.height}%` }}
                            >
                              <span className="chart-tooltip" role="tooltip">{tooltip}</span>
                            </span>
                            <small>{label}</small>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="empty-card">{statsPeriodLabel}还没有可展示的阅读节奏。</p>
                  )}
                </article>

                <article className="insight-card category-card">
                  <div className="card-heading-row">
                    <div>
                      <span className="section-index">PREFERENCE</span>
                      <h2>阅读偏好</h2>
                    </div>
                  </div>
                  {(stats?.preferCategory || []).slice(0, 5).map((category, index) => (
                    <div className="category-row" key={`${category.categoryTitle}-${index}`}>
                      <span>{category.categoryTitle || "其他"}</span>
                      <div><i style={{ width: `${Math.max(8, Math.min(100, Number(category.val) * 100 || 0))}%` }} /></div>
                      <small>{formatDuration(category.readingTime)}</small>
                    </div>
                  ))}
                  {!stats?.preferCategory?.length ? (
                    <p className="empty-card">阅读数据积累后，这里会出现你的分类偏好。</p>
                  ) : null}
                </article>
              </div>

              <section className="recent-books">
                <div className="section-heading-row">
                  <div>
                    <span className="section-index">RECENT NOTES</span>
                    <h2>最近留下笔记的书</h2>
                  </div>
                  <button onClick={() => setView("notes")}>查看全部</button>
                </div>
                <div className="book-grid">
                  {displayedBooks.slice(0, 6).map((notebook) => (
                    <button key={notebook.bookId} onClick={() => void openBook(notebook)}>
                      <BookCover book={notebook.book} />
                      <strong>{notebook.book.title}</strong>
                      <span>{notebook.book.author || "作者未知"}</span>
                      <small>{getBookNoteTotal(notebook)} 条记录</small>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : view === "data" ? (
            <ReadingDataDashboard
              stats={stats}
              statsMode={statsMode}
              statsLoading={statsLoading || syncState === "syncing"}
              statsError={statsError}
              statsWarning={statsWarning}
              timeline={timeline}
              timeDistribution={timeDistribution}
              totalNotes={totalNotes}
              notebookCount={notebooks.length}
              onStatsModeChange={(mode) => void changeStatsMode(mode)}
            />
          ) : selectedBook ? (
            <div className="notes-view">
              <header className="notes-header">
                <div className="notes-book-heading">
                  <BookCover book={selectedBook.book} />
                  <div>
                    <span className="section-index">BOOK NOTES</span>
                    <h1>{selectedBook.book.title}</h1>
                    <p>{selectedBook.book.author || "作者未知"}</p>
                    <div className="note-counts">
                      <span>{selectedBook.noteCount || 0} 条划线</span>
                      <span>{selectedBook.reviewCount || 0} 条想法</span>
                      <span>{selectedBook.bookmarkCount || 0} 个书签</span>
                    </div>
                  </div>
                </div>
                <div className="notes-actions">
                  {readerUrl ? (
                    <a href={readerUrl} target="_blank" rel="noreferrer">
                      在微信读书打开
                    </a>
                  ) : null}
                  <button onClick={() => void copyMarkdown()} disabled={!noteGroups.length}>
                    {copyLabel}
                  </button>
                  <button className="primary-action" onClick={downloadMarkdown} disabled={!noteGroups.length}>
                    导出 .md
                  </button>
                </div>
              </header>

              {notesLoading ? (
                <div className="notes-loading" role="status">
                  <span />
                  <p>正在整理划线与想法…</p>
                </div>
              ) : notesError ? (
                <div className="notes-empty" role="alert">
                  <h2>笔记没有载入</h2>
                  <p>{notesError}</p>
                  <button onClick={() => void openBook(selectedBook)}>重新尝试</button>
                </div>
              ) : noteGroups.length ? (
                <div className="chapter-list">
                  {noteGroups.map((group, groupIndex) => (
                    <section className="chapter-section" key={`${group.chapterUid}-${groupIndex}`}>
                      <div className="chapter-heading">
                        <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                        <h2>{group.title}</h2>
                        <small>{group.items.length} 条</small>
                      </div>
                      <div className="chapter-notes">
                        {group.items.map((item) => (
                          <article className={`note-card ${item.kind}`} key={item.id}>
                            {item.kind === "underline" ? (
                              <>
                                <span className="note-type">划线</span>
                                <blockquote>{item.quote}</blockquote>
                                {item.thoughts.map((thought) => (
                                  <div className="attached-thought" key={thought.id}>
                                    <span>我的想法</span>
                                    <p>{thought.content}</p>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <>
                                <span className="note-type">想法</span>
                                {item.abstract ? <blockquote>{item.abstract}</blockquote> : null}
                                <p className="standalone-thought">{item.content}</p>
                              </>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="notes-empty">
                  <h2>这本书还没有可导出的笔记</h2>
                  <p>官方接口会返回划线与想法；书签目前只提供数量。</p>
                </div>
              )}
            </div>
          ) : (
            <div className="notes-empty notes-prompt">
              <span className="section-index">BOOK NOTES</span>
              <h1>选择一本书，回到当时的想法。</h1>
              <p>从左侧书目进入，划线与想法会按章节重新排好。</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
