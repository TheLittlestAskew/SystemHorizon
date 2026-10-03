// Cascade pins for the Flow task-control row.
//
// Why this file exists: the handoff pill (`.task-promotion`) is a <button> that
// lives inside `.task-controls`, so every rule written for "the button in the
// controls row" -- which for a long time meant only the delete `x` -- also hits
// the pill. Three separate layout fixes (flex-wrap, flex-basis, grid-areas) all
// failed to stop FLAG rendering on top of the delete button, because all three
// changed the CONTAINER while the pill was being given an explicit `width:26px`
// by a rule nobody was looking at. A container cannot resize an explicitly
// sized item.
//
// These are not layout tests -- nothing here renders. They pin the one property
// of the cascade that a layout change cannot express: which rules are allowed
// to reach this element at all.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Comments are stripped FIRST and that is not cosmetic: a comment carries no
// braces, so the rule regex below would glue its prose onto the next selector.
// Prose containing a comma (`(0,1,1)`) then splits into fragments like `1`,
// which parse to a compound with no tag and no classes -- and a compound with
// no constraints matches EVERYTHING. An unstripped comment makes this whole
// file silently over-report. Found the hard way, one edit after writing it.
const CSS = readFileSync(fileURLToPath(new URL('./App.css', import.meta.url)), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')

// `([^{}]+)\{([^{}]+)\}` finds INNERMOST rules only, so an `@media (...)  { ... }`
// wrapper is skipped rather than parsed -- its closing brace just gets glued to
// the front of a later selector, which is why the selector is taken as the
// final segment after any stray brace.
function parseRules(css) {
  const rules = []
  const RULE = /([^{}]+)\{([^{}]+)\}/g
  let match
  while ((match = RULE.exec(css)) !== null) {
    const selector = match[1].split('}').pop().trim()
    if (!selector || selector.startsWith('@')) continue
    for (const one of selector.split(',')) {
      const trimmed = one.trim()
      if (trimmed) rules.push({ selector: trimmed, body: match[2] })
    }
  }
  return rules
}

// State pseudos are stripped: `button:hover` still targets the same element, and
// for "may this rule reach the pill" the state is irrelevant. `:not(.class)` is
// NOT stripped -- it is the entire mechanism under test.
const STATE_PSEUDO = /:(?:hover|focus-visible|focus|active|disabled|checked|first-child|last-child|nth-child\([^)]*\))/g

function parseCompound(raw) {
  const text = raw.replace(/:not\(:[^)]*\)/g, '').replace(STATE_PSEUDO, '')
  const excluded = [...text.matchAll(/:not\(([^)]*)\)/g)]
    .flatMap((m) => m[1].split(',').map((s) => s.trim().replace(/^\./, '')))
    .filter(Boolean)
  const bare = text.replace(/:not\([^)]*\)/g, '')
  const classes = [...bare.matchAll(/\.([\w-]+)/g)].map((m) => m[1])
  const tag = (bare.match(/^[a-zA-Z][\w-]*/) ?? [null])[0]
  return { tag, classes, excluded }
}

function compoundMatches(compound, element) {
  // A compound with no tag, no class and no exclusion constrains nothing and
  // would match every element. That is never a real selector -- it only arises
  // from a parse failure, so it must fail loudly rather than match everything.
  if (!compound.tag && compound.classes.length === 0 && compound.excluded.length === 0) return false
  if (compound.tag && compound.tag !== element.tag) return false
  if (compound.classes.some((c) => !element.classes.includes(c))) return false
  if (compound.excluded.some((c) => element.classes.includes(c))) return false
  return true
}

// Right-to-left descendant matching over a fixed ancestor chain. Child (`>`) is
// treated as descendant: that is deliberately permissive, so the test can only
// ever over-report a rule as reaching the pill, never under-report one.
function selectorMatches(selector, element, ancestors) {
  const parts = selector.replace(/>/g, ' ').split(/\s+/).filter(Boolean).map(parseCompound)
  const own = parts.pop()
  if (!own || !compoundMatches(own, element)) return false
  let index = ancestors.length - 1
  for (const compound of parts.reverse()) {
    while (index >= 0 && !compoundMatches(compound, ancestors[index])) index -= 1
    if (index < 0) return false
    index -= 1
  }
  return true
}

function declares(body, property) {
  return new RegExp(`(^|;)\\s*${property}\\s*:`, 'i').test(body)
}

// The pill as it actually renders on the Flow board (App.jsx TaskRow).
const PILL = { tag: 'button', classes: ['task-promotion', 'task-promotion-none'] }
const ANCESTORS = [
  { tag: 'div', classes: ['app-shell'] },
  { tag: 'main', classes: ['main-content'] },
  { tag: 'div', classes: ['flow-view'] },
  { tag: 'div', classes: ['flow-columns'] },
  { tag: 'div', classes: ['flow-column', 'flow-column-active'] },
  { tag: 'div', classes: ['flow-column-list'] },
  { tag: 'article', classes: ['task-row'] },
  { tag: 'div', classes: ['task-controls'] },
]

const reaching = parseRules(CSS).filter((rule) => selectorMatches(rule.selector, PILL, ANCESTORS))

// Guard the guard. The M8 round-trip tests were blind because they built their
// own input; a matcher that silently matches nothing would make every assertion
// below pass vacuously. These four cases fix the matcher against known answers.
test('the selector matcher is not vacuous', () => {
  assert.equal(selectorMatches('.task-controls button', PILL, ANCESTORS), true, 'a bare button rule must reach the pill')
  assert.equal(selectorMatches('.task-controls button:not(.task-promotion)', PILL, ANCESTORS), false, ':not(.task-promotion) must exclude it')
  assert.equal(selectorMatches('.task-controls select', PILL, ANCESTORS), false, 'a select rule must not reach a button')
  assert.equal(selectorMatches('.calendar-panel .task-promotion', PILL, ANCESTORS), false, 'an unrelated ancestor must not match')
  assert.ok(reaching.length > 0, 'some rules must reach the pill, or the parse failed')
})

// THE BUG. A fixed width plus `white-space:nowrap` (line 160) means the label
// overflows its own box, and the delete button -- later in DOM order -- paints
// over the spill. No container change can fix this.
test('nothing gives the handoff pill a fixed width or height', () => {
  const sized = reaching.filter((rule) => declares(rule.body, 'width') || declares(rule.body, 'height'))
  assert.deepEqual(sized.map((rule) => rule.selector), [],
    'the pill must be sized by its own padding and label, never by a fixed box')
})

// The same rule also outranks `.task-promotion-candidate` (0,1,0) and
// `.task-promotion-promoted` (0,1,0) at (0,1,1), so all three promotion states
// render identically. M9's colour coding is unreachable while this is true.
test('only .task-promotion rules may paint the handoff pill', () => {
  const painting = reaching.filter((rule) =>
    (declares(rule.body, 'background') || declares(rule.body, 'border') || declares(rule.body, 'color'))
    && !rule.selector.includes('.task-promotion'))
  assert.deepEqual(painting.map((rule) => rule.selector), [],
    'a rule that does not name .task-promotion must not override its state colours')
})
