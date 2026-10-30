// ============================================================================
// 30 CARTAS — condiciones, seleccion y presentacion de la siguiente carta.
// Prioridad: 1) efectos retardados vencidos ("luego"), 2) cartas de calendario
// ("semana"/"sem16"), 3) mazo de campana (si faltan <= 8 semanas para la
// eleccion), 4) mazo normal ponderado.
// ============================================================================
const S = runtimeScene.__reigns;
if (!S.mod_cartas) {
  S.mod_cartas = true;
  const U = S.u, setTxt = U.setTxt, anim = U.anim, rnd = U.rnd;
  const RE_SI = /^\s*(<=|>=|!=|<|>|=)\s*(-?\d+)\s*$/;

  // 'si': {"acad":"<30","fin":">=60","int":"<=20"}  (acad, est, fin, pol, int)
  S.cumpleSi = function (si) {
    return Object.keys(si).every(k => {
      const val = k === "int" ? S.int : S.v[S.STAT_KEY[k]];
      if (val === undefined) return true;
      const m = RE_SI.exec(String(si[k]));
      if (!m) return true;
      const n = +m[2];
      return m[1] === "<" ? val < n : m[1] === "<=" ? val <= n : m[1] === ">" ? val > n : m[1] === ">=" ? val >= n : m[1] === "!=" ? val !== n : val === n;
    });
  };
  // Condiciones comunes a cartas y a finales raros.
  S.cumpleCond = function (c) {
    if ((c.req || []).some(f => !S.flags[f])) return false;
    if ((c.noreq || []).some(f => S.flags[f])) return false;
    if ((c.reqitem || []).some(i => !S.items[i])) return false;
    if (c.si && !S.cumpleSi(c.si)) return false;
    if (c.uansi && !S.cumpleUan(c.uansi)) return false;
    if (c.afmin && Object.keys(c.afmin).some(k => (S.af[k] || 0) < c.afmin[k])) return false;
    if (c.afmax && Object.keys(c.afmax).some(k => (S.af[k] || 0) > c.afmax[k])) return false;
    if (c.semmin !== undefined && S.semana < c.semmin) return false;
    if (c.semmax !== undefined && S.semana > c.semmax) return false;
    if (c.desde || c.hasta) {
      const ym = S.fecha().ym;
      if (c.desde && ym < c.desde) return false;
      if (c.hasta && ym > c.hasta) return false;
    }
    if (c.de && c.de === S.dirId) return false;                 // el director ya no es un personaje
    if (c.rasgo && c.rasgo !== S.rasgo) return false;
    if (c.reelmin !== undefined && S.reel < c.reelmin) return false;
    if (c.reelmax !== undefined && S.reel > c.reelmax) return false;
    if (c.campana && !S.enCampana()) return false;
    return true;
  };
  S.cumple = function (c) {
    if (c.unica !== false && S.usadas[c.id]) return false;
    if (S.ult[c.id] !== undefined && S.semana - S.ult[c.id] < 6 && c.unica === false) return false;   // enfriamiento
    return S.cumpleCond(c);
  };
  S.forzada = function (c) {
    const starts = [];
    if (c.semana !== undefined) [].concat(c.semana).forEach(s => starts.push(s));
    if (c.sem16 !== undefined) starts.push(S.semana - (S.semana % 16) + c.sem16);
    return starts.some(s => S.semana >= s && S.semana - s <= 1 && (S.ult[c.id] === undefined || S.ult[c.id] < s));
  };
  S.arribaDisp = function () { return !!(S.c && S.c.arriba && S.items[S.c.arriba.usa]); };
  const fija = c => c.semana !== undefined || c.sem16 !== undefined;
  const elige = function (pool) {
    // Peso: base; x3 cartas de la epoca actual y cartas de afinidad; x0.3 mismo personaje que la anterior.
    const w = c => {
      let p = c.peso === undefined ? 1 : c.peso;
      if (c.desde) p *= 3;
      if (c.afmin || c.afmax) p *= 3;
      if (c.pj === S.pjUlt) p *= 0.3;
      return Math.max(0.01, p);
    };
    let total = pool.reduce((a, c) => a + w(c), 0), r = Math.random() * total;
    return pool.find(c => (r -= w(c)) <= 0) || pool[0];
  };
  S.siguiente = function () {
    S.setEstado("carta");
    const todas = S.data.cartas;
    let c = null;
    // 1) consecuencias retardadas
    S.futuro = S.futuro.filter(f => S.porId[f.id]);        // descarta ids inexistentes
    const k = S.futuro.findIndex(f => f.sem <= S.semana);
    if (k >= 0) { c = S.porId[S.futuro[k].id]; S.futuro.splice(k, 1); }
    // 2) calendario
    if (!c) { const forz = todas.filter(x => fija(x) && S.cumple(x) && S.forzada(x)); if (forz.length) c = forz[0]; }
    // 3) campana
    if (!c && S.enCampana()) {
      if (S.campIni !== S.eleccionEn) { S.campIni = S.eleccionEn; todas.forEach(x => { if (x.campana) delete S.usadas[x.id]; }); }
      const camp = todas.filter(x => x.campana && !x.solo_luego && !fija(x) && S.cumple(x));
      if (camp.length && Math.random() < 0.7) c = elige(camp);
    }
    // 4) mazo normal
    if (!c) {
      const libre = x => !fija(x) && !x.solo_luego && !x.campana;
      let pool = todas.filter(x => libre(x) && S.cumple(x));
      // Las cartas de cadena (con req) tienen prioridad para que la historia avance.
      const cadena = pool.filter(x => (x.req && x.req.length) || (x.reqitem && x.reqitem.length));
      if (cadena.length && Math.random() < 0.6) pool = cadena;
      // Personajes en afinidad extrema (|af| >= 4) traen sus cartas especiales de aliado/enemigo.
      const esp = pool.filter(x => (x.afmin || x.afmax) && Object.keys(Object.assign({}, x.afmin, x.afmax)).some(p => Math.abs(S.af[p] || 0) >= 4));
      if (esp.length && Math.random() < 0.25) pool = esp;
      if (!pool.length) {
        // Se agoto el mazo: solo se reciclan las cartas NO marcadas unica:true.
        Object.keys(S.usadas).forEach(id => { const x = S.porId[id]; if (!x || x.unica !== true) delete S.usadas[id]; });
        pool = todas.filter(x => libre(x) && S.cumple(x));
      }
      if (!pool.length) pool = todas.filter(x => libre(x) && S.cumpleCond(x));
      if (!pool.length) pool = todas.filter(x => libre(x));
      if (!pool.length) pool = todas;
      c = elige(pool);
    }
    S.c = c;
    S.usadas[c.id] = true; S.ult[c.id] = S.semana;
    S.mostrarCarta();
    S.senal.carta++;
    S.guardar();
  };
  S.mostrarCarta = function () {
    const c = S.c;
    S.pjUlt = c.pj;
    setTxt(S.o.texto, S.fmt(c.texto));
    setTxt(S.o.pj, S.fmt(S.data.personajes[c.pj] || c.pj));
    anim(S.o.retrato, c.pj); anim(S.o.carta, c.pj);
  };
}
