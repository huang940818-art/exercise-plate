/* 記錄有氧／微型運動 */
(function () {
  'use strict';
  var App = window.App, R = App.R, h = App.h, Q = window.PlateQuestions;
  var ORDER = ['light', 'moderate', 'vigorous'];

  App.screens.record = {
    title: function (p) { return p.kind === 'micro' ? '記錄微型運動' : '記錄有氧'; },
    back: 'home',
    render: function (params) {
      var kind = params.kind === 'micro' ? 'micro' : 'aerobic';
      var plan = App.plan();
      var capIdx = ORDER.indexOf(plan.intensityCap);
      var state = { activity: null, intensity: 'moderate', minutes: kind === 'micro' ? 5 : 30, date: R.today() };
      if (capIdx < 1) state.intensity = 'light';

      var root = h('div', { class: 'screen record' });
      var preview = h('p', { class: 'credit-preview', 'aria-live': 'polite' });
      var minutesBox = h('div');

      function updatePreview() {
        var c = R.aerobicCredit(state.intensity, state.minutes, plan.intensityCap);
        if (state.intensity === 'light' && c > 0) preview.textContent = '會算進餐盤 ' + c + ' 分鐘。';
        else if (state.intensity === 'light') preview.textContent = '輕強度會記錄下來，但不算進餅裡（WHO 2020：輕度不算中高強度活動）。';
        else preview.textContent = '會算進' + (kind === 'micro' ? '微型運動 ' : '有氧 ') + c + ' 分鐘' + (state.intensity === 'vigorous' ? '（高強度 1 分鐘算 2 分鐘）' : '') + '。';
      }
      function drawMinutes() {
        minutesBox.innerHTML = '';
        minutesBox.appendChild(App.minutesInput(state.minutes, function (v) { state.minutes = v; updatePreview(); }, { step: kind === 'micro' ? 1 : 5 }));
      }

      // 活動
      var options;
      if (kind === 'micro') {
        var avoid = (plan.avoid || []).concat(plan.blocked || []);
        options = window.PlateExercises.filter(function (e) { return e.type === 'micro'; }).map(function (e) {
          var bad = e.avoid.some(function (a) { return avoid.indexOf(a) >= 0; });
          return { value: e.id, label: e.name, sub: bad ? '你勾的部位不建議' : null, disabled: bad, ex: e };
        });
      } else {
        options = window.PlateActivities.map(function (a) {
          return { value: a.id, label: a.name, sub: plan.lowImpact && a.lowImpact ? '低衝擊' : null, act: a };
        });
      }
      var intensityBox = h('div', { class: 'intensity-list', role: 'radiogroup', 'aria-label': '強度' });
      function drawIntensity() {
        intensityBox.innerHTML = '';
        Q.intensity.forEach(function (it, i) {
          var disabled = i > capIdx;
          var on = state.intensity === it.id;
          intensityBox.appendChild(h('button', {
            type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', disabled: disabled || null,
            class: 'intensity-opt ' + it.id + (on ? ' on' : '') + (disabled ? ' disabled' : ''),
            onclick: function () { state.intensity = it.id; drawIntensity(); updatePreview(); }
          }, [
            h('span', { class: 'int-label', text: it.label + '強度' }),
            h('span', { class: 'int-talk', text: '談話測試：' + it.talk }),
            disabled ? h('span', { class: 'int-lock', text: '目前健康篩檢建議先不要' }) : (!it.counts && plan.intensityCap !== 'light' ? h('span', { class: 'int-lock', text: '記錄但不算分' }) : null)
          ]));
        });
      }

      var actChips = App.chips(options, null, false, function (v) {
        var o = options.filter(function (x) { return x.value === v; })[0];
        state.activity = o.label;
        var def = o.ex ? o.ex.intensity : o.act.defaultIntensity;
        if (ORDER.indexOf(def) <= capIdx) state.intensity = def;
        if (o.ex) { state.minutes = Math.max(1, Math.round(o.ex.seconds / 60)); drawMinutes(); }
        drawIntensity(); updatePreview();
        exHint.innerHTML = '';
        if (o.ex) o.ex.steps.forEach(function (t) { exHint.appendChild(h('li', { text: t })); });
      });
      var exHint = h('ul', { class: 'steps small' });

      root.appendChild(App.card('form', [
        h('h3', { class: 'card-title', text: kind === 'micro' ? '做了什麼' : '選活動' }),
        kind === 'micro' ? h('p', { class: 'hint', text: '室外走路、爬樓梯、走去辦事，幾分鐘都算，會填進餐盤的「微型運動」那塊。' }) : null,
        plan.lowImpact && kind === 'aerobic' ? h('p', { class: 'hint', text: '你勾了膝蓋不舒服，建議選標「低衝擊」的活動。' }) : null,
        actChips, exHint
      ]));
      root.appendChild(App.card('form', [h('h3', { class: 'card-title', text: '強度' }), intensityBox]));
      var dateInput = h('input', { type: 'date', class: 'date-input', value: state.date, max: R.today() });
      dateInput.addEventListener('change', function () { state.date = dateInput.value || R.today(); });
      root.appendChild(App.card('form', [
        h('h3', { class: 'card-title', text: '做了多久' }), minutesBox, preview,
        App.field('日期', dateInput)
      ]));
      var err = h('p', { class: 'error', role: 'alert' });
      root.appendChild(err);
      root.appendChild(h('div', { class: 'btn-row sticky' }, [
        h('button', { type: 'button', class: 'btn primary block', text: '存起來', onclick: function () {
          if (!state.activity) { err.textContent = '先選一個活動。'; return; }
          if (!(state.minutes > 0)) { err.textContent = '分鐘要大於 0。'; return; }
          if (state.date > R.today()) { err.textContent = '不能記未來的日期。'; return; }
          App.addLog({ date: state.date, kind: kind, activity: state.activity, intensity: state.intensity, minutes: state.minutes, source: 'manual' });
          var c = R.aerobicCredit(state.intensity, state.minutes, plan.intensityCap);
          App.toast(c > 0 ? '記好了，' + (kind === 'micro' ? '微型運動' : '有氧') + ' +' + c + ' 分鐘' : '記好了（輕強度不算分）');
          App.go('home');
        } })
      ]));
      drawMinutes(); drawIntensity(); updatePreview();
      return root;
    }
  };
})();
