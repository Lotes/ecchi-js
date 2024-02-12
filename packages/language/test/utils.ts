import { LangiumDocument } from "langium";
import { Model } from "../src/generated/ast.js";
import { expect } from "vitest";

export function assertNoErrors(document: LangiumDocument<Model>) {
  expect(document.parseResult.lexerErrors).toHaveLength(0);
  expect(document.parseResult.parserErrors).toHaveLength(0);
  expect(document.diagnostics ?? []).toHaveLength(0);
}