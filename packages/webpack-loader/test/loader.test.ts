import { expect, test } from 'vitest';
import compiler from './compiler.js';
import { join } from 'path';

test('ecchi-loader', async () => {
  const stats = await compiler(join(__dirname,  '..',  '..',  '..',  'resources', 'Blog.ecchi'), { name: 'Alice' });
  const output = stats.toJson({ source: true })
  expect(output.modules![0].source).toMatchSnapshot();
});