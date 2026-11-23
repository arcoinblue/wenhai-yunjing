# Web韻圖 〜文海〜

Yunjing-style (韻鏡) rhyme tables of the Tangut rhyme dictionary *Wenhai* (文海), with Gong Hwang-cherng's reconstructions and Marc Miyake's *Tangut Database* ver. 4.0 (2019).

Wenhai entries and the MB reconstruction come from Mathieu Beaudouin, *The Digital Wenhai: A Unicode-Compliant
Dataset of the Backbone of Tangut Linguistics and Philology* (Zenodo). Character meanings (English / Chinese):
*Tangut characters by group* v2.0.

**Site:** https://arcoinblue.github.io/wenhai-yunjing/

- 39 charts, ordered by 攝; each chart has four sections: 平開 (tone 1, no -w-), 上開 (tone 2, no -w-),
  平合 (tone 1, -w-), 上合 (tone 2, -w-), each with grades (等) I–IV.
- Columns follow the nine Tangut initial classes (九音), labelled with their Tangut names.
- Each cell shows one 小韻 (first in Wenhai order). Click a cell to see every 小韻 placed there, with
  fanqie, GHC / MB / Miyake readings, and every member character with its meaning (English or Chinese),
  Li Fanwen number and Wenhai position.
- Click a row roundel for rhyme details. Search by character, reading, Li Fanwen number or Wenhai position.
- Links are shareable: `#c=<chart>&s=<section>-<grade>-<initial>`.


- Tangut font switch: Noto Serif Tangut and BabelStone Tangut Wenhai (both bundled, SIL OFL), and Tangut Yinchuan,
  which is not redistributable and is used only if installed or loaded from the reader's own file (kept in their browser).

## Files
- `index.html`, `style.css`, `app.js`: the page (no build step, no dependencies)
- `data/wenhai.json`: generated data (charts, 小韻, members, rhymes)
- `fonts.js`: Tangut font switch
- `fonts/NotoSerifTangut-subset.woff2`: Noto Serif Tangut, subset to the characters used (SIL Open Font License 1.1)
- `fonts/BabelStoneTangutWenhai.ttf`: BabelStone Tangut Wenhai v1.002 by Andrew West, unmodified (SIL Open Font License 1.1, see `fonts/BabelStoneTangutWenhai-OFL.txt`)
