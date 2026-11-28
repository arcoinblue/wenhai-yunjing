# Rime Tangut input (西夏文 Rime 輸入方案)

Tangut input schemas for [Rime](https://github.com/rime/librime), to use with **Squirrel** (鼠鬚管, macOS) and
**Weasel** (小狼毫, Windows). Same data as the Wenhai site: 6,175 characters and 18,042 words.

| Schema | Name in the menu | Type… |
|---|---|---|
| `tangut_downes` | 西夏 Downes | Alan Downes's radical code, exactly |
| `tangut_downes_reduced` | 西夏 Downes 寬 | Downes radical code; any radical of the same reduced group is accepted |
| `tangut_ghc` | 西夏 GHC | Gong Hwang-cherng's reading; characters and words |

Each candidate shows its GHC reading (Downes schemas) or Downes code (GHC schema), and its meaning in English or
Chinese.

## Install

1. Install Rime: **Squirrel** 1.0+ on macOS, **Weasel** 0.16+ on Windows, both from <https://rime.im>.
   Both include the Lua plugin these schemas use for meanings and code completion.
2. Unzip `rime-tangut-<version>.zip`.
3. Run the installer:
   - **macOS:** double-click `install-mac.command` (if macOS blocks it: right-click → Open).
   - **Windows:** double-click `install-windows.bat`.

The installer copies the schemas into your Rime folder (`~/Library/Rime` or `%APPDATA%\Rime`), installs the
Noto Serif Tangut font for your user, adds the three schemas to the end of your schema list in
`default.custom.yaml` (your old file is kept as `default.custom.yaml.bak`), and redeploys Rime.

Then switch to Rime, press **Ctrl+\`** or **F4** and choose a schema. In the same menu you can switch the
meanings between **EN**, **中** and **—** (none).

**Manual install:** copy everything in `rime/` (including `lua/`) into your Rime folder, add
`tangut_downes`, `tangut_downes_reduced` and `tangut_ghc` to `schema_list` in `default.custom.yaml`, and deploy.

**Uninstall:** delete the `tangut_*` files and `lua/tangut_*.lua` from your Rime folder, remove the three
schemas from `default.custom.yaml`, and deploy.

## Typing by radical code (西夏 Downes, 西夏 Downes 寬)

Type the code from Downes, *Xixia Dictionaries* (2008): `macanali` → 𗀀 *do¹* "poison". Hyphens and `'` are
optional (`maca-nali`).

- **Completion.** Typing the start of a code lists the characters it can continue to, with the rest of the code:
  `maca` → 𘃻 `~naxe`, 𗸹 `~naxe`, 𗀀 `~nali`, …
- **Several characters in a row.** `macanalimanaqa` → 𗀀𗀁.
- **Reduced radicals (寬 only).** Any radical of the same group counts: `macunali` → 𗀀 (ca ~ cu).
  A character whose code is exactly what you typed comes first. Groups are `tangut_reduced.txt`, the ones the
  Wenhai practice page uses.
- **Look up by sound.** Type `` ` `` and a GHC spelling: `` `do `` lists characters read *do*, with their codes.

## Typing by GHC reading (西夏 GHC)

GHC readings are typed in ASCII. The full spelling is:

| GHC | type | | GHC | type |
|---|---|---|---|---|
| ś | `sx` (or `sh`) | | tense a̱ | `af` |
| ź | `zx` (or `zh`) | | retroflex ạ | `ac` |
| ń | `nx` | | nasal ã | `an` |
| ŋ | `ng` | | tone ¹ | `;` |
| ɣ | `gh` | | tone ² | `/` |
| ꞏ | `q` | | ɨ | `y` |
| ə | `eh` | | | |

Every mark can be left out: `tsxhjaf;` = *tśhja̱¹* exactly, while `tshja` also finds it among others
(ś as s, no tense mark, no tone). The input line shows what you typed as GHC (`tśhja̱¹`).

- **Words.** Type the syllables in a row: `doniow` → 𗀀𘊄 *do¹ niow²* "vicious, venomous";
  `do;do/` → 𗀀𗻊. Use `'` to split syllables if needed.
- **Look up by shape.** Type `` ` `` and a radical code: `` `maca `` lists characters with that code start.

Rime learns from what you pick, so characters you use often move up.

## Data and limits

- Radical codes: Alan Downes, *Xixia Dictionaries* (supplement to *The Xixia Writing System*, BA Hons thesis,
  Macquarie University, 2008); method: Downes, 递归部首法和西夏文字的结构 (2016). 175 characters have no code.
- Readings, words and meanings: the Tangut Character Dictionary v2.2 / *Tangut characters by group* v2.0, as on the
  Wenhai site. 173 characters have no GHC reading; 101 words whose readings don't line up with their characters are
  left out of the GHC schema.
- There is no frequency list for Tangut. To begin with, characters are ordered by how many dictionary words they
  appear in.
- In the reduced schema, group members are accepted in codes of any length (the practice page only allows it for
  codes of two or more radicals).
- Font: Noto Serif Tangut (SIL Open Font License, `fonts/NotoSerifTangut-OFL.txt`). The candidate window uses it
  through the `style` section of each schema; change `font_face` there to use another Tangut font.

## Rebuilding

`ime/build.py` makes everything in `ime/rime/` from `data/tangut.json` and the templates in `ime/templates/`.
`ime/package.sh` rebuilds and makes `ime/dist/rime-tangut-<version>.zip` with the font.
