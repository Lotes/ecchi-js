import { expect, test } from 'vitest';
import compiler from './compiler.js';

test('Test1', async () => {
  const stats = await compiler('Blog.ecchi', { name: 'Alice' });
  const output = stats.toJson({ source: true })
  expect(output.modules![0].source).toMatchSnapshot();
});