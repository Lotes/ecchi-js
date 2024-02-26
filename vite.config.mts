import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        deps: {
            interopDefault: true
        },
        include: ['**/test/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/out/**', '**/generated/**']
    }
});