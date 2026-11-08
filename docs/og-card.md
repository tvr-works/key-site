# Social preview card

Created on 2026-11-08 with the built-in ImageGen tool, using the site's Touch ID
photography. The composited source is `assets/source/og-card.png`;
`npm run images` encodes it to the 1200 × 630 `public/assets/og-card.jpg` used
by Open Graph and Twitter metadata.

The composition preserves the bold, three-line headline and uses one supporting
line: “A CLI vault with Secure Enclave device keys. Unlock with Apple Watch or Touch ID.”
There are no footer labels. Text is baked into the social image; website
typography remains HTML. Check the exported JPEG at full size and at a small
social-preview size after changing the source.

The authentication chapter and `docs/chapter-content.md` document the security
claims for device-enrolled vaults. `V3EnrollmentDeviceIdentityStore.swift` was
also checked for Secure Enclave device keys with `.privateKeyUsage` and
`.userPresence` access control. Social descriptions name Apple Watch and Mac
password approval as well. Vault decryption is performed by Key Agent.

## Stacked layout prompt

Use case: text-localization / compositing.
Edit the attached key Open Graph card. This attachment is the approved STACKED-TITLE version. Preserve its exact photograph, keyboard geometry, sensor, grayscale palette, wordmark "key", website address, and especially the three-line bold headline "Your Mac." / "Your CLI." / "Your secrets." with exactly the same layout, size, weight, spacing, and positions. Keep the full wide 1200:630 aspect-ratio composition. Do not change the title into a single horizontal line.
Change ONLY the bottom supporting text area:
Remove both existing supporting lines ("A CLI password vault with native macOS security." and "Secure Enclave device keys. Touch ID approval.") and remove the small uppercase footer entirely.
Replace all that with this ONE concise supporting sentence, spelled EXACTLY:
"A CLI vault with Secure Enclave device keys. Unlock with Touch ID."
Place it at the original subtitle's left alignment near x64 with baseline around y500 at a 1200px-wide output. Use the existing regular muted light-gray sans serif, approximately 22px at 1200px-wide. Keep it on ONE line, extending toward the right side as needed; leave safe right margin at least 64px. No footer or text below it. Do not add any bottom labels or slashes.
Only these five text elements may remain: "key"; "key.tvr.works"; the three-line headline treated as one element; the exact new subtitle. No additional text or decorations. Keep all other visual elements unchanged. Final flat social card only.

## Final subtitle edit prompt

Use case: text-localization.
Edit the attached existing key social card. Preserve the exact photograph, composition, grayscale colors, wordmark, website address, and bold STACKED three-line headline, including all their positions, sizes, and weights. Change ONLY the subtitle.
Replace the existing subtitle with EXACT text:
"A CLI vault with Secure Enclave device keys. Unlock with Apple Watch or Touch ID."
Use the same muted light-gray regular sans serif, the same left alignment and baseline. Keep it on one line, using the empty space to its right and staying inside safe right margin. If absolutely needed reduce only the subtitle font size slightly to fit. Do not alter or move the title. Do not add any bottom labels or other text. Wide 1200:630 aspect ratio. Final flat social image only.
