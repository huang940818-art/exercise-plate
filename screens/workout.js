/* 肌力／伸展：手動輸入分鐘，或跟著做（計時器） */
(function () {
  'use strict';
  var App = window.App, R = App.R, h = App.h, Q = window.PlateQuestions;
  var TYPE_LABEL = { strength: '肌力', stretch: '伸展' };
  var EX_BY_ID = {};
  window.PlateExercises.forEach(function (e) { EX_BY_ID[e.id] = e; });

  var timer = null; // 計時器狀態
  function stopTimer() {
    if (timer && timer.iv) clearInterval(timer.iv);
    timer = null;
    if ('speechSynthesis' in window) try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
  }

  function exerciseCard(e, plan) {
    var secs = e.seconds ? (e.type === 'stretch' && plan.holdSeconds ? Math.max(e.seconds, plan.holdSeconds) : e.seconds) : null;
    return h('li', { class: 'ex-card' }, [
      h('div', { class: 'ex-fig' }, App.figure(e.pose)),
      h('div', { class: 'ex-info' }, [
        h('p', { class: 'ex-name' }, [e.name, e.balance ? h('span', { class: 'tag tag-balance', text: '平衡' }) : null]),
        h('p', { class: 'ex-dose', text: (secs ? secs + ' 秒' : e.reps + ' 下') + (e.sides === 2 ? '・左右各一次' : '') }),
        h('ol', { class: 'steps small' }, e.steps.map(function (t) { return h('li', { text: t }); }))
      ])
    ]);
  }

  // ---------- 手動輸入 ----------
  function manualView(type, root) {
    var state = { minutes: type === 'stretch' ? 10 : 20, date: R.today(), activity: null, balance: false };
    var ACTS = type === 'strength'
      ? [{ value: '徒手', label: '徒手' }, { value: '啞鈴／水瓶', label: '啞鈴／水瓶' }, { value: '彈力帶', label: '彈力帶' }, { value: '健身房器材', label: '健身房器材' }, { value: '其他', label: '其他' }]
      : [{ value: '伸展操', label: '伸展操' }, { value: '瑜伽', label: '瑜伽' }, { value: '平衡動作', label: '平衡動作' }, { value: '其他', label: '其他' }];
    var dateInput = h('input', { type: 'date', class: 'date-input', value: state.date, max: R.today() });
    dateInput.addEventListener('change', function () { state.date = dateInput.value || R.today(); });
    var err = h('p', { class: 'error', role: 'alert' });
    return [
      App.card('form', [
        h('h3', { class: 'card-title', text: '做了什麼' }),
        App.chips(ACTS, null, false, function (v) { state.activity = v; state.balance = v === '平衡動作'; })
      ]),
      App.card('form', [
        h('h3', { class: 'card-title', text: '做了多久' }),
        App.minutesInput(state.minutes, function (v) { state.minutes = v; }),
        h('p', { class: 'hint', text: '分鐘會填進餐盤的' + TYPE_LABEL[type] + '那塊。' }),
        App.field('日期', dateInput)
      ]),
      type === 'stretch' ? h('button', { type: 'button', class: 'btn ghost', onclick: function () { App.go('workout', { type: type, mode: 'setup' }); } }, [App.icon('play'), h('span', { text: '不知道做什麼？跟著做伸展' })]) : null,
      err,
      h('div', { class: 'btn-row sticky' }, [
        h('button', { type: 'button', class: 'btn primary', text: '存起來', onclick: function () {
          if (!(state.minutes > 0)) { err.textContent = '分鐘要大於 0。'; return; }
          if (state.date > R.today()) { err.textContent = '不能記未來的日期。'; return; }
          var log = { date: state.date, kind: type, minutes: state.minutes, source: 'manual' };
          if (state.activity) log.activity = state.activity;
          if (state.balance) log.balance = true;
          App.addLog(log);
          App.toast('記好了，' + TYPE_LABEL[type] + ' +' + state.minutes + ' 分鐘');
          App.go('home');
        } })
      ])
    ];
  }

  // ---------- 跟著做：準備 ----------
  function setupView(type, plan) {
    var st = App.settings();
    var equip = st.equipment && st.equipment.length ? st.equipment : ['none'];
    var listBox = h('div');
    var seed = R.today() + type;
    var routine;
    function draw() {
      routine = R.pickRoutine(window.PlateExercises, { type: type, equipment: equip, plan: plan, seed: seed });
      var tl = R.buildTimeline(routine.items, { holdSeconds: plan.holdSeconds });
      listBox.innerHTML = '';
      routine.notes.forEach(function (n) { listBox.appendChild(h('p', { class: 'notice info', text: n })); });
      if (!routine.items.length) return;
      listBox.appendChild(h('p', { class: 'routine-meta', text: '這一回 ' + routine.items.length + ' 個動作，大約 ' + tl.minutes + ' 分鐘' }));
      listBox.appendChild(h('ul', { class: 'ex-list' }, routine.items.map(function (e) { return exerciseCard(e, plan); })));
    }
    draw();
    var out = [
      App.card('form', [
        h('h3', { class: 'card-title', text: '身邊有什麼器材？' }),
        App.chips(Q.equipment.map(function (e) { return { value: e.id, label: e.label }; }), equip, true, function (v) {
          equip = v.length ? v : ['none'];
          App.saveSettings({ equipment: equip });
          draw();
        }),
        plan.avoid.length ? h('p', { class: 'hint', text: '已避開' + plan.avoid.map(function (a) { return R.AREA_LABEL[a]; }).join('、') + '容易不舒服的動作。' }) : null,
        plan.balance && type === 'stretch' ? h('p', { class: 'hint', text: '65 歲以上，這回會放平衡動作。' }) : null
      ]),
      listBox,
      h('div', { class: 'btn-row sticky' }, [
        h('button', { type: 'button', class: 'btn ghost', text: '換一組', onclick: function () { seed = seed + 'x'; draw(); } }),
        h('button', { type: 'button', class: 'btn primary', onclick: function () {
          if (!routine.items.length) { App.toast('沒有可以做的動作，多勾幾樣器材試試'); return; }
          App.go('workout', { type: type, mode: 'timer', items: routine.items.map(function (e) { return e.id; }) });
        } }, [App.icon('play'), h('span', { text: '開始' })])
      ])
    ];
    return out;
  }

  // ---------- 跟著做：計時器 ----------
  function timerView(type, plan, ids) {
    var items = ids.map(function (id) { return EX_BY_ID[id]; }).filter(Boolean);
    var tl = R.buildTimeline(items, { holdSeconds: plan.holdSeconds });
    var steps = [{ kind: 'prep', seconds: 5, nextName: items[0].name }].concat(tl.steps);
    var hasBalance = items.some(function (e) { return e.balance; });

    var root = h('div', { class: 'timer' });
    var stageLabel = h('p', { class: 'timer-stage' });
    var nameEl = h('p', { class: 'timer-name' });
    var sideEl = h('p', { class: 'timer-side', 'aria-live': 'assertive' });
    var figBox = h('div', { class: 'timer-fig' });
    var bigNum = h('p', { class: 'timer-num', 'aria-live': 'off' });
    var dose = h('p', { class: 'timer-dose' });
    var stepsBox = h('ol', { class: 'steps' });
    var nextEl = h('p', { class: 'timer-next' });
    var bar = h('span', { class: 'bar-fill ' + type });
    var pauseBtn = h('button', { type: 'button', class: 'round-btn', 'aria-label': '暫停' }, App.icon('pause'));
    var voiceBtn = h('button', { type: 'button', class: 'voice-btn' });

    function drawVoice() {
      var on = App.settings().voice;
      voiceBtn.innerHTML = '';
      voiceBtn.appendChild(App.icon(on ? 'speaker' : 'mute'));
      voiceBtn.appendChild(h('span', { text: on ? '語音開' : '語音關' }));
      voiceBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    voiceBtn.onclick = function () { App.saveSettings({ voice: !App.settings().voice }); drawVoice(); if (App.settings().voice) App.speak('語音提示開啟'); };
    drawVoice();

    timer = { i: 0, remaining: steps[0].seconds, paused: false, endAt: 0, elapsed: 0, lastTick: 0, iv: null };

    function showStep() {
      var st = steps[timer.i];
      var ex = st.exId ? EX_BY_ID[st.exId] : null;
      root.className = 'timer ' + st.kind;
      figBox.innerHTML = '';
      stepsBox.innerHTML = '';
      sideEl.textContent = '';
      dose.textContent = '';
      if (st.kind === 'prep') {
        stageLabel.textContent = '準備';
        nameEl.textContent = '準備開始';
        nextEl.textContent = '第一個：' + st.nextName;
        App.speak('準備開始，第一個動作：' + st.nextName);
      } else if (st.kind === 'rest') {
        stageLabel.textContent = '休息一下';
        nameEl.textContent = '喝口水、深呼吸';
        nextEl.textContent = '下一個：' + st.nextName;
        figBox.appendChild(App.figure(EX_BY_ID[steps[timer.i + 1].exId].pose));
        App.speak('休息一下，下一個是' + st.nextName);
      } else {
        stageLabel.textContent = '第 ' + (st.index + 1) + '／' + items.length + ' 個';
        nameEl.textContent = st.name;
        figBox.appendChild(App.figure(ex.pose));
        ex.steps.forEach(function (t) { stepsBox.appendChild(h('li', { text: t })); });
        if (st.side) sideEl.textContent = (st.switchSide ? '換邊！' : '') + st.side;
        dose.textContent = st.reps ? '做 ' + st.reps + ' 下，慢慢來' : '保持住';
        var nx = steps[timer.i + 1];
        var nextWork = steps.slice(timer.i + 1).filter(function (x) { return x.kind === 'work'; })[0];
        nextEl.textContent = nx && nx.kind === 'work' && nx.exId === st.exId ? '下一步：換邊' : (nextWork ? '下一個：' + nextWork.name : '這是最後一個');
        if (st.switchSide) {
          App.speak('換邊，' + st.side);
          App.animate(sideEl, [{ transform: 'scale(1.4)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-out' });
        } else {
          App.speak(st.name + (st.side ? '，先做' + st.side : '') + (st.reps ? '，' + st.reps + '下' : '，' + st.seconds + '秒'));
        }
      }
      timer.remaining = st.seconds;
      timer.endAt = Date.now() + st.seconds * 1000;
      tick(true);
    }

    function tick(force) {
      if (!timer) return;
      var now = Date.now();
      if (!timer.paused) {
        if (timer.lastTick) timer.elapsed += (now - timer.lastTick) / 1000;
        timer.lastTick = now;
        timer.remaining = Math.max(0, (timer.endAt - now) / 1000);
      }
      var shown = Math.ceil(timer.remaining);
      if (force || bigNum.textContent !== String(shown)) {
        bigNum.textContent = String(shown);
        if (!force && shown <= 3 && shown > 0 && steps[timer.i].kind !== 'prep') App.speak(String(shown));
      }
      var done = steps.slice(0, timer.i).reduce(function (s, x) { return s + x.seconds; }, 0) + (steps[timer.i].seconds - timer.remaining);
      var total = steps.reduce(function (s, x) { return s + x.seconds; }, 0);
      bar.style.width = Math.min(100, done / total * 100) + '%';
      if (!timer.paused && timer.remaining <= 0) next();
    }

    function next() {
      if (timer.i >= steps.length - 1) { finish(true); return; }
      timer.i++;
      showStep();
    }

    function finish(completed) {
      var workSecs = Math.round(timer ? timer.elapsed : 0);
      stopTimer();
      var minutes = R.secondsToMinutes(workSecs);
      if (completed || workSecs >= 30) {
        App.addLog({ date: R.today(), kind: type, minutes: minutes, source: 'follow', count: items.length, balance: type === 'stretch' && hasBalance && completed });
      }
      App.go('workout', { type: type, mode: 'done', minutes: minutes, completed: completed, saved: completed || workSecs >= 30 });
    }

    pauseBtn.onclick = function () {
      if (!timer) return;
      timer.paused = !timer.paused;
      if (timer.paused) { pauseBtn.innerHTML = ''; pauseBtn.appendChild(App.icon('play')); pauseBtn.setAttribute('aria-label', '繼續'); }
      else { timer.endAt = Date.now() + timer.remaining * 1000; timer.lastTick = Date.now(); pauseBtn.innerHTML = ''; pauseBtn.appendChild(App.icon('pause')); pauseBtn.setAttribute('aria-label', '暫停'); }
      root.classList.toggle('paused', timer.paused);
    };

    root.appendChild(h('div', { class: 'timer-top' }, [h('div', { class: 'bar' }, bar), voiceBtn]));
    root.appendChild(stageLabel);
    root.appendChild(nameEl);
    root.appendChild(sideEl);
    root.appendChild(figBox);
    root.appendChild(bigNum);
    root.appendChild(dose);
    root.appendChild(stepsBox);
    root.appendChild(nextEl);
    root.appendChild(h('div', { class: 'timer-controls' }, [
      h('button', { type: 'button', class: 'round-btn ghost', 'aria-label': '結束', onclick: function () {
        if (timer) timer.paused = true;
        var secs = Math.round(timer ? timer.elapsed : 0);
        App.overlay([
          h('p', { class: 'overlay-msg', text: secs >= 30 ? '要先結束嗎？已經做了大約 ' + R.secondsToMinutes(secs) + ' 分鐘，會幫你記下來。' : '要先結束嗎？還不到 30 秒，這次不會記錄。' }),
          h('div', { class: 'btn-row' }, [
            h('button', { type: 'button', class: 'btn ghost', text: '繼續做', onclick: function () { App.closeOverlay(); if (timer) { timer.paused = false; timer.endAt = Date.now() + timer.remaining * 1000; timer.lastTick = Date.now(); root.classList.remove('paused'); pauseBtn.innerHTML = ''; pauseBtn.appendChild(App.icon('pause')); } } }),
            h('button', { type: 'button', class: 'btn primary', text: '結束', onclick: function () { App.closeOverlay(); finish(false); } })
          ])
        ], { dismissable: false });
      } }, App.icon('stop')),
      pauseBtn,
      h('button', { type: 'button', class: 'round-btn ghost', 'aria-label': '跳到下一個', onclick: function () { if (timer) { timer.lastTick = Date.now(); next(); } } }, App.icon('skip'))
    ]));

    showStep();
    timer.lastTick = Date.now();
    timer.iv = setInterval(function () { tick(false); }, 200);
    return root;
  }

  function doneView(type, params) {
    var plan = App.plan();
    var prog = App.progress(plan);
    var root = h('div', { class: 'done-view' }, [
      h('div', { class: 'pizza-wrap small' }, App.pizza(plan, prog)),
      h('p', { class: 'done-title', text: params.completed ? '做完一回了' : '先做到這裡' }),
      h('p', { class: 'lead', text: params.saved ? TYPE_LABEL[type] + ' +' + params.minutes + ' 分鐘，已經填進餐盤。' : '這次時間太短，沒有記錄。' }),
      params.saved && plan.avoid.length ? h('p', { class: 'hint', text: '提醒：運動中疼痛不超過 3 分、隔天回到原本程度才算安全；超過的話下次降一階。' }) : null,
      h('div', { class: 'btn-row' }, [h('button', { type: 'button', class: 'btn primary block', text: '回餐盤', onclick: function () { App.go('home'); } })])
    ]);
    return root;
  }

  App.screens.workout = {
    title: function (p) {
      var t = TYPE_LABEL[p.type] || '';
      if (p.mode === 'timer') return '跟著做' + t;
      if (p.mode === 'manual') return '記錄' + t;
      return t;
    },
    back: function (p) { return p.mode === 'timer' ? null : 'home'; },
    leave: stopTimer,
    render: function (params) {
      stopTimer();
      var type = params.type === 'stretch' ? 'stretch' : 'strength';
      var plan = App.plan();
      var root = h('div', { class: 'screen workout ' + type });
      // 11/11：肌力不做跟著做，兩種都直接輸入時間；伸展的跟著做留在輸入頁下面
      if (!params.mode || params.mode === 'manual' || (type === 'strength' && params.mode !== 'done')) { root.appendChild(h('div', { class: 'screen' }, manualView(type, root))); return root; }
      if (params.mode === 'setup') { root.appendChild(h('div', null, setupView(type, plan))); return root; }
      if (params.mode === 'timer') { root.appendChild(timerView(type, plan, params.items || [])); return root; }
      if (params.mode === 'done') { root.appendChild(doneView(type, params)); return root; }

      var prog = App.progress(plan);
      root.appendChild(h('div', { class: 'type-head ' + type }, [
        App.icon(type === 'strength' ? 'dumbbell' : 'leaf', 'lg'),
        h('div', null, [
          h('p', { class: 'type-title', text: '本週' + TYPE_LABEL[type] + ' ' + prog[type] + '／' + plan[type] + ' 分鐘' }),
          h('p', { class: 'hint', text: type === 'strength' ? '本週做了 ' + prog.strengthDays + ' 天，建議至少分 2 天做。每個動作 8–12 下，同一肌群隔一天再練。' : '每個動作 10–30 秒' + (plan.balance ? '（65 歲以上建議 30–60 秒）' : '') + '，每週至少 2–3 天。' })
        ])
      ]));
      root.appendChild(h('div', { class: 'choice-list' }, [
        h('button', { type: 'button', class: 'choice-btn ' + type, onclick: function () { App.go('workout', { type: type, mode: 'setup' }); } }, [
          App.icon('play', 'lg'), h('span', null, [h('b', { text: '跟著做' }), h('small', { text: '挑 5–6 個動作，計時器帶你做' })])
        ]),
        h('button', { type: 'button', class: 'choice-btn ghost', onclick: function () { App.go('workout', { type: type, mode: 'manual' }); } }, [
          App.icon('plus', 'lg'), h('span', null, [h('b', { text: '自己輸入分鐘' }), h('small', { text: '自己做的也算' })])
        ])
      ]));
      return root;
    }
  };
})();
