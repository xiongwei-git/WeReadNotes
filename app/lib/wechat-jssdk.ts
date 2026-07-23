export const WECHAT_SHARE_ORIGIN = "https://wereadnotes.tedxiong.com";

const WECHAT_API_ORIGIN = "https://api.weixin.qq.com";
const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;
const MAX_SIGNED_URL_LENGTH = 2_048;

export type WeChatJssdkErrorCode =
  | "INVALID_URL"
  | "NOT_CONFIGURED"
  | "WECHAT_UPSTREAM_ERROR";

const publicErrorMessages: Record<WeChatJssdkErrorCode, string> = {
  INVALID_URL: "分享页面地址无效",
  NOT_CONFIGURED: "微信分享暂未配置",
  WECHAT_UPSTREAM_ERROR: "微信分享服务暂时不可用",
};

export class WeChatJssdkError extends Error {
  readonly code: WeChatJssdkErrorCode;

  constructor(code: WeChatJssdkErrorCode) {
    super(publicErrorMessages[code]);
    this.name = "WeChatJssdkError";
    this.code = code;
  }
}

export function resolveWeChatAccountConfig(
  environment: Record<string, string | undefined>,
): {
  appId: string;
  appSecret: string;
} {
  const appId = environment.WECHAT_APP_ID?.trim() ?? "";
  const appSecret = environment.WECHAT_APP_SECRET?.trim() ?? "";

  if (
    !/^wx[a-f0-9]{16}$/i.test(appId) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(appSecret)
  ) {
    throw new WeChatJssdkError("NOT_CONFIGURED");
  }

  return { appId, appSecret };
}

export function normalizeWeChatPageUrl(rawUrl: string): string {
  if (!rawUrl || rawUrl.length > MAX_SIGNED_URL_LENGTH) {
    throw new WeChatJssdkError("INVALID_URL");
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new WeChatJssdkError("INVALID_URL");
  }

  if (
    url.protocol !== "https:" ||
    url.origin !== WECHAT_SHARE_ORIGIN ||
    url.username ||
    url.password
  ) {
    throw new WeChatJssdkError("INVALID_URL");
  }

  url.hash = "";
  return url.toString();
}

export async function createWeChatJssdkSignature({
  ticket,
  nonceStr,
  timestamp,
  url,
}: {
  ticket: string;
  nonceStr: string;
  timestamp: number;
  url: string;
}): Promise<string> {
  const source = [
    `jsapi_ticket=${ticket}`,
    `noncestr=${nonceStr}`,
    `timestamp=${timestamp}`,
    `url=${url}`,
  ].join("&");
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(source),
  );

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

type CachedCredential = {
  expiresAt: number;
  value: string;
};

type WeChatTicketProviderOptions = {
  appId: string;
  appSecret: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  requestTimeoutMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSafeExpiry(now: number, expiresIn: unknown): number {
  const seconds =
    typeof expiresIn === "number" && Number.isFinite(expiresIn)
      ? Math.max(60, Math.floor(expiresIn))
      : 7_200;
  const safetyWindow = Math.min(300, Math.max(6, Math.floor(seconds / 10)));
  return now + Math.max(1, seconds - safetyWindow) * 1_000;
}

export function createWeChatTicketProvider({
  appId,
  appSecret,
  fetchImpl = fetch,
  now = Date.now,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
}: WeChatTicketProviderOptions) {
  let accessTokenCache: CachedCredential | undefined;
  let ticketCache: CachedCredential | undefined;
  let accessTokenRequest: Promise<string> | undefined;
  let ticketRequest: Promise<string> | undefined;

  async function requestJson(url: URL): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });

      if (!response.ok || (response.status >= 300 && response.status < 400)) {
        throw new WeChatJssdkError("WECHAT_UPSTREAM_ERROR");
      }

      const data: unknown = await response.json();
      if (!isRecord(data)) {
        throw new WeChatJssdkError("WECHAT_UPSTREAM_ERROR");
      }
      return data;
    } catch (error) {
      if (error instanceof WeChatJssdkError) {
        throw error;
      }
      throw new WeChatJssdkError("WECHAT_UPSTREAM_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }

  async function loadAccessToken(): Promise<string> {
    if (accessTokenCache && accessTokenCache.expiresAt > now()) {
      return accessTokenCache.value;
    }
    if (accessTokenRequest) {
      return accessTokenRequest;
    }

    accessTokenRequest = (async () => {
      const url = new URL("/cgi-bin/token", WECHAT_API_ORIGIN);
      url.searchParams.set("grant_type", "client_credential");
      url.searchParams.set("appid", appId);
      url.searchParams.set("secret", appSecret);

      const data = await requestJson(url);
      if (typeof data.access_token !== "string" || !data.access_token) {
        throw new WeChatJssdkError("WECHAT_UPSTREAM_ERROR");
      }

      accessTokenCache = {
        value: data.access_token,
        expiresAt: getSafeExpiry(now(), data.expires_in),
      };
      return accessTokenCache.value;
    })();

    try {
      return await accessTokenRequest;
    } finally {
      accessTokenRequest = undefined;
    }
  }

  async function loadTicket(): Promise<string> {
    if (ticketCache && ticketCache.expiresAt > now()) {
      return ticketCache.value;
    }
    if (ticketRequest) {
      return ticketRequest;
    }

    ticketRequest = (async () => {
      const accessToken = await loadAccessToken();
      const url = new URL("/cgi-bin/ticket/getticket", WECHAT_API_ORIGIN);
      url.searchParams.set("access_token", accessToken);
      url.searchParams.set("type", "jsapi");

      const data = await requestJson(url);
      if (
        data.errcode !== 0 ||
        typeof data.ticket !== "string" ||
        !data.ticket
      ) {
        throw new WeChatJssdkError("WECHAT_UPSTREAM_ERROR");
      }

      ticketCache = {
        value: data.ticket,
        expiresAt: getSafeExpiry(now(), data.expires_in),
      };
      return ticketCache.value;
    })();

    try {
      return await ticketRequest;
    } finally {
      ticketRequest = undefined;
    }
  }

  return { getTicket: loadTicket };
}

export function createWeChatNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
