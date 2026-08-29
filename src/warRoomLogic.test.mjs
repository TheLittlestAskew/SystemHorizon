import test from 'node:test'
import assert from 'node:assert/strict'
import {
  seasonYear, normalizePos, playerKey, overallToRoundPick, myOverallPicks,
  parseCSVLine, parseRankingsCSV, normalizeAdpPayload, mergeOrder, moveInOrder,
  applyEspnPicks, describeEspnPoll,
} from './warRoomLogic.js'

test('seasonYear rolls back before March', () => {
  assert.equal(seasonYear(new Date('2026-01-15T12:00:00Z')), 2025)
  assert.equal(seasonYear(new Date('2026-02-28T12:00:00Z')), 2025)
  assert.equal(seasonYear(new Date('2026-03-01T12:00:00Z')), 2026)
  assert.equal(seasonYear(new Date('2026-08-29T12:00:00Z')), 2026)
})

test('seasonYear survives junk input', () => {
  assert.equal(typeof seasonYear('not a date'), 'number')
  assert.equal(typeof seasonYear(new Date('nope')), 'number')
})

test('normalizePos canonicalises real-world spellings', () => {
  assert.equal(normalizePos('WR1'), 'WR')
  assert.equal(normalizePos('D/ST'), 'DST')
  assert.equal(normalizePos('DEF'), 'DST')
  assert.equal(normalizePos('PK'), 'K')
  assert.equal(normalizePos('rb12'), 'RB')
})

test('normalizePos rejects junk instead of guessing', () => {
  assert.equal(normalizePos(42), null)
  assert.equal(normalizePos(''), null)
  assert.equal(normalizePos('LB'), null) // IDP slots are not board positions
  assert.equal(normalizePos(null), null)
})

test('playerKey is stable across punctuation and case', () => {
  assert.equal(playerKey("Ja'Marr Chase", 'WR'), playerKey('JaMarr chase', 'WR'))
  assert.notEqual(playerKey('Josh Allen', 'QB'), playerKey('Josh Allen', 'LB'))
  assert.equal(playerKey('', 'WR'), null)
})

test('overallToRoundPick handles snake boundaries', () => {
  assert.deepEqual(overallToRoundPick(1, 20), { round: 1, pick: 1, seat: 1 })
  assert.deepEqual(overallToRoundPick(20, 20), { round: 1, pick: 20, seat: 20 })
  const r2 = overallToRoundPick(21, 20)
  assert.equal(r2.round, 2)
  assert.equal(r2.pick, 1)
  assert.equal(r2.seat, 20) // round 2 reverses
})

test('overallToRoundPick rejects impossible input', () => {
  assert.equal(overallToRoundPick(0, 20), null)
  assert.equal(overallToRoundPick(5, 0), null)
  assert.equal(overallToRoundPick(1.5, 20), null)
})

test('myOverallPicks returns the real snake seats', () => {
  assert.deepEqual(myOverallPicks(3, 20, 2), [3, 38])
  assert.deepEqual(myOverallPicks(20, 20, 2), [20, 21])
  // Tayls: slot 9 of 20, first three rounds
  assert.deepEqual(myOverallPicks(9, 20, 3), [9, 32, 49])
})

test('myOverallPicks refuses out-of-range slots', () => {
  assert.deepEqual(myOverallPicks(0, 20, 2), [])
  assert.deepEqual(myOverallPicks(21, 20, 2), [])
  assert.deepEqual(myOverallPicks(null, 20, 2), [])
  assert.deepEqual(myOverallPicks(3, 20, 0), [])
})

test('parseCSVLine handles quotes and embedded commas', () => {
  assert.deepEqual(parseCSVLine('a,b,c'), ['a', 'b', 'c'])
  assert.deepEqual(parseCSVLine('"Smith, Jr.",WR'), ['Smith, Jr.', 'WR'])
  assert.deepEqual(parseCSVLine('"say ""hi""",x'), ['say "hi"', 'x'])
})

test('parseRankingsCSV parses FantasyPros shape and dedupes', () => {
  const csv = '"RK","TIERS","PLAYER NAME","TEAM","POS","BYE WEEK"\n'
    + '"1","1","Test Player","CIN","WR1","10"\n'
    + '"1","1","Test Player","CIN","WR1","10"'
  const r = parseRankingsCSV(csv)
  assert.equal(r.error, null)
  assert.equal(r.players.length, 1)
  assert.equal(r.players[0].bye, 10)
  assert.equal(r.players[0].pos, 'WR')
  assert.equal(r.players[0].tier, 1)
})

test('parseRankingsCSV fails loudly, never silently', () => {
  assert.notEqual(parseRankingsCSV('').error, null)
  assert.notEqual(parseRankingsCSV('just one line').error, null)
  assert.notEqual(parseRankingsCSV('name,thing\na,b').error, null) // no POS column
  assert.notEqual(parseRankingsCSV('player,pos\n,,\n').error, null) // header ok, zero rows
})

test('normalizeAdpPayload sorts by ADP and drops unusable rows', () => {
  const { players, error } = normalizeAdpPayload({ players: [
    { name: 'B Player', position: 'RB', team: 'kc', adp: 4.2, bye: 6 },
    { name: 'A Player', position: 'WR', team: 'CIN', adp: 1.1, bye: 10 },
    { name: 'Bad Pos', position: 'LB', team: 'NYJ', adp: 2 },
    { name: 'B Player', position: 'RB', team: 'KC', adp: 4.2 },
  ] })
  assert.equal(error, null)
  assert.equal(players.length, 2) // LB dropped, duplicate dropped
  assert.equal(players[0].name, 'A Player')
  assert.equal(players[1].team, 'KC')
})

test('normalizeAdpPayload reports empty payloads', () => {
  assert.notEqual(normalizeAdpPayload(null).error, null)
  assert.notEqual(normalizeAdpPayload({}).error, null)
  assert.notEqual(normalizeAdpPayload({ players: [] }).error, null)
})

test('mergeOrder preserves custom ranks across a refresh', () => {
  const players = [{ key: 'a' }, { key: 'b' }, { key: 'c' }]
  // 'c' was hand-moved to the top; 'z' is gone from the new data
  assert.deepEqual(mergeOrder(['c', 'a', 'z'], players), ['c', 'a', 'b'])
  assert.deepEqual(mergeOrder([], players), ['a', 'b', 'c'])
  assert.deepEqual(mergeOrder(null, players), ['a', 'b', 'c'])
})

test('moveInOrder never mutates and clamps at the edges', () => {
  const order = ['a', 'b', 'c']
  assert.deepEqual(moveInOrder(order, 'c', 'top'), ['c', 'a', 'b'])
  assert.deepEqual(moveInOrder(order, 'a', -1), ['a', 'b', 'c']) // already top
  assert.deepEqual(moveInOrder(order, 'c', +1), ['a', 'b', 'c']) // already bottom
  assert.deepEqual(moveInOrder(order, 'missing', -1), ['a', 'b', 'c'])
  assert.deepEqual(order, ['a', 'b', 'c'], 'input array must be untouched')
})

test('applyEspnPicks marks my picks vs everyone else', () => {
  const players = [
    { key: 'chase|WR', name: "Ja'Marr Chase", pos: 'WR' },
    { key: 'gibbs|RB', name: 'Jahmyr Gibbs', pos: 'RB' },
  ]
  const out = applyEspnPicks({
    picks: [
      { overall: 1, teamId: 4, name: "Ja'Marr Chase", pos: 'WR' },
      { overall: 9, teamId: 16, name: 'Jahmyr Gibbs', pos: 'RB' },
    ],
    players, statuses: {}, lastAppliedOverall: 0, myTeamId: 16,
  })
  assert.equal(out.statuses['chase|WR'], 'taken')
  assert.equal(out.statuses['gibbs|RB'], 'mine')
  assert.equal(out.draftSlots['chase|WR'], 1)
  assert.equal(out.draftSlots['gibbs|RB'], 9)
  assert.equal(out.applied, 2)
  assert.equal(out.lastAppliedOverall, 9)
})

test('applyEspnPicks skips already-applied picks and counts unmatched', () => {
  const players = [{ key: 'chase|WR', name: "Ja'Marr Chase", pos: 'WR' }]
  const out = applyEspnPicks({
    picks: [
      { overall: 1, teamId: 4, name: "Ja'Marr Chase", pos: 'WR' }, // already applied
      { overall: 2, teamId: 4, name: 'Unknown Guy', pos: 'WR' },   // not on board
      { overall: 3, teamId: 4, name: null, pos: null },            // name unresolved
    ],
    players, statuses: { 'chase|WR': 'taken' }, lastAppliedOverall: 1, myTeamId: 16,
  })
  assert.equal(out.applied, 0)
  assert.equal(out.unmatched, 2)
  assert.equal(out.lastAppliedOverall, 1)
})

test('applyEspnPicks never un-applies a pick', () => {
  const players = [{ key: 'chase|WR', name: "Ja'Marr Chase", pos: 'WR' }]
  const out = applyEspnPicks({
    picks: [{ overall: 5, teamId: 16, name: "Ja'Marr Chase", pos: 'WR' }],
    players, statuses: { 'chase|WR': 'taken' }, lastAppliedOverall: 0, myTeamId: 16,
  })
  assert.equal(out.statuses['chase|WR'], 'mine') // upgraded, not cleared
})

test('applyEspnPicks treats a null team id as "not mine", not a match', () => {
  const players = [{ key: 'chase|WR', name: "Ja'Marr Chase", pos: 'WR' }]
  const out = applyEspnPicks({
    picks: [{ overall: 1, teamId: null, name: "Ja'Marr Chase", pos: 'WR' }],
    players, statuses: {}, lastAppliedOverall: 0, myTeamId: null,
  })
  assert.equal(out.statuses['chase|WR'], 'taken')
})

test('applyEspnPicks survives a malformed payload', () => {
  const out = applyEspnPicks({ picks: null, players: null, statuses: null, lastAppliedOverall: null, myTeamId: 16 })
  assert.deepEqual(out.statuses, {})
  assert.equal(out.applied, 0)
})

test('describeEspnPoll reads state from flags, not pick count', () => {
  // ESPN pre-populates placeholder rosters; a non-empty pick list is not proof.
  assert.match(describeEspnPoll({ drafted: false, inProgress: false, picks: [] }, 0), /not started/)
  assert.match(describeEspnPoll({ drafted: false, inProgress: true, picks: [1, 2] }, 0), /live/)
  assert.match(describeEspnPoll({ drafted: true, inProgress: false, picks: [1] }, 0), /complete/)
  assert.match(describeEspnPoll({ drafted: false, inProgress: true, picks: [] }, 3), /3 unmatched/)
})
