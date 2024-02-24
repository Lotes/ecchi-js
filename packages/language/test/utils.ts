import { LangiumDocument } from "langium";
import { Model } from "../src/generated/ast.js";
import { expect } from "vitest";

export function assertNoErrors(document: LangiumDocument<Model>) {
  expect(document.parseResult.lexerErrors, document.parseResult.lexerErrors.map(e=>e.message).join('\n')).toHaveLength(0);
  expect(document.parseResult.parserErrors, document.parseResult.parserErrors.map(e=>e.message).join('\n')).toHaveLength(0);
  expect(document.diagnostics ?? [], (document.diagnostics??[]).map(e=>e.message).join('\n')).toHaveLength(0);
}