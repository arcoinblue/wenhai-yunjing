# Web韻圖 〜文海〜

Yunjing-style (韻鏡) rhyme tables of the Tangut rhyme dictionary *Wenhai* (文海), with Gong Hwang-cherng's reconstructions and Marc Miyake's *Tangut Database* ver. 4.0 (2019).

Wenhai entries and the MB reconstruction come from Mathieu Beaudouin, *The Digital Wenhai: A Unicode-Compliant
Dataset of the Backbone of Tangut Linguistics and Philology* (Zenodo). Character meanings (English / Chinese):
*Tangut characters by group* v2.0.

**Site:** https://arcoinblue.github.io/wenhai-yunjing/

- 39 charts, ordered by 攝; each chart has four sections: 平開 (tone 1, no -w-), 平合 (tone 1, -w-),
  上開 (tone 2, no -w-), 上合 (tone 2, -w-), each with three 等 rows set by GHC's medials (一: no i/j, 二: -i-, 三: -j-).
- Columns follow the nine Tangut initial classes (九音), labelled with their Tangut names.
- Each cell shows one 小韻 (first in Wenhai order). Click a cell to see every 小韻 placed there, with
  fanqie, GHC / MB / Miyake readings, and every member character with its meaning (English or Chinese),
  Li Fanwen number and Wenhai position.
- Click a Wenhai position (e.g. `93.121`) to open that page of the Wenhai: transcription on the left, facsimile
  half-folio on the right, with zoom, pan and page turning. Images: `pages/<folio>-<side>.jpg` (e.g. `05-1`, `M02-1`).
- Click a row roundel for rhyme details. Search by character, reading, Li Fanwen number or Wenhai position.
- Links are shareable: `tables.html#c=<chart>&s=<section>-<grade>-<initial>` (older links to the site root with the same
  `#c=…` are forwarded to `tables.html`).
- **Verb stem pairs** (`pairs.html`): every character marked [ᴀ] or [ʙ] in *Tangut characters by group* v2.0, paired
  stem A ~ stem B and grouped by how the GHC final alternates (or listed by meaning), with GHC / MB / Miyake readings,
  English / Chinese meanings and the Wenhai position where the character is in the Wenhai. MB is blank for characters
  the Digital Wenhai does not have; tentative pairs are marked, and forms with no partner are listed at the end.

- **Rhyme reconstructions** (`rhymes.html`): the 105 rhymes laid out by 攝, lax ~ tense ~ rhotic (the site author's
  table), with GHC and Beaudouin (2023) shown by default and Gong Xun, Gong Xun 2020, Miyake (2006), Arakawa (2006),
  Nishida (1964), Sofronov (1968, two stages) and the Tibetan / Sanskrit transcriptions as options. GHC, GX and Miyake
  follow the site author's table; everything else is from Mathieu Beaudouin, *Grammaire du tangoute. Phonologie et
  morphologie* (thèse, INALCO, 2023), “Reconstruction des rimes du tangoute”. Click a rhyme number for every reading,
  Beaudouin's analysis (initial, medial, phonation), and the chart and row in the rhyme tables. Links: `rhymes.html#r=<rhyme>`.

- **Radical code practice** (`practice.html`): a Tangut character is shown and you type its radical code
  (Alan Downes's recursive radical method, top left to bottom right; hyphens optional), with a clickable radical
  table, hints, a score and a list of missed characters to practise again. Options: all characters or Wenhai
  characters only, code length, and accepting *reduced* radicals (a radical from the same group counts, for codes
  of two or more radicals; groups as on the dictionary site).
- **Write Tangut** (`write.html`): build sentences by radical code (with the radical table; reduced search
  optional), GHC reading, English / Chinese meaning, or pasted Tangut text (split into dictionary words). Each word
  shows its reading (GHC, GX, Miyake or MB) and gloss; the Tangut, reading and gloss lines can be copied. Named
  drafts are kept in the browser.

- Tangut font switch: Noto Serif Tangut and BabelStone Tangut Wenhai (both bundled, SIL OFL), and Tangut Yinchuan,
  which is not redistributable and is used only if installed or loaded from the reader's own file (kept in their browser).

- Options: **Wenhai characters only** (on by default). Off adds the characters not in the Wenhai (2,867 from
  *Tangut characters by group* v2.0), placed by Miyake's rhyme, tone, -w- and initial with the 等 from GHC, and grouped
  as homophones by Miyake reading. **Rows**: tone → 等 (default) or 等 → tone (three 等 groups of four sections).

## Files
- `index.html`: the main page, linking to the rhyme tables and the verb stem pairs
- `site.css`: shared base for every page (colours, type, header, controls); each page adds its own stylesheet
- `tables.html`, `tables.css`, `app.js`: the rhyme tables
- `data/wenhai.json`: generated data (charts, 小韻, members, rhymes)
- `pairs.html`, `pairs.css`, `pairs.js`, `data/pairs.json`: the verb stem pairs page and its data
- `rhymes.html`, `rhymes.css`, `rhymes.js`, `data/rhymes.json`: the rhyme reconstructions page and its data
- `practice.html`, `practice.js`, `write.html`, `write.js`, `tg-common.js`, `tg.css`: the practice and writing pages
- `data/tangut.json`: all 6,175 characters and 18,042 words of the Tangut Character Dictionary v2.2 (readings, meanings,
  radical codes, Wenhai positions; MB readings from the Digital Wenhai), the 176 radicals and the reduced groups;
  `img/rad/*.png`: the radical pictures from the same dictionary
- `pages/`: Wenhai page images, one per folio side (2400 px, grayscale); sides with no surviving text have none
- `fonts.js`: Tangut font switch
- `fonts/WenhaiSerif-*.woff2`: Latin, IPA and Cyrillic text face, a subset of Charis 7.000 by SIL Global, renamed as the SIL Open Font License requires for modified versions (see `fonts/Charis-OFL.txt`)
- `fonts/NotoSerifTangut.woff2`: Noto Serif Tangut, all Tangut characters (SIL Open Font License 1.1)
- `fonts/BabelStoneTangutWenhai.ttf`: BabelStone Tangut Wenhai v1.002 by Andrew West, unmodified (SIL Open Font License 1.1, see `fonts/BabelStoneTangutWenhai-OFL.txt`)
