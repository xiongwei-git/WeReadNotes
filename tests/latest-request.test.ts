import assert from "node:assert/strict";
import test from "node:test";

import { createLatestRequestGate } from "../app/lib/latest-request.ts";

test("marks earlier asynchronous requests stale when a later request begins", () => {
  const gate = createLatestRequestGate();
  const firstRequest = gate.begin();
  const latestRequest = gate.begin();

  assert.equal(firstRequest.isCurrent(), false);
  assert.equal(latestRequest.isCurrent(), true);

  gate.invalidate();
  assert.equal(latestRequest.isCurrent(), false);
});
