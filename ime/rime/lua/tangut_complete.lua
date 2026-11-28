-- tangut_complete.lua — lists characters whose Downes code continues what has been typed
-- (Rime's own translator only gives codes typed in full).
-- Data: tangut_gloss.txt (column 3 = Downes code, column 6 = weight); tangut_reduced.txt (one group per line).
-- Schema config:  tangut_complete/reduced (bool), tangut_complete/limit (int, default 300),
--                  tangut_complete/reverse_only (bool: only after the ` reverse-lookup prefix)

local chars, groups = nil, nil

local function open_data(name)
  for _, dir in ipairs({ rime_api.get_user_data_dir(), rime_api.get_shared_data_dir() }) do
    local f = dir and io.open(dir .. "/" .. name, "r")
    if f then return f end
  end
end

local function radicals(code)
  local t = {}
  for r in code:gmatch("[^aeiou%-][aeiou]*") do t[#t + 1] = r end
  return t
end

local function load()
  if chars then return end
  chars, groups = {}, {}
  local f = open_data("tangut_gloss.txt")
  if f then
    for line in f:lines() do
      line = line:gsub("\r$", "")
      local k, _, code, _, _, w = line:match("^([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t([^\t]*)\t?([^\t]*)$")
      if k and code and code ~= "" then
        chars[#chars + 1] = { text = k, code = code, rad = radicals(code), w = tonumber(w) or 0 }
      end
    end
    f:close()
    table.sort(chars, function(a, b) return a.w > b.w end)
  end
  local g = open_data("tangut_reduced.txt")
  if g then
    local n = 0
    for line in g:lines() do
      n = n + 1
      for r in line:gmatch("%a+") do groups[r] = n end
    end
    g:close()
  end
end

local M = {}

function M.init(env)
  load()
  local cfg = env.engine.schema.config
  env.reduced = cfg:get_bool(env.name_space .. "/reduced") or false
  env.limit = cfg:get_int(env.name_space .. "/limit") or 300
  -- abc: complete ordinary input; reverse: complete input after the ` prefix
  env.on_abc = not cfg:get_bool(env.name_space .. "/reverse_only")
  env.on_reverse = cfg:get_bool(env.name_space .. "/reverse_only") or false
end

local function same(a, b, reduced)
  if a == b then return true end
  return reduced and groups[a] ~= nil and groups[a] == groups[b]
end

-- does radical r begin with the partly typed t (allowing any group member when reduced)?
local function starts(r, t, reduced)
  if r:sub(1, #t) == t then return true end
  if reduced and groups[r] then
    for m, n in pairs(groups) do
      if n == groups[r] and m:sub(1, #t) == t then return true end
    end
  end
  return false
end

function M.func(input, seg, env)
  local typed = input
  if typed:sub(1, 1) == "`" then
    if not (env.on_reverse and seg:has_tag("reverse_lookup")) then return end
    typed = typed:sub(2)
  elseif not (env.on_abc and seg:has_tag("abc")) then
    return
  end
  typed = typed:gsub("[%s'%-]", "")
  if typed == "" or typed:find("[^a-z]") then return end
  local t = radicals(typed)
  local n = #t
  if n == 0 then return end
  local last = t[n]
  local count = 0
  for _, c in ipairs(chars) do
    local r = c.rad
    if #r >= n then
      local ok = true
      for i = 1, n - 1 do
        if not same(r[i], t[i], env.reduced) then ok = false; break end
      end
      -- the code must go on past what was typed (a code typed in full comes from the main translator)
      if ok then
        if #r == n then
          ok = not same(r[n], last, env.reduced) and starts(r[n], last, env.reduced)
        else
          ok = same(r[n], last, env.reduced) or starts(r[n], last, env.reduced)
        end
      end
      if ok then
        local rest = {}
        for i = n + 1, #r do rest[#rest + 1] = r[i] end
        local comment = "~" .. table.concat(rest)
        if #r == n then comment = "~" .. r[n]:sub(#last + 1) end
        local cand = Candidate("completion", seg.start, seg._end, c.text, comment)
        cand.quality = -1
        yield(cand)
        count = count + 1
        if count >= env.limit then return end
      end
    end
  end
end

return M
