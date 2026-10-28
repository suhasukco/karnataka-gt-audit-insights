#!/usr/bin/env node
/**
 * Fails if any source file carries UTF-8-read-as-CP1252 corruption.
 *
 * This exists because it actually happened: scripted edits that used Windows
 * PowerShell's `Get-Content -Raw` read UTF-8 files using the system ANSI
 * codepage, turning ₹ into "â‚¹", — into "â€”", · into "Â·", and so on. Saving
 * the result made the damage permanent, and it reached the UI before anyone
 * noticed.
 *
 * The lead bytes below (C2, C3, E2 …) are the giveaway: this codebase writes
 * ASCII plus a small set of typographic characters, so a bare "â" or "Â" in
 * source is corruption, never intent.
 *
 * Run:  node scripts/check-encoding.mjs
 * Prevention, not just detection: never round-trip source through
 * `Get-Content`/`Set-Content`. Use the editor, or Node, which is UTF-8 by
 * default.
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOTS = ['src']
const EXT = new Set(['.ts', '.tsx', '.css', '.json'])
const SUSPECT = /[ÂÃâ�]|^﻿/

const files = []
for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', 'dist'].includes(e.name)) continue
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (EXT.has(path.extname(e.name))) files.push(p)
    }
  }
  walk(root)
}

let bad = 0
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  text.split('\n').forEach((line, i) => {
    if (!SUSPECT.test(i === 0 ? text.slice(0, 1) + line : line)) return
    bad++
    const codes = [...line]
      .filter((c) => c.charCodeAt(0) > 127)
      .map((c) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'))
      .join(' ')
    console.error(`${f}:${i + 1}\n  ${line.trim().slice(0, 100)}\n  ${codes}\n`)
  })
}

if (bad) {
  console.error(`FAIL: ${bad} line(s) look mis-encoded (UTF-8 read as CP1252).`)
  process.exit(1)
}
console.log(`OK: ${files.length} files, no encoding corruption.`)
