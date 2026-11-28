-- tangut_gloss.lua — adds GHC reading, Downes code and English/Chinese meaning to Tangut candidates.
-- Data: tangut_gloss.txt (key \t GHC \t Downes code \t English \t Chinese \t weight)
--       in the Rime user folder (or the shared folder).
-- Options (switches in the schema): gloss_en / gloss_zh / gloss_none.
-- Schema config:
--   tangut_gloss/show_ghc     show the GHC reading
--   tangut_gloss/show_code    show the Downes radical code
--   tangut_gloss/show_code_reverse  show it only on ` reverse lookups
--   tangut_gloss/max_len      cut meanings to this many characters (default 40)
--   tangut_gloss/exact_first  put characters whose code is exactly what was typed first
--                             (used by the reduced schema, where other group members also match)

local data = nil

local function load_data()
  if data then return data end
  data = {}
  for _, dir in ipairs({ rime_api.get_user_data_dir(), rime_api.get_shared_data_dir() }) do
    local f = dir and io.open(dir .. "/tangut_gloss.txt", "r")
    if f then
      for line in f:lines() do
        line = line:gsub("\r$", "")
        local k, ghc, code, en, zh = line:match("^([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)")
        if k and k ~= "" then data[k] = { ghc, (code:gsub("%-", "")), en, zh, code } end
      end
      f:close()
      break
    end
  end
  return data
end

local function cut(s, n)
  local len = utf8.len(s)
  if not n or n <= 0 or len == nil or len <= n then return s end
  return s:sub(1, utf8.offset(s, n + 1) - 1) .. "…"
end

local M = {}

function M.init(env)
  env.d = load_data()
  local cfg = env.engine.schema.config
  local ns = env.name_space
  env.show_ghc = cfg:get_bool(ns .. "/show_ghc")
  env.show_code = cfg:get_bool(ns .. "/show_code")
  env.exact_first = cfg:get_bool(ns .. "/exact_first")
  env.show_code_reverse = cfg:get_bool(ns .. "/show_code_reverse")
  env.max_len = cfg:get_int(ns .. "/max_len") or 40
end

local function annotate(cand, env, lang)
  local e = env.d[cand.text]
  local parts = {}
  if cand.comment ~= "" then parts[#parts + 1] = cand.comment end
  if e then
    if env.show_ghc and e[1] ~= "" then parts[#parts + 1] = e[1] end
    local code = env.show_code
    if not code and env.show_code_reverse then
      code = env.engine.context.input:sub(cand.start + 1, cand.start + 1) == "`"
    end
    if code and e[5] ~= "" and cand.type ~= "completion" then parts[#parts + 1] = e[5] end
    if lang > 0 and e[lang] ~= "" then parts[#parts + 1] = cut(e[lang], env.max_len) end
  elseif env.show_ghc and (utf8.len(cand.text) or 0) > 1 then
    -- a sentence made of several entries: give the reading of each character
    local rs = {}
    for _, cp in utf8.codes(cand.text) do
      local c = env.d[utf8.char(cp)]
      rs[#rs + 1] = (c and c[1] ~= "") and (c[1]:gsub(" / .*", "")) or "?"
    end
    parts[#parts + 1] = table.concat(rs, " ")
  end
  cand.comment = table.concat(parts, "  ")
end

function M.func(input, env)
  local ctx = env.engine.context
  local lang = ctx:get_option("gloss_zh") and 4 or (ctx:get_option("gloss_none") and 0 or 3)
  if not env.exact_first then
    for cand in input:iter() do
      annotate(cand, env, lang)
      yield(cand)
    end
    return
  end
  -- exact codes first, among the first 200 candidates
  local held, n, full = {}, 0, nil
  for cand in input:iter() do
    n = n + 1
    full = full or cand._end
    annotate(cand, env, lang)
    if n > 200 then
      for _, c in ipairs(held) do yield(c) end
      held = {}
      yield(cand)
    else
      local typed = ctx.input:sub(cand.start + 1, cand._end):gsub("[%s'%-]", "")
      local e = env.d[cand.text]
      if e and cand._end == full and e[2] == typed then yield(cand) else held[#held + 1] = cand end
    end
  end
  for _, c in ipairs(held) do yield(c) end
end

return M
