import { test } from 'vitest';
import compiler from './compiler';

test('ecchi-loader', async () => {
  const stats = await compiler("./Blog.ecchi");
  stats.toJson({ source: true });
}, 100000);