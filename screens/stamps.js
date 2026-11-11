/* 集章冊：一張卡 8 格，達標週蓋 Pizza 章；受傷、身體不適的週可以用休養券補章；集滿可兌換（示意） */
(function () {
  'use strict';
  var App = window.App, R = App.R, h = App.h, s = App.s;

  function shortDate(iso) {
    var d = R.parseISO(iso);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  // Pizza 印章 SVG（三塊：有氧、肌力、伸展）
  function pizzaStamp(gray, size) {
    var c = function (v, fb) { return gray ? 'fill:#C9C4BC' : 'fill:var(' + v + ',' + fb + ')'; };
    var svg = s('svg', { viewBox: '0 0 100 100', width: size || 64, height: size || 64, 'aria-hidden': 'true', class: 'stamp-svg' }, [
      s('circle', { cx: 50, cy: 50, r: 47, style: 'fill:none;stroke:' + (gray ? '#A8A29A' : 'var(--stamp-ink,#C0392B)') + ';stroke-width:4' }),
      s('path', { d: 'M50 50 L50 10 A40 40 0 0 1 84.64 70 Z', style: c('--aerobic', '#E8833A') }),
      s('path', { d: 'M50 50 L84.64 70 A40 40 0 0 1 15.36 70 Z', style: c('--strength', '#5B8DEF') }),
      s('path', { d: 'M50 50 L15.36 70 A40 40 0 0 1 50 10 Z', style: c('--stretch', '#5FB878') }),
      s('path', { d: 'M50 50 L50 10 M50 50 L84.64 70 M50 50 L15.36 70', style: 'stroke:#fff;stroke-width:3;fill:none' })
    ]);
    return svg;
  }

  // 休養章：OK 繃
  function restStamp() {
    return s('svg', { viewBox: '0 0 100 100', class: 'stamp-svg rest-svg', 'aria-hidden': 'true' }, [
      s('circle', { cx: 50, cy: 50, r: 47, style: 'fill:#FFF3E3;stroke:#E9A23B;stroke-width:4' }),
      s('g', { transform: 'rotate(-35 50 50)' }, [
        s('rect', { x: 14, y: 38, width: 72, height: 24, rx: 12, style: 'fill:#F6C48A' }),
        s('rect', { x: 38, y: 38, width: 24, height: 24, style: 'fill:#FBE3C2' }),
        s('circle', { cx: 45, cy: 45, r: 1.8, style: 'fill:#E9A23B' }), s('circle', { cx: 55, cy: 45, r: 1.8, style: 'fill:#E9A23B' }),
        s('circle', { cx: 45, cy: 55, r: 1.8, style: 'fill:#E9A23B' }), s('circle', { cx: 55, cy: 55, r: 1.8, style: 'fill:#E9A23B' })
      ])
    ]);
  }

  var P = window.PlateProduce;
  function produceOf(mk) { return P.months[Number(mk.slice(5, 7))]; }
  function monthNum(mk) { return Number(mk.slice(5, 7)); }

  // 農產品小圖（簡單的形狀＋顏色）
  function produceIcon(pr, size) {
    var c = pr.color, kids = [];
    if (pr.shape === 'pine') kids = [s('ellipse', { cx: 50, cy: 60, rx: 22, ry: 28, style: 'fill:' + c }), s('path', { d: 'M50 34 L40 12 L50 22 L60 10 L56 30 Z', style: 'fill:#4E9A4A' }), s('path', { d: 'M34 50 L66 74 M66 50 L34 74', style: 'stroke:#B8862A;stroke-width:2' })];
    else if (pr.shape === 'pod') kids = [s('ellipse', { cx: 50, cy: 52, rx: 16, ry: 32, transform: 'rotate(30 50 52)', style: 'fill:' + c }), s('circle', { cx: 42, cy: 40, r: 6, style: 'fill:rgba(255,255,255,.35)' }), s('circle', { cx: 52, cy: 54, r: 6, style: 'fill:rgba(255,255,255,.35)' }), s('circle', { cx: 60, cy: 68, r: 5, style: 'fill:rgba(255,255,255,.35)' })];
    else if (pr.shape === 'bean') kids = [s('ellipse', { cx: 38, cy: 52, rx: 13, ry: 10, style: 'fill:' + c }), s('ellipse', { cx: 62, cy: 46, rx: 13, ry: 10, style: 'fill:' + c }), s('ellipse', { cx: 52, cy: 66, rx: 13, ry: 10, style: 'fill:' + c }), s('path', { d: 'M34 50 h6 M58 44 h6 M48 64 h6', style: 'stroke:#fff;stroke-width:2;stroke-linecap:round' })];
    else if (pr.shape === 'bell') kids = [s('path', { d: 'M50 22 C30 22 26 50 28 70 C30 80 70 80 72 70 C74 50 70 22 50 22 Z', style: 'fill:' + c }), s('path', { d: 'M50 22 v-8', style: 'stroke:#4E9A4A;stroke-width:4;stroke-linecap:round' })];
    else if (pr.shape === 'onion') kids = [s('path', { d: 'M50 18 C46 30 26 40 28 60 C30 80 70 80 72 60 C74 40 54 30 50 18 Z', style: 'fill:' + c }), s('path', { d: 'M50 30 C44 44 42 60 46 76 M50 30 C56 44 58 60 54 76', style: 'stroke:rgba(255,255,255,.4);stroke-width:2;fill:none' })];
    else if (pr.shape === 'drop') kids = [s('path', { d: 'M50 16 C66 36 74 50 74 62 A24 24 0 0 1 26 62 C26 50 34 36 50 16 Z', style: 'fill:' + c }), s('ellipse', { cx: 42, cy: 56, rx: 5, ry: 9, style: 'fill:rgba(255,255,255,.35)' })];
    else kids = [s('circle', { cx: 50, cy: 54, r: 26, style: 'fill:' + c }), s('path', { d: 'M44 28 L50 34 L56 28', style: 'stroke:#4E9A4A;stroke-width:4;fill:none;stroke-linecap:round' }), s('circle', { cx: 42, cy: 46, r: 5, style: 'fill:rgba(255,255,255,.35)' })];
    return s('svg', { viewBox: '0 0 100 100', width: size, height: size, class: 'produce-svg', 'aria-hidden': 'true' }, kids);
  }

  function slotEl(ws, slot, currentWs) {
    var future = ws > currentWs;
    var label = shortDate(ws) + ' 那週';
    if (!slot) {
      return h('div', { class: 'stamp-slot empty' + (future ? ' future' : '') + (ws === currentWs ? ' now' : ''), 'aria-label': label + (future ? '，還沒到' : '，還沒蓋章') }, [
        h('span', { class: 'slot-empty', text: ws === currentWs ? '本週' : shortDate(ws) })
      ]);
    }
    var isRest = slot.kind === 'rest';
    return h('div', { class: 'stamp-slot ' + (isRest ? 'rest' : 'stamp'), 'data-week': ws, 'aria-label': label + (isRest ? '，受傷休養' : '，達標印章') }, [
      h('div', { class: 'stamp-face' }, isRest ? restStamp() : pizzaStamp(false, 64)),
      h('small', { class: 'slot-date', text: shortDate(ws) })
    ]);
  }

  function playStampDrop(cell) {
    var face = cell.querySelector('.stamp-face') || cell;
    cell.classList.add('stamp-drop');
    var ink = h('span', { class: 'stamp-ink', 'aria-hidden': 'true', style: {
      position: 'absolute', left: '50%', top: '32px', width: '64px', height: '64px', 'margin-left': '-32px', 'margin-top': '-32px',
      'border-radius': '50%', background: 'rgba(192,57,43,.25)', 'pointer-events': 'none', opacity: '0' } });
    cell.appendChild(ink);
    var drop = App.animate(face, [
      { transform: 'scale(2.4) translateY(-30px)', opacity: 0 },
      { transform: 'scale(1.6) translateY(-14px)', opacity: 0.8, offset: 0.45 },
      { transform: 'scale(0.92) translateY(0)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1) translateY(0)', opacity: 1 }
    ], { duration: 700, easing: 'cubic-bezier(.3,.7,.4,1)' });
    return drop.finished.then(function () {
      var spread = App.animate(ink, [
        { transform: 'scale(.6)', opacity: 0.6 },
        { transform: 'scale(1.7)', opacity: 0 }
      ], { duration: 550, easing: 'ease-out' });
      var shake = App.animate(face, [
        { transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(5deg)' },
        { transform: 'rotate(-3deg)' }, { transform: 'rotate(0)' }
      ], { duration: 450, easing: 'ease-in-out' });
      return Promise.all([spread.finished, shake.finished]);
    }).then(function () {
      if (ink.parentNode) ink.parentNode.removeChild(ink);
      cell.classList.remove('stamp-drop');
    });
  }

  function playBigStamp(el) {
    el.classList.add('big-stamp');
    return App.animate(el, [
      { transform: 'scale(3) rotate(-20deg)', opacity: 0 },
      { transform: 'scale(.9) rotate(-8deg)', opacity: 1, offset: 0.65 },
      { transform: 'scale(1.05) rotate(-12deg)', opacity: 1, offset: 0.82 },
      { transform: 'scale(1) rotate(-10deg)', opacity: 1 }
    ], { duration: 900, easing: 'cubic-bezier(.3,.7,.4,1)' }).finished;
  }

  function markSeen(ws) {
    var st = App.stamps();
    if (st.seen.indexOf(ws) < 0) { st.seen.push(ws); App.saveStamps(st); }
  }

  function redeemBox(card) {
    var pr = produceOf(card.month);
    if (card.redeemed) return h('p', { class: 'status done' }, [App.icon('check'), h('span', { text: ' 已兌換 ' + monthNum(card.month) + ' 月的' + pr.name + '（示意）' })]);
    return h('button', { type: 'button', class: 'btn primary block', onclick: function () {
      App.confirm('要兌換 ' + monthNum(card.month) + ' 月的當季' + pr.name + '嗎？（目前是示意，不會真的寄送）', '兌換', function () {
        var st = App.stamps();
        if (st.redeemed.indexOf(card.month) < 0) st.redeemed.push(card.month);
        App.saveStamps(st);
        App.toast('兌換好了：' + pr.name + '（示意）');
        App.params = {}; App.render();
      });
    } }, [App.icon('gift'), h('span', { text: '兌換當季' + pr.name })]);
  }

  function cardEl(card, pending, currentWs, big) {
    var pr = produceOf(card.month);
    var byWeek = {};
    card.slots.forEach(function (x) { byWeek[x.weekStart] = x; });
    var grid = h('div', { class: 'stamp-grid w' + card.weeks.length });
    card.weeks.forEach(function (ws) {
      var cell = slotEl(ws, byWeek[ws], currentWs);
      if (byWeek[ws] && pending.week === ws) pending.cell = cell;
      grid.appendChild(cell);
    });
    var got = card.slots.length;
    var head = h('div', { class: 'month-head' }, [
      h('div', { class: 'produce-badge', style: { background: pr.color + '22' } }, produceIcon(pr, big ? 64 : 44)),
      h('div', { class: 'month-text' }, [
        h('p', { class: 'month-kicker', text: monthNum(card.month) + ' 月主打' }),
        h('h3', { class: 'month-name', text: pr.name }),
        big ? h('p', { class: 'hint', text: pr.note }) : null
      ]),
      card.full ? null : h('p', { class: 'month-count' }, [h('b', { text: String(Math.min(got, card.need)) }), h('span', { text: '／' + card.need })])
    ]);
    var wrap = h('div', { class: 'stamp-card-body' }, grid);
    var children = [head, wrap];
    if (card.full) {
      var mark = h('div', { class: 'big-stamp-mark', 'aria-label': '集滿大章' }, [produceIcon(pr, 30), h('b', { text: '集滿' })]);
      if (App.stamps().seenCards.indexOf(card.month) < 0) { mark.style.opacity = '0'; pending.bigs.push({ el: mark, month: card.month }); }
      else mark.classList.add('big-stamp');
      head.appendChild(mark);
      children.push(redeemBox(card));
    } else if (card.current) {
      children.push(h('p', { class: 'hint center', text: '這個月再蓋 ' + (card.need - got) + ' 個章，就能換當季' + pr.name + '。' }));
    }
    return h('section', { class: 'stamp-card' + (big ? ' big' : ' small') + (card.full ? ' full' : '') }, children);
  }

  // 用休養券前先問哪裡受傷，記下來；提醒就醫和回來時重填問卷
  function askRest(ws) {
    var Q = window.PlateQuestions;
    var picked = [];
    var other = false;
    var opts = Q.msk.areas.items.map(function (x) { return { value: x.id, label: x.label }; });
    App.overlay([
      h('h3', { class: 'card-title', text: R.weekLabel(ws) + ' 受傷休養' }),
      h('p', { text: '休養券是給中途受傷、身體不舒服沒辦法運動的週。哪裡不舒服？' }),
      App.chips(opts, [], true, function (v, n) { picked = v; other = n; }, { none: '其他（生病、身體不適）' }),
      h('p', { class: 'notice warn', text: '痛到沒辦法承重、腫起來，或一週都沒好轉，先去看醫生。回來運動前到「設定」重填問卷的骨骼肌肉那頁，餐盤會幫你避開受傷的部位。' }),
      h('div', { class: 'btn-row' }, [
        h('button', { type: 'button', class: 'btn ghost', text: '取消', onclick: App.closeOverlay }),
        h('button', { type: 'button', class: 'btn primary', text: '補這格', onclick: function () {
          if (!picked.length && !other) { App.toast('先選哪裡不舒服'); return; }
          var s2 = App.stamps();
          if (s2.rests.indexOf(ws) < 0) s2.rests.push(ws);
          s2.restNotes = s2.restNotes || {};
          s2.restNotes[ws] = { areas: picked, other: other, at: new Date().toISOString() };
          App.saveStamps(s2);
          App.closeOverlay();
          App.toast('好好休息，' + R.weekLabel(ws) + ' 補上了');
          App.go('stamps', { animate: ws });
        } })
      ])
    ]);
  }

  App.screens.stamps = {
    title: '集章冊',
    tab: 'stamps',
    render: function (params) {
      params = params || {};
      var book = App.book();
      var root = h('div', { class: 'screen stamps' });
      var st = App.stamps();
      var pending = { week: null, cell: null, bigs: [] };
      if (params.animate && st.seen.indexOf(params.animate) < 0) pending.week = params.animate;

      var currentWs = R.weekStart();
      var cards = book.cards.slice();
      var cur = book.current;
      root.appendChild(cardEl(cur, pending, currentWs, true));
      root.appendChild(h('p', { class: 'hint', text: '每月主打一樣當季在地農產品。這個月有 ' + cur.need + ' 週把餐盤四塊都做滿，就能兌換。受傷、生病沒辦法運動的那週，可以用休養券補一格（一個月 ' + book.restPerCard + ' 張）。' }));
      root.appendChild(h('p', { class: 'source', text: '農產品和產季：' + window.PlateProduce.status }));

      var usable = (book.missed || []).filter(function (m) { return m.canUseRest; });
      if (usable.length) {
        root.appendChild(h('h3', { class: 'section-title', text: '那週受傷了嗎？' }));
        root.appendChild(h('ul', { class: 'missed-list' }, usable.map(function (m) {
          return h('li', null, [
            h('span', { text: R.weekLabel(m.weekStart) + ' 沒做滿' }),
            h('button', { type: 'button', class: 'btn ghost sm', onclick: function () { askRest(m.weekStart); } }, [App.icon('ticket'), h('span', { text: '用休養券' })])
          ]);
        })));
      }

      var past = cards.filter(function (c) { return c.month !== cur.month; }).reverse();
      if (past.length) {
        root.appendChild(h('h3', { class: 'section-title', text: '之前的月份' }));
        past.forEach(function (c) { root.appendChild(cardEl(c, pending, currentWs, false)); });
      }
      root.appendChild(h('p', { class: 'hint center', text: '總共 ' + (book.totalStamps || 0) + ' 個 Pizza 章、用了 ' + (book.totalRests || 0) + ' 張休養券' }));

      // 動畫：等畫面掛上 DOM 後再播
      setTimeout(function () {
        var chain = Promise.resolve();
        if (pending.cell) {
          var cell = pending.cell, ws = pending.week;
          try { cell.scrollIntoView({ block: 'center', behavior: App.reducedMotion ? 'auto' : 'smooth' }); } catch (e) { /* 舊瀏覽器 */ }
          chain = playStampDrop(cell).then(function () { markSeen(ws); App.speak('蓋章完成'); }, function () { markSeen(ws); });
        } else if (pending.week) {
          markSeen(pending.week);
        }
        pending.bigs.forEach(function (b) {
          chain = chain.then(function () {
            b.el.style.opacity = '';
            return playBigStamp(b.el).then(null, function () {});
          }).then(function () {
            var s3 = App.stamps();
            if (s3.seenCards.indexOf(b.month) < 0) { s3.seenCards.push(b.month); App.saveStamps(s3); }
            App.toast(monthNum(b.month) + ' 月集滿了，可以兌換囉');
          });
        });
      }, 60);

      return root;
    }
  };
})();
