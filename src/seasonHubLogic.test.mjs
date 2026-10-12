import test from 'node:test'
import assert from 'node:assert/strict'
import { hubUrl, validateHub, fmtPts, fmtWhen, freeAgentPositions, buildClaudePrompt } from './seasonHubLogic.js'

const hub = () => ({
  leagueId: '1573934181', teamId: 16, week: 5, leagueName: 'INSPIRED FANTASY FOOTBALL',
  matchup: {
    week: 5,
    me: { teamId: 16, name: 'Hits Different', score: 130.1, projected: 139.5,
      lineup: [{ slot: 'QB', name: 'Joe Burrow', pos: 'QB', proTeam: 'CIN', points: 36, projected: 36.9, injuryStatus: null }] },
    opponent: { teamId: 20, name: "Halfling Hail Mary's", score: 137.6, projected: 137.6,
      lineup: [{ slot: 'K', name: 'Wil Lutz', pos: 'K', proTeam: 'DEN', points: null, projected: 7.4, injuryStatus: 'QUESTIONABLE' }] },
  },
  standings: [{ teamId: 16, name: 'Hits Different', seed: 3, wins: 4, losses: 0, ties: 0, pointsFor: 542.5 }],
  freeAgents: [{ name: 'T.J. Edwards', pos: 'LB', proTeam: 'CHI', projected: 18.3, percentOwned: 13 }],
  transactions: [],
})

test('hubUrl encodes params and rejects bad ids', () => {
  assert.equal(hubUrl('https://x', '123', 16), 'https://x/api/hub?leagueId=123&teamId=16')
  assert.equal(hubUrl('https://x', '123', 16, 2026), 'https://x/api/hub?leagueId=123&teamId=16&year=2026')
  assert.throws(() => hubUrl('https://x', '12a', 16), /league ID/)
  assert.throws(() => hubUrl('https://x', '123', 0), /team ID/)
  assert.throws(() => hubUrl('https://x', '123', 1.5), /team ID/)
})

test('validateHub passes a good payload and names what is wrong otherwise', () => {
  assert.equal(validateHub(hub()).week, 5)
  assert.throws(() => validateHub(null), /no JSON/)
  assert.throws(() => validateHub({ error: 'ESPN rejected the cookies (401)' }), /401/)
  assert.throws(() => validateHub({ ...hub(), week: undefined }), /no week/)
  assert.throws(() => validateHub({ ...hub(), freeAgents: null }), /freeAgents/)
})

test('fmtPts shows a dash for not-yet-played, never 0.0', () => {
  assert.equal(fmtPts(36), '36.0')
  assert.equal(fmtPts(0), '0.0')
  assert.equal(fmtPts(null), '–')
  assert.equal(fmtPts(NaN), '–')
})

test('fmtWhen buckets epoch ms into minutes, hours, days', () => {
  const now = 1_000_000_000_000
  assert.equal(fmtWhen(now - 10_000, now), 'just now')
  assert.equal(fmtWhen(now - 5 * 60000, now), '5m ago')
  assert.equal(fmtWhen(now - 3 * 3600000, now), '3h ago')
  assert.equal(fmtWhen(now - 72 * 3600000, now), '3d ago')
  assert.equal(fmtWhen(null, now), '')
})

test('freeAgentPositions keeps football order and unknowns last', () => {
  assert.deepEqual(freeAgentPositions([{ pos: 'S' }, { pos: 'QB' }, { pos: 'LB' }, { pos: 'QB' }, { pos: 'XX' }, { pos: null }]), ['QB', 'LB', 'S', 'XX'])
  assert.deepEqual(freeAgentPositions(undefined), [])
})

test('buildClaudePrompt carries the numbers, the injury, and the bye case', () => {
  const p = buildClaudePrompt(hub())
  assert.match(p, /week 5 of INSPIRED FANTASY FOOTBALL/)
  assert.match(p, /Hits Different 130\.1 \(proj 139\.5\) vs Halfling Hail Mary's 137\.6/)
  assert.match(p, /- K: Wil Lutz \(K, DEN\) – pts, proj 7\.4, QUESTIONABLE/)
  assert.match(p, /seed 3, 4-0, 542\.5 PF/)
  assert.match(p, /T\.J\. Edwards \(LB, CHI\) proj 18\.3, 13% owned/)
  assert.match(buildClaudePrompt({ ...hub(), matchup: null }), /No matchup this week/)
  assert.throws(() => buildClaudePrompt({}), /no week/)
})
