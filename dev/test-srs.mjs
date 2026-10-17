// Review boxes (src/srs.js): the schedule, practice before the due date, the cap, both directions, the queue order.
import assert from 'node:assert/strict';
import { answer, isFirm, nextDir, enroll, dueList, addDays, DAYS } from '../src/srs.js';

const day = '2026-10-15';
const entry = (o = {}) => ({ p: 'x', b: 0, d: day, ...o });

let e = entry({ p: 'good morning' });
answer(e, true, 'r', day);
assert.deepEqual([e.b, e.d, e.r], [1, '2026-10-16', 1], 'right on the due date: box 1, back tomorrow, recognition proven');

answer(e, true, 'w', day);
assert.deepEqual([e.b, e.d, e.w], [1, '2026-10-16', undefined], 'before the due date is practice: box, date and proof stay');
assert.deepEqual([e.n, e.k], [2, 2], 'practice still counts as an answer');

answer(e, true, 'w', '2026-10-16');
assert.deepEqual([e.b, e.d, e.w], [2, '2026-10-19', 1], 'right again on time: box 2, 3 days, production proven');

answer(e, false, 'r', '2026-10-19');
assert.deepEqual([e.b, e.d, e.r], [1, '2026-10-20', 0], 'wrong from box 2: box 1, tomorrow, the direction loses its proof');

const g = entry({ b: 5, r: 1, w: 1 });
answer(g, false, 'w', day);
assert.deepEqual([g.b, g.d, g.w, g.r], [4, '2026-10-29', 0, 1], 'wrong from box 5: one box down, only the missed direction loses its proof');

const g1 = entry({ b: 1 });
answer(g1, false, 'r', day);
assert.deepEqual([g1.b, g1.d], [1, '2026-10-16'], 'wrong from box 1 stays in box 1');

const top = entry({ b: DAYS.length - 1, r: 1, w: 1 });
answer(top, true, 'r', day);
assert.deepEqual([top.b, top.d], [DAYS.length - 1, '2036-10-12'], 'the top box waits 3,650 days, never more');

assert.ok(isFirm({ b: 4, r: 1, w: 1 }) && !isFirm({ b: 4, r: 1, w: 0 }) && !isFirm({ b: 3, r: 1, w: 1 }), 'firm needs box 4 and both directions');
assert.deepEqual([{ b: 0 }, { b: 2, r: 1 }, { b: 3, r: 1, w: 1 }, { b: 4, r: 1, w: 1 }].map(nextDir), ['r', 'w', 'w', 'r'], 'recognise first, then produce, then alternate');
assert.equal(addDays('2026-12-30', 3), '2027-01-02', 'dates roll over the year');

// Enrolment never resets a box, and the first import can be spread over several days.
const items = Array.from({ length: 60 }, (_, i) => ({ id: `item-${i}`, prompt: `p${i}` }));
const map = enroll({}, items, day, i => i % 14);
assert.equal(Object.keys(map).length, 60, 'every item enters');
const dues = Object.values(map).map(x => x.d);
assert.equal(new Set(dues).size, 14, 'due dates spread over 14 days');
assert.ok(dues.filter(d => d === day).length <= Math.ceil(60 / 14), 'no wall on day one');
map['item-0'].b = 5;
enroll(map, items, day, 1);
assert.equal(map['item-0'].b, 5, 'enrolling again never resets a box');

// Queue: highest box first, then the most overdue, new items last; not-yet-due items stay out.
const q = { fresh: { b: 0, d: day }, box4: { b: 4, d: day }, late1: { b: 1, d: '2026-10-10' }, box1: { b: 1, d: day }, later: { b: 6, d: '2026-10-16' } };
assert.equal(dueList(q, day).map(x => x[0]).join(','), 'box4,late1,box1,fresh', 'queue order');
assert.equal(dueList(q, '2026-10-16').length, 5, 'a day later everything is due');

console.log('srs: ok');
