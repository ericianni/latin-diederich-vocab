/* US Roman (Ordinary Form) liturgical colors. Offline. No network.
   Most US provinces: Ascension and Corpus Christi on Sunday.
   colorFor(date, opts) -> { color, celebration, season }
   opts.memorial: 'season' (default) or 'saint'. Optional memorials keep the season
   color unless 'saint'. Progress and vocabulary are not touched here. */
(function (root) {
  'use strict';
  const COLORS = ['green', 'violet', 'rose', 'white', 'red'];
  // Gold stands in for white vestments so a frame still shows on parchment.
  const FRAME = { green: '#1e6b3a', violet: '#5c3d86', rose: '#b85c74', red: '#8e2f2f', white: '#a68534' };

  function date(y, m, d) { return new Date(y, m - 1, d, 12, 0, 0, 0); }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(d, n) { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function dow(d) { return d.getDay(); }
  function ord(n) {
    const j = n % 10, k = n % 100;
    if (j === 1 && k !== 11) return n + 'st';
    if (j === 2 && k !== 12) return n + 'nd';
    if (j === 3 && k !== 13) return n + 'rd';
    return n + 'th';
  }
  const WORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
  const wnum = n => WORD[n] || ord(n);
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Gregorian computus. Month is 1–12.
  function easter(year) {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return date(year, month, day);
  }

  function advent1(year) {
    const nov27 = date(year, 11, 27);
    return addDays(nov27, (7 - dow(nov27)) % 7); // Sunday on Nov 27–Dec 3
  }
  function epiphanySunday(year) {
    const jan2 = date(year, 1, 2);
    return addDays(jan2, (7 - dow(jan2)) % 7); // Sunday on Jan 2–8
  }
  function baptism(year) {
    const ep = epiphanySunday(year);
    const md = (ep.getMonth() + 1) * 100 + ep.getDate();
    if (md >= 107) return addDays(ep, 1); // Epiphany on Jan 7 or 8: Baptism the next Monday
    const jan6 = date(year, 1, 6);
    return addDays(jan6, (7 - dow(jan6)) % 7); // otherwise the Sunday after Jan 6
  }
  function holyFamily(year) {
    for (let d = 26; d <= 31; d++) { const x = date(year, 12, d); if (dow(x) === 0) return x; }
    return date(year, 12, 30);
  }

  // kind: sol 3, lord 5, feast 7, mem 12, opt 14. color is the saint's/feast color.
  // US rows are proper to the dioceses of the United States.
  const FIXED = [
    [1, 2, 'mem', 'white', 'Saints Basil the Great and Gregory Nazianzen'],
    [1, 4, 'mem', 'white', 'Saint Elizabeth Ann Seton'],
    [1, 5, 'mem', 'white', 'Saint John Neumann'],
    [1, 17, 'mem', 'white', 'Saint Anthony, Abbot'],
    [1, 21, 'mem', 'red', 'Saint Agnes, Virgin and Martyr'],
    [1, 24, 'mem', 'white', 'Saint Francis de Sales'],
    [1, 25, 'feast', 'white', 'The Conversion of Saint Paul'],
    [1, 26, 'mem', 'white', 'Saints Timothy and Titus'],
    [1, 28, 'mem', 'white', 'Saint Thomas Aquinas'],
    [1, 31, 'mem', 'white', 'Saint John Bosco'],
    [2, 2, 'lord', 'white', 'The Presentation of the Lord'],
    [2, 5, 'mem', 'red', 'Saint Agatha, Virgin and Martyr'],
    [2, 6, 'mem', 'red', 'Saints Paul Miki and Companions, Martyrs'],
    [2, 10, 'mem', 'white', 'Saint Scholastica'],
    [2, 11, 'opt', 'white', 'Our Lady of Lourdes'],
    [2, 14, 'mem', 'white', 'Saints Cyril and Methodius'],
    [2, 22, 'feast', 'white', 'The Chair of Saint Peter'],
    [2, 23, 'mem', 'red', 'Saint Polycarp, Bishop and Martyr'],
    [3, 3, 'opt', 'white', 'Saint Katharine Drexel'],
    [3, 4, 'opt', 'white', 'Saint Casimir'],
    [3, 7, 'mem', 'red', 'Saints Perpetua and Felicity, Martyrs'],
    [3, 17, 'opt', 'white', 'Saint Patrick, Bishop'],
    [4, 7, 'mem', 'white', 'Saint John Baptist de la Salle'],
    [4, 11, 'mem', 'red', 'Saint Stanislaus, Bishop and Martyr'],
    [4, 25, 'feast', 'red', 'Saint Mark, Evangelist'],
    [4, 29, 'mem', 'white', 'Saint Catherine of Siena'],
    [5, 1, 'opt', 'white', 'Saint Joseph the Worker'],
    [5, 2, 'mem', 'white', 'Saint Athanasius'],
    [5, 3, 'feast', 'red', 'Saints Philip and James, Apostles'],
    [5, 14, 'feast', 'red', 'Saint Matthias, Apostle'],
    [5, 26, 'mem', 'white', 'Saint Philip Neri'],
    [5, 31, 'feast', 'white', 'The Visitation of the Blessed Virgin Mary'],
    [6, 1, 'mem', 'red', 'Saint Justin, Martyr'],
    [6, 3, 'mem', 'red', 'Saints Charles Lwanga and Companions, Martyrs'],
    [6, 5, 'mem', 'red', 'Saint Boniface, Bishop and Martyr'],
    [6, 11, 'mem', 'red', 'Saint Barnabas, Apostle'],
    [6, 13, 'mem', 'white', 'Saint Anthony of Padua'],
    [6, 21, 'mem', 'white', 'Saint Aloysius Gonzaga'],
    [6, 22, 'opt', 'red', 'Saints John Fisher and Thomas More, Martyrs'],
    [6, 24, 'sol', 'white', 'The Nativity of Saint John the Baptist'],
    [6, 28, 'mem', 'white', 'Saint Irenaeus, Bishop and Martyr'],
    [6, 29, 'sol', 'red', 'Saints Peter and Paul, Apostles'],
    [7, 3, 'feast', 'red', 'Saint Thomas, Apostle'],
    [7, 6, 'opt', 'red', 'Saint Maria Goretti, Virgin and Martyr'],
    [7, 11, 'mem', 'white', 'Saint Benedict, Abbot'],
    [7, 14, 'mem', 'white', 'Saint Kateri Tekakwitha'],
    [7, 15, 'mem', 'white', 'Saint Bonaventure'],
    [7, 22, 'feast', 'white', 'Saint Mary Magdalene'],
    [7, 25, 'feast', 'red', 'Saint James, Apostle'],
    [7, 26, 'mem', 'white', 'Saints Joachim and Anne'],
    [7, 29, 'mem', 'white', 'Saints Martha, Mary, and Lazarus'],
    [8, 1, 'mem', 'white', 'Saint Alphonsus Liguori'],
    [8, 4, 'mem', 'white', 'Saint John Vianney'],
    [8, 6, 'lord', 'white', 'The Transfiguration of the Lord'],
    [8, 8, 'mem', 'white', 'Saint Dominic'],
    [8, 10, 'feast', 'red', 'Saint Lawrence, Deacon and Martyr'],
    [8, 11, 'mem', 'white', 'Saint Clare'],
    [8, 14, 'mem', 'red', 'Saint Maximilian Kolbe, Priest and Martyr'],
    [8, 15, 'sol', 'white', 'The Assumption of the Blessed Virgin Mary'],
    [8, 20, 'mem', 'white', 'Saint Bernard'],
    [8, 21, 'mem', 'white', 'Saint Pius X'],
    [8, 22, 'mem', 'white', 'The Queenship of the Blessed Virgin Mary'],
    [8, 24, 'feast', 'red', 'Saint Bartholomew, Apostle'],
    [8, 27, 'mem', 'white', 'Saint Monica'],
    [8, 28, 'mem', 'white', 'Saint Augustine'],
    [8, 29, 'mem', 'red', 'The Passion of Saint John the Baptist'],
    [9, 3, 'mem', 'white', 'Saint Gregory the Great'],
    [9, 8, 'feast', 'white', 'The Nativity of the Blessed Virgin Mary'],
    [9, 9, 'mem', 'white', 'Saint Peter Claver'],
    [9, 13, 'mem', 'white', 'Saint John Chrysostom'],
    [9, 14, 'lord', 'red', 'The Exaltation of the Holy Cross'],
    [9, 15, 'mem', 'white', 'Our Lady of Sorrows'],
    [9, 16, 'mem', 'red', 'Saints Cornelius and Cyprian, Martyrs'],
    [9, 20, 'mem', 'red', 'Saints Andrew Kim Tae-gŏn and Companions, Martyrs'],
    [9, 21, 'feast', 'red', 'Saint Matthew, Apostle and Evangelist'],
    [9, 23, 'opt', 'white', 'Saint Pius of Pietrelcina'],
    [9, 27, 'mem', 'white', 'Saint Vincent de Paul'],
    [9, 29, 'feast', 'white', 'Saints Michael, Gabriel, and Raphael'],
    [9, 30, 'mem', 'white', 'Saint Jerome'],
    [10, 1, 'mem', 'white', 'Saint Thérèse of the Child Jesus'],
    [10, 2, 'mem', 'white', 'The Holy Guardian Angels'],
    [10, 4, 'mem', 'white', 'Saint Francis of Assisi'],
    [10, 7, 'mem', 'white', 'Our Lady of the Rosary'],
    [10, 15, 'mem', 'white', 'Saint Teresa of Jesus'],
    [10, 17, 'mem', 'red', 'Saint Ignatius of Antioch, Bishop and Martyr'],
    [10, 18, 'feast', 'red', 'Saint Luke, Evangelist'],
    [10, 19, 'mem', 'red', 'Saints John de Brébeuf, Isaac Jogues, and Companions, Martyrs'],
    [10, 22, 'opt', 'white', 'Saint John Paul II'],
    [10, 28, 'feast', 'red', 'Saints Simon and Jude, Apostles'],
    [11, 1, 'sol', 'white', 'All Saints'],
    [11, 4, 'mem', 'white', 'Saint Charles Borromeo'],
    [11, 9, 'feast', 'white', 'The Dedication of the Lateran Basilica'],
    [11, 10, 'mem', 'white', 'Saint Leo the Great'],
    [11, 11, 'mem', 'white', 'Saint Martin of Tours'],
    [11, 12, 'mem', 'red', 'Saint Josaphat, Bishop and Martyr'],
    [11, 13, 'mem', 'white', 'Saint Frances Xavier Cabrini'],
    [11, 17, 'mem', 'white', 'Saint Elizabeth of Hungary'],
    [11, 18, 'opt', 'white', 'Dedication of the Basilicas of Saints Peter and Paul'],
    [11, 21, 'mem', 'white', 'The Presentation of the Blessed Virgin Mary'],
    [11, 22, 'mem', 'red', 'Saint Cecilia, Virgin and Martyr'],
    [11, 23, 'opt', 'red', 'Blessed Miguel Agustín Pro, Priest and Martyr'],
    [11, 24, 'mem', 'red', 'Saint Andrew Dũng-Lạc and Companions, Martyrs'],
    [11, 30, 'feast', 'red', 'Saint Andrew, Apostle'],
    [12, 3, 'mem', 'white', 'Saint Francis Xavier'],
    [12, 4, 'opt', 'white', 'Saint John Damascene'],
    [12, 6, 'opt', 'white', 'Saint Nicholas'],
    [12, 7, 'mem', 'white', 'Saint Ambrose'],
    [12, 9, 'opt', 'white', 'Saint Juan Diego'],
    [12, 12, 'feast', 'white', 'Our Lady of Guadalupe'],
    [12, 13, 'mem', 'red', 'Saint Lucy, Virgin and Martyr'],
    [12, 14, 'mem', 'white', 'Saint John of the Cross'],
    [12, 21, 'opt', 'white', 'Saint Peter Canisius'],
    [12, 26, 'feast', 'red', 'Saint Stephen, the First Martyr'],
    [12, 27, 'feast', 'white', 'Saint John, Apostle and Evangelist'],
    [12, 28, 'feast', 'red', 'The Holy Innocents, Martyrs'],
    [12, 29, 'opt', 'red', 'Saint Thomas Becket, Bishop and Martyr'],
    [12, 31, 'opt', 'white', 'Saint Sylvester I']
  ];
  const RANK = { sol: 3, lord: 5, feast: 7, mem: 12, opt: 14 };

  const cache = new Map();
  function yearMap(year) {
    if (cache.has(year)) return cache.get(year);
    const E = easter(year);
    const ash = addDays(E, -46);
    const palm = addDays(E, -7);
    const pentecost = addDays(E, 49);
    const adv = advent1(year);
    const ctk = addDays(adv, -7);
    const ep = epiphanySunday(year);
    const bap = baptism(year);
    const map = new Map();

    function base(d, color, name, rank, season, privileged) {
      map.set(ymd(d), { color, name, rank, season, privileged: !!privileged, optional: null });
    }
    function raise(d, color, name, rank, privileged) {
      const cur = map.get(ymd(d));
      if (!cur || rank > cur.rank) return; // equal rank replaces a generic title (Ascension on the 7th Sunday of Easter)
      map.set(ymd(d), { color, name, rank, season: cur.season, privileged: privileged !== false, optional: null });
    }
    function offer(d, color, name) {
      const cur = map.get(ymd(d));
      if (!cur || cur.privileged) return;
      // Lent weekdays (11) reduce an obligatory memorial to optional. Freer weekdays keep one too.
      if (cur.rank === 11 || cur.rank >= 14) cur.optional = { color, name };
    }

    const dim = m => new Date(year, m, 0).getDate();
    for (let m = 1; m <= 12; m++) for (let day = 1; day <= dim(m); day++) {
      const d = date(year, m, day);
      const k = m * 100 + day;
      let color = 'green', name = WD[dow(d)], rank = 18, season = 'ordinary', priv = false;
      if (d >= adv && k < 1225) {
        season = 'advent'; color = 'violet'; rank = dow(d) === 0 ? 2 : (k >= 1217 ? 9 : 15); priv = rank <= 9;
        if (dow(d) === 0) {
          const n = Math.round((d - adv) / 86400000 / 7) + 1;
          name = wnum(n) + ' Sunday of Advent';
          if (n === 3) color = 'rose';
        } else if (k >= 1217) name = 'December ' + day;
        else {
          const sun = addDays(d, -dow(d)), n = Math.round((sun - adv) / 86400000 / 7) + 1;
          name = WD[dow(d)] + ' of the ' + wnum(n) + ' Week of Advent';
        }
      } else if (k >= 1225 || d < bap || ymd(d) === ymd(bap)) {
        season = 'christmas'; color = 'white'; rank = dow(d) === 0 ? 6 : 16; priv = false;
        name = 'Weekday of Christmas Time';
        if (k === 1225) { name = 'The Nativity of the Lord'; rank = 2; priv = true; }
      } else if (d >= ash && d < E) {
        season = 'lent'; color = 'violet'; rank = 11; priv = false;
        const daysAfter = Math.round((d - ash) / 86400000);
        if (ymd(d) === ymd(ash)) { name = 'Ash Wednesday'; rank = 2; priv = true; }
        else if (d < addDays(ash, 4)) { name = WD[dow(d)] + ' after Ash Wednesday'; }
        else if (d >= palm) {
          rank = 2; priv = true;
          name = dow(d) === 0 ? 'Palm Sunday of the Passion of the Lord' : WD[dow(d)] + ' of Holy Week';
          if (dow(d) === 0 || dow(d) === 5) color = 'red';
          if (dow(d) === 4) { color = 'white'; name = 'Holy Thursday'; }
          if (dow(d) === 6) { color = 'white'; name = 'Holy Saturday'; }
          if (dow(d) === 5) name = 'Good Friday';
        } else if (dow(d) === 0) {
          const n = Math.round((d - addDays(ash, 4)) / 86400000 / 7) + 1;
          name = wnum(n) + ' Sunday of Lent'; rank = 2; priv = true;
          if (n === 4) color = 'rose';
        } else {
          const sun = addDays(d, -dow(d));
          const n = Math.round((sun - addDays(ash, 4)) / 86400000 / 7) + 1;
          name = WD[dow(d)] + ' of the ' + wnum(n) + ' Week of Lent';
        }
      } else if (d >= E && d <= pentecost) {
        season = 'easter'; color = 'white'; rank = 2; priv = true;
        const n = Math.round((d - E) / 86400000);
        if (n === 0) name = 'Easter Sunday';
        else if (n < 7) name = WD[dow(d)] + ' within the Octave of Easter';
        else if (n === 7) name = 'Second Sunday of Easter';
        else if (ymd(d) === ymd(pentecost)) { name = 'Pentecost Sunday'; color = 'red'; }
        else if (dow(d) === 0) name = wnum(n / 7 + 1) + ' Sunday of Easter';
        else {
          rank = 17; priv = false; // weekdays after the octave give way to memorials
          const sun = addDays(d, -dow(d));
          const wk = Math.round((sun - E) / 86400000 / 7) + 1;
          name = WD[dow(d)] + ' of the ' + wnum(wk) + ' Week of Easter';
        }
      } else {
        season = 'ordinary';
        const sun = addDays(d, -dow(d));
        let week;
        if (d < ash) {
          const firstSun = addDays(bap, (7 - dow(bap)) % 7 || 7); // the Sunday after Baptism, which is OT week 2
          week = sun < firstSun ? 1 : 2 + Math.round((sun - firstSun) / 86400000 / 7);
        } else {
          week = 34 - Math.round((ctk - sun) / 86400000 / 7);
        }
        if (dow(d) === 0) { name = ord(week) + ' Sunday in Ordinary Time'; rank = 6; priv = false; }
        else name = WD[dow(d)] + ' of the ' + ord(week) + ' Week in Ordinary Time';
      }
      base(d, color, name, rank, season, priv);
    }

    raise(ep, 'white', 'The Epiphany of the Lord', 2, true);
    raise(bap, 'white', 'The Baptism of the Lord', 5, true);
    raise(holyFamily(year), 'white', 'The Holy Family of Jesus, Mary, and Joseph', 5, true);
    raise(date(year, 1, 1), 'white', 'Mary, the Holy Mother of God', 3, true);
    raise(addDays(E, 42), 'white', 'The Ascension of the Lord', 2, true);
    raise(addDays(E, 56), 'white', 'The Most Holy Trinity', 3, true);
    raise(addDays(E, 63), 'white', 'The Most Holy Body and Blood of Christ', 3, true);
    raise(addDays(E, 68), 'white', 'The Most Sacred Heart of Jesus', 3, true);
    raise(ctk, 'white', 'Our Lord Jesus Christ, King of the Universe', 3, true);

    // Joseph: Sunday of Lent → Monday, except Palm Sunday and Holy Week, which move to the Saturday before Palm Sunday (UNLY; 2008 → March 15).
    (function () {
      let d = date(year, 3, 19);
      if (d >= palm && d < E) d = addDays(palm, -1);
      else if (dow(d) === 0) d = addDays(d, 1);
      raise(d, 'white', 'Saint Joseph, Spouse of the Blessed Virgin Mary', 3, true);
    })();
    // Annunciation: Sunday of Lent → Monday. Palm Sunday through the Easter octave → Monday after the Second Sunday of Easter (USCCB 2027 → April 5).
    (function () {
      let d = date(year, 3, 25);
      const octaveEnd = addDays(E, 7);
      if (d >= palm && d <= octaveEnd) d = addDays(octaveEnd, 1);
      else if (dow(d) === 0) d = addDays(d, 1);
      raise(d, 'white', 'The Annunciation of the Lord', 3, true);
    })();
    // Immaculate Conception, patronal solemnity of the United States. A Sunday of Advent keeps the Sunday; the solemnity moves to December 9.
    (function () {
      let d = date(year, 12, 8);
      if (dow(d) === 0) d = date(year, 12, 9);
      raise(d, 'white', 'The Immaculate Conception of the Blessed Virgin Mary', 3, true);
    })();
    // All Souls outranks a Sunday in Ordinary Time (USCCB 2025 keeps it on Sunday). Violet; black is optional.
    raise(date(year, 11, 2), 'violet', 'The Commemoration of All the Faithful Departed', 3, true);

    for (const row of FIXED) {
      const d = date(year, row[0], row[1]);
      const rank = RANK[row[2]], color = row[3], name = row[4];
      if (row[2] === 'opt') offer(d, color, name);
      else if (row[2] === 'mem') {
        const cur = map.get(ymd(d));
        if (cur && cur.rank === 11) offer(d, color, name);
        else if (!cur || rank < cur.rank) raise(d, color, name, rank, false);
      } else raise(d, color, name, rank, true);
    }
    cache.set(year, map);
    return map;
  }

  function colorFor(when, opts) {
    const d = when instanceof Date ? when : new Date(when);
    const day = yearMap(d.getFullYear()).get(ymd(d));
    const saint = opts && opts.memorial === 'saint';
    if (saint && day && day.optional) return { color: day.optional.color, celebration: day.optional.name, season: day.season };
    return { color: day.color, celebration: day.name, season: day.season };
  }

  const api = { colorFor, easter, advent1, epiphanySunday, baptism, COLORS, FRAME, addDays, ymd };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Liturgical = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
