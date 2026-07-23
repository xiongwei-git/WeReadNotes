"use client";

import { useEffect, useRef } from "react";

import { WeReadMark } from "./WeReadMark";

const githubUrl = "https://github.com/xiongwei-git";
const xUrl = "https://x.com/tedxiongwei";

export function DeveloperCredit({ onWechat }: { onWechat: () => void }) {
  return (
    <footer className="developer-footer">
      <span>WeRead Notes 由 Ted 独立开发</span>
      <nav className="developer-footer-links" aria-label="开发者链接">
        <a href={githubUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={xUrl} target="_blank" rel="noreferrer">
          X
        </a>
        <button type="button" onClick={onWechat}>
          微信联系
        </button>
      </nav>
    </footer>
  );
}

export function DeveloperAboutDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="developer-dialog"
      aria-labelledby="developer-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="developer-dialog-card">
        <button
          className="developer-dialog-close"
          type="button"
          aria-label="关闭开发者信息"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>

        <div className="developer-dialog-copy">
          <div className="developer-dialog-brand">
            <WeReadMark />
            <div>
              <span className="section-index">ABOUT THE MAKER</span>
              <h2 id="developer-dialog-title">关于开发者</h2>
            </div>
          </div>
          <p>
            WeRead Notes 由 Ted 独立开发。如果你遇到问题、有功能建议，或想交流阅读与产品，欢迎通过下面的方式联系。
          </p>
          <div className="developer-profile-links">
            <a href={githubUrl} target="_blank" rel="noreferrer">
              <span>GitHub</span>
              <strong>@xiongwei-git</strong>
            </a>
            <a href={xUrl} target="_blank" rel="noreferrer">
              <span>X</span>
              <strong>@tedxiongwei</strong>
            </a>
          </div>
        </div>

        <figure className="developer-qr-card">
          {/* This user-supplied QR image must stay unoptimized for reliable scanning. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/developer-wechat-qr.png"
            alt="Ted 的微信二维码"
            width="732"
            height="732"
            loading="lazy"
          />
          <figcaption>
            <strong>微信联系</strong>
            <span>添加时请备注 WeRead Notes</span>
          </figcaption>
        </figure>
      </div>
    </dialog>
  );
}
