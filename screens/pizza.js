/* Pizza 餐盤、印章、火柴人示意圖（純繪圖；比例和分鐘都由 PlateRules 算好再丟進來） */
(function () {
  'use strict';
  var App = window.App, s = App.s;

  var COLORS = {
    aerobic: '#E2483A', aerobicLight: '#FBD3CC', micro: '#F08A3C', microLight: '#FDDCC0',
    strength: '#F6C34A', strengthLight: '#FDEBB8',
    stretch: '#4E9A4A', stretchLight: '#D5EBC9',
    crust: '#E3B672', crustDark: '#C8924A', dough: '#FBEBCB'
  };
  App.COLORS = COLORS;
  var LABEL = { aerobic: '有氧', micro: '微型', strength: '肌力', stretch: '伸展' };
  var KEYS = ['aerobic', 'micro', 'strength', 'stretch'];

  function polar(cx, cy, r, deg) {
    var rad = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  function f(n) { return Math.round(n * 100) / 100; }
  /** 扇形（r0=0）或環形扇 */
  function arcPath(cx, cy, r0, r1, a0, a1) {
    if (r1 <= 0.01 || a1 - a0 <= 0.01) return '';
    if (a1 - a0 >= 359.99) a1 = a0 + 359.99;
    var large = a1 - a0 > 180 ? 1 : 0;
    var p1 = polar(cx, cy, r1, a0), p2 = polar(cx, cy, r1, a1);
    if (r0 <= 0.01) {
      return 'M' + cx + ' ' + cy + 'L' + f(p1[0]) + ' ' + f(p1[1]) + 'A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + f(p2[0]) + ' ' + f(p2[1]) + 'Z';
    }
    var q1 = polar(cx, cy, r0, a1), q2 = polar(cx, cy, r0, a0);
    return 'M' + f(p1[0]) + ' ' + f(p1[1]) + 'A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + f(p2[0]) + ' ' + f(p2[1]) +
      'L' + f(q1[0]) + ' ' + f(q1[1]) + 'A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + f(q2[0]) + ' ' + f(q2[1]) + 'Z';
  }

  function frac(x) { return x - Math.floor(x); }

  function topping(kind, x, y, i) {
    var rot = function (m) { return 'rotate(' + (i * m % 180) + ' ' + f(x) + ' ' + f(y) + ')'; };
    if (kind === 'aerobic') return s('g', null, [ // 臘腸
      s('circle', { cx: f(x), cy: f(y), r: 6.5, fill: '#B8322A' }),
      s('circle', { cx: f(x - 2), cy: f(y - 2), r: 1.5, fill: '#E7826F' }),
      s('circle', { cx: f(x + 2), cy: f(y + 1.5), r: 1.1, fill: '#E7826F' })
    ]);
    if (kind === 'micro') return s('circle', { cx: f(x), cy: f(y), r: 4.6, fill: 'none', stroke: '#E0701F', 'stroke-width': 2.4 }); // 甜椒圈
    if (kind === 'strength') return s('rect', { x: f(x - 5.5), y: f(y - 3.6), width: 11, height: 7.2, rx: 2.5, fill: '#FFE08A', stroke: '#D99A1E', 'stroke-width': 1, transform: rot(37) }); // 起司丁
    return s('ellipse', { cx: f(x), cy: f(y), rx: 6.5, ry: 3.3, fill: '#2F6E2B', transform: rot(53) }); // 羅勒葉
  }

  /** 每塊最多幾顆料、每顆代表幾分鐘 */
  function toppingPlan(span, target) {
    var max = Math.max(3, Math.min(14, Math.floor(span / 9)));
    return { max: max, unit: target > 0 ? target / max : 0 };
  }
  App.toppingPlan = toppingPlan;

  /**
   * @param {object} plan  planPlate 結果
   * @param {object} prog  weekProgress 結果
   * @param {{mini?:boolean, animate?:boolean, seen?:object}} opts  seen：上次看到的每塊料數，多出來的會跳出來
   */
  App.pizza = function (plan, prog, opts) {
    opts = opts || {};
    var size = 260, cx = 130, cy = 130, R = 104;
    var done = { aerobic: prog.aerobicShown, micro: prog.microShown, strength: prog.strength, stretch: prog.stretch };
    var svg = s('svg', { viewBox: opts.mini ? '0 0 260 260' : '-10 -10 280 280', class: 'pizza' + (opts.mini ? ' mini' : ''), role: 'img',
      'aria-label': '本週餐盤：' + KEYS.map(function (k) { return LABEL[k] + ' ' + Math.round(done[k] || 0) + '／' + (plan[k] || 0) + ' 分鐘'; }).join('，') });
    var parts = KEYS.map(function (k) { return { key: k, min: plan[k] || 0, light: COLORS[k + 'Light'], color: COLORS[k] }; });
    var a = 0;
    parts.forEach(function (p) {
      var span = plan.total ? p.min / plan.total * 360 : 90;
      p.a0 = a; p.a1 = a + span; a = p.a1;
      p.tp = toppingPlan(span, p.min);
      p.count = Math.min(p.tp.max, p.tp.unit > 0 ? Math.ceil((done[p.key] || 0) / p.tp.unit - 1e-9) : 0); // 記了就至少一顆
    });
    App.lastToppings = {}; parts.forEach(function (p) { App.lastToppings[p.key] = p.count; });

    function draw(tAngle, tFill, withTop) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (!opts.mini) {
        svg.appendChild(s('circle', { cx: cx, cy: cy, r: 136, fill: '#FFFFFF', stroke: '#E8DCC8', 'stroke-width': 2 }));
        svg.appendChild(s('circle', { cx: cx, cy: cy, r: 128, fill: 'none', stroke: '#F1E7D6', 'stroke-width': 1.5 }));
      }
      svg.appendChild(s('circle', { cx: cx, cy: cy, r: 122, fill: COLORS.crustDark }));
      svg.appendChild(s('circle', { cx: cx, cy: cy, r: 118, fill: COLORS.crust }));
      for (var d = 0; d < 360; d += 24) { var pt = polar(cx, cy, 112, d + 7); svg.appendChild(s('circle', { cx: f(pt[0]), cy: f(pt[1]), r: 1.6, fill: COLORS.crustDark, opacity: 0.6 })); }
      svg.appendChild(s('circle', { cx: cx, cy: cy, r: R + 2, fill: COLORS.dough }));
      parts.forEach(function (p) {
        var a0 = p.a0 * tAngle, a1 = p.a1 * tAngle;
        svg.appendChild(s('path', { d: arcPath(cx, cy, 0, R, a0, a1), fill: p.light }));
        var r = R * Math.sqrt(prog.fill[p.key] || 0) * tFill;
        svg.appendChild(s('path', { d: arcPath(cx, cy, 0, r, a0, a1), fill: p.color, opacity: 0.85 }));
      });
      if (withTop && !opts.mini) {
        var gTop = s('g', { class: 'toppings' });
        parts.forEach(function (p) {
          var span = p.a1 - p.a0, old = opts.seen ? (opts.seen[p.key] || 0) : p.count;
          for (var i = 0; i < p.count; i++) {
            var ang = p.a0 + span * (0.14 + 0.72 * frac(i * 0.618 + 0.21));
            var rr = R * (0.3 + 0.58 * Math.sqrt(frac(i * 0.3819 + 0.47)));
            var pt2 = polar(cx, cy, rr, ang);
            var tg = topping(p.key, pt2[0], pt2[1], i);
            if (i >= old) { tg.setAttribute('class', 'new-topping'); tg.style.animationDelay = (0.15 * (i - old)) + 's'; }
            gTop.appendChild(tg);
          }
        });
        svg.appendChild(gTop);
      }
      parts.forEach(function (p) {
        var e = polar(cx, cy, R + 2, p.a0 * tAngle);
        svg.appendChild(s('line', { x1: cx, y1: cy, x2: f(e[0]), y2: f(e[1]), stroke: COLORS.crust, 'stroke-width': 3, 'stroke-linecap': 'round' }));
      });
      svg.appendChild(s('circle', { cx: cx, cy: cy, r: 4, fill: COLORS.crust }));
      if (!opts.mini && tAngle >= 1) {
        // 名字做成小牌子插在每塊上，蓋在料上面
        parts.forEach(function (p) {
          if (p.a1 - p.a0 < 1) return;
          var mid = (p.a0 + p.a1) / 2, rr = (p.a1 - p.a0) < 60 ? R * 0.7 : R * 0.6;
          var lp = polar(cx, cy, rr, mid);
          var txt = LABEL[p.key], w = txt.length * 13 + 14;
          svg.appendChild(s('g', { class: 'slice-tag' }, [
            s('rect', { x: f(lp[0] - w / 2), y: f(lp[1] - 10), width: w, height: 20, rx: 10, fill: '#FFFDF7', stroke: p.color, 'stroke-width': 2 }),
            s('text', { x: f(lp[0]), y: f(lp[1] + 4.5), 'text-anchor': 'middle', class: 'slice-label' }, txt)
          ]));
        });
      }
    }

    if (opts.animate && !App.reducedMotion && window.requestAnimationFrame) {
      draw(0, 0, false);
      var t0 = null, D1 = 750, D2 = 500;
      var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
      var step = function (ts) {
        if (t0 === null) t0 = ts;
        var e = ts - t0;
        var ta = ease(Math.min(1, e / D1)), tf = e < D1 ? 0 : ease(Math.min(1, (e - D1) / D2));
        var end = e >= D1 + D2;
        draw(ta, tf, end);
        if (!end) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } else {
      draw(1, 1, true);
    }
    return svg;
  };

  /** 圓形印章。kind: stamp | rest | empty */
  App.stampSvg = function (kind, label) {
    var svg = s('svg', { viewBox: '0 0 100 100', class: 'stamp-svg ' + kind, 'aria-hidden': 'true' });
    if (kind === 'empty') {
      svg.appendChild(s('circle', { cx: 50, cy: 50, r: 42, fill: 'none', stroke: '#D9C6A8', 'stroke-width': 3, 'stroke-dasharray': '6 6' }));
      return svg;
    }
    var c = kind === 'rest' ? '#9A8E80' : '#C8432F';
    svg.appendChild(s('circle', { cx: 50, cy: 50, r: 44, fill: 'none', stroke: c, 'stroke-width': 4 }));
    svg.appendChild(s('circle', { cx: 50, cy: 50, r: 37, fill: 'none', stroke: c, 'stroke-width': 1.5 }));
    if (kind === 'rest') {
      svg.appendChild(s('path', { d: 'M38 44a14 14 0 1 0 24 -10a11 11 0 1 1 -24 10z', fill: c, opacity: 0.85 }));
    } else {
      // 小 pizza
      svg.appendChild(s('path', { d: arcPath(50, 44, 0, 18, 0, 120), fill: c }));
      svg.appendChild(s('path', { d: arcPath(50, 44, 0, 18, 122, 240), fill: c, opacity: 0.7 }));
      svg.appendChild(s('path', { d: arcPath(50, 44, 0, 18, 242, 358), fill: c, opacity: 0.45 }));
    }
    svg.appendChild(s('text', { x: 50, y: 78, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: c }, label || ''));
    return svg;
  };

  // ---------- 火柴人 ----------
  var CHAIR = [[64, 50, 64, 86], [64, 64, 86, 64, 86, 86], [86, 64, 86, 40]];
  var POSES = {
    stand: { head: [50, 15], lines: [[50, 23, 50, 55], [50, 30, 38, 48], [50, 30, 62, 48], [50, 55, 42, 86], [50, 55, 58, 86]] },
    'stand-neck': { head: [57, 17], lines: [[50, 25, 50, 55], [50, 30, 40, 48], [50, 30, 60, 48], [50, 55, 42, 86], [50, 55, 58, 86]] },
    'stand-chest': { head: [50, 15], lines: [[50, 23, 50, 55], [50, 32, 22, 34], [50, 32, 78, 34], [50, 55, 42, 86], [50, 55, 58, 86]] },
    'stand-crossarm': { head: [50, 15], lines: [[50, 23, 50, 55], [50, 32, 30, 36], [50, 32, 42, 42, 32, 36], [50, 55, 42, 86], [50, 55, 58, 86]] },
    'arms-up': { head: [50, 17], lines: [[50, 25, 50, 56], [50, 31, 38, 6], [50, 31, 62, 6], [50, 56, 42, 86], [50, 56, 58, 86]] },
    curl: { head: [50, 15], lines: [[50, 23, 50, 55], [50, 30, 44, 48, 44, 36], [50, 30, 56, 48, 56, 36], [50, 55, 42, 86], [50, 55, 58, 86]], props: [[40, 34, 48, 34], [52, 34, 60, 34]] },
    squat: { head: [40, 26], lines: [[42, 34, 34, 60], [34, 60, 58, 62, 54, 86], [40, 42, 72, 44]] , props: [[10, 87, 90, 87]] },
    wallsit: { head: [28, 26], lines: [[28, 34, 28, 60], [28, 60, 56, 62, 56, 87], [28, 42, 46, 54]], props: [[18, 6, 18, 88], [10, 88, 90, 88]] },
    lunge: { head: [48, 12], lines: [[48, 20, 48, 50], [48, 50, 68, 64, 68, 87], [48, 50, 34, 70, 18, 86], [48, 28, 40, 44], [48, 28, 56, 44]], props: [[8, 88, 92, 88]] },
    plank: { head: [20, 48], lines: [[27, 52, 86, 72], [32, 54, 32, 76, 44, 76]], props: [[8, 78, 94, 78]] },
    wallpush: { head: [62, 22], lines: [[60, 30, 42, 64], [42, 64, 34, 87], [42, 64, 40, 87], [58, 34, 80, 32], [58, 36, 80, 40]], props: [[82, 6, 82, 88], [10, 88, 90, 88]] },
    bridge: { head: [14, 72], lines: [[21, 74, 50, 56], [50, 56, 66, 48, 76, 76], [24, 76, 40, 78]], props: [[6, 80, 94, 80]] },
    'side-lie': { head: [14, 62], lines: [[21, 64, 56, 68], [56, 68, 72, 54, 62, 76], [56, 68, 74, 72, 62, 78], [22, 62, 22, 50]], props: [[6, 82, 94, 82]] },
    'sit-reach': { head: [52, 26], lines: [[40, 62, 50, 34], [40, 62, 84, 76], [48, 40, 66, 64]], props: [[30, 62, 50, 62], [30, 62, 30, 88], [50, 62, 50, 88], [30, 62, 30, 36], [10, 88, 92, 88]] },
    'sit-twist': { head: [44, 20], lines: [[44, 28, 44, 58], [44, 58, 66, 58, 66, 87], [44, 36, 30, 46], [44, 36, 60, 40]], props: [[30, 60, 52, 60], [30, 60, 30, 88], [52, 60, 52, 88], [30, 60, 30, 34], [10, 88, 92, 88]] },
    quad: { head: [42, 15], lines: [[42, 23, 42, 55], [42, 55, 42, 87], [42, 55, 48, 72, 34, 62], [42, 30, 36, 58], [42, 30, 64, 44]], props: CHAIR },
    calf: { head: [64, 18], lines: [[40, 56, 60, 26], [58, 32, 84, 32], [40, 56, 58, 70, 58, 87], [40, 56, 20, 87]], props: [[86, 6, 86, 88], [10, 88, 90, 88]] },
    'all-fours': { head: [18, 40], lines: [[26, 46, 70, 46], [30, 46, 30, 76], [70, 46, 70, 76, 92, 76]], props: [[6, 78, 96, 78]] },
    child: { head: [26, 72], lines: [[72, 62, 34, 70], [34, 72, 8, 78], [72, 62, 72, 78, 92, 78]], props: [[4, 80, 96, 80]] },
    oneleg: { head: [42, 15], lines: [[42, 23, 42, 55], [42, 55, 42, 87], [42, 55, 54, 64, 50, 78], [42, 30, 64, 44], [42, 30, 30, 46]], props: CHAIR },
    walk: { head: [50, 14], lines: [[50, 22, 48, 54], [50, 30, 38, 44], [50, 30, 62, 42], [48, 54, 36, 86], [48, 54, 62, 84]], props: [[10, 88, 90, 88]] },
    row: { head: [74, 30], lines: [[36, 56, 66, 36], [62, 38, 62, 62], [46, 50, 30, 64], [36, 56, 34, 87], [38, 56, 48, 87]], props: [[56, 62, 68, 62], [14, 64, 34, 64], [14, 64, 14, 88], [30, 64, 30, 88], [10, 88, 92, 88]] },
    hinge: { head: [76, 30], lines: [[44, 56, 70, 36], [66, 38, 66, 64], [44, 56, 44, 87], [44, 56, 52, 87]], props: [[60, 64, 72, 64], [10, 88, 92, 88]] }
  };
  App.figure = function (pose) {
    var p = POSES[pose] || POSES.stand;
    var svg = s('svg', { viewBox: '0 0 100 100', class: 'figure', 'aria-hidden': 'true' });
    (p.props || []).forEach(function (l) { svg.appendChild(s('polyline', { points: l.join(' '), fill: 'none', stroke: '#C9B79C', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })); });
    p.lines.forEach(function (l) { svg.appendChild(s('polyline', { points: l.join(' '), fill: 'none', stroke: '#4A3426', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })); });
    svg.appendChild(s('circle', { cx: p.head[0], cy: p.head[1], r: 8, fill: '#FFF8EC', stroke: '#4A3426', 'stroke-width': 4.5 }));
    return svg;
  };
})();
