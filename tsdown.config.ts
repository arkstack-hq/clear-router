import { defineConfig } from 'tsdown'
import { rmSync } from 'node:fs'

export default defineConfig([
  {
    tsconfig: 'tsconfig.json',
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    // exports: true,
    outDir: 'dist',
    outExtensions (ctx) {
      return {
        dts: '.d.ts',
        js: ctx.format === 'cjs' ? '.cjs' : '.mjs',
      }
    }
  },
  {
    dts: true,
    clean: true,
    // exports: true,
    tsconfig: 'tsconfig.json',
    entry: ['src/express/index.ts', 'src/h3/index.ts'],
    platform: 'node',
    outDir: 'dist',
    format: ['esm', 'cjs'],
    skipNodeModulesBundle: true,
    outExtensions (ctx) {
      return {
        dts: '.d.ts',
        js: ctx.format === 'cjs' ? '.cjs' : '.mjs',
      }
    }
  },
  {
    clean: true,
    // exports: true,
    unbundle: true,
    entry: {
      'types/*': [
        './types/*.ts',
        '!./types/index.ts',
        '!./src/index.ts',
        '!./src/ClearRequest.ts',
        '!./src/Route.ts',
      ],
    },
    outDir: 'dist',
    format: ['esm'],
    onSuccess (rsc) {
      rmSync(rsc.outDir + '/src', { recursive: true })
    },
    outExtensions () {
      return {
        dts: '.d.ts',
      }
    }
  }
])
