import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { environment: 'node', include: ['tests/unit/**/*.test.{ts,tsx}'] },
  resolve: { alias: { '@': path.resolve(process.cwd()) } },
})
