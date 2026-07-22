import {
  buildGatewayPayload,
  validateApiKey,
} from "../../lib/weread-core";

const GATEWAY_URL = "https://i.weread.qq.com/api/agent/gateway";
const MAX_REQUEST_BYTES = 16 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function jsonError(message: string, status: number) {
  return Response.json(
    { errcode: status, errmsg: message },
    { status, headers: responseHeaders },
  );
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonError("请求内容过大", 413);
  }

  const apiKey = request.headers.get("x-weread-key");
  if (!validateApiKey(apiKey)) {
    return jsonError("请输入有效的微信读书 API Key", 401);
  }

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("请求格式无效", 400);
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return jsonError("请求格式无效", 400);
  }

  let payload;
  try {
    payload = buildGatewayPayload(String(input.api_name || ""), input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求参数无效";
    return jsonError(message, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      return jsonError("微信读书服务返回了未允许的跳转", 502);
    }

    const text = await upstream.text();
    try {
      JSON.parse(text);
    } catch {
      return jsonError("微信读书服务返回了无法识别的响应", 502);
    }

    return new Response(text, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonError("微信读书服务响应超时，请稍后重试", 504);
    }
    return jsonError("暂时无法连接微信读书服务", 502);
  } finally {
    clearTimeout(timeout);
  }
}
