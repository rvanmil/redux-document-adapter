import { build } from 'esbuild'
import terser from 'terser'
import path from 'path'
import fs from 'fs-extra'
import ts from 'typescript'
import { RawSourceMap } from 'source-map'
import merge from 'merge-source-map'

import { extractInlineSourcemap, removeInlineSourceMap } from './sourcemap'
import type { BuildOptions } from './types'
import { appendInlineSourceMap } from './sourcemap'

const outputDir = path.join(__dirname, '../dist')

const buildTargets: BuildOptions[] = [
  {
    format: 'cjs',
    name: 'cjs.development',
    minify: false,
    env: 'development',
  },

  {
    format: 'cjs',
    name: 'cjs.production.min',
    minify: true,
    env: 'production',
  },
  // ESM, embedded `process`, ES5 syntax: typical Webpack dev
  {
    format: 'esm',
    name: 'esm',
    minify: false,
    env: '',
  },
  // ESM, embedded `process`, ES2017 syntax: modern Webpack dev
  {
    format: 'esm',
    name: 'modern',
    target: 'es2017',
    minify: false,
    env: '',
  },
  // ESM, pre-compiled "dev", ES2017 syntax: browser development
  {
    format: 'esm',
    name: 'modern.development',
    target: 'es2017',
    minify: false,
    env: 'development',
  },
  // ESM, pre-compiled "prod", ES2017 syntax: browser prod
  {
    format: 'esm',
    name: 'modern.production.min',
    target: 'es2017',
    minify: true,
    env: 'production',
  }
]

const esVersionMappings = {
  // Don't output ES2015 - have TS convert to ES5 instead
  es2015: ts.ScriptTarget.ES5,
  es2017: ts.ScriptTarget.ES2017,
  es2018: ts.ScriptTarget.ES2018,
  es2019: ts.ScriptTarget.ES2019,
  es2020: ts.ScriptTarget.ES2020,
}

async function bundle(options: BuildOptions) {
  const {
    format,
    minify,
    env,
    name,
    target = 'es2015'
  } = options

  const outputFolder = path.join('dist', '')
  const outputFilename = `redux-document-adapter.${name}.js`
  const outputFilePath = path.join(outputFolder, outputFilename)

  const result = await build({
    entryPoints: ['src/index.ts'],
    outfile: outputFilePath,
    write: false,
    target: target,
    sourcemap: 'inline',
    bundle: true,
    format,
    // Needed to prevent auto-replacing of process.env.NODE_ENV in all builds
    platform: 'neutral',
    // Needed to return to normal lookup behavior when platform: 'neutral'
    mainFields: ['browser', 'module', 'main'],
    conditions: ['browser'],
    define: env
      ? {
          'process.env.NODE_ENV': JSON.stringify(env),
        }
      : {},
    plugins: [
      {
        name: 'node_module_external',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path.startsWith('.') || args.path.startsWith('/')) {
              return undefined
            } else {
              return {
                path: args.path,
                external: true,
              }
            }
          })
        },
      },
    ],
  })

  for (const chunk of result.outputFiles) {
    const esVersion =
      target in esVersionMappings
        ? esVersionMappings[target]
        : ts.ScriptTarget.ES5

    const origin = chunk.text
    const sourcemap = extractInlineSourcemap(origin)
    const result = ts.transpileModule(removeInlineSourceMap(origin), {
      compilerOptions: {
        sourceMap: true,
        module:
          format !== 'cjs' ? ts.ModuleKind.ES2015 : ts.ModuleKind.CommonJS,
        target: esVersion,
      },
      fileName: outputFilename
    })

    const mergedSourcemap = merge(sourcemap, result.sourceMapText)
    let code = result.outputText
    let mapping: RawSourceMap = mergedSourcemap

    if (minify) {
      const transformResult = await terser.minify(
        appendInlineSourceMap(code, mapping),
        {
          sourceMap: { content: 'inline', asObject: true } as any,
          output: {
            comments: false,
          },
          compress: {
            keep_infinity: true,
            pure_getters: true,
            passes: 10,
          },
          ecma: 5,
          toplevel: true,
        }
      )
      code = transformResult.code
      mapping = transformResult.map as RawSourceMap
    }

    const relativePath = path.relative(process.cwd(), chunk.path)
    console.log(`Build artifact: ${relativePath}, settings: `, {
      target,
      output: ts.ScriptTarget[esVersion],
    })
    await fs.writeFile(chunk.path, code)
    await fs.writeJSON(chunk.path + '.map', mapping)
  }
}

async function main() {
  // Dist folder will be removed by rimraf beforehand so TSC can generate typedefs
  await fs.ensureDir(outputDir)
  fs.ensureDirSync('dist')

  // Run builds in parallel
  const bundlePromises = buildTargets.map((options) =>
    bundle({
      ...options
    })
  )
  await Promise.all(bundlePromises)
  await fs.writeFile(
    path.join('dist', 'index.js'),
    `'use strict'
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./redux-document-adapter.cjs.production.min.js')
} else {
  module.exports = require('./redux-document-adapter.cjs.development.js')
}`
  )
}

main()
