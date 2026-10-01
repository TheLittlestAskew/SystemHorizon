// M9: a task can be labelled a handoff candidate without SH becoming a second
// handoff system. The boundary is the whole point (NORTH_STAR section 2 and 5):
// repo HANDOFF.md files own banked implementation state, SH owns routine task
// state. So SH may raise a hand; it may not declare the work banked.
//
// 'promoted' therefore exists as a value the app READS and renders but never
// WRITES. A real implementation session sets it. That is enforced here rather than
// left to convention, because the convention is exactly what a future session
// would not know.
export const PROMOTION = {
  none: 'none',
  candidate: 'candidate',
  promoted: 'promoted',
}

export const PROMOTION_STATES = [PROMOTION.none, PROMOTION.candidate, PROMOTION.promoted]

// The only transitions SH is allowed to make. Anything touching 'promoted' is not
// SH's call in either direction: it must not claim the work was banked, and it must
// not quietly un-bank something a real session recorded.
export function nextPromotionState(current) {
  const state = PROMOTION_STATES.includes(current) ? current : PROMOTION.none
  if (state === PROMOTION.promoted) return null
  return state === PROMOTION.candidate ? PROMOTION.none : PROMOTION.candidate
}

// True when SH may change this task's promotion state at all.
export function canTogglePromotion(task) {
  return nextPromotionState(task?.promotionState) !== null
}

// What the control says. Reads as words, not colour, so the state survives being
// seen by someone who cannot distinguish the tones (criterion 4).
export function promotionLabel(current) {
  const state = PROMOTION_STATES.includes(current) ? current : PROMOTION.none
  if (state === PROMOTION.promoted) return { text: 'Promoted', hint: 'Banked by an implementation session. SH does not change this.', locked: true }
  if (state === PROMOTION.candidate) return { text: 'Handoff candidate', hint: 'Marked for a future implementation session. Click to unmark.', locked: false }
  return { text: 'Mark handoff candidate', hint: 'Flag this for a future implementation session.', locked: false }
}

