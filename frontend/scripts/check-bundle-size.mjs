import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const distDir = path.join(process.cwd(), 'dist', 'assets')
const limitKb = 250
const files = fs.readdirSync(distDir).filter((f) => f.endsWith('.js'))
const main = files.find((f) => f.startsWith('index-'))
if (!main) {
  console.error('Could not find main bundle in', distDir)
  process.exit(1)
}
const raw = fs.readFileSync(path.join(distDir, main))
const gzKb = gzipSync(raw).length / 1024
console.log(`main bundle: ${gzKb.toFixed(1)} kB gzipped`)
if (gzKb > limitKb) {
  console.error(`bundle exceeds ${limitKb} kB`)
  process.exit(1)
}
