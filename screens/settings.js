/* 設定 */
(function () {
  'use strict';
  var App = window.App, R = App.R, h = App.h;

  var EQUIPMENT = [
    { value: 'none', label: '徒手', sub: '不用器材' },
    { value: 'bottle', label: '水瓶' },
    { value: 'dumbbell', label: '啞鈴' },
    { value: 'band', label: '彈力帶' },
    { value: 'chair', label: '椅子' }
  ];
  var KEYS = ['aerobic', 'micro', 'strength', 'stretch'];
  var LABEL = { aerobic: '有氧', micro: '微型運動', strength: '肌力', stretch: '伸展' };
  var STEP = 5;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /** 系統建議的餐盤（不含使用者自己配置的部分） */
  function suggestedPlan(total) {
    var p = App.profile();
    if (!p) return null;
    var input = {};
    Object.keys(p).forEach(function (k) { input[k] = p[k]; });
    input.chosenTotal = total || null;
    return R.planPlate(input, App.latestInbody());
  }

  function splitOf(plan) {
    return { total: plan.total, aerobic: plan.aerobic, micro: plan.micro, strength: plan.strength, stretch: plan.stretch };
  }

  function row(label, control, hint) {
    return h('div', { class: 'setting-row' }, [
      h('div', { class: 'setting-text' }, [h('span', { class: 'field-label', text: label }), hint ? h('span', { class: 'hint', text: hint }) : null]),
      control
    ]);
  }

  // ---------- 各區塊 ----------
  function profileCard() {
    var skipped = (App.profile() || {}).skipped;
    return App.card('settings-profile', [
      h('h3', { class: 'section-title', text: '我的狀況' }),
      h('p', { class: 'hint', text: skipped ? '健康問卷還沒填。現在的餐盤是最保守的起步盤，填完會照你的身體狀況重排。' : '身體狀況、運動習慣有變化時，重新填一次問卷，個人化運動建議會跟著更新。' }),
      h('button', { type: 'button', class: 'btn' + (skipped ? ' primary' : ''), onclick: function () { App.go('onboarding', { restart: true }); } }, [App.icon('chevron'), h('span', { text: skipped ? '填問卷' : '重做問卷' })])
    ]);
  }

  function equipmentCard() {
    var holder = h('div');
    function draw() {
      holder.innerHTML = '';
      var cur = App.settings().equipment || ['none'];
      holder.appendChild(App.chips(EQUIPMENT, cur, true, function (sel) {
        var prev = App.settings().equipment || [];
        var next = sel;
        var addedNone = sel.indexOf('none') >= 0 && prev.indexOf('none') < 0;
        if (addedNone) next = ['none'];
        else if (sel.length > 1) next = sel.filter(function (v) { return v !== 'none'; });
        if (!next.length) next = ['none'];
        App.saveSettings({ equipment: next });
        draw();
      }));
    }
    draw();
    return App.card('settings-equipment', [
      h('h3', { class: 'section-title', text: '身邊的器材' }),
      h('p', { class: 'hint', text: '跟著做的肌力動作會依照你有的器材挑選。' }),
      holder
    ]);
  }

  function voiceCard() {
    var on = !!App.settings().voice;
    var supported = 'speechSynthesis' in window;
    var btn = h('button', {
      type: 'button', class: 'toggle' + (on ? ' on' : ''), role: 'switch', 'aria-checked': on ? 'true' : 'false',
      'aria-label': '語音提示', disabled: !supported || null,
      onclick: function () {
        var v = !App.settings().voice;
        App.saveSettings({ voice: v });
        if (v) App.speak('語音提示已開啟');
        App.toast(v ? '語音提示已開啟' : '語音提示已關閉');
        App.render();
      }
    }, [App.icon(on ? 'speaker' : 'mute'), h('span', { text: on ? '開' : '關' })]);
    return App.card('settings-voice', [
      row('語音提示', btn, supported ? '跟著做的時候，用聲音提醒換動作和休息。' : '這個瀏覽器不支援語音。')
    ]);
  }

  function planCard(plan) {
    var st = App.settings();
    var custom = plan.mode === 'custom';
    var children = [
      h('h3', { class: 'section-title', text: '餐盤怎麼排' }),
      h('div', { class: 'segmented', role: 'radiogroup' }, [['suggest', '系統建議', '照問卷排'], ['custom', '自己配置', '分鐘、強度自己調']].map(function (m) {
        var on = (custom ? 'custom' : 'suggest') === m[0];
        return h('button', { type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', class: 'seg' + (on ? ' on' : ''), onclick: function () {
          if (on) return;
          if (m[0] === 'custom') App.saveSettings({ planMode: 'custom', chosenTotal: plan.total, chosenIntensity: plan.intensityCap, customSplit: splitOf(plan) });
          else App.saveSettings({ planMode: 'suggest' });
          App.toast(m[0] === 'custom' ? '改成自己配置' : '改回系統建議');
          App.render();
        } }, [h('b', { text: m[1] }), h('small', { text: m[2] })]);
      }))
    ];

    if (!custom) {
      children.push(h('p', { class: 'hint', text: '每週 ' + plan.total + ' 分鐘，強度：' + plan.intensityLabel + '。' }));
      children.push(h('ul', { class: 'split-list readonly' }, KEYS.map(function (k) {
        return h('li', { class: 'split-row' }, [h('span', { class: 'dot ' + k }), h('span', { class: 'split-main', text: LABEL[k] }), h('b', { text: plan[k] + ' 分鐘' })]);
      })));
      return App.card('settings-plan', children);
    }

    // 每週總量
    var allowed = [150, 300];
    children.push(h('p', { class: 'field-label', text: '每週總量' }));
    if (allowed.length > 1) {
      children.push(App.chips(allowed.map(function (t) { return { value: t, label: t + ' 分鐘', sub: t === 150 ? '起步盤' : '完整盤' }; }), plan.total, false, function (v) {
        var sp = suggestedPlan(v);
        App.saveSettings({ chosenTotal: v, customSplit: splitOf(sp) });
        App.render();
      }));
    } else {
      children.push(h('p', { class: 'hint', text: '依你的健康篩檢，先用 ' + plan.total + ' 分鐘起步盤。狀況改變、重填問卷後會開放 300。' }));
    }

    // 強度
    var capIdx = R.INTENSITY_ORDER.indexOf(plan.screenCap);
    children.push(h('p', { class: 'field-label', text: '強度上限' }));
    children.push(App.chips(R.INTENSITY_ORDER.map(function (k, i) {
      return { value: k, label: { light: '輕', moderate: '中', vigorous: '高' }[k], sub: i > capIdx ? '篩檢建議先問醫師' : null, disabled: i > capIdx };
    }), plan.intensityCap, false, function (v) {
      App.saveSettings({ chosenIntensity: v });
      App.render();
    }));
    if (capIdx < 2) children.push(h('p', { class: 'hint', text: '你的健康篩檢建議強度先到「' + R.INTENSITY_LABEL[plan.screenCap] + '」。取得醫師許可後重填問卷，就能往上調。' }));

    // 四塊分鐘
    var cur = splitOf(plan);
    var base = suggestedPlan(plan.total);
    var msg = h('p', { class: 'notice warn', hidden: true });
    function bump(key, delta) {
      var res = R.shiftSplit(plan.total, cur, key, delta);
      if (!res.ok) { msg.textContent = res.reason; msg.hidden = false; return; }
      var next = res.split; next.total = plan.total;
      App.saveSettings({ customSplit: next });
      App.render();
    }
    children.push(h('p', { class: 'field-label', text: '每塊幾分鐘' }));
    children.push(h('p', { class: 'hint', text: '一次調 ' + STEP + ' 分鐘，總量維持 ' + plan.total + ' 分鐘，其他塊會跟著讓出或補上。' }));
    children.push(h('ul', { class: 'split-list' }, KEYS.map(function (k) {
      var changed = base && cur[k] !== base[k];
      return h('li', { class: 'split-row' }, [
        h('span', { class: 'dot ' + k }),
        h('div', { class: 'split-main' }, [
          h('span', { class: 'legend-name', text: LABEL[k] }),
          h('small', { class: 'hint', text: changed ? '建議 ' + base[k] : '建議值' })
        ]),
        h('div', { class: 'stepper' }, [
          h('button', { type: 'button', class: 'step-btn', 'aria-label': LABEL[k] + '減 ' + STEP + ' 分鐘', onclick: function () { bump(k, -STEP); } }, App.icon('minus')),
          h('b', { class: 'split-val', 'aria-live': 'polite', text: String(cur[k]) }),
          h('button', { type: 'button', class: 'step-btn', 'aria-label': LABEL[k] + '加 ' + STEP + ' 分鐘', onclick: function () { bump(k, STEP); } }, App.icon('plus'))
        ])
      ]);
    })));
    children.push(msg);
    children.push(h('button', { type: 'button', class: 'btn ghost', onclick: function () {
      App.saveSettings({ customSplit: base ? splitOf(base) : null, chosenIntensity: null });
      App.toast('分鐘和強度回到建議值');
      App.render();
    } }, h('span', { text: '分鐘和強度回到建議值' })));
    return App.card('settings-plan', children);
  }

  function whyCard(plan) {
    var list = h('ol', { class: 'why-list' }, plan.applied.map(function (r) {
      return h('li', null, [
        h('p', { class: 'why-reason', text: r.白話理由 }),
        h('p', { class: 'why-source' }, [
          App.sourceTag(r),
          h('span', { class: 'src-text' + (r.類型 === '待查證' ? ' todo' : ''), text: r.出處 }),
          r.網址 ? h('a', { href: r.網址, target: '_blank', rel: 'noopener', class: 'src-link', text: '連結' }) : null
        ])
      ]);
    }));
    return h('details', { class: 'why' }, [
      h('summary', null, [h('span', { text: '為什麼這樣分' }), h('span', { class: 'why-count', text: plan.applied.length + ' 條' }), App.icon('chevron', 'chev')]),
      h('p', { class: 'hint', text: '「文獻」：數字直接來自指南或研究。「設計值」：方向有文獻支持、分鐘是我們訂的。「待查證」：出處還在確認。' }),
      list
    ]);
  }

  function dataCard() {
    return App.card('settings-data', [
      h('h3', { class: 'section-title', text: '資料' }),
      h('p', { class: 'hint', text: '所有資料只存在這台裝置的瀏覽器裡。' }),
      h('div', { class: 'btn-col' }, [
        h('button', { type: 'button', class: 'btn', onclick: function () {
          App.confirm('載入示範資料會覆蓋目前的紀錄、InBody 和集章冊，確定嗎？', '載入', function () {
            App.loadDemo();
            App.toast('已載入示範資料');
            App.go('home');
          });
        } }, [App.icon('play'), h('span', { text: '載入示範資料' })]),
        h('button', { type: 'button', class: 'btn', onclick: exportJSON }, [App.icon('chevron'), h('span', { text: '匯出資料（JSON）' })]),
        h('button', { type: 'button', class: 'btn danger', onclick: function () {
          App.confirm('要清除全部資料嗎？紀錄、InBody、集章冊都會刪掉。', '清除', function () {
            App.confirm('再確認一次：刪掉就救不回來了，建議先匯出備份。', '全部清除', function () {
              App.Store.clearAll();
              App.toast('資料已清除');
              App.go('onboarding');
            });
          });
        } }, [App.icon('trash'), h('span', { text: '清除全部資料' })])
      ])
    ]);
  }

  function exportJSON() {
    try {
      var data = JSON.stringify(App.Store.dump(), null, 2);
      var blob = new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var d = new Date();
      var a = h('a', { href: url, download: '運動餐盤-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.json' });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      App.toast('已匯出');
    } catch (e) {
      App.toast('匯出失敗');
    }
  }

  App.screens.settings = {
    title: '設定',
    tab: 'settings',
    render: function () {
      var plan = App.plan();
      var root = h('div', { class: 'screen settings' });
      root.appendChild(profileCard());
      if (plan) {
        root.appendChild(planCard(plan));
        root.appendChild(whyCard(plan));
      }
      root.appendChild(voiceCard());
      root.appendChild(dataCard());
      root.appendChild(h('p', { class: 'hint disclaimer', text: '這是個人化運動建議，不能取代醫師或專業人員評估。運動中如有胸痛、頭暈、呼吸困難等不適，請立即停止並就醫。' }));
      root.appendChild(h('p', { class: 'credit', text: '開發者　杯子蛋糕好好吃' }));
      return root;
    }
  };
})();
