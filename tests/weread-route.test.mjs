import assert from "node:assert/strict";
import test from "node:test";

async function fetchWorker(request) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    request,
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

test("rejects an oversized streamed proxy request without Content-Length", async () => {
  const body = JSON.stringify({
    api_name: "/user/notebooks",
    padding: "x".repeat(16 * 1024),
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ books: [] });

  try {
    const response = await fetchWorker(
      new Request("http://localhost/api/weread", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-weread-key": "wrk-test_key_123456789",
        },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(body));
            controller.close();
          },
        }),
        duplex: "half",
      }),
    );

    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      errcode: 413,
      errmsg: "请求内容过大",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
