import { describe, test, expect } from "vitest";
import { ExpressionsModule, memoize } from "../src/conditions.js";

describe("Conditions", () => {
  test("should be able to use conditions", async () => {
    //arrange
    type Ctx = [number, number, boolean];
    const XXX: ExpressionsModule<Ctx> = [
      () => 0,
      () => new Date().getTime(),
      (common) => common[0] < common[1]
    ];
    const cache = new Map<string, Ctx>();
    const xxx = memoize(XXX, [], cache);

    //act
    const value = xxx[1];

    //assert
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(xxx[0]).toBe(0);
    expect(xxx[1]).toBe(value);
    expect(xxx[2]).toBe(true);
    const yyy = memoize(XXX, [1], cache);
    expect(yyy[1]).not.toBe(xxx[1]);
  });
});