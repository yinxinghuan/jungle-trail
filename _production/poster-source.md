# Poster source record

- Date: 2026-08-08
- Final asset: `public/poster.png`
- Format and size: raster PNG, 1024×1024
- Primary required route: Aigram transit `POST https://chat.aiwaves.tech/aigram/api/gen-image`
- Transit request header: `Origin: https://aigram.app`
- Transit result: `{"error":"Generation failed: code=100 "}`
- Approved fallback: built-in OpenAI raster image generation (`imagegen` skill)
- Source output: `/Users/yin/.codex/generated_images/019fdd9d-a5bb-7d03-9a1a-9ef3b2e3bc26/exec-a8253914-13f2-48c3-998b-80d159c4bda5.png`

## Final prompt

```text
Use case: ads-marketing
Asset type: square 1024x1024 premium game poster for the AlterU game JUNGLE TRAIL
Primary request: Create a cinematic narrative key art scene of a lone explorer seen from behind, small but readable, walking along a narrow wet rainforest trail through immense ancient trees and overgrown stone ruins toward a luminous waterfall in the distance.
Style/medium: photorealistic cinematic adventure poster, refined natural textures, no game UI
Composition/framing: strong central depth and a clear thumbnail-readable explorer silhouette; immense jungle framing the path; waterfall as the distant emotional destination. Place the exact title "JUNGLE TRAIL" within the upper 25 percent safe area. Keep the bottom 20 percent free of faces, key props, and critical text.
Lighting/mood: humid mist, cool deep-green canopy, diagonal warm sun shafts, wet stone and leaf litter, quiet awe and mystery
Text (verbatim): "JUNGLE TRAIL"
Typography: large elegant restrained uppercase English lettering, highly legible at 160x160
Constraints: English text only, absolutely no Chinese characters, no fake glyphs, no bilingual text. Show a clear narrative journey, subject focus, and emotional destination.
Avoid: UI, phone frame, logos, badges, extra words, abstract geometry, title-only composition, watermark
```

## Visual checks

- 1024×1024: exact English title, no Chinese or pseudo-Chinese glyphs, explorer and waterfall both readable.
- 160×160: title, explorer silhouette, path and waterfall remain distinct.
- Title remains inside the upper 25% safe area.
- Bottom 20% contains only noncritical wet trail and foliage.
