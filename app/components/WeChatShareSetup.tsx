"use client";

import { useEffect, useState } from "react";

const SHARE_LINK = "https://wereadnotes.tedxiong.com/";
const SHARE_IMAGE = "https://wereadnotes.tedxiong.com/share-cover.png";
const SHARE_TITLE = "WeRead Notes｜微信读书笔记工作台";
const SHARE_DESCRIPTION =
  "连接微信读书官方 API，整理、回顾和导出你的划线与想法。";
const SDK_SOURCES = [
  "https://res.wx.qq.com/open/js/jweixin-1.6.0.js",
  "https://res2.wx.qq.com/open/js/jweixin-1.6.0.js",
];

type WeChatSharePayload = {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
  success?: () => void;
  fail?: (result: WeChatApiResult) => void;
};

type WeChatApiResult = {
  errMsg?: string;
};

type WeChatSdk = {
  config(config: {
    debug: boolean;
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: string[];
  }): void;
  error(callback: (result: WeChatApiResult) => void): void;
  ready(callback: () => void): void;
  updateAppMessageShareData(payload: WeChatSharePayload): void;
  updateTimelineShareData(payload: WeChatSharePayload): void;
};

type SignatureResponse = {
  appId: string;
  timestamp: number;
  nonceStr: string;
  signature: string;
};

type DiagnosticKey = "environment" | "sdk" | "signature" | "config" | "share";
type DiagnosticStatus = "pending" | "success" | "error";
type DiagnosticItem = {
  key: DiagnosticKey;
  label: string;
  status: DiagnosticStatus;
  detail: string;
};

const INITIAL_DIAGNOSTICS: DiagnosticItem[] = [
  { key: "environment", label: "微信环境", status: "pending", detail: "等待检测" },
  { key: "sdk", label: "JS-SDK", status: "pending", detail: "等待加载" },
  { key: "signature", label: "页面签名", status: "pending", detail: "等待请求" },
  { key: "config", label: "权限配置", status: "pending", detail: "等待 wx.ready" },
  { key: "share", label: "分享接口", status: "pending", detail: "等待设置" },
];

class SignatureFetchError extends Error {
  constructor(readonly diagnostic: string) {
    super("WeChat signature unavailable");
    this.name = "SignatureFetchError";
  }
}

declare global {
  interface Window {
    wx?: WeChatSdk;
  }
}

let sdkRequest: Promise<WeChatSdk> | undefined;

function loadWeChatSdk(): Promise<WeChatSdk> {
  if (window.wx) {
    return Promise.resolve(window.wx);
  }
  if (sdkRequest) {
    return sdkRequest;
  }

  const request = new Promise<WeChatSdk>((resolve, reject) => {
    const trySource = (index: number) => {
      const source = SDK_SOURCES[index];
      if (!source) {
        reject(new Error("WeChat JS-SDK unavailable"));
        return;
      }

      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        script.remove();
        trySource(index + 1);
      }, 8_000);

      script.async = true;
      script.dataset.wechatJssdk = "true";
      script.src = source;
      script.onload = () => {
        window.clearTimeout(timeout);
        if (window.wx) {
          resolve(window.wx);
        } else {
          script.remove();
          trySource(index + 1);
        }
      };
      script.onerror = () => {
        window.clearTimeout(timeout);
        script.remove();
        trySource(index + 1);
      };
      document.head.appendChild(script);
    };

    trySource(0);
  }).catch((error) => {
    sdkRequest = undefined;
    throw error;
  });

  sdkRequest = request;
  return request;
}

function isSignatureResponse(value: unknown): value is SignatureResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const response = value as Record<string, unknown>;
  return (
    typeof response.appId === "string" &&
    /^wx[a-f0-9]{16}$/i.test(response.appId) &&
    typeof response.timestamp === "number" &&
    Number.isInteger(response.timestamp) &&
    typeof response.nonceStr === "string" &&
    /^[a-f0-9]{32}$/.test(response.nonceStr) &&
    typeof response.signature === "string" &&
    /^[a-f0-9]{40}$/.test(response.signature)
  );
}

async function fetchSignature(pageUrl: string): Promise<SignatureResponse> {
  const response = await fetch(
    `/api/wechat/jssdk?url=${encodeURIComponent(pageUrl)}`,
    {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    },
  );
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new SignatureFetchError(`HTTP ${response.status} · 响应不是 JSON`);
  }

  if (!response.ok) {
    const code =
      data && typeof data === "object" && !Array.isArray(data)
        ? (data as { error?: { code?: unknown } }).error?.code
        : undefined;
    throw new SignatureFetchError(
      `HTTP ${response.status}${typeof code === "string" ? ` · ${code}` : ""}`,
    );
  }
  if (!isSignatureResponse(data)) {
    throw new SignatureFetchError("签名响应字段无效");
  }
  return data;
}

function safeWeChatMessage(result: WeChatApiResult): string {
  return typeof result.errMsg === "string" && result.errMsg
    ? result.errMsg.slice(0, 160)
    : "微信客户端未返回错误详情";
}

export function WeChatShareSetup() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] =
    useState<DiagnosticItem[]>(INITIAL_DIAGNOSTICS);

  useEffect(() => {
    const debugEnabled =
      new URLSearchParams(window.location.search).get("wechatDebug") === "1";
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    let cancelled = false;

    if (debugEnabled) {
      queueMicrotask(() => {
        if (!cancelled) {
          setShowDiagnostics(true);
        }
      });
    }

    const updateDiagnostic = (
      key: DiagnosticKey,
      status: DiagnosticStatus,
      detail: string,
    ) => {
      setDiagnostics((current) =>
        current.map((item) =>
          item.key === key ? { ...item, status, detail } : item,
        ),
      );
    };

    if (!isWeChat) {
      if (debugEnabled) {
        updateDiagnostic("environment", "error", "当前不是微信内置浏览器");
      }
      return () => {
        cancelled = true;
      };
    }

    const pageUrl = window.location.href.split("#", 1)[0];
    updateDiagnostic("environment", "success", "已识别 Android/iOS 微信环境");
    updateDiagnostic("sdk", "pending", "正在加载 jweixin-1.6.0.js");
    updateDiagnostic("signature", "pending", "正在请求同源签名");

    const sdk = loadWeChatSdk()
      .then((value) => {
        if (!cancelled) {
          updateDiagnostic("sdk", "success", "微信官方脚本已加载");
        }
        return value;
      })
      .catch((error) => {
        if (!cancelled) {
          updateDiagnostic("sdk", "error", "微信官方脚本加载失败");
        }
        throw error;
      });

    const signature = fetchSignature(pageUrl)
      .then((value) => {
        if (!cancelled) {
          updateDiagnostic("signature", "success", "同源签名已返回");
        }
        return value;
      })
      .catch((error) => {
        if (!cancelled) {
          updateDiagnostic(
            "signature",
            "error",
            error instanceof SignatureFetchError
              ? error.diagnostic
              : "签名请求失败",
          );
        }
        throw error;
      });

    Promise.all([sdk, signature])
      .then(([wx, signature]) => {
        if (cancelled) {
          return;
        }

        updateDiagnostic("config", "pending", "已调用 wx.config，等待 ready");
        wx.config({
          debug: debugEnabled,
          appId: signature.appId,
          timestamp: signature.timestamp,
          nonceStr: signature.nonceStr,
          signature: signature.signature,
          jsApiList: [
            "updateAppMessageShareData",
            "updateTimelineShareData",
          ],
        });

        wx.ready(() => {
          if (cancelled) {
            return;
          }

          updateDiagnostic("config", "success", "wx.ready 已触发");
          updateDiagnostic("share", "pending", "正在设置分享给朋友");
          const payload: WeChatSharePayload = {
            title: SHARE_TITLE,
            desc: SHARE_DESCRIPTION,
            link: SHARE_LINK,
            imgUrl: SHARE_IMAGE,
            success: () => {
              if (!cancelled) {
                updateDiagnostic(
                  "share",
                  "success",
                  "updateAppMessageShareData:ok",
                );
              }
            },
            fail: (result) => {
              if (!cancelled) {
                updateDiagnostic("share", "error", safeWeChatMessage(result));
              }
            },
          };
          wx.updateAppMessageShareData(payload);
          wx.updateTimelineShareData({
            title: SHARE_TITLE,
            desc: SHARE_DESCRIPTION,
            link: SHARE_LINK,
            imgUrl: SHARE_IMAGE,
          });
        });
        wx.error((result) => {
          if (!cancelled) {
            updateDiagnostic("config", "error", safeWeChatMessage(result));
          }
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  if (!showDiagnostics) {
    return null;
  }

  return (
    <aside
      className="wechat-debug-panel"
      role="status"
      aria-live="polite"
      aria-label="微信分享诊断"
    >
      <div className="wechat-debug-heading">
        <strong>微信分享诊断</strong>
        <span>仅调试模式</span>
      </div>
      <p>只显示运行状态，不包含 AppSecret、Token、ticket 或签名。</p>
      <ol>
        {diagnostics.map((item) => (
          <li key={item.key} data-status={item.status}>
            <span className="wechat-debug-dot" aria-hidden="true" />
            <div>
              <strong>{item.label}</strong>
              <span>{item.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}
