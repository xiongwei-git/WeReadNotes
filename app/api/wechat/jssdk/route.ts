import {
  WECHAT_APP_ID,
  WeChatJssdkError,
  createWeChatJssdkSignature,
  createWeChatNonce,
  createWeChatTicketProvider,
  normalizeWeChatPageUrl,
} from "../../../lib/wechat-jssdk";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

type TicketProvider = ReturnType<typeof createWeChatTicketProvider>;

let ticketProvider: TicketProvider | undefined;

function jsonError(code: string, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: responseHeaders },
  );
}

function getAppSecret(): string | undefined {
  const value = process.env.WECHAT_APP_SECRET?.trim();
  return value && /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : undefined;
}

function getTicketProvider(appSecret: string): TicketProvider {
  ticketProvider ??= createWeChatTicketProvider({
    appId: WECHAT_APP_ID,
    appSecret,
  });
  return ticketProvider;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let pageUrl: string;
  try {
    const requestedUrl = new URL(request.url).searchParams.get("url") || "";
    pageUrl = normalizeWeChatPageUrl(requestedUrl);
  } catch (error) {
    if (error instanceof WeChatJssdkError && error.code === "INVALID_URL") {
      return jsonError(error.code, error.message, 400);
    }
    return jsonError("INVALID_URL", "分享页面地址无效", 400);
  }

  const appSecret = getAppSecret();
  if (!appSecret) {
    return jsonError("NOT_CONFIGURED", "微信分享暂未配置", 503);
  }

  try {
    const ticket = await getTicketProvider(appSecret).getTicket();
    const nonceStr = createWeChatNonce();
    const timestamp = Math.floor(Date.now() / 1_000);
    const signature = await createWeChatJssdkSignature({
      ticket,
      nonceStr,
      timestamp,
      url: pageUrl,
    });

    return Response.json(
      { appId: WECHAT_APP_ID, timestamp, nonceStr, signature },
      { headers: responseHeaders },
    );
  } catch {
    return jsonError(
      "WECHAT_UPSTREAM_ERROR",
      "微信分享服务暂时不可用",
      502,
    );
  }
}
