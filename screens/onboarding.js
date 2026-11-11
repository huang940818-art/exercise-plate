/* 開始問卷 */
(function () {
  'use strict';
  var App = window.App, R = App.R, h = App.h, Q = window.PlateQuestions;

  var draft = null;
  var step = 0;
  var STEPS = ['基本資料', '健康篩檢', '運動前篩檢', '骨骼肌肉', '運動經驗', '結果'];

  function blank() {
    var p = App.profile();
    if (p && !p.skipped) {
      p = JSON.parse(JSON.stringify(p));
      // 舊資料：已經填過的複選題，空的就當作選了「以上皆無」
      if (!p.none) p.none = { symptoms: !p.acsm.symptoms.length, areas: !p.msk.areas.length, redFlags: !p.msk.redFlags.length };
      return p;
    }
    return {
      none: {}, wantTotal: 150,
      createdAt: p ? p.createdAt : undefined,
      age: '', sex: '', height: '', weight: '',
      parq: [null, null, null, null, null, null, null],
      acsm: { regular: null, disease: null, symptoms: [], clearance: false },
      godin: { strenuous: 0, moderate: 0, light: 0 },
      strengthExp: null,
      msk: { areas: [], pain: 0, redFlags: [] }
    };
  }

  function yesNo(value, onChange) {
    return App.chips([{ value: true, label: '是' }, { value: false, label: '否' }], value, false, onChange);
  }

  function numField(label, unit, value, onChange, attrs) {
    var input = h('input', { type: 'number', inputmode: 'decimal', class: 'num-input wide', value: value === null ? '' : value, min: attrs.min, max: attrs.max });
    input.addEventListener('input', function () { onChange(input.value === '' ? '' : Number(input.value)); });
    return App.field(label, h('div', { class: 'input-unit' }, [input, h('span', { class: 'unit', text: unit })]));
  }

  function counter(value, onChange) {
    var n = h('output', { class: 'counter-val', text: String(value) });
    function set(v) { v = Math.max(0, Math.min(21, v)); value = v; n.textContent = v; onChange(v); }
    return h('div', { class: 'counter' }, [
      h('button', { type: 'button', class: 'step-btn', 'aria-label': '減一次', onclick: function () { set(value - 1); } }, App.icon('minus')),
      n, h('span', { class: 'unit', text: '次／週' }),
      h('button', { type: 'button', class: 'step-btn', 'aria-label': '加一次', onclick: function () { set(value + 1); } }, App.icon('plus'))
    ]);
  }

  function validate() {
    if (step === 0) {
      var ok = true;
      Q.basic.forEach(function (q) {
        var v = draft[q.id];
        if (q.type === 'number' && (v === '' || v === null || v < q.min || v > q.max)) ok = false;
        if (q.type === 'choice' && !v) ok = false;
      });
      return ok ? null : '請把年齡、性別、身高、體重填完整（數字要在合理範圍）。';
    }
    if (step === 1) return draft.parq.every(function (a) { return a === true || a === false; }) ? null : '7 題都要回答喔。';
    if (step === 2) {
      if (draft.acsm.regular === null || draft.acsm.disease === null) return '前兩題要回答喔。';
      if (!answered('symptoms', draft.acsm.symptoms)) return '最近的狀況那題，沒有的話請選「以上皆無」。';
      return null;
    }
    if (step === 3) {
      if (!answered('areas', draft.msk.areas)) return '不舒服的部位，沒有的話請選「以上皆無」。';
      if (!answered('redFlags', draft.msk.redFlags)) return '最後一題，沒有的話請選「以上皆無」。';
      return null;
    }
    if (step === 4) return draft.strengthExp ? null : '請選肌力訓練經驗。';
    return null;
  }

  function answered(key, arr) { return arr.length > 0 || !!draft.none[key]; }
  function setNone(key, on) { draft.none[key] = on; }
  var NONE = '以上皆無';

  function stepBody() {
    var body = [];
    if (step === 0) {
      body.push(h('p', { class: 'lead', text: '花 3 分鐘回答幾個問題，幫你排出這週的運動餐盤。' }));
      body.push(h('div', { class: 'q time-pick' }, [
        h('p', { class: 'q-text', text: '每週想運動多久？' }),
        App.chips([{ value: 150, label: '150 分鐘', sub: '起步盤，一天 20 多分鐘' }, { value: 300, label: '300 分鐘', sub: '完整盤，一天 40 多分鐘' }], draft.wantTotal || 150, false, function (v) { draft.wantTotal = v; }, { list: true })
      ]));
      body.push(h('p', { class: 'hint', text: '現在沒空也可以先跳過，之後到「設定」再回來填。沒填之前強度會先排最保守的。' }));
      Q.basic.forEach(function (q) {
        if (q.type === 'number') body.push(numField(q.label, q.unit, draft[q.id], function (v) { draft[q.id] = v; }, q));
        else body.push(App.field(q.label, App.chips(q.options, draft[q.id], false, function (v) { draft[q.id] = v; })));
      });
    }
    if (step === 1) {
      body.push(h('p', { class: 'lead', text: Q.parq.intro }));
      Q.parq.items.forEach(function (q, i) {
        body.push(h('div', { class: 'q' }, [
          h('p', { class: 'q-text' }, [h('b', { text: q.no + '. ' }), q.text]),
          q.note ? h('p', { class: 'hint', text: q.note }) : null,
          yesNo(draft.parq[i], function (v) { draft.parq[i] = v; })
        ]));
      });
      body.push(h('p', { class: 'source', text: '題目來源：' + Q.parq.source + '（正式版題目待替換）' }));
    }
    if (step === 2) {
      body.push(h('div', { class: 'q' }, [h('p', { class: 'q-text', text: Q.acsm.regular.text }), h('p', { class: 'hint', text: Q.acsm.regular.note }),
        yesNo(draft.acsm.regular, function (v) { draft.acsm.regular = v; })]));
      body.push(h('div', { class: 'q' }, [h('p', { class: 'q-text', text: Q.acsm.disease.text }),
        yesNo(draft.acsm.disease, function (v) { draft.acsm.disease = v; render(); })]));
      body.push(h('div', { class: 'q' }, [h('p', { class: 'q-text', text: Q.acsm.symptoms.text }),
        App.chips(Q.acsm.symptoms.items.map(function (x) { return { value: x.id, label: x.text }; }), draft.acsm.symptoms, true, function (v, n) { draft.acsm.symptoms = v; setNone('symptoms', n); }, { none: NONE, noneOn: draft.none.symptoms, list: true })
      ]));
      if (draft.acsm.disease) {
        body.push(h('div', { class: 'q' }, [App.chips([{ value: true, label: Q.acsm.clearance.text }], draft.acsm.clearance ? [true] : [], true, function (v) { draft.acsm.clearance = v.length > 0; }),
          h('p', { class: 'hint', text: '勾了只是提醒用，不會擋你使用。' })]));
      }
      body.push(h('p', { class: 'source', text: '依據：' + Q.acsm.source }));
    }
    if (step === 3) {
      if (draft.parq[5] === true) body.push(h('p', { class: 'notice warn', text: '你在健康篩檢第 6 題答了「是」，請在這裡選出不舒服的部位。' }));
      body.push(h('div', { class: 'q' }, [h('p', { class: 'q-text', text: Q.msk.areas.text }),
        App.chips(Q.msk.areas.items.map(function (x) { return { value: x.id, label: x.label }; }), draft.msk.areas, true, function (v, n) { draft.msk.areas = v; setNone('areas', n); render(); }, { none: NONE, noneOn: draft.none.areas })]));
      if (draft.msk.areas.length) {
        var out = h('output', { class: 'range-val', text: String(draft.msk.pain || 0) });
        var range = h('input', { type: 'range', min: 0, max: 10, step: 1, value: draft.msk.pain || 0, class: 'range', 'aria-label': '疼痛分數' });
        range.addEventListener('input', function () { draft.msk.pain = Number(range.value); out.textContent = range.value; });
        body.push(h('div', { class: 'q' }, [h('p', { class: 'q-text', text: Q.msk.pain.text }), h('div', { class: 'range-row' }, [range, out])]));
      }
      body.push(h('div', { class: 'q' }, [h('p', { class: 'q-text', text: Q.msk.redFlags.text }),
        App.chips(Q.msk.redFlags.items.map(function (x) { return { value: x.id, label: x.text }; }), draft.msk.redFlags, true, function (v, n) { draft.msk.redFlags = v; setNone('redFlags', n); }, { none: NONE, noneOn: draft.none.redFlags, list: true })]));
      body.push(h('p', { class: 'source', text: '架構：' + Q.msk.source }));
    }
    if (step === 4) {
      body.push(h('p', { class: 'lead', text: Q.godin.intro }));
      Q.godin.items.forEach(function (it) {
        body.push(h('div', { class: 'q' }, [h('p', { class: 'q-text' }, [h('b', { text: it.label }), '　' + it.desc]),
          counter(draft.godin[it.id] || 0, function (v) { draft.godin[it.id] = v; })]));
      });
      body.push(h('div', { class: 'q' }, [h('p', { class: 'q-text', text: Q.strengthExp.text }),
        App.chips(Q.strengthExp.options, draft.strengthExp, false, function (v) { draft.strengthExp = v; }, { list: true })]));
      body.push(h('p', { class: 'source', text: '依據：' + Q.godin.source + '；' + Q.strengthExp.source }));
    }
    if (step === 5) body = body.concat(resultBody());
    return body;
  }

  function resultBody() {
    var lv = R.composeLevel(draft);
    var chosen = draft.wantTotal || lv.defaultTotal;
    if (lv.allowedTotals.indexOf(chosen) < 0) chosen = lv.defaultTotal;
    var plan = R.planPlate(Object.assign({}, draft, { chosenTotal: chosen }), App.latestInbody());
    var out = [];
    out.push(h('div', { class: 'result-hero' }, [
      h('p', { class: 'result-kicker', text: '你的等級' }),
      h('p', { class: 'result-level', text: lv.label }),
      h('p', { class: 'result-sub', text: '休閒運動分數 ' + lv.godin.score + '（' + lv.godin.label + '）・強度上限：' + lv.intensityLabel })
    ]));
    plan.notices.forEach(function (n) { out.push(h('p', { class: 'notice ' + n.kind, text: n.text })); });
    if (lv.allowedTotals.length > 1) {
      out.push(h('div', { class: 'q' }, [h('p', { class: 'q-text', text: '本週目標' }),
        App.chips([{ value: 150, label: '150 起步盤' }, { value: 300, label: '300 完整盤' }], chosen, false, function (v) { draft.wantTotal = v; render(); }, { cls: 'duo' })]));
    } else {
      out.push(h('p', { class: 'q-text', text: '本週目標：150 分鐘起步盤' }));
    }
    var prog = R.weekProgress([], plan, R.weekStart());
    out.push(h('div', { class: 'result-plate' }, [App.pizza(plan, prog, { mini: false }), legendStatic(plan)]));
    out.push(h('p', { class: 'hint', text: '每塊為什麼這樣分，在「設定」裡看得到；也可以在那裡自己配置。' }));
    return out;
  }

  function legendStatic(plan) {
    return h('ul', { class: 'legend' }, [
      ['aerobic', '有氧', plan.aerobic], ['micro', '微型運動', plan.micro], ['strength', '肌力', plan.strength], ['stretch', '伸展', plan.stretch]
    ].map(function (x) { return h('li', null, [h('span', { class: 'dot ' + x[0] }), h('span', { text: x[1] }), h('b', { text: x[2] + ' 分鐘' })]); }));
  }

  function finish() {
    var lv = R.composeLevel(draft);
    var chosen = draft._chosen && lv.allowedTotals.indexOf(draft._chosen) >= 0 ? draft._chosen : null;
    var p = JSON.parse(JSON.stringify(draft));
    delete p._chosen;
    delete p.skipped;
    p.createdAt = p.createdAt || R.today();
    p.updatedAt = new Date().toISOString();
    App.Store.set('profile', p);
    App.saveSettings({ chosenTotal: chosen, customSplit: null });
    draft = null; step = 0;
    App.toast('餐盤排好了');
    App.go('home');
  }

  var root;
  function render() {
    root.innerHTML = '';
    root.appendChild(h('div', { class: 'progress-dots', 'aria-label': '第 ' + (step + 1) + ' 步，共 ' + STEPS.length + ' 步' },
      STEPS.map(function (n, i) { return h('span', { class: 'pdot' + (i <= step ? ' on' : '') }); })));
    root.appendChild(h('h2', { class: 'step-title', text: STEPS[step] }));
    root.appendChild(h('div', { class: 'form' }, stepBody()));
    var err = h('p', { class: 'error', role: 'alert' });
    root.appendChild(err);
    root.appendChild(h('div', { class: 'btn-row sticky' }, [
      step > 0 ? h('button', { type: 'button', class: 'btn ghost', text: '上一步', onclick: function () { step--; render(); window.scrollTo(0, 0); } }) : (App.profile() ? h('button', { type: 'button', class: 'btn ghost', text: '取消', onclick: function () { draft = null; step = 0; App.go('settings'); } })
        : h('button', { type: 'button', class: 'btn ghost', text: '先跳過', onclick: function () { var w = draft && draft.wantTotal; draft = null; step = 0; App.skipOnboarding(w); App.toast('之後到「設定」可以回來填'); App.go('home'); } })),
      h('button', { type: 'button', class: 'btn primary', text: step === STEPS.length - 1 ? '開始我的餐盤' : '下一步', onclick: function () {
        var e = validate();
        if (e) { err.textContent = e; return; }
        if (step === STEPS.length - 1) { finish(); return; }
        step++; render(); window.scrollTo(0, 0);
      } })
    ]));
  }

  App.screens.onboarding = {
    title: '開始問卷',
    render: function (params) {
      if (!draft || (params && params.restart)) { draft = blank(); step = 0; }
      root = h('div', { class: 'screen onboarding' });
      render();
      return root;
    }
  };
})();
