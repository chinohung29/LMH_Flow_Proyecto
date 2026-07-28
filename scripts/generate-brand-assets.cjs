// Regenera los assets de marca (íconos PWA, favicon, logo) a partir de
// scripts/brand-assets/lmh-logo-source.webp (la lámina de presentación del
// logo oficial de LMH, con mockup 3D sobre fondo oscuro).
//
// El fondo se recorta por luminancia (no hay versión con alfa/vector del
// logo), así que si alguna vez aparece un SVG o PNG con transparencia real
// del logo, es mejor reemplazar directamente los archivos en /public y
// borrar este script en vez de tocar los bounding boxes de acá.
//
// Requiere `sharp` (no está en las dependencias del proyecto):
//   npm install --no-save sharp
//   node scripts/generate-brand-assets.cjs
const sharp = require('sharp')
const path = require('path')

const SRC = path.join(__dirname, 'brand-assets', 'lmh-logo-source.webp')
const OUT = path.join(__dirname, '..', 'public')
const BRAND_BG = { r: 10, g: 12, b: 15, alpha: 1 } // #0A0C0F graphite-950

// Bounding boxes medidos contra la lámina fuente (1254x1254px).
const MARK_BOX = { left: 145, top: 60, width: 510, height: 260 } // isotipo LMH solo
const FAVICON_BOX = { left: 150, top: 65, width: 400, height: 250 } // L-M-H sin las líneas finas del circuito
const LOCKUP_BOX = { left: 15, top: 50, width: 680, height: 340 } // isotipo + wordmark "Flow-Finance"

async function extractWithAlpha(box, { low = 22, high = 55 } = {}) {
  const { data, info } = await sharp(SRC).extract(box).raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const out = Buffer.alloc(width * height * 4)

  for (let p = 0; p < width * height; p++) {
    const i = p * channels
    const o = p * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    let alpha
    if (lum <= low) alpha = 0
    else if (lum >= high) alpha = 255
    else alpha = Math.round(((lum - low) / (high - low)) * 255)

    out[o] = r
    out[o + 1] = g
    out[o + 2] = b
    out[o + 3] = alpha
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

async function squareIcon(size, contentRatio, outFile, box = MARK_BOX) {
  const contentSize = Math.round(size * contentRatio)
  const cutout = await extractWithAlpha(box)
  const mark = await sharp(cutout)
    .resize({ width: contentSize, height: contentSize, fit: 'inside' })
    .toBuffer()
  const markMeta = await sharp(mark).metadata()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BG },
  })
    .composite([
      {
        input: mark,
        left: Math.round((size - markMeta.width) / 2),
        top: Math.round((size - markMeta.height) / 2),
      },
    ])
    .png()
    .toFile(path.join(OUT, outFile))
  console.log('wrote', outFile)
}

// PNG transparente (sin relleno de fondo) para usar directo en la UI, donde
// se apoya sobre las superficies oscuras de la app en vez de traer su
// propio rectángulo de fondo.
async function transparentAsset(box, outFile, targetWidth) {
  const cutout = await extractWithAlpha(box)
  let pipeline = sharp(cutout)
  if (targetWidth) pipeline = pipeline.resize({ width: targetWidth })
  await pipeline.png().toFile(path.join(OUT, outFile))
  console.log('wrote', outFile)
}

async function main() {
  await squareIcon(192, 0.82, 'icons/icon-192.png')
  await squareIcon(512, 0.82, 'icons/icon-512.png')
  await squareIcon(512, 0.62, 'icons/icon-maskable-512.png')
  await squareIcon(180, 0.82, 'icons/apple-touch-icon-180.png')
  await squareIcon(32, 0.95, 'favicon-32.png', FAVICON_BOX)
  await squareIcon(16, 0.95, 'favicon-16.png', FAVICON_BOX)

  await transparentAsset(MARK_BOX, 'logo-mark.png', 512)
  await transparentAsset(LOCKUP_BOX, 'logo.png', 900)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
