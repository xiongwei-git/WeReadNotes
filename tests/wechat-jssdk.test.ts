import assert from "node:assert/strict";
import test from "node:test";

import {
  WECHAT_APP_ID,
  WECHAT_SHARE_ORIGIN,
  WeChatJssdkError,
  createWeChatJssdkSignature,
  createWeChatTicketProvider,
  normalizeWeChatPageUrl,
} from "../app/lib/wechat-jssdk.ts";

test("accepts only same-origin HTTPS pages for WeChat signatures", () => {
  assert.equal(WECHAT_APP_ID, "wx1a90de06643413f0");
  assert.equal(WECHAT_SHARE_ORIGIN, "https://wereadnotes.tedxiong.com");
  assert.equal(
    normalizeWeChatPageUrl(
      "https://wereadnotes.tedxiong.com/?share=wechat#ignored",
    ),
    "https://wereadnotes.tedxiong.com/?share=wechat",
  );

  for (const url of [
    "http://wereadnotes.tedxiong.com/",
    "https://evil.example/",
    "https://wereadnotes.tedxiong.com.evil.example/",
    "https://user:password@wereadnotes.tedxiong.com/",
    "not-a-url",
    "",
  ]) {
    assert.throws(
      () => normalizeWeChatPageUrl(url),
      (error) =>
        error instanceof WeChatJssdkError && error.code === "INVALID_URL",
      url,
    );
  }
});

test("creates the canonical WeChat SHA-1 signature", async () => {
  assert.equal(
    await createWeChatJssdkSignature({
      ticket: "ticket-value",
      nonceStr: "nonce1234567890",
      timestamp: 1_720_000_000,
      url: "https://wereadnotes.tedxiong.com/?share=wechat",
    }),
    "56201f760359d3f4c817b15780e250210021ced4",
  );
});

test("caches the WeChat access token and jsapi ticket before expiry", async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url.startsWith("https://api.weixin.qq.com/cgi-bin/token?")) {
      return Response.json({ access_token: "access-token", expires_in: 7200 });
    }

    if (url.startsWith("https://api.weixin.qq.com/cgi-bin/ticket/getticket?")) {
      assert.match(url, /access_token=access-token/);
      assert.match(url, /type=jsapi/);
      return Response.json({ errcode: 0, ticket: "jsapi-ticket", expires_in: 7200 });
    }

    return new Response("Not found", { status: 404 });
  };

  const provider = createWeChatTicketProvider({
    appId: "wx-test-app",
    appSecret: "test-secret-value",
    fetchImpl,
    now: () => 1_720_000_000_000,
  });

  assert.equal(await provider.getTicket(), "jsapi-ticket");
  assert.equal(await provider.getTicket(), "jsapi-ticket");
  assert.equal(calls.length, 2);
});

test("does not expose WeChat upstream details through public errors", async () => {
  const provider = createWeChatTicketProvider({
    appId: "wx-test-app",
    appSecret: "test-secret-value",
    fetchImpl: async () =>
      Response.json({
        errcode: 40164,
        errmsg: "invalid ip 203.0.113.10, secret=test-secret-value",
      }),
  });

  await assert.rejects(
    provider.getTicket(),
    (error) =>
      error instanceof WeChatJssdkError &&
      error.code === "WECHAT_UPSTREAM_ERROR" &&
      !error.message.includes("203.0.113.10") &&
      !error.message.includes("test-secret-value"),
  );
});
