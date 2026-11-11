/* 本週餐盤（主畫面） */
(function () {
  'use strict';
  var App = window.App, R = App.R, h = App.h;

  var KIND_LABEL = { aerobic: '有氧', micro: '微型運動', strength: '肌力', stretch: '伸展' };
  var INT_LABEL = { light: '輕', moderate: '中', vigorous: '高' };

  function legend(plan, prog) {
    var rows = [
      { key: 'aerobic', label: '有氧', done: Math.round(prog.aerobicShown), target: plan.aerobic,
        sub: prog.lightMinutes && plan.intensityCap !== 'light' ? '輕強度 ' + prog.lightMinutes + ' 分鐘（有記錄，不算分）' : '快走、騎車、游泳這類整段的運動' },
      { key: 'micro', label: '微型運動', done: Math.round(prog.microShown), target: plan.micro,
        sub: '走路去辦事、爬樓梯、外出多走一段，幾分鐘都算' },
      { key: 'strength', label: '肌力', done: prog.strength, target: plan.strength, sub: '本週 ' + prog.strengthDays + ' 天（至少 ' + plan.strengthDaysTarget + ' 天）' },
      { key: 'stretch', label: '伸展', done: prog.stretch, target: plan.stretch, sub: plan.balance ? '平衡動作 ' + prog.balanceDays + '／' + plan.balanceDaysTarget + ' 天' : null }
    ];
    return h('ul', { class: 'legend big' }, rows.map(function (r) {
      var pct = Math.round((prog.fill[r.key] || 0) * 100);
      return h('li', { class: prog.full[r.key] ? 'full' : '' }, [
        h('span', { class: 'dot ' + r.key }),
        h('div', { class: 'legend-main' }, [
          h('div', { class: 'legend-top' }, [h('span', { class: 'legend-name', text: r.label }), h('b', { text: r.done + '／' + r.target + ' 分鐘' })]),
          h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': r.label + '完成 ' + pct + '%' },
            h('span', { class: 'bar-fill ' + r.key, style: { width: pct + '%' } })),
          r.sub ? h('span', { class: 'hint', text: r.sub }) : null
        ]),
        prog.full[r.key] ? App.icon('check', 'ok') : null
      ]);
    }));
  }

  function logList(prog) {
    var items = prog.logs.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    if (!items.length) return h('p', { class: 'empty', text: '這週還沒有紀錄，從下面的按鈕開始吧。' });
    return h('ul', { class: 'log-list' }, items.map(function (l) {
      var d = R.parseISO(l.date);
      var credit = (l.kind === 'aerobic' || l.kind === 'micro') ? R.aerobicCredit(l.intensity, l.minutes, App.plan().intensityCap) : l.minutes;
      var desc = KIND_LABEL[l.kind] + (l.activity ? '・' + l.activity : '') + (l.intensity ? '・' + INT_LABEL[l.intensity] + '強度' : '') + (l.source === 'follow' ? '・跟著做' : '');
      return h('li', null, [
        h('span', { class: 'log-date', text: (d.getMonth() + 1) + '/' + d.getDate() + ' 週' + '日一二三四五六'[d.getDay()] }),
        h('span', { class: 'dot ' + (l.kind === 'micro' ? 'micro' : l.kind) }),
        h('span', { class: 'log-desc' }, [desc, h('small', { text: l.minutes + ' 分鐘' + ((l.kind === 'aerobic' || l.kind === 'micro') ? (credit !== l.minutes ? '，算 ' + credit + ' 分鐘' : '') : '') })]),
        h('button', { type: 'button', class: 'icon-btn sm', 'aria-label': '刪除這筆', onclick: function () {
          App.confirm('要刪除這筆紀錄嗎？', '刪除', function () { App.removeLog(l.id); App.render(); });
        } }, App.icon('trash'))
      ]);
    }));
  }

  App.screens.home = {
    title: '本週餐盤',
    tab: 'home',
    render: function () {
      var plan = App.plan();
      var ws = R.weekStart();
      var prog = App.progress(plan, ws);
      var root = h('div', { class: 'screen home' });

      root.appendChild(h('div', { class: 'week-head' }, [
        h('div', null, [h('p', { class: 'week-label', text: '本週 ' + R.weekLabel(ws) }), h('p', { class: 'week-sub', text: plan.levelLabel + '・' + plan.total + ' 分鐘' + (plan.total === 150 ? '起步盤' : '完整盤') + '・' + plan.phenotype.label })]),
        h('span', { class: 'badge', text: plan.intensityLabel })
      ]));
      plan.notices.forEach(function (n) {
        root.appendChild(h('div', { class: 'notice ' + n.kind + (n.fillForm ? ' skip-notice' : '') }, [
          h('span', { text: n.text }),
          n.fillForm ? h('button', { type: 'button', class: 'link-btn', text: '去填', onclick: function () { App.go('onboarding', { restart: true }); } }) : null
        ]));
      });

      var seen = App.Store.get('toppingsSeen', null);
      var pizzaWrap = h('div', { class: 'pizza-wrap' + (prog.pizzaFull ? ' all-full' : '') },
        App.pizza(plan, prog, { animate: true, seen: seen && seen.ws === ws ? seen.counts : {} }));
      App.Store.set('toppingsSeen', { ws: ws, counts: App.lastToppings });
      root.appendChild(pizzaWrap);

      var st = App.stamps();
      if (prog.achieved) {
        var fresh = st.seen.indexOf(ws) < 0;
        root.appendChild(h('div', { class: 'status done' }, [
          h('p', { class: 'status-title', text: '這週達標了' }),
          h('p', { text: fresh ? '四塊都滿了。這片 Pizza 可以蓋成印章囉。' : '印章已經蓋進集章冊。' }),
          fresh ? h('button', { type: 'button', class: 'btn primary', onclick: function () { App.go('stamps', { animate: ws }); } }, [App.icon('stamp'), h('span', { text: '去蓋章' })]) : null
        ]));
      } else {
        var rm = prog.remaining, parts = [];
        if (rm.aerobic > 0) parts.push('有氧 ' + Math.ceil(rm.aerobic) + ' 分鐘');
        if (rm.micro > 0) parts.push('微型 ' + Math.ceil(rm.micro) + ' 分鐘');
        if (rm.strength > 0) parts.push('肌力 ' + rm.strength + ' 分鐘');
        if (rm.stretch > 0) parts.push('伸展 ' + rm.stretch + ' 分鐘');
        root.appendChild(h('div', { class: 'status' }, [h('p', { text: '還差 ' + parts.join('、') + ' 就能蓋章。' })]));
      }

      root.appendChild(legend(plan, prog));

      root.appendChild(h('h3', { class: 'section-title menu-title', text: '今天點什麼？' }));
      root.appendChild(h('div', { class: 'action-grid' }, [
        h('button', { type: 'button', class: 'big-btn aerobic', onclick: function () { App.go('record', { kind: 'aerobic' }); } }, [App.icon('run', 'lg'), h('span', { text: '有氧' }), h('small', { text: '快走、騎車' })]),
        h('button', { type: 'button', class: 'big-btn strength', onclick: function () { App.go('workout', { type: 'strength', mode: 'manual' }); } }, [App.icon('dumbbell', 'lg'), h('span', { text: '肌力' }), h('small', { text: '啞鈴、徒手' })]),
        h('button', { type: 'button', class: 'big-btn stretch', onclick: function () { App.go('workout', { type: 'stretch', mode: 'manual' }); } }, [App.icon('leaf', 'lg'), h('span', { text: '伸展' }), h('small', { text: '伸展操、瑜伽' })]),
        h('button', { type: 'button', class: 'big-btn micro', onclick: function () { App.go('record', { kind: 'micro' }); } }, [App.icon('bolt', 'lg'), h('span', { text: '微型運動' }), h('small', { text: '室外走路' })])
      ]));

      root.appendChild(h('h3', { class: 'section-title menu-title', text: '這週的點單' }));
      root.appendChild(logList(prog));
      return root;
    }
  };
})();
