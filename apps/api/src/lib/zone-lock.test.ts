import { describe, expect, it } from "vitest";
import { zoneIdsInLockOrder } from "./zone-lock.js";

describe("zone lock ordering", () => {
  it("locks zone ids in sorted order so two transactions cannot deadlock", () => {
    const first = zoneIdsInLockOrder(["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    const second = zoneIdsInLockOrder(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", null]);
    expect(first).toEqual(second);
    expect(first[0]! < first[1]!).toBe(true);
  });
});
