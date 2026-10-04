// Class-name pins for SidePane and PulseView.
//
// Follows the taskControlsCss.test.mjs precedent, and exists for the same
// reason: a component that emits a class name App.css never defines renders
// unstyled, and unstyled in a dark app usually means INVISIBLE rather than
// ugly. Nothing here renders; these read both files as text.
//
// The specific failure being guarded: the collapsed pane. If its tab rail ever
// reaches zero width, the pane disappears with no control left to bring it
// back, and the only recovery is clearing localStorage.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

function read(name) {
  return readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), 'utf8')
}

const CSS = read('App.css').replace(/\/\*[\s\S]*?\*\//g, '')
const SIDE_PANE = read('SidePane.jsx')
const PULSE_VIEW = read('PulseView.jsx')

// Every class name that appears in a className="..." or className={`...`} in
// the two components. Template expressions are stripped first so a conditional
// like `${selected ? ' x' : ''}` contributes its literal fragments only.
function emittedClasses(source) {
  const names = new Set()
  const ATTR = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g
  let match
  while ((match = ATTR.exec(source)) !== null) {
    const raw = (match[1] ?? match[2] ?? '').replace(/\$\{[^}]*\}/g, ' ')
    for (const name of raw.split(/\s+/)) if (name) names.add(name)
  }
  // Class names built inside a conditional expression inside a template, e.g.
  // ` side-pane-tab-active`, survive the strip above only if they sat outside
  // the ${...}. These are picked up explicitly from the ternary branches.
  const TERNARY = /\$\{[^}]*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\}/g
  while ((match = TERNARY.exec(source)) !== null) {
    for (const branch of [match[1], match[2]]) {
      for (const name of branch.split(/\s+/)) if (name) names.add(name)
    }
  }
  // A fragment ending in `-` is the literal half of an interpolated name such
  // as `pulse-ring-${tone}`; the real class is only known at runtime. Those are
  // dropped here and asserted explicitly instead, by name, below.
  return [...names].filter((name) => !name.endsWith('-'))
}

function defines(css, className) {
  return new RegExp(`\\.${className.replace(/[-]/g, '\\-')}(?![\\w-])`).test(css)
}

test('the class extractor is not vacuous', () => {
  // Guard the guard: a matcher that finds nothing would make every assertion
  // below pass for the wrong reason.
  const found = emittedClasses(SIDE_PANE)
  assert.ok(found.includes('side-pane-tab'), 'must find a plain class')
  assert.ok(found.includes('side-pane-tab-active'), 'must find a ternary-branch class')
  assert.ok(found.includes('visually-hidden'), 'must find the collapsed-rail label class')
})

test('every class SidePane emits is defined in App.css', () => {
  const missing = emittedClasses(SIDE_PANE).filter((name) => !defines(CSS, name))
  assert.deepEqual(missing, [], 'an undefined class renders unstyled, which in a dark app means invisible')
})

test('every class PulseView emits is defined in App.css', () => {
  // `button`, `coral` and `signal` tones come from the shared vocabulary and
  // are defined elsewhere in App.css, so they are not excluded here -- if one
  // ever stops existing, this should fail.
  const missing = emittedClasses(PULSE_VIEW).filter((name) => !defines(CSS, name))
  assert.deepEqual(missing, [], 'an undefined class renders unstyled, which in a dark app means invisible')
})

test('every runtime-built class name is defined too', () => {
  // These are assembled from a variable (`pulse-ring-${tone}`, `signal ${tone}`)
  // so the text extractor cannot see them. A missing one would leave the ring
  // with a track and no arc -- a reading that silently shows nothing.
  for (const name of ['pulse-ring-cyan', 'pulse-ring-amber', 'pulse-ring-coral']) {
    assert.ok(defines(CSS, name), `${name} is built at runtime and must exist in App.css`)
  }
  // The three tones the ring can actually produce, and nothing else.
  const tones = PULSE_VIEW.match(/const tone = [^\n]*/)
  assert.ok(tones, 'the ring must still choose a tone')
  for (const tone of ['cyan', 'amber', 'coral']) assert.match(tones[0], new RegExp(`'${tone}'`))

  // The project dot reuses the shared signal vocabulary. `cyan` deliberately
  // has NO rule of its own: base `.signal` is already cyan, and the tone
  // classes exist only to override it. Asserting `.cyan` exists would be
  // asserting a rule the app does not have and does not need.
  assert.ok(defines(CSS, 'signal'), 'the base signal dot must exist')
  assert.equal(/\.signal\s*\{[^}]*background\s*:\s*var\(--cyan\)/.test(CSS), true,
    'cyan must stay the BASE signal colour, since toneFor emits a bare `cyan` class with no rule')
  for (const name of ['signal.coral', 'signal.violet']) {
    assert.ok(defines(CSS, name.replace('.', '\\.')) || new RegExp(`\\.${name.replace('.', '\\.')}`).test(CSS),
      `.${name} must exist to override the base dot colour`)
  }
})

test('🛑 the collapsed rail has a non-zero width, so the pane cannot vanish', () => {
  // If this ever reaches 0, the toggle goes with it and the only way back is
  // clearing localStorage.
  const rule = CSS.match(/\.side-pane-collapsed\s+\.side-pane-tabs\s*\{([^}]*)\}/)
  assert.ok(rule, 'the collapsed rail must have its own rule')
  const width = rule[1].match(/min-width\s*:\s*(\d+)px/)
  assert.ok(width, 'the collapsed rail must declare a min-width')
  assert.ok(Number(width[1]) > 0, `collapsed rail min-width must be > 0, got ${width[1]}px`)
})

test('the collapsed pane still renders its tab rail', () => {
  // The rail is outside the `!collapsed &&` guard; only the panel is inside it.
  // If that ever changes, content becomes reachable only by expanding.
  assert.match(SIDE_PANE, /\{!collapsed && <div\s+className="side-pane-panel"/)
  assert.equal(/\{!collapsed && <div className="side-pane-tabs"/.test(SIDE_PANE), false,
    'the tab rail must never be hidden by the collapse guard')
})

test('the collapsed rail keeps an accessible name for every tab', () => {
  // Collapsed shows one initial; the full label has to survive for a screen
  // reader, or the rail is a row of mystery glyphs.
  assert.match(SIDE_PANE, /visually-hidden/)
  assert.match(SIDE_PANE, /aria-label=\{collapsed \? `Expand/)
})

test('Pulse introduces no new colour token', () => {
  // Section 3: no new colours. The Pulse block may only reference tokens that
  // already existed in :root.
  const block = CSS.slice(CSS.indexOf('.pulse-view'))
  const used = new Set([...block.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]))
  const declared = new Set([...CSS.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]))
  const unknown = [...used].filter((token) => !declared.has(token))
  assert.deepEqual(unknown, [], 'every colour must come from the existing token set')
})

test('only the mobile project rail is allowed to scroll sideways', () => {
  // Nothing else may scroll horizontally (spec section 10).
  const block = CSS.slice(CSS.indexOf('.pulse-view'))
  const scrollers = [...block.matchAll(/([^{}]+)\{[^}]*overflow-x\s*:\s*auto[^}]*\}/g)]
    .map((m) => m[1].split('}').pop().trim())
  assert.deepEqual(scrollers, ['.pulse-projects'], 'only the mobile chip rail may scroll horizontally')
})
