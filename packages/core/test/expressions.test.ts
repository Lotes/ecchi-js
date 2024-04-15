import { describe, test, expect } from "vitest";
import { CommonModule, SubjectModule, cacheCommonExpressions, cacheSubjectExpressions } from "../src/expressions.js";
import { LRUCache } from "../src/cache.js";

describe("Expressions", () => {
  test("common cache should work", async () => {
    //arrange
    type Ctx = [number, number, boolean];
    const XXX: CommonModule<Ctx> = [
      () => 0,
      () => new Date().getTime(),
      (common) => common[0] < common[1]
    ];
    const cache = new LRUCache(10);

    //act
    const xxx = cacheCommonExpressions(XXX, [], cache);
    const value1 = xxx[1];
    await new Promise((resolve) => setTimeout(resolve, 100));
    const value2 = xxx[1];

    //assert
    expect(xxx[0]).toBe(0);
    expect(value2).toBe(value1);
    expect(xxx[2]).toBe(true);
    const yyy = cacheCommonExpressions(XXX, [1], cache);
    expect(yyy[1]).not.toBe(xxx[1]);
  });

  test("subject cache should work", async () => {
    //arrange
    type Common = [number, number, number];
    type Subject = [number, number, number];
    const XXX: CommonModule<Common> = [
      () => 123,
      () => 456,
      (common) => common[0] + common[1]
    ];
    const YYY: SubjectModule<Common, Subject> = [
      (common) => common[0],
      (common) => common[1],
      (common, subject) => common[2] + subject[0] + subject[1]
    ];
    const cache = new LRUCache(10);

    //act
    const common = cacheCommonExpressions<Common>(XXX, [1], cache);
    const subject = cacheSubjectExpressions<Common, Subject>(common, YYY, [1], cache);

    //assert
    expect(subject[2]).toBe((123+456)*2);
  });
});