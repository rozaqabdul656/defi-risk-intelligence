import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("liquidity chart keeps the source and observation provenance visible", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Source: \{source/);
  assert.match(page, /Observed \$\{new Date\(observedAt\)\.toISOString\(\)\}/);
  assert.match(page, /coverage \?\? "Coverage pending"/);
});

test("liquidity chart sorts hub rows by supplied liquidity", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /sort\(\(a, b\) => b\.suppliedUsd - a\.suppliedUsd\)/);
});
