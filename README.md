# Web韻圖 〜文海〜

Yunjing-style (韻鏡) rhyme tables of the Tangut rhyme dictionary *Wenhai* (文海), with Gong Hwang-cherng's reconstructions, the MB reconstruction, and
Marc Miyake's *Tangut Database* ver. 4.0 (2019).

**Site:** https://arcoinblue.github.io/wenhai-yunjing/

- 39 charts, ordered by 攝; each chart has four sections: 平開 (tone 1, no -w-), 上開 (tone 2, no -w-),
  平合 (tone 1, -w-), 上合 (tone 2, -w-), each with grades (等) I–IV.
- Columns follow the nine Tangut initial classes (九音), labelled with their Tangut names.
- Each cell shows one 小韻 (first in Wenhai order). Click a cell to see every 小韻 placed there, with
  fanqie, all member characters, Li Fanwen numbers, Wenhai positions, GHC, MB and Miyake readings.
- Click a row roundel for rhyme details. Search by character, reading, Li Fanwen number or Wenhai position.
- Links are shareable: `#c=<chart>&s=<section>-<grade>-<initial>`.

## Files
- `index.html`, `style.css`, `app.js`: the page (no build step, no dependencies)
- `data/wenhai.json`: generated data (charts, 小韻, members, rhymes)
- `fonts/NotoSerifTangut-subset.woff2`: Noto Serif Tangut, subset to the characters used (SIL Open Font License 1.1)
