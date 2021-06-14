import { fromObject, fromComment } from 'convert-source-map'
const SOURCEMAPPING_URL = 'sourceMappingURL'

const SOURCEMAP_REG = new RegExp(
  `^\\/\\/#\\s+${SOURCEMAPPING_URL}=.+\\n?`,
  'gm'
)
function appendInlineSourceMap(code: string, sourceMap: any) {
  if (sourceMap) {
    const mapping = fromObject(sourceMap)
    return `${code}\n${mapping.toComment()}`
  } else {
    return code
  }
}
function removeInlineSourceMap(code) {
  return code.replace(
    new RegExp(`^\\/\\/#\\s+${SOURCEMAPPING_URL}=.+\\n?`, 'gm'),
    ''
  )
}
function extractInlineSourcemap(code: string) {
  return fromComment(code.match(SOURCEMAP_REG)?.[0]).toObject()
}

export {
  extractInlineSourcemap,
  removeInlineSourceMap,
  appendInlineSourceMap
}
