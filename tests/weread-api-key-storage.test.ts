import assert from "node:assert/strict";
import test from "node:test";

import {
  clearSavedApiKey,
  getBrowserApiKeyStorage,
  readSavedApiKey,
  saveApiKey,
  WEREAD_API_KEY_STORAGE_KEY,
  type ApiKeyStorage,
} from "../app/lib/weread-api-key-storage.ts";

function createStorage(initialValue?: string) {
  const values = new Map<string, string>();
  if (initialValue !== undefined) {
    values.set(WEREAD_API_KEY_STORAGE_KEY, initialValue);
  }

  const storage: ApiKeyStorage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };

  return { storage, values };
}

test("saves and restores a valid WeRead API key", () => {
  const { storage, values } = createStorage();

  assert.equal(saveApiKey(storage, "  wrk-temporary_key-123456  "), true);
  assert.equal(
    values.get(WEREAD_API_KEY_STORAGE_KEY),
    "wrk-temporary_key-123456",
  );
  assert.equal(readSavedApiKey(storage), "wrk-temporary_key-123456");
});

test("does not cache invalid API keys and removes stale invalid values", () => {
  const { storage, values } = createStorage("not-a-valid-key");

  assert.equal(readSavedApiKey(storage), null);
  assert.equal(values.has(WEREAD_API_KEY_STORAGE_KEY), false);
  assert.equal(saveApiKey(storage, "wrk-short"), false);
  assert.equal(values.has(WEREAD_API_KEY_STORAGE_KEY), false);
});

test("clears a remembered API key", () => {
  const { storage, values } = createStorage("wrk-temporary_key-123456");

  assert.equal(clearSavedApiKey(storage), true);
  assert.equal(values.has(WEREAD_API_KEY_STORAGE_KEY), false);
});

test("handles unavailable browser storage without exposing an exception", () => {
  const storage: ApiKeyStorage = {
    getItem() {
      throw new Error("storage is blocked");
    },
    setItem() {
      throw new Error("storage is blocked");
    },
    removeItem() {
      throw new Error("storage is blocked");
    },
  };

  assert.equal(readSavedApiKey(storage), null);
  assert.equal(saveApiKey(storage, "wrk-temporary_key-123456"), false);
  assert.equal(clearSavedApiKey(storage), false);
});

test("does not assume browser storage exists during server rendering", () => {
  assert.equal(getBrowserApiKeyStorage(), null);
});
