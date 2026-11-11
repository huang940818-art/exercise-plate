/* 運動餐盤 畫面核心：儲存、路由、共用元件。
 * 規則與計算一律呼叫 window.PlateRules，這裡只負責資料存取與畫面。
 */
(function () {
  'use strict';
  var R = window.PlateRules;
  var PREFIX = 'plate.';

  // ---------- 儲存 ----------
  var Store = {
    get: function (k, d) {
      try { var v = localStorage.getItem(PREFIX + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) { App.toast('儲存失敗，瀏覽器空間可能不夠'); } },
    remove: function (k) { localStorage.removeItem(PREFIX + k); },
    clearAll: function () {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) keys.push(k); }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    },
    dump: function () {
      var o = {};
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) { try { o[k] = JSON.parse(localStorage.getItem(k)); } catch (e) { o[k] = localStorage.getItem(k); } }
      }
      return o;
    }
  };

  var DEFAULT_SETTINGS = { equipment: ['none'], voice: false, planMode: 'suggest', chosenTotal: null, chosenIntensity: null, customSplit: null };
  var DEFAULT_STAMPS = { rests: [], redeemed: [], seen: [], seenCards: [] };

  // ---------- DOM 小工具 ----------
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // 只給內建 SVG 用
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { el.style.setProperty(s, v[s]); });
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    append(el, children);
    return el;
  }
  function append(el, children) {
    if (children === null || children === undefined || children === false) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) append(el, c);
      else if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
      else el.appendChild(c);
    });
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, children) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]); });
    if (children) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (!c) return;
      if (typeof c === 'string') el.appendChild(document.createTextNode(c)); else el.appendChild(c);
    });
    return el;
  }

  // ---------- 圖示（inline SVG）----------
  var ICONS = {
    plate: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9l7.8 4.5M12 12l-7.8 4.5"/>',
    stamp: '<circle cx="12" cy="10" r="6"/><path d="M8 18h8M6 21h12"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M7 15l4-4 3 3 5-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    run: '<circle cx="14" cy="4.5" r="2"/><path d="M6 20l4-5 3 2 1-5 4 3M9 9l4-2 3 2"/>',
    dumbbell: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    skip: '<path d="M6 5l9 7-9 7zM18 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    ticket: '<path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
    gift: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1zm0 0c2-4 6-4 6-1s-6 1-6 1z"/>'
  };
  function icon(name, cls) {
    var span = document.createElement('span');
    span.className = 'icon ' + (cls || '');
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
    return span;
  }

  // ---------- App ----------
  var App = window.App = {
    R: R, Store: Store, h: h, s: s, icon: icon,
    screens: {},
    current: null,
    params: {},
    reducedMotion: window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,

    // 資料
    profile: function () { return Store.get('profile', null); },
    settings: function () { var st = Store.get('settings', {}); var o = {}; Object.keys(DEFAULT_SETTINGS).forEach(function (k) { o[k] = st[k] === undefined ? DEFAULT_SETTINGS[k] : st[k]; }); return o; },
    saveSettings: function (patch) { var st = App.settings(); Object.keys(patch).forEach(function (k) { st[k] = patch[k]; }); Store.set('settings', st); },
    logs: function () { return Store.get('logs', []); },
    addLog: function (log) {
      var logs = App.logs();
      log.id = log.id || ('l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
      log.createdAt = log.createdAt || new Date().toISOString();
      logs.push(log);
      Store.set('logs', logs);
      return log;
    },
    removeLog: function (id) { Store.set('logs', App.logs().filter(function (l) { return l.id !== id; })); },
    inbody: function () {
      return Store.get('inbody', []).slice().sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
    },
    latestInbody: function () { var a = App.inbody(); return a.length ? a[a.length - 1] : null; },
    stamps: function () { var st = Store.get('stamps', {}); var o = {}; Object.keys(DEFAULT_STAMPS).forEach(function (k) { o[k] = st[k] || DEFAULT_STAMPS[k].slice(); }); o.restNotes = st.restNotes || {}; return o; },
    saveStamps: function (st) { Store.set('stamps', st); },

    /** 目前的餐盤（profile + 設定 + 最新 InBody 丟給 rules） */
    /** 跳過問卷：先建一份「還沒填」的檔，餐盤用最保守的起步盤 */
    skipOnboarding: function (wantTotal) {
      Store.set('profile', {
        skipped: true, wantTotal: wantTotal || 150, age: '', sex: '', height: '', weight: '',
        parq: [null, null, null, null, null, null, null],
        acsm: { regular: null, disease: null, symptoms: [], clearance: false },
        godin: { strenuous: 0, moderate: 0, light: 0 }, strengthExp: null,
        msk: { areas: [], pain: 0, redFlags: [] }, none: {},
        createdAt: R.today(), updatedAt: new Date().toISOString()
      });
      App.saveSettings({ chosenTotal: null, customSplit: null });
    },

    plan: function () {
      var p = App.profile();
      if (!p) return null;
      var st = App.settings();
      var input = {};
      Object.keys(p).forEach(function (k) { input[k] = p[k]; });
      var custom = st.planMode === 'custom';
      input.chosenTotal = custom ? (st.chosenTotal || null) : (p.wantTotal || null);
      input.chosenIntensity = custom ? (st.chosenIntensity || null) : null;
      var ib = App.latestInbody();
      var base = R.planPlate(input, ib);
      base.mode = custom ? 'custom' : 'suggest';
      // 自己配置：分配只在總量相同時套用（總量變了就回到規則算的分配）
      if (custom && st.customSplit && st.customSplit.total === base.total) {
        input.customSplit = st.customSplit;
        var out = R.planPlate(input, ib);
        out.mode = 'custom';
        return out;
      }
      return base;
    },
    progress: function (plan, ws) { return R.weekProgress(App.logs(), plan || App.plan(), ws || R.weekStart()); },

    /** 集章冊：從第一筆紀錄（或建檔日）到本週 */
    book: function (plan) {
      plan = plan || App.plan();
      var p = App.profile();
      var logs = App.logs();
      var first = (p && p.createdAt) || R.today();
      logs.forEach(function (l) { if (l.date < first) first = l.date; });
      var weeks = R.weekResults(logs, plan, first, R.today());
      var st = App.stamps();
      return R.stampBook(weeks, st.rests, R.weekStart(), st.redeemed);
    },

    // ---------- 路由 ----------
    go: function (name, params) {
      if (App.current && App.screens[App.current] && App.screens[App.current].leave) App.screens[App.current].leave();
      if (!App.profile() && name !== 'onboarding') name = 'onboarding';
      App.current = name;
      App.params = params || {};
      App.render();
    },
    render: function () {
      var scr = App.screens[App.current];
      var main = document.getElementById('app');
      main.innerHTML = '';
      if (!scr) return;
      var title = typeof scr.title === 'function' ? scr.title(App.params) : scr.title;
      document.getElementById('title').textContent = title || '運動餐盤';
      var back = document.getElementById('backBtn');
      var backTo = typeof scr.back === 'function' ? scr.back(App.params) : scr.back;
      back.hidden = !backTo;
      back.onclick = backTo ? function () { if (scr.onBack && scr.onBack() === false) return; App.go(backTo); } : null;
      var tabs = document.getElementById('tabs');
      tabs.hidden = !scr.tab;
      App.renderTabs(scr.tab);
      document.body.classList.toggle('no-tabs', !scr.tab);
      main.appendChild(scr.render(App.params));
      window.scrollTo(0, 0);
    },
    renderTabs: function (active) {
      var tabs = document.getElementById('tabs');
      tabs.innerHTML = '';
      [['home', '餐盤', 'plate'], ['stamps', '集章冊', 'stamp'], ['inbody', 'InBody', 'chart'], ['settings', '設定', 'gear']].forEach(function (t) {
        tabs.appendChild(h('button', { type: 'button', class: 'tab' + (active === t[0] ? ' active' : ''), 'aria-current': active === t[0] ? 'page' : null, onclick: function () { App.go(t[0]); } }, [icon(t[2]), h('span', { text: t[1] })]));
      });
    },

    // ---------- 回饋 ----------
    toast: function (msg) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(App._toastT);
      App._toastT = setTimeout(function () { t.classList.remove('show'); }, 2400);
    },
    overlay: function (content, opts) {
      opts = opts || {};
      var ov = document.getElementById('overlay');
      ov.innerHTML = '';
      var box = h('div', { class: 'overlay-box', role: 'dialog', 'aria-modal': 'true' }, content);
      ov.appendChild(box);
      ov.hidden = false;
      ov.onclick = function (e) { if (e.target === ov && opts.dismissable !== false) App.closeOverlay(); };
      return box;
    },
    closeOverlay: function () { var ov = document.getElementById('overlay'); ov.hidden = true; ov.innerHTML = ''; },
    confirm: function (msg, okText, onOk) {
      App.overlay([
        h('p', { class: 'overlay-msg', text: msg }),
        h('div', { class: 'btn-row' }, [
          h('button', { type: 'button', class: 'btn ghost', onclick: App.closeOverlay, text: '取消' }),
          h('button', { type: 'button', class: 'btn danger', onclick: function () { App.closeOverlay(); onOk(); }, text: okText || '確定' })
        ])
      ]);
    },
    speak: function (text) {
      if (!App.settings().voice || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-TW'; u.rate = 1;
        window.speechSynthesis.speak(u);
      } catch (e) { /* 不支援就算了 */ }
    },
    animate: function (el, frames, opts) {
      if (App.reducedMotion || !el.animate) return { finished: Promise.resolve() };
      var a = el.animate(frames, opts);
      return { finished: a.finished || new Promise(function (r) { a.onfinish = r; }) };
    },

    // ---------- 共用元件 ----------
    card: function (cls, children) { return h('section', { class: 'card ' + (cls || '') }, children); },
    sourceTag: function (r) {
      var type = r.類型;
      return h('span', { class: 'tag ' + (type === '文獻' ? 'tag-lit' : (type === '設計值' ? 'tag-design' : 'tag-todo')), text: type });
    },
    minutesInput: function (value, onChange, opts) {
      opts = opts || {};
      var input = h('input', { type: 'number', inputmode: 'numeric', min: 0, max: 600, value: value, class: 'num-input', 'aria-label': opts.label || '分鐘' });
      input.addEventListener('input', function () { onChange(Number(input.value) || 0); });
      function bump(d) { var v = Math.max(0, (Number(input.value) || 0) + d); input.value = v; onChange(v); }
      var step = opts.step || 5;
      return h('div', { class: 'stepper' }, [
        h('button', { type: 'button', class: 'step-btn', 'aria-label': '減 ' + step + ' 分鐘', onclick: function () { bump(-step); } }, icon('minus')),
        input,
        h('span', { class: 'unit', text: opts.unit || '分鐘' }),
        h('button', { type: 'button', class: 'step-btn', 'aria-label': '加 ' + step + ' 分鐘', onclick: function () { bump(step); } }, icon('plus'))
      ]);
    },
    /** opts.none：複選題加一個「以上皆無」，跟其他選項互斥。onChange(選的, 是否選了無) */
    chips: function (options, selected, multi, onChange, opts) {
      opts = opts || {};
      var wrap = h('div', { class: 'chips' + (opts.list ? ' list' : ''), role: multi ? 'group' : 'radiogroup' });
      var sel = multi ? (selected || []).slice() : selected;
      var noneOn = !!opts.noneOn && multi && !sel.length;
      function chip(on, label, sub, disabled, extra, click) {
        return h('button', {
          type: 'button', class: 'chip' + (on ? ' on' : '') + (disabled ? ' disabled' : '') + (extra || ''),
          role: multi ? 'checkbox' : 'radio', 'aria-checked': on ? 'true' : 'false', disabled: disabled || null,
          onclick: click
        }, [on ? icon('check', 'sm') : null, h('span', { text: label }), sub ? h('small', { text: sub }) : null]);
      }
      function draw() {
        wrap.innerHTML = '';
        options.forEach(function (o) {
          var on = multi ? sel.indexOf(o.value) >= 0 : sel === o.value;
          wrap.appendChild(chip(on, o.label, o.sub, o.disabled, '', function () {
            if (multi) { var i = sel.indexOf(o.value); if (i >= 0) sel.splice(i, 1); else sel.push(o.value); noneOn = false; }
            else sel = o.value;
            draw(); onChange(multi ? sel.slice() : sel, noneOn);
          }));
        });
        if (multi && opts.none) {
          wrap.appendChild(chip(noneOn, opts.none, null, false, ' none', function () {
            noneOn = !noneOn; if (noneOn) sel = [];
            draw(); onChange(sel.slice(), noneOn);
          }));
        }
      }
      draw();
      return wrap;
    },
    field: function (label, control, hint) {
      return h('label', { class: 'field' }, [h('span', { class: 'field-label', text: label }), control, hint ? h('span', { class: 'hint', text: hint }) : null]);
    },

    // ---------- 示範資料 ----------
    loadDemo: function () {
      var t = R.today();
      var ws = R.weekStart(t);
      var profile = App.profile();
      if (!profile) {
        profile = {
          age: 45, sex: 'female', height: 160, weight: 62,
          parq: [false, false, false, false, false, false, false],
          acsm: { regular: false, disease: false, symptoms: [], clearance: false },
          godin: { strenuous: 0, moderate: 2, light: 3 },
          strengthExp: 'none',
          msk: { areas: [], pain: 0, redFlags: [] },
          createdAt: R.addDays(ws, -28)
        };
      } else {
        profile.createdAt = R.addDays(ws, -28);
      }
      Store.set('profile', profile);
      Store.set('settings', { equipment: ['none', 'bottle', 'chair'], voice: false, chosenTotal: null, customSplit: null });

      // 先放 InBody 才算得出最後的餐盤
      Store.set('inbody', [
        { id: 'ib1', date: R.addDays(ws, -54), weight: 63.4, smm: 22.1, bodyFat: 31.2, visceral: 9, smmPct: 92, smi: 6.1 },
        { id: 'ib2', date: R.addDays(ws, -26), weight: 62.6, smm: 22.4, bodyFat: 30.1, visceral: 8, smmPct: 94, smi: 6.2 },
        { id: 'ib3', date: R.addDays(ws, -5), weight: 61.9, smm: 22.8, bodyFat: 29.0, visceral: 8, smmPct: 96, smi: 6.4 }
      ]);
      var plan = App.plan();
      var logs = [];
      function add(date, kind, minutes, extra) {
        var l = { id: 'd' + logs.length, date: date, kind: kind, minutes: minutes, source: 'manual', createdAt: date + 'T12:00:00' };
        if (extra) Object.keys(extra).forEach(function (k) { l[k] = extra[k]; });
        logs.push(l);
      }
      function fullWeek(w) {
        var a = plan.aerobic;
        add(R.addDays(w, 0), 'aerobic', Math.ceil(a * 0.4), { activity: '快走', intensity: 'moderate' });
        add(R.addDays(w, 2), 'aerobic', Math.ceil(a * 0.2 / 2), { activity: '爬樓梯', intensity: 'vigorous' });
        add(R.addDays(w, 3), 'micro', plan.micro, { activity: '走路去辦事', intensity: 'moderate' });
        add(R.addDays(w, 4), 'aerobic', Math.ceil(a * 0.4), { activity: '騎腳踏車', intensity: 'moderate' });
        add(R.addDays(w, 5), 'aerobic', 20, { activity: '散步', intensity: 'light' });
        add(R.addDays(w, 1), 'strength', Math.ceil(plan.strength / 2), { source: 'follow' });
        add(R.addDays(w, 4), 'strength', Math.ceil(plan.strength / 2));
        add(R.addDays(w, 2), 'stretch', Math.ceil(plan.stretch / 2));
        add(R.addDays(w, 6), 'stretch', Math.ceil(plan.stretch / 2), { source: 'follow' });
      }
      var w4 = R.addDays(ws, -28), w3 = R.addDays(ws, -21), w2 = R.addDays(ws, -14), w1 = R.addDays(ws, -7);
      fullWeek(w4);
      // w3 沒達標（之後用休息券）
      add(R.addDays(w3, 1), 'aerobic', 30, { activity: '快走', intensity: 'moderate' });
      add(R.addDays(w3, 3), 'strength', 10);
      fullWeek(w2);
      fullWeek(w1);
      // 本週進行中（只放到今天為止）
      var dow = (R.parseISO(t).getDay() + 6) % 7; // 週一=0
      add(R.addDays(ws, 0), 'aerobic', 30, { activity: '快走', intensity: 'moderate' });
      if (dow >= 1) add(R.addDays(ws, 1), 'strength', 15, { source: 'follow' });
      if (dow >= 1) add(R.addDays(ws, 1), 'micro', 4, { activity: '爬樓梯', intensity: 'vigorous' });
      if (dow >= 2) add(R.addDays(ws, 2), 'stretch', 8);
      Store.set('logs', logs);
      Store.set('stamps', { rests: [w3], redeemed: [], seen: [w4, w3, w2, w1], seenCards: [] });
    },

    boot: function () {
      var back = document.getElementById('backBtn');
      if (back && !back.firstChild) back.appendChild(icon('back'));
      App.go(App.profile() ? 'home' : 'onboarding');
    }
  };

  document.addEventListener('DOMContentLoaded', function () { App.boot(); });
})();
