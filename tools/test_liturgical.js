// US Ordinary Form colors, checked against the USCCB liturgical calendars for 2025 and 2027
// (usccb.org/resources/2025cal.pdf, 2027cal.pdf) and the Universal Norms on the Liturgical Year.
// Run: node tools/test_liturgical.js
const L = require('../liturgical.js');
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) { if (cond) pass++; else { fail++; failures.push(msg); console.log('FAIL', msg); } }
function on(iso) { const [y, m, d] = iso.split('-').map(Number); return L.colorFor(new Date(y, m - 1, d, 12), { memorial: 'season' }); }
function saint(iso) { const [y, m, d] = iso.split('-').map(Number); return L.colorFor(new Date(y, m - 1, d, 12), { memorial: 'saint' }); }
function check(iso, color, name) {
  const r = on(iso);
  ok(r.color === color && r.celebration.toLowerCase().includes(name.toLowerCase()),
    iso + ' want ' + color + ' / ' + name + ' got ' + r.color + ' / ' + r.celebration);
}

// Easter and the movable cycle, 2025–2030 (USCCB 2025: Easter April 20, Ash Wednesday March 5, Pentecost June 8)
check('2025-04-20', 'white', 'Easter');
check('2026-04-05', 'white', 'Easter');
check('2027-03-28', 'white', 'Easter');
check('2028-04-16', 'white', 'Easter');
check('2029-04-01', 'white', 'Easter');
check('2030-04-21', 'white', 'Easter');
ok(L.ymd(L.easter(2025)) === '2025-04-20' && L.ymd(L.easter(2027)) === '2027-03-28' && L.ymd(L.easter(2030)) === '2030-04-21', 'computus 2025, 2027, 2030');

check('2025-03-05', 'violet', 'Ash Wednesday');
check('2026-02-18', 'violet', 'Ash Wednesday');
check('2027-02-10', 'violet', 'Ash Wednesday');
check('2025-03-06', 'violet', 'Thursday after Ash Wednesday');
check('2025-04-13', 'red', 'Palm Sunday');
check('2027-03-21', 'red', 'Palm Sunday');
check('2025-04-17', 'white', 'Holy Thursday');
check('2027-03-25', 'white', 'Holy Thursday');
check('2025-04-18', 'red', 'Good Friday');
check('2027-03-26', 'red', 'Good Friday');
check('2025-04-19', 'white', 'Holy Saturday');
check('2027-03-27', 'white', 'Holy Saturday');
check('2025-04-21', 'white', 'within the Octave');
check('2025-06-01', 'white', 'Ascension');
check('2025-05-29', 'white', 'Easter'); // Thursday stays a weekday where the US observes Sunday
ok(!on('2025-05-29').celebration.includes('Ascension'), 'May 29, 2025 is not Ascension in the US Sunday observance');
check('2027-05-09', 'white', 'Ascension');
check('2025-06-08', 'red', 'Pentecost');
check('2027-05-16', 'red', 'Pentecost');
check('2025-06-15', 'white', 'Trinity');
check('2025-06-22', 'white', 'Body and Blood');
check('2025-06-27', 'white', 'Sacred Heart');
check('2025-11-23', 'white', 'King of the Universe');
check('2026-11-22', 'white', 'King of the Universe');
check('2025-11-30', 'violet', 'First Sunday of Advent');
check('2026-11-29', 'violet', 'First Sunday of Advent');
check('2025-12-14', 'rose', 'Third Sunday of Advent');
check('2024-12-15', 'rose', 'Third Sunday of Advent');
check('2025-03-30', 'rose', 'Fourth Sunday of Lent');
check('2026-03-15', 'rose', 'Fourth Sunday of Lent');
check('2027-03-07', 'rose', 'Fourth Sunday of Lent');

// US Epiphany on the Sunday of January 2–8, Baptism the Sunday after January 6, or the Monday when Epiphany is January 7 or 8
check('2025-01-05', 'white', 'Epiphany');
check('2025-01-06', 'white', 'Christmas');
ok(!on('2025-01-06').celebration.includes('Epiphany'), 'January 6, 2025 is not Epiphany');
check('2025-01-12', 'white', 'Baptism');
check('2027-01-03', 'white', 'Epiphany');
check('2029-01-07', 'white', 'Epiphany');
check('2029-01-08', 'white', 'Baptism');
check('2028-01-02', 'white', 'Epiphany');
check('2025-01-01', 'white', 'Holy Mother of God');
check('2025-12-25', 'white', 'Nativity');
check('2025-12-28', 'white', 'Holy Family');
ok(!on('2025-12-28').celebration.includes('Innocents'), 'Holy Family replaces the Holy Innocents when they share a Sunday');
check('2025-02-02', 'white', 'Presentation');
check('2025-06-29', 'red', 'Peter and Paul');

// Transfers
check('2027-04-05', 'white', 'Annunciation');
ok(!on('2027-03-25').celebration.includes('Annunciation'), 'Annunciation leaves Holy Thursday 2027');
check('2029-04-09', 'white', 'Annunciation');
ok(on('2029-03-25').celebration.includes('Palm'), 'Palm Sunday 2029 keeps March 25');
check('2027-03-19', 'white', 'Joseph');
check('2028-03-20', 'white', 'Joseph');
check('2028-03-19', 'violet', 'Sunday of Lent');
check('2008-03-15', 'white', 'Joseph');
ok(!on('2008-03-19').celebration.includes('Joseph'), 'Joseph leaves Holy Week 2008');
check('2030-12-09', 'white', 'Immaculate Conception');
check('2030-12-08', 'violet', 'Sunday of Advent');
check('2025-12-08', 'white', 'Immaculate Conception');
check('2025-12-12', 'white', 'Guadalupe');
check('2027-12-12', 'rose', 'Third Sunday of Advent');
ok(!on('2027-12-12').celebration.includes('Guadalupe'), 'Guadalupe is omitted on Gaudete Sunday 2027');

// All Souls stays on Sunday in the 2025 USCCB calendar. Violet, not black.
check('2025-11-02', 'violet', 'Faithful Departed');
check('2026-11-02', 'violet', 'Faithful Departed');

// Obligatory martyr memorial in Ordinary Time, and a Lenten optional memorial.
check('2025-01-21', 'red', 'Agnes');
check('2026-01-21', 'red', 'Agnes');
check('2026-10-17', 'red', 'Ignatius of Antioch');
check('2026-08-10', 'red', 'Lawrence');
check('2026-11-30', 'red', 'Andrew');
ok(on('2025-08-10').celebration.includes('Sunday'), 'Lawrence yields to a Sunday in Ordinary Time');
ok(on('2025-11-30').celebration.includes('Advent'), 'Andrew yields to the First Sunday of Advent');
check('2026-03-17', 'violet', 'Lent');
ok(saint('2026-03-17').color === 'white' && /Patrick/.test(saint('2026-03-17').celebration), 'Saint’s color names Patrick on a Lenten weekday');
ok(on('2026-03-17').color === 'violet' && !/Patrick/.test(on('2026-03-17').celebration), 'season color hides the optional memorial');
check('2025-12-07', 'violet', 'Advent'); // Sunday outranks Ambrose
check('2026-12-07', 'white', 'Ambrose');
check('2025-12-17', 'violet', 'December 17');
ok(!saint('2025-12-21').celebration.includes('Canisius'), 'December 17–24 does not offer the saint’s color');

// A green weekday and a violet Advent weekday, so the two season defaults are real.
check('2025-01-16', 'green', 'Ordinary Time');
check('2025-12-02', 'violet', 'Advent');
check('2025-12-03', 'white', 'Francis Xavier');
ok(L.COLORS.includes(on('2025-06-08').color) && L.FRAME.red && L.FRAME.white, 'colors and frame map exist');

console.log(fail ? 'FAILED ' + fail + ' / ' + (pass + fail) : 'OK ' + pass);
process.exit(fail ? 1 : 0);
