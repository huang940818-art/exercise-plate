/* InBody 紀錄：表單、趨勢圖、上次 → 這次對照、個人化運動建議 */
(function () {
  'use strict';
  var App = window.App, R = App.R, h = App.h, s = App.s;

  var METRICS = [
    { value: 'weight', label: '體重', unit: '公斤' },
    { value: 'smm', label: '骨骼肌量', unit: '公斤' },
    { value: 'bodyFat', label: '體脂率', unit: '%' }
  ];
  var metric = 'weight';

  function num(v) {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }
  function fmt(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return String(Math.round(Number(n) * 10) / 10);
  }
  function shortDate(iso) {
    var d = R.parseISO(iso);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }
  function longDate(iso) {
    var d = R.parseISO(iso);
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }
  function metricInfo(key) {
    for (var i = 0; i < METRICS.length; i++) if (METRICS[i].value === key) return METRICS[i];
    return METRICS[0];
  }

  // ---------- 表單 ----------
  function form() {
    var inputs = {};
    function numInput(key, opts) {
      var el = h('input', {
        type: 'number', inputmode: 'decimal', step: opts.step || '0.1', min: opts.min, max: opts.max,
        class: 'num-input wide', placeholder: opts.placeholder || '', 'aria-label': opts.label
      });
      inputs[key] = el;
      return h('div', { class: 'input-unit' }, [el, opts.unit ? h('span', { class: 'unit', text: opts.unit }) : null]);
    }
    var dateInput = h('input', { type: 'date', value: R.today(), max: R.today(), class: 'date-input', 'aria-label': '測量日期' });

    function save() {
      var date = dateInput.value;
      var weight = num(inputs.weight.value), smm = num(inputs.smm.value), bodyFat = num(inputs.bodyFat.value);
      if (!date) { App.toast('請填測量日期'); return; }
      if (date > R.today()) { App.toast('日期不能是未來'); return; }
      if (weight === null || weight < 20 || weight > 300) { App.toast('體重請填 20 到 300 公斤'); return; }
      if (smm === null || smm < 5 || smm > 100) { App.toast('骨骼肌量請填 5 到 100 公斤'); return; }
      if (smm >= weight) { App.toast('骨骼肌量應該比體重小，請再確認'); return; }
      if (bodyFat === null || bodyFat < 2 || bodyFat > 70) { App.toast('體脂率請填 2 到 70 %'); return; }
      var entry = { id: 'ib' + Date.now(), date: date, weight: weight, smm: smm, bodyFat: bodyFat };
      var visceral = num(inputs.visceral.value), smmPct = num(inputs.smmPct.value), asm = num(inputs.asm.value), smi = num(inputs.smi.value);
      if (visceral !== null) { if (visceral < 1 || visceral > 30) { App.toast('內臟脂肪等級請填 1 到 30'); return; } entry.visceral = visceral; }
      if (smmPct !== null) { if (smmPct < 30 || smmPct > 200) { App.toast('骨骼肌標準百分比請填 30 到 200'); return; } entry.smmPct = smmPct; }
      if (asm !== null) { if (asm < 3 || asm > 60) { App.toast('四肢骨骼肌量請填 3 到 60 公斤'); return; } entry.asm = asm; }
      if (smi !== null) { if (smi < 2 || smi > 15) { App.toast('SMI 請填 2 到 15'); return; } entry.smi = smi; }

      var list = App.Store.get('inbody', []);
      var replaced = false;
      list = list.filter(function (x) { if (x.date === date) { replaced = true; return false; } return true; });
      list.push(entry);
      list.sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });
      App.Store.set('inbody', list);
      App.toast(replaced ? '已更新 ' + longDate(date) + ' 的紀錄' : '已儲存 InBody 紀錄');
      App.render();
    }

    return App.card('inbody-form', [
      h('h3', { class: 'card-title', text: '新增一筆 InBody' }),
      App.field('測量日期', dateInput, '同一天再存一次會取代舊的那筆'),
      App.field('體重', numInput('weight', { label: '體重', unit: '公斤', min: 20, max: 300 })),
      App.field('骨骼肌量', numInput('smm', { label: '骨骼肌量', unit: '公斤', min: 5, max: 100 })),
      App.field('體脂率', numInput('bodyFat', { label: '體脂率', unit: '%', min: 2, max: 70 })),
      h('details', { class: 'more-fields' }, [
        h('summary', null, [h('span', { text: '更多欄位（選填）' }), App.icon('chevron', 'chev')]),
        App.field('內臟脂肪等級', numInput('visceral', { label: '內臟脂肪等級', step: '1', min: 1, max: 30 })),
        App.field('骨骼肌標準百分比', numInput('smmPct', { label: '骨骼肌標準百分比', unit: '%', min: 30, max: 200 }), '報告上骨骼肌量那條長條的百分比'),
        App.field('四肢骨骼肌量（ASM）', numInput('asm', { label: '四肢骨骼肌量', unit: '公斤', min: 3, max: 60 }), '有的話填這個或 SMI 擇一即可'),
        App.field('骨骼肌質量指數（SMI）', numInput('smi', { label: 'SMI', unit: 'kg/m²', min: 2, max: 15 }))
      ]),
      h('button', { type: 'button', class: 'btn primary block', onclick: save }, [App.icon('plus'), h('span', { text: '儲存' })])
    ]);
  }

  // ---------- 折線圖 ----------
  function chart(list) {
    var wrap = h('div', { class: 'chart-wrap' });
    function draw() {
      wrap.innerHTML = '';
      var info = metricInfo(metric);
      var pts = list.filter(function (x) { return num(x[metric]) !== null; });
      if (!pts.length) { wrap.appendChild(h('p', { class: 'empty', text: '還沒有' + info.label + '的資料。' })); return; }

      var W = 320, H = 190, L = 40, Rt = 14, T = 16, B = 30;
      var vals = pts.map(function (x) { return Number(x[metric]); });
      var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      var pad = (max - min) * 0.15 || Math.max(1, Math.abs(max) * 0.03);
      min -= pad; max += pad;
      var times = pts.map(function (x) { return R.parseISO(x.date).getTime(); });
      var t0 = times[0], t1 = times[times.length - 1];
      function X(i) { return pts.length === 1 || t1 === t0 ? (L + (W - L - Rt) / 2) : L + (times[i] - t0) / (t1 - t0) * (W - L - Rt); }
      function Y(v) { return T + (max - v) / (max - min) * (H - T - B); }

      var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'inbody-chart', role: 'img', 'aria-label': info.label + '趨勢圖，共 ' + pts.length + ' 筆' });
      // 格線與 Y 軸刻度
      for (var k = 0; k <= 4; k++) {
        var v = min + (max - min) * k / 4, y = Y(v);
        svg.appendChild(s('line', { x1: L, x2: W - Rt, y1: y, y2: y, class: 'grid', stroke: 'currentColor', 'stroke-opacity': '0.12' }));
        svg.appendChild(s('text', { x: L - 6, y: y + 4, 'text-anchor': 'end', class: 'axis-label', 'font-size': '10', fill: 'currentColor', 'fill-opacity': '0.6' }, fmt(v)));
      }
      // 軸
      svg.appendChild(s('line', { x1: L, x2: L, y1: T, y2: H - B, stroke: 'currentColor', 'stroke-opacity': '0.4', class: 'axis' }));
      svg.appendChild(s('line', { x1: L, x2: W - Rt, y1: H - B, y2: H - B, stroke: 'currentColor', 'stroke-opacity': '0.4', class: 'axis' }));
      // X 軸日期（太多時只標頭尾與部分）
      var stepX = Math.max(1, Math.ceil(pts.length / 5));
      pts.forEach(function (p, i) {
        if (i % stepX !== 0 && i !== pts.length - 1) return;
        svg.appendChild(s('text', { x: X(i), y: H - B + 16, 'text-anchor': 'middle', class: 'axis-label', 'font-size': '10', fill: 'currentColor', 'fill-opacity': '0.6' }, shortDate(p.date)));
      });
      // 折線
      if (pts.length > 1) {
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(vals[i]).toFixed(1); }).join(' ');
        var path = s('path', { d: d, fill: 'none', stroke: 'var(--accent, #E07A3F)', 'stroke-width': '2.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'chart-line ' + metric });
        svg.appendChild(path);
      }
      // 點與數值
      pts.forEach(function (p, i) {
        var cx = X(i), cy = Y(vals[i]), last = i === pts.length - 1;
        var c = s('circle', { cx: cx, cy: cy, r: last ? 5 : 4, fill: last ? 'var(--accent, #E07A3F)' : '#fff', stroke: 'var(--accent, #E07A3F)', 'stroke-width': '2', class: 'chart-dot' + (last ? ' last' : '') },
          s('title', null, longDate(p.date) + ' ' + info.label + ' ' + fmt(vals[i]) + ' ' + info.unit));
        svg.appendChild(c);
        if (pts.length <= 8 || last) {
          svg.appendChild(s('text', { x: cx, y: cy - 9, 'text-anchor': 'middle', 'font-size': '10', fill: 'currentColor', 'font-weight': last ? '700' : '400', class: 'point-label' }, fmt(vals[i])));
        }
      });
      wrap.appendChild(svg);
      wrap.appendChild(h('p', { class: 'hint center', text: info.label + '（' + info.unit + '）' }));
    }
    var tabs = App.chips(METRICS.map(function (m) { return { value: m.value, label: m.label }; }), metric, false, function (v) { metric = v; draw(); });
    draw();
    return App.card('inbody-chart-card', [
      h('h3', { class: 'card-title' }, [App.icon('chart'), h('span', { text: '趨勢' })]),
      tabs,
      wrap
    ]);
  }

  // ---------- 上次 → 這次 ----------
  function compareCard(prev, curr) {
    var rows = R.inbodyCompare(prev, curr) || [];
    var improvedEls = [];
    var list = h('ul', { class: 'compare-list' }, rows.map(function (r) {
      var hasDelta = r.delta !== null && r.delta !== undefined && !isNaN(r.delta);
      var deltaText = hasDelta ? ((r.delta > 0 ? '+' : '') + fmt(r.delta)) : '';
      var li = h('li', { class: 'compare-row' + (r.improved === true ? ' improved' : '') }, [
        h('span', { class: 'compare-label', text: r.label }),
        h('span', { class: 'compare-vals' }, [
          h('span', { class: 'prev', text: fmt(r.prev) }),
          h('span', { class: 'arrow', 'aria-label': '到', text: ' → ' }),
          h('b', { class: 'curr', text: fmt(r.curr) }),
          r.unit ? h('small', { class: 'unit', text: ' ' + r.unit }) : null
        ]),
        hasDelta ? h('span', { class: 'delta' + (r.improved === true ? ' up' : (r.improved === false ? ' down' : '')), text: deltaText }) : null,
        r.improved === true ? App.icon('check', 'ok sm') : null
      ]);
      if (r.improved === true) improvedEls.push(li);
      return li;
    }));
    var card = App.card('inbody-compare', [
      h('h3', { class: 'card-title', text: '上次 → 這次' }),
      h('p', { class: 'hint', text: longDate(prev.date) + ' → ' + longDate(curr.date) }),
      rows.length ? list : h('p', { class: 'empty', text: '兩次沒有可以比較的欄位。' }),
      improvedEls.length ? h('p', { class: 'compare-cheer', text: '有 ' + improvedEls.length + ' 項往好的方向走，繼續保持。' }) : null
    ]);
    setTimeout(function () {
      improvedEls.forEach(function (el, i) {
        App.animate(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 500, delay: 150 * i, easing: 'ease-out' });
      });
    }, 60);
    return card;
  }

  // ---------- 個人化運動建議 ----------
  function adviceCard(latest) {
    var res;
    try { res = R.adjustPlate(latest, App.profile()); } catch (e) { res = null; }
    var items = Array.isArray(res) ? res : (res && (res.suggestions || res.applied || res.items || res.notes)) || [];
    if (!items.length) {
      return App.card('inbody-advice', [
        h('h3', { class: 'card-title', text: '個人化運動建議' }),
        h('p', { class: 'empty', text: '這次的數字不需要調整餐盤，照原本的分配繼續就好。' })
      ]);
    }
    return App.card('inbody-advice', [
      h('h3', { class: 'card-title', text: '個人化運動建議' }),
      h('p', { class: 'hint', text: '依最新一筆 InBody 調整。灰字是出處還在確認中的建議，參考就好。' }),
      h('ol', { class: 'why-list' }, items.map(function (r) {
        if (typeof r === 'string') return h('li', null, h('p', { class: 'why-reason', text: r }));
        var type = r.類型 || r.type;
        var todo = type === '待查證';
        var text = r.白話理由 || r.建議 || r.text || r.message || r.label || '';
        return h('li', { class: todo ? 'is-gray todo' : '' }, [
          h('p', { class: 'why-reason' + (todo ? ' gray' : ''), text: text }),
          (type || r.出處) ? h('p', { class: 'why-source' }, [
            type ? App.sourceTag({ 類型: type }) : null,
            r.出處 && r.出處 !== r.類型 ? h('span', { class: 'src-text' + (todo ? ' todo' : ''), text: r.出處 }) : null,
            r.網址 ? h('a', { href: r.網址, target: '_blank', rel: 'noopener', class: 'src-link', text: '連結' }) : null
          ]) : null
        ]);
      }))
    ]);
  }

  // ---------- 歷史 ----------
  function historyList(list) {
    var items = list.slice().reverse();
    return h('ul', { class: 'log-list inbody-history' }, items.map(function (x) {
      var extra = [];
      if (num(x.visceral) !== null) extra.push('內臟脂肪 ' + fmt(x.visceral));
      if (num(x.smmPct) !== null) extra.push('骨骼肌 ' + fmt(x.smmPct) + '%');
      if (num(x.asm) !== null) extra.push('ASM ' + fmt(x.asm));
      if (num(x.smi) !== null) extra.push('SMI ' + fmt(x.smi));
      return h('li', null, [
        h('span', { class: 'log-date', text: longDate(x.date) }),
        h('span', { class: 'log-desc' }, [
          '體重 ' + fmt(x.weight) + '・骨骼肌 ' + fmt(x.smm) + '・體脂 ' + fmt(x.bodyFat) + '%',
          extra.length ? h('small', { text: extra.join('、') }) : null
        ]),
        h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': '刪除 ' + longDate(x.date) + ' 的紀錄', onclick: function () {
          App.confirm('要刪除 ' + longDate(x.date) + ' 的 InBody 紀錄嗎？', '刪除', function () {
            App.Store.set('inbody', App.Store.get('inbody', []).filter(function (y) { return y.id !== x.id; }));
            App.toast('已刪除');
            App.render();
          });
        } }, App.icon('trash'))
      ]);
    }));
  }

  App.screens.inbody = {
    title: 'InBody',
    tab: 'inbody',
    render: function () {
      var list = App.inbody();
      var root = h('div', { class: 'screen inbody' });

      if (!list.length) {
        root.appendChild(h('p', { class: 'notice info', text: '把 InBody 報告上的數字記下來，餐盤會依你的身體組成給個人化運動建議。' }));
      }
      root.appendChild(form());

      if (list.length) {
        var latest = list[list.length - 1];
        root.appendChild(chart(list));
        if (list.length >= 2) root.appendChild(compareCard(list[list.length - 2], latest));
        root.appendChild(adviceCard(latest));
        root.appendChild(h('h3', { class: 'section-title', text: '所有紀錄' }));
        root.appendChild(historyList(list));
      }
      return root;
    }
  };
})();
