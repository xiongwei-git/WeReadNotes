"use client";

import { useEffect } from "react";

const WECHAT_APP_ID = "wx1a90de06643413f0";
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
  error(callback: () => void): void;
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
    response.appId === WECHAT_APP_ID &&
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
  const data: unknown = await response.json();

  if (!response.ok || !isSignatureResponse(data)) {
    throw new Error("WeChat signature unavailable");
  }
  return data;
}

export function WeChatShareSetup() {
  useEffect(() => {
    if (!/MicroMessenger/i.test(navigator.userAgent)) {
      return;
    }

    let cancelled = false;
    const pageUrl = window.location.href.split("#", 1)[0];

    Promise.all([loadWeChatSdk(), fetchSignature(pageUrl)])
      .then(([wx, signature]) => {
        if (cancelled) {
          return;
        }

        wx.config({
          debug: false,
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

          const payload = {
            title: SHARE_TITLE,
            desc: SHARE_DESCRIPTION,
            link: SHARE_LINK,
            imgUrl: SHARE_IMAGE,
          };
          wx.updateAppMessageShareData(payload);
          wx.updateTimelineShareData(payload);
        });
        wx.error(() => undefined);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
