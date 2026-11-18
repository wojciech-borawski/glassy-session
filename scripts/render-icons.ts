import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const SIZES = [16, 32, 48, 96, 128]

const svg = readFileSync('assets/icon.svg')

mkdirSync('public/icon', { recursive: true })
for (const size of SIZES) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(`public/icon/${size}.png`, png)
}
