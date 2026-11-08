import sharp from "sharp"
import { mkdir } from "node:fs/promises"

// Re-encode the approved, unretouched ImageGen photograph for the web.
// CSS controls composition; these variants keep the original framing.
await mkdir("public/assets", { recursive: true })
for (const width of [768, 1024, 1536]) {
  await sharp("assets/source/touch-id.png")
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(`public/assets/touch-id-${width}.webp`)
}
// Keep the social typography in its own composed source, independent of the hero.
await sharp("assets/source/og-card.png")
  .resize(1200, 630, { fit: "cover", position: "centre" })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile("public/assets/og-card.jpg")
