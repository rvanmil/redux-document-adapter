export interface BuildOptions {
  format: 'cjs' | 'esm'
  name:
    | 'cjs.development'
    | 'cjs.production.min'
    | 'esm'
    | 'modern'
    | 'modern.development'
    | 'modern.production.min'
  minify: boolean
  env: 'development' | 'production' | ''
  target?: 'es2017'
}
