import assert from "node:assert/strict";
import test from "node:test";

import { refreshWeReadData } from "../app/lib/weread-sync.ts";

test("refreshes notebooks, reading stats, and the selected book together", async () => {
  const calls: string[] = [];

  const result = await refreshWeReadData({
    loadNotebooks: async () => {
      calls.push("notebooks");
      return ["book-1", "book-2"];
    },
    loadStats: async () => {
      calls.push("stats");
      return { readDays: 12 };
    },
    loadSelectedNotes: async () => {
      calls.push("notes");
      return ["note-1"];
    },
  });

  assert.deepEqual(new Set(calls), new Set(["notebooks", "stats", "notes"]));
  assert.deepEqual(result.notebooks, ["book-1", "book-2"]);
  assert.deepEqual(result.stats, {
    status: "fulfilled",
    value: { readDays: 12 },
  });
  assert.deepEqual(result.selectedNotes, {
    status: "fulfilled",
    value: ["note-1"],
  });
});

test("keeps the required notebook refresh usable when optional data fails", async () => {
  const result = await refreshWeReadData({
    loadNotebooks: async () => ["book-1"],
    loadStats: async () => {
      throw new Error("stats unavailable");
    },
    loadSelectedNotes: async () => null,
  });

  assert.deepEqual(result.notebooks, ["book-1"]);
  assert.equal(result.stats.status, "rejected");
  assert.deepEqual(result.selectedNotes, {
    status: "fulfilled",
    value: null,
  });
});

test("rejects the refresh when notebooks cannot be updated", async () => {
  await assert.rejects(
    refreshWeReadData({
      loadNotebooks: async () => {
        throw new Error("notebooks unavailable");
      },
      loadStats: async () => ({ readDays: 12 }),
      loadSelectedNotes: async () => null,
    }),
    /notebooks unavailable/,
  );
});
