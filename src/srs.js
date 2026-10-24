// Spaced review boxes, pure functions over plain objects. Dates are 'YYYY-MM-DD' strings.
//
// An entry: { p: prompt, b: box, d: due date, r: recognition proven, w: production proven, n: answers, k: right, m: misses }
//   - an answer on or after the due date moves the box; an answer before it is practice and moves nothing
//   - right climbs one box (1, 3, 7, 14, 30 days and on, capped at 3,650), wrong drops one box (never below 1)
//   - each item is asked in two directions: 'r' recognise it, 'w' produce it
//   - "firm" = box 4 (14 days) or more with both directions proven
//   - the queue serves the highest box first, then the most overdue, new items last; this keeps the items about
//     to become firm from starving behind a long queue of new ones

export const DAYS = [0, 1, 3, 7, 14, 30, 60, 120, 240, 480, 960, 1920, 3650];
export const FIRM_BOX = 4;

function isDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export const addDays = (day, n) => {
  if (!isDay(day) || !Number.isSafeInteger(n)) {
    throw new TypeError('day must be a valid YYYY-MM-DD date and n must be a safe integer');
  }
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// One answer. Changes the entry in place and returns it.
export function answer(e, good, dir, day) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) throw new TypeError('entry must be an object');
  if (typeof good !== 'boolean') throw new TypeError('good must be a boolean');
  if (dir !== 'r' && dir !== 'w') throw new TypeError('dir must be r or w');
  if (!isDay(day) || !isDay(e.d)) throw new TypeError('day and entry due date must be valid YYYY-MM-DD dates');

  e.n = (e.n || 0) + 1;
  if (good) e.k = (e.k || 0) + 1;
  if (e.d > day) return e; // before the due date: practice, the schedule stays
  if (good) {
    e[dir] = 1;
    e.b = Math.min(DAYS.length - 1, (e.b || 0) + 1);
  } else {
    e[dir] = 0;
    e.b = Math.max(1, (e.b || 0) - 1);
    e.m = (e.m || 0) + 1;
  }
  e.d = addDays(day, DAYS[e.b]);
  return e;
}

export const isFirm = e => (e.b || 0) >= FIRM_BOX && !!e.r && !!e.w;

// Recognition first, then production; once both are proven they alternate by box.
export const nextDir = e => (!e.r ? 'r' : !e.w ? 'w' : e.b % 2 ? 'w' : 'r');

// Adds the items that are not in the map yet. items: [{ id, prompt }]. offset: days until first due,
// a number or a function of the item's index (spread a first import over several days).
export function enroll(map, items, day, offset = 1) {
  items.forEach(({ id, prompt }, i) => {
    if (map[id]) return;
    map[id] = { p: prompt, b: 0, d: addDays(day, typeof offset === 'function' ? offset(i) : offset) };
  });
  return map;
}

export function dueList(map, day) {
  return Object.entries(map)
    .filter(([, e]) => e.d <= day)
    .sort((x, y) => ((y[1].b || 0) - (x[1].b || 0)) || (x[1].d < y[1].d ? -1 : x[1].d > y[1].d ? 1 : 0));
}
