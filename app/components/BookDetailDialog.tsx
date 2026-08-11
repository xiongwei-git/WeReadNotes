"use client";

import { useEffect, useRef } from "react";

import { formatDuration, type BookDetail } from "../lib/weread-core";

type BookPreview = {
  bookId: string;
  title: string;
  author?: string;
  cover?: string;
  category?: string;
};

function formatBookWordCount(value?: number) {
  if (!value) return "暂无";
  if (value < 10_000) return `${value.toLocaleString("zh-CN")} 字`;
  return `${(value / 10_000).toFixed(value >= 100_000 ? 0 : 1)} 万字`;
}

function formatRating(value?: number) {
  if (!value) return "暂无";
  const rating = value > 100 ? value / 100 : value / 10;
  return `${rating.toFixed(1)} / 10`;
}

function formatTimestamp(value?: number) {
  if (!value) return "暂无";
  const milliseconds = value > 10_000_000_000 ? value : value * 1000;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) return "暂无";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function BookDetailDialog({
  open,
  loading,
  error,
  warning,
  book,
  detail,
  readerUrl,
  onClose,
  onRetry,
}: {
  open: boolean;
  loading: boolean;
  error: string;
  warning: string;
  book: BookPreview | null;
  detail: BookDetail | null;
  readerUrl: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const title = detail?.title || book?.title || "书籍详情";
  const author = detail?.author || book?.author || "作者未知";
  const cover = detail?.cover || book?.cover;
  const progress = detail?.progress ?? 0;
  const readingStatus =
    detail?.readingStatus === "finished"
      ? "已读完"
      : detail?.readingStatus === "reading"
        ? "阅读中"
        : "未开始";

  return (
    <dialog
      ref={dialogRef}
      className="book-detail-dialog"
      aria-labelledby="book-detail-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="book-detail-card">
        <button
          className="book-detail-close"
          type="button"
          aria-label="关闭书籍详情"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        <header className="book-detail-heading">
          <span className="book-detail-cover">
            <span aria-hidden="true">{title.slice(0, 2)}</span>
            {cover ? (
              // WeRead cover URLs stay direct to avoid proxying private library data.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={`${title}封面`}
                onError={(event) => { event.currentTarget.hidden = true; }}
              />
            ) : null}
          </span>
          <div>
            <span className="section-index">BOOK PROFILE</span>
            <h2 id="book-detail-title">{title}</h2>
            <p>{author}{detail?.translator ? ` · ${detail.translator} 译` : ""}</p>
          </div>
        </header>

        {loading ? (
          <div className="book-detail-loading" role="status">
            <span />正在获取书籍资料与阅读进度…
          </div>
        ) : error ? (
          <div className="book-detail-error" role="alert">
            <strong>书籍详情没有载入</strong>
            <p>{error}</p>
            <button type="button" onClick={onRetry}>重新尝试</button>
          </div>
        ) : detail ? (
          <>
            {warning ? <p className="book-detail-warning" role="status">{warning}</p> : null}
            <section className="book-progress-card" aria-label={`阅读进度 ${progress}%`}>
              <div className="book-progress-copy">
                <span>{readingStatus}</span>
                <strong>{progress}<small>%</small></strong>
                <p>
                  {detail.currentChapterTitle
                    ? `当前读到：${detail.currentChapterTitle}`
                    : progress > 0
                      ? "官方暂未返回当前章节名称"
                      : "还没有阅读进度"}
                </p>
              </div>
              <div className="book-progress-track" aria-hidden="true">
                <i style={{ width: `${progress}%` }} />
              </div>
              <dl>
                <div>
                  <dt>累计阅读</dt>
                  <dd>{formatDuration(detail.recordReadingTime)}</dd>
                </div>
                <div>
                  <dt>最近阅读</dt>
                  <dd>{formatTimestamp(detail.updateTime)}</dd>
                </div>
                {detail.readingStatus === "finished" ? (
                  <div>
                    <dt>读完时间</dt>
                    <dd>{formatTimestamp(detail.finishTime)}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <dl className="book-metadata-grid">
              <div><dt>分类</dt><dd>{detail.category || book?.category || "暂无"}</dd></div>
              <div><dt>出版社</dt><dd>{detail.publisher || "暂无"}</dd></div>
              <div><dt>出版时间</dt><dd>{detail.publishTime || "暂无"}</dd></div>
              <div><dt>字数</dt><dd>{formatBookWordCount(detail.wordCount)}</dd></div>
              <div><dt>评分</dt><dd>{formatRating(detail.rating)}</dd></div>
              <div><dt>ISBN</dt><dd>{detail.isbn || "暂无"}</dd></div>
            </dl>

            <section className="book-intro">
              <h3>内容简介</h3>
              <p>{detail.intro || "官方暂未提供这本书的简介。"}</p>
            </section>

            {readerUrl ? (
              <a className="book-detail-reader-link" href={readerUrl} target="_blank" rel="noreferrer">
                继续在微信读书中阅读
              </a>
            ) : null}
          </>
        ) : null}
      </div>
    </dialog>
  );
}
