#!/usr/bin/env node

// Aligns GFM table pipes in Markdown files, matching markdownlint's MD060 "aligned" style
// (.markdownlint-cli2.yaml). markdownlint can only auto-fix "compact"/"tight" table styles —
// "aligned" requires reformatting the whole table, which it explicitly doesn't do.
//
// Usage: node scripts/align-md-tables.mjs [file...]
// With no arguments, discovers **/*.md respecting .markdownlint-cli2.yaml's `ignores` list.

import { globSync, readFileSync, writeFileSync } from 'node:fs'

function readIgnorePatterns() {
  const config = readFileSync('.markdownlint-cli2.yaml', 'utf8')
  const match = config.match(/^ignores:\n((?:\s+-\s+.*\n?)+)/m)
  if (!match) return []
  return [...match[1].matchAll(/-\s+"([^"]+)"/g)].map((m) => m[1])
}

function discoverFiles() {
  return [...globSync('**/*.md', { exclude: readIgnorePatterns() })]
}

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line)
const isSeparatorRow = (line) => /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line)

function splitRow(line) {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|')) s = s.slice(0, -1)
  return s.split(/(?<!\\)\|/).map((cell) => cell.trim())
}

// Approximates markdownlint's visual column width: most emoji render as 2 columns
// even though single-codepoint ones (✅ ❌ etc.) are 1 UTF-16 code unit in JS.
const WIDE_EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u

function displayWidth(text) {
  let width = 0
  for (const grapheme of text) {
    if (grapheme === '️') continue // variation selector: zero width
    width += WIDE_EMOJI.test(grapheme) ? 2 : 1
  }
  return width
}

function pad(cell, width) {
  return cell + ' '.repeat(Math.max(0, width - displayWidth(cell)))
}

function alignBlock(lines) {
  const indent = lines[0].match(/^\s*/)[0]
  const rows = lines.map(splitRow)
  const sepIndex = 1
  const widths = rows[0].map(() => 0)

  rows.forEach((row, i) => {
    if (i === sepIndex) return
    row.forEach((cell, j) => {
      widths[j] = Math.max(widths[j], displayWidth(cell))
    })
  })

  rows[sepIndex].forEach((cell, j) => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    const minWidth = 3 + (left ? 1 : 0) + (right ? 1 : 0)
    widths[j] = Math.max(widths[j], minWidth)
  })

  return rows.map((row, i) => {
    const cells = row.map((cell, j) => {
      if (i !== sepIndex) return pad(cell, widths[j])
      const left = cell.startsWith(':')
      const right = cell.endsWith(':')
      const dashCount = widths[j] - (left ? 1 : 0) - (right ? 1 : 0)
      return `${left ? ':' : ''}${'-'.repeat(dashCount)}${right ? ':' : ''}`
    })
    return `${indent}| ${cells.join(' | ')} |`
  })
}

function alignTables(content) {
  const lines = content.split('\n')
  const result = []
  let inFence = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence

    if (!inFence && isTableRow(line) && isSeparatorRow(lines[i + 1] ?? '')) {
      const block = [line]
      let j = i + 1
      while (j < lines.length && isTableRow(lines[j])) {
        block.push(lines[j])
        j++
      }
      result.push(...alignBlock(block))
      i = j - 1
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

const files = process.argv.slice(2)
for (const file of files.length > 0 ? files : discoverFiles()) {
  const original = readFileSync(file, 'utf8')
  const aligned = alignTables(original)
  if (aligned !== original) {
    writeFileSync(file, aligned)
    console.log(`Aligned tables in ${file}`)
  }
}
