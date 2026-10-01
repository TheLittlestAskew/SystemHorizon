import test from 'node:test'
import assert from 'node:assert/strict'
import { PROMOTION, PROMOTION_STATES, canTogglePromotion, nextPromotionState, promotionLabel } from './promotion.js'

test('the states match the database CHECK exactly', () => {
  // If these drift from horizon_tasks_promotion_state_check, writes start failing
  // at the database instead of being caught here.
  assert.deepEqual(PROMOTION_STATES, ['none', 'candidate', 'promoted'])
})

test('SH toggles none -> candidate -> none', () => {
  assert.equal(nextPromotionState(PROMOTION.none), PROMOTION.candidate)
  assert.equal(nextPromotionState(PROMOTION.candidate), PROMOTION.none)
})

test('🛑 SH can never write promoted, in either direction', () => {
  // Criterion 5. This is the milestone's whole boundary: SH may raise a hand, it
  // may not declare the work banked, and it may not un-bank what a real session
  // recorded. Asserted, not left to convention.
  assert.equal(nextPromotionState(PROMOTION.promoted), null)
  assert.equal(canTogglePromotion({ promotionState: PROMOTION.promoted }), false)
  // No input of any kind may produce 'promoted' as the next state.
  const everyInput = [...PROMOTION_STATES, null, undefined, '', 'PROMOTED', 'Promoted', 'banked', 0, {}, []]
  for (const input of everyInput) {
    assert.notEqual(nextPromotionState(input), PROMOTION.promoted, `input ${JSON.stringify(input)} must not yield promoted`)
  }
})

test('an unrecognised state is treated as none for toggling, so the control still works', () => {
  assert.equal(nextPromotionState('nonsense'), PROMOTION.candidate)
  assert.equal(nextPromotionState(null), PROMOTION.candidate)
  assert.equal(nextPromotionState(undefined), PROMOTION.candidate)
})

test('a task with no promotion field at all is togglable', () => {
  assert.equal(canTogglePromotion({}), true)
  assert.equal(canTogglePromotion(undefined), true)
})

test('labels state the condition in words, never by colour alone', () => {
  assert.equal(promotionLabel(PROMOTION.none).text, 'Mark handoff candidate')
  assert.equal(promotionLabel(PROMOTION.candidate).text, 'Handoff candidate')
  assert.equal(promotionLabel(PROMOTION.promoted).text, 'Promoted')
  for (const state of PROMOTION_STATES) {
    const label = promotionLabel(state)
    assert.ok(label.text.length > 0 && label.hint.length > 0, `${state} needs text and a hint`)
    assert.ok(label.short.length > 0, `${state} needs a short form for the narrow Flow column`)
  }
})

test('the short forms are three distinct words, so colour is never the only signal', () => {
  // A Flow column is one of four and cannot fit a sentence, but shortening must not
  // collapse two states into the same word with different tones.
  const shorts = PROMOTION_STATES.map((state) => promotionLabel(state).short)
  assert.equal(new Set(shorts).size, PROMOTION_STATES.length, `short forms collide: ${shorts.join(', ')}`)
  for (const short of shorts) assert.ok(!short.includes(' '), `${short} must be one word to fit the column`)
})

test('only promoted is locked', () => {
  assert.equal(promotionLabel(PROMOTION.promoted).locked, true)
  assert.equal(promotionLabel(PROMOTION.none).locked, false)
  assert.equal(promotionLabel(PROMOTION.candidate).locked, false)
})

test('an unknown value falls back to the none label rather than rendering blank', () => {
  assert.equal(promotionLabel('nonsense').text, 'Mark handoff candidate')
  assert.equal(promotionLabel(undefined).locked, false)
})


test('toggling is idempotent in pairs, so a double click lands back where it started', () => {
  assert.equal(nextPromotionState(nextPromotionState(PROMOTION.none)), PROMOTION.none)
  assert.equal(nextPromotionState(nextPromotionState(PROMOTION.candidate)), PROMOTION.candidate)
})
