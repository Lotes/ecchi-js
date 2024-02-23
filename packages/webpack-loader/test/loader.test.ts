import { expect, test } from 'vitest';
import compiler from './compiler';

test('ecchi-loader', async () => {
  const stats = await compiler("./Blog.ecchi");
  const output = stats.toJson({ source: true })
  expect(output.modules![0].source).toMatchSnapshot();
}, 100000);