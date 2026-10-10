import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

// The Projects header placeholder (a3b1a12) shipped as a 90KB data: URL that
// Chrome rejected with ERR_INVALID_URL on every load. The bytes were fine; the
// base64 ended in a bogus "==" on a payload whose length is a multiple of 3, so
// the string was 89906 chars (length % 4 == 2). Node's Buffer decoder shrugs
// that off, which is why it looked valid when decoded here. Browsers decode
// data: URLs with WHATWG "forgiving-base64", which rejects it. This check
// implements that algorithm so the next malformed embed fails here instead.
// https://infra.spec.whatwg.org/#forgiving-base64-decode
function isForgivingBase64(input) {
  let s = input.replace(/[\t\n\f\r ]/g, '')
  if (s.length % 4 === 0) s = s.replace(/={1,2}$/, '')
  if (s.length % 4 === 1) return false
  return /^[A-Za-z0-9+/]*$/.test(s)
}

test('forgiving-base64 accepts canonical, unpadded and whitespace-wrapped input', () => {
  assert.equal(isForgivingBase64('QUJD'), true) // "ABC", no padding needed
  assert.equal(isForgivingBase64('QUI='), true) // "AB", correctly padded
  assert.equal(isForgivingBase64('QUI'), true) // "AB", padding omitted
  assert.equal(isForgivingBase64('QU\nJD'), true)
  assert.equal(isForgivingBase64(''), true)
})

test('forgiving-base64 rejects the exact defect that broke the header image', () => {
  assert.equal(isForgivingBase64('QUJD=='), false) // padding on a length-%3==0 payload
  assert.equal(isForgivingBase64('QUJDR'), false) // length % 4 == 1
  assert.equal(isForgivingBase64('QU=JD'), false) // padding mid-string
  assert.equal(isForgivingBase64('QUJD!'), false) // outside the alphabet
})

test('every base64 data: URL in src/*.css is one a browser will decode', () => {
  const cssFiles = readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.css'))
  // Guard: an empty scan would pass vacuously.
  assert.ok(cssFiles.includes('App.css'), 'expected to scan src/App.css')
  let checked = 0
  for (const file of cssFiles) {
    const css = readFileSync(new URL(file, import.meta.url), 'utf8')
    for (const [, payload] of css.matchAll(/data:[^;,]+;base64,([^)"'\s]*)/g)) {
      checked += 1
      assert.ok(isForgivingBase64(payload), `${file}: data: URL #${checked} is not valid forgiving-base64 (length ${payload.length})`)
    }
  }
  assert.ok(checked >= 1, 'expected at least one data: URL; the header image embed is gone')
})
