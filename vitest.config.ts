import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Workaround for vitest 4 issue #5251 (https://github.com/vitest-dev/vitest/issues/5251):
// when the cwd reported to Node has a LOWERCASE Windows drive letter (e.g.
// `c:\LoveDate`), every test file fails at import-time with
//   "TypeError: Cannot read properties of undefined (reading 'config')"
// and/or
//   "Vitest failed to find the runner".
// This happens on machines where the user opens a cmd.exe via `cd c:\…`
// instead of `cd C:\…` — Windows itself doesn't care, but vitest's internal
// path-matching is case-sensitive at some layer.
//
// Fix: pin `root` to this config file's own directory, uppercasing the drive
// letter on Windows. Vitest then uses this canonical path instead of inferring
// it from cwd casing.
const dir = import.meta.dirname
const root =
  process.platform === 'win32' && /^[a-z]:/.test(dir)
    ? dir[0].toUpperCase() + dir.slice(1)
    : dir

// Separate from vite.config.ts so the test runner doesn't pull in the PWA
// plugin, electron stuff, or the build-time `execSync` git read.
export default defineConfig({
  root,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'android', 'desktop-dist', 'releases'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/sw.ts',
      ],
    },
  },
})
