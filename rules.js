/* 運動餐盤 規則引擎（純函式、不碰 DOM、不碰 localStorage）
 * 依據：運動餐盤 規則表 v1（跟規格衝突時以規則表為準）
 * 每一條會影響結果的規則，都會在 applied 裡留一筆：
 *   { id, 白話理由, 出處, 類型: '文獻' | '設計值' | '待查證', 網址? }
 *   - 文獻：數字直接來自指南／研究
 *   - 設計值：方向有文獻支持，具體分鐘／比例是我們訂的（之後依研究調整）
 *   - 待查證：出處還沒驗原始來源，畫面要用灰字標
 * 日期一律用本地時間的 'YYYY-MM-DD' 字串。
 */
(function (root) {
  'use strict';

  // ---------- 出處 ----------
  var WHO_URL = 'https://www.who.int/publications/i/item/9789240015128';
  var SRC = {
    PARQ: 'PAR-Q+ Collaboration, eparmedx.com',
    ACSM15: 'Riebe et al. 2015（ACSM 運動前篩檢建議）',
    GODIN: 'Amireault & Godin 2015（Godin 休閒運動問卷）',
    ACSM09: 'ACSM 2009 Progression Models in Resistance Training',
    WHO: 'WHO 2020 身體活動與久坐行為指引',
    PAG: 'Physical Activity Guidelines for Americans 2018',
    GARBER: 'Garber et al. 2011（ACSM 運動量與品質立場聲明）',
    BALANCED: 'WHO 2020、Garber 2011',
    VISCERAL: "Ismail 2012、Willis 2012、O'Donoghue 2021",
    LOWMUSCLE: 'Chen 2020 AWGS、Dent 2018',
    TOFI: 'Kobayashi 2023',
    SARCOBESE: 'Villareal 2017、Donini 2022',
    AWGS: 'Chen 2020（AWGS 2019 亞洲肌少症共識）',
    NMQ: 'Kuorinka 1987（Nordic Musculoskeletal Questionnaire）',
    KNEE: 'Powers 2014、Willy 2019、Kolasinski 2020',
    PAINMON: 'Willy 2019（疼痛監測模式）',
    INBODY: 'InBody 判讀指南',
    HPA: '衛福部國健署 全民身體活動指引',
    HPA_BMI: '衛福部國健署 成人健康體位標準（BMI 18.5–24）'
  };

  function rule(id, reason, source, type, url) {
    var r = { id: id, 白話理由: reason, 出處: source, 類型: type };
    if (url) r.網址 = url;
    return r;
  }

  // ---------- 小工具 ----------
  function round5(n) { return Math.round(n / 5) * 5; }
  function num(v) { var n = Number(v); return isFinite(n) && v !== '' && v !== null && v !== undefined ? n : null; }
  function uniq(arr) { var o = []; arr.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }

  var INTENSITY_ORDER = ['light', 'moderate', 'vigorous'];
  function minIntensity(a, b) {
    return INTENSITY_ORDER[Math.min(INTENSITY_ORDER.indexOf(a), INTENSITY_ORDER.indexOf(b))];
  }
  var INTENSITY_LABEL = { light: '低強度', moderate: '輕～中強度', vigorous: '可到高強度' };

  // ---------- 日期 ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseISO(s) {
    if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    var p = String(s).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function addDays(iso, n) { var d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); }
  function today(now) { return toISO(now ? new Date(now) : new Date()); }

  /** 本週週一（週一到週日為一週） */
  function weekStart(date) {
    var d = parseISO(date || today());
    var dow = d.getDay(); // 0=日
    var diff = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + diff);
    return toISO(d);
  }
  function weekRange(date) {
    var s = weekStart(date);
    return { start: s, end: addDays(s, 6) };
  }
  function weekLabel(ws) {
    var a = parseISO(ws), b = parseISO(addDays(ws, 6));
    return (a.getMonth() + 1) + '/' + a.getDate() + '–' + (b.getMonth() + 1) + '/' + b.getDate();
  }
  /** 從 fromDate 所在週到 toDate 所在週，每週的週一 */
  function listWeeks(fromDate, toDate) {
    var out = [], s = weekStart(fromDate), e = weekStart(toDate);
    while (s <= e) { out.push(s); s = addDays(s, 7); }
    return out;
  }
  function inWeek(dateIso, ws) { return dateIso >= ws && dateIso <= addDays(ws, 6); }

  // ---------- A1 PAR-Q+ ----------
  /**
   * @param {Array<boolean>} answers 7 題，true＝是
   */
  function screenParq(answers) {
    answers = answers || [];
    var yes = [];
    for (var i = 0; i < 7; i++) if (answers[i] === true) yes.push(i + 1);
    var red = yes.indexOf(2) >= 0 || yes.indexOf(7) >= 0;
    var res = {
      yes: yes,
      complete: answers.filter(function (a) { return a === true || a === false; }).length === 7,
      level: red ? 'red' : (yes.length ? 'ask' : 'pass'),
      redFlag: red,
      lock150: yes.length > 0,
      intensityCap: red ? 'light' : (yes.length ? 'moderate' : 'vigorous'),
      gotoMsk: yes.indexOf(6) >= 0,
      message: '',
      applied: []
    };
    if (red) {
      res.message = '建議先就醫評估再開始。';
      res.applied.push(rule('A1-red', '健康篩檢第 2 或第 7 題答「是」，先請醫師評估比較安全。在那之前餐盤先用 150 起步盤，只出低強度動作。', SRC.PARQ, '文獻'));
    } else if (yes.length) {
      res.message = '建議先詢問醫師或合格運動專業人員。';
      res.applied.push(rule('A1-ask', '健康篩檢有題目答「是」，建議先問過醫師或合格運動專業人員。餐盤先用 150 起步盤，有氧只開輕～中強度。', SRC.PARQ, '文獻'));
    } else {
      res.message = '健康篩檢通過，可以漸進開始。';
      res.applied.push(rule('A1-pass', '健康篩檢 7 題都是「否」，可以從少量開始、慢慢增加。', SRC.PARQ, '文獻'));
    }
    return res;
  }

  // ---------- A2 ACSM ----------
  /**
   * @param {{regular:boolean, disease:boolean, symptoms:string[], clearance:boolean}} a
   */
  function screenAcsm(a) {
    a = a || {};
    var hasSym = (a.symptoms || []).length > 0;
    var r = { code: '', message: '', intensityCap: 'vigorous', lock150: false, needClearance: false, stop: false, seeDoctor: false, applied: [] };
    if (!a.regular) {
      if (hasSym) {
        r.code = 'irregular-symptom'; r.message = '建議先就醫，App 先鎖低強度。';
        r.intensityCap = 'light'; r.lock150 = true; r.seeDoctor = true;
      } else if (a.disease) {
        r.code = 'irregular-disease'; r.message = '建議先取得醫師許可，之後從輕～中強度起步。';
        r.intensityCap = 'moderate'; r.lock150 = true; r.needClearance = true;
      } else {
        r.code = 'irregular-ok'; r.message = '可以開始，從輕～中強度起步。';
        r.intensityCap = 'moderate';
      }
    } else {
      if (hasSym) {
        r.code = 'regular-symptom'; r.message = '請先停止運動、就醫評估。';
        r.intensityCap = 'light'; r.lock150 = true; r.stop = true; r.seeDoctor = true;
      } else if (a.disease) {
        r.code = 'regular-disease'; r.needClearance = true; r.lock150 = true;
        r.intensityCap = a.clearance ? 'vigorous' : 'moderate';
        r.message = a.clearance ? '已取得醫師許可，可以做到高強度。' : '中強度可以；要做高強度，先取得醫師許可。';
      } else {
        r.code = 'regular-ok'; r.message = '可以維持，也可以進到中～高強度。';
        r.intensityCap = 'vigorous';
      }
    }
    r.applied.push(rule('A2-' + r.code, r.message, SRC.ACSM15, '文獻'));
    return r;
  }

  // ---------- B1 Godin ----------
  function godinScore(g) {
    g = g || {};
    var s = Math.max(0, num(g.strenuous) || 0), m = Math.max(0, num(g.moderate) || 0);
    var score = s * 9 + m * 5;
    var cat = score >= 24 ? 'active' : (score >= 14 ? 'moderate' : 'insufficient');
    var label = { active: '活躍', moderate: '中度活躍', insufficient: '活動不足' }[cat];
    return {
      score: score, category: cat, label: label,
      applied: [rule('B1-godin', '休閒運動分數 ' + score + ' 分（費力×9＋中度×5），屬於「' + label + '」。24 分以上活躍、14–23 中度活躍、14 以下活動不足。', SRC.GODIN, '文獻')]
    };
  }

  // ---------- B2 肌力經驗 ----------
  var STRENGTH_EXP = {
    none: { level: 1, label: '初學', reason: '沒練過肌力或中斷很久，從基本動作開始。' },
    '6m': { level: 2, label: '中階', reason: '規律練肌力 6 個月以上，可以做中階動作。' },
    '2y': { level: 3, label: '進階', reason: '系統化練肌力 1–2 年以上，可以做進階動作。' }
  };
  function strengthExperience(v) {
    var e = STRENGTH_EXP[v] || STRENGTH_EXP.none;
    return { level: e.level, label: e.label, applied: [rule('B2-' + (STRENGTH_EXP[v] ? v : 'none'), e.reason, SRC.ACSM09, '文獻')] };
  }

  // ---------- B3 等級合成 ----------
  var LEVEL_LABEL = { beginner: '初學', intermediate: '中階', advanced: '進階' };
  /**
   * 合成運動等級與可選總量
   * @param {object} profile 問卷結果
   */
  function composeLevel(profile) {
    profile = profile || {};
    if (profile.skipped) {
      // 問卷跳過：沒有篩檢資料，不能當作「都答否」，一律用最保守的起步盤
      return {
        level: 'beginner', label: '問卷未填',
        allowedTotals: [150, 300], defaultTotal: 150, locked: true,
        intensityCap: 'moderate', intensityLabel: INTENSITY_LABEL.moderate,
        exerciseLevel: 1, skipped: true,
        parq: screenParq([]), acsm: { applied: [] }, godin: godinScore({}), strengthExp: strengthExperience('none'),
        applied: [rule('A0-skip', '健康問卷還沒填，不知道你的身體狀況，先用 150 起步盤、只到輕～中強度、動作從最基本的開始。填完問卷餐盤會照你的情況重排。', SRC.WHO + '、' + SRC.ACSM15, '設計值', WHO_URL)]
      };
    }
    var parq = screenParq(profile.parq);
    var acsm = screenAcsm(profile.acsm);
    var godin = godinScore(profile.godin);
    var exp = strengthExperience(profile.strengthExp);
    var regular = !!(profile.acsm && profile.acsm.regular);
    var applied = [].concat(parq.applied, acsm.applied, godin.applied, exp.applied);

    var level;
    if (!regular || godin.score < 14) level = 'beginner';
    else if (godin.score >= 24) level = 'advanced'; // 規則表 B3：規律運動＋Godin ≥24；肌力經驗只影響動作難度
    else level = 'intermediate';

    var reason = {
      beginner: '目前還沒有規律運動，或休閒運動分數低於 14，先從 150 起步盤開始。WHO 建議不常活動的人從少量開始、逐步增加。',
      intermediate: '有在動但還沒到進階（休閒運動分數 14–23，或肌力經驗未滿 6 個月），預設 150 起步盤，想挑戰可以自己選 300。',
      advanced: '規律運動、休閒運動分數 24 以上，預設 300 完整盤。'
    }[level];
    applied.push(rule('B3-' + level, reason, SRC.WHO + '、' + SRC.ACSM15, '設計值', WHO_URL));

    var locked = parq.lock150 || acsm.lock150;
    var allowed = [150, 300]; // 11/11 需求：時間一定讓人選。WHO 150–300 適用所有成人，風險控制交給強度上限
    var def = locked ? 150 : (level === 'advanced' ? 300 : 150);
    if (locked) {
      applied.push(rule('B3-lock', '健康篩檢有題目答「是」，建議從 150 起步盤開始；選 300 也可以，但強度上限不變。', SRC.PARQ + '、' + SRC.ACSM15, '設計值'));
    }
    var cap = minIntensity(parq.intensityCap, acsm.intensityCap);
    var exLevel = Math.min(exp.level, cap === 'light' ? 1 : (cap === 'moderate' ? 2 : 3));
    if (level === 'beginner') exLevel = Math.min(exLevel, 1);

    return {
      level: level, label: LEVEL_LABEL[level],
      allowedTotals: allowed, defaultTotal: def, locked: locked,
      intensityCap: cap, intensityLabel: INTENSITY_LABEL[cap],
      exerciseLevel: exLevel,
      parq: parq, acsm: acsm, godin: godin, strengthExp: exp,
      applied: applied
    };
  }

  // ---------- D4 InBody 判讀 ----------
  function bodyStatus(profile, inbody) {
    profile = profile || {};
    var out = { hasData: !!inbody, bmi: null, fatHigh: false, visceralHigh: false, smi: null, smiLow: false, smmLow: false, muscleKnown: false, muscleLow: false, bmiNormal: null, applied: [] };
    if (!inbody) return out;
    var male = profile.sex === 'male';
    var h = num(profile.height), w = num(inbody.weight) || num(profile.weight);
    if (h && w) {
      out.bmi = Math.round(w / Math.pow(h / 100, 2) * 10) / 10;
      out.bmiNormal = out.bmi >= 18.5 && out.bmi < 24;
    }
    var fat = num(inbody.bodyFat);
    if (fat !== null) {
      out.fatHigh = fat > (male ? 20 : 28);
      if (out.fatHigh) out.applied.push(rule('D4-fat', '體脂率 ' + fat + '%，超過' + (male ? '男性 10–20%' : '女性 18–28%') + '的標準範圍。', SRC.INBODY, '待查證'));
    }
    var vis = num(inbody.visceral);
    if (vis !== null) {
      out.visceralHigh = vis >= 10;
      if (out.visceralHigh) out.applied.push(rule('D4-visceral', '內臟脂肪等級 ' + vis + '，10 以上算偏高。', SRC.INBODY, '待查證'));
    }
    var smiVal = num(inbody.smi);
    var asm = num(inbody.asm);
    if (smiVal !== null || (asm !== null && h)) {
      out.smi = smiVal !== null ? Math.round(smiVal * 100) / 100 : Math.round(asm / Math.pow(h / 100, 2) * 100) / 100;
      out.smiLow = out.smi < (male ? 7.0 : 5.7);
      out.muscleKnown = true;
      if (out.smiLow) out.applied.push(rule('D4-smi', '四肢骨骼肌指數（SMI）' + out.smi + ' kg/m²，低於亞洲切點（男 7.0、女 5.7）。', SRC.AWGS, '文獻'));
    }
    var pct = num(inbody.smmPct);
    if (pct !== null) {
      out.smmLow = pct < 90;
      out.muscleKnown = true;
      if (out.smmLow) out.applied.push(rule('D4-smm', '骨骼肌是標準值的 ' + pct + '%，低於 90%。', SRC.INBODY, '待查證'));
    }
    out.muscleLow = out.smiLow || out.smmLow;
    return out;
  }

  // ---------- D2 表型 ----------
  var PHENOTYPES = {
    balanced: { label: '均衡', split: { 150: [90, 40, 20], 300: [150, 100, 50] },
      reason: '有氧顧心肺，每週至少兩天肌力。', source: SRC.BALANCED, url: WHO_URL },
    visceral: { label: '內臟脂肪偏高', split: { 150: [100, 35, 15], 300: [200, 70, 30] },
      reason: '有氧對減內臟脂肪效果明確，單做肌力效果不顯著，所以有氧多一點。', source: SRC.VISCERAL },
    fatHigh: { label: '體脂偏高', split: { 150: [100, 35, 15], 300: [200, 70, 30] },
      reason: '體脂率偏高、肌肉量正常，有氧對減少總脂肪的效果比單做肌力明顯，所以有氧多一點（比例比照內臟脂肪偏高）。', source: 'Willis 2012' },
    lowMuscle: { label: '肌肉量偏低', split: { 150: [70, 60, 20], 300: [150, 110, 40] },
      reason: '先把肌肉練回來，漸進式肌力訓練是第一線做法。', source: SRC.LOWMUSCLE },
    tofi: { label: '體重正常但體脂高', split: { 150: [70, 60, 20], 300: [150, 110, 40] },
      reason: '體重正常但體脂高、肌肉偏少，這類人做肌力改善體組成比只做有氧好。', source: SRC.TOFI },
    sarcobese: { label: '肌少型肥胖', split: { 150: [75, 55, 20], 300: [150, 105, 45] },
      reason: '減脂時只做有氧會掉肌肉，有氧＋肌力一起做才保得住。', source: SRC.SARCOBESE }
  };

  function phenotype(profile, inbody) {
    var b = bodyStatus(profile, inbody);
    var id;
    if (!b.hasData) id = 'balanced';
    else if (b.bmiNormal && b.fatHigh && b.smmLow) id = 'tofi';
    else if ((b.fatHigh || b.visceralHigh) && b.muscleLow) id = 'sarcobese';
    else if (b.visceralHigh) id = 'visceral';
    else if (b.fatHigh) id = 'fatHigh';
    else if (b.muscleLow) id = 'lowMuscle';
    else id = 'balanced';
    var p = PHENOTYPES[id];
    var applied = b.applied.slice();
    if (id === 'tofi') applied.push(rule('D4-bmi', 'BMI ' + b.bmi + '，在 18.5–24 的正常範圍。', SRC.HPA_BMI, '設計值'));
    var reason = p.reason;
    if (!b.hasData) reason = '還沒有 InBody 資料，先用均衡盤：' + p.reason;
    else if (!b.muscleKnown) reason += '（沒有填骨骼肌標準百分比或四肢骨骼肌量，肌肉量先當作正常判斷）';
    applied.push(rule('D2-' + id, reason, p.source, id === 'fatHigh' ? '設計值' : '設計值', p.url));
    return { id: id, label: p.label, split: p.split, body: b, applied: applied };
  }

  // ---------- 分配 ----------
  /** 300 盤有氧至少 150；不足從伸展先扣、再扣肌力；取 5 的倍數 */
  function enforceSplit(total, a, s, t) {
    a = round5(a); s = round5(s); t = round5(t);
    if (total >= 300 && a < 150) {
      var need = 150 - a;
      var fromT = Math.min(need, t); t -= fromT; need -= fromT;
      var fromS = Math.min(need, s); s -= fromS; need -= fromS;
      a = 150;
    }
    var diff = total - (a + s + t);
    a += diff; // 進位誤差補在有氧
    return { aerobic: a, strength: s, stretch: t };
  }

  var SPLIT_KEYS = ['aerobic', 'micro', 'strength', 'stretch'];
  var SPLIT_LABEL = { aerobic: '有氧', micro: '微型運動', strength: '肌力', stretch: '伸展' };
  // 微型運動從有氧切出來的分鐘（設計值）：WHO 2020 取消「每次至少 10 分鐘」，零碎活動都算有氧；
  // 切一小塊給它，讓排不出整段時間的人也填得滿。分鐘數是我們訂的。
  var MICRO_DEFAULT = { 150: 20, 300: 30 };

  /** 使用者手動改四塊：總數不變、5 的倍數、每塊至少 5、300 盤有氧＋微型 ≥150 */
  function validateSplit(total, split) {
    if (!split) return { ok: false, reason: '沒有資料' };
    var sum = 0;
    for (var i = 0; i < SPLIT_KEYS.length; i++) {
      var v = num(split[SPLIT_KEYS[i]]);
      if (v === null) return { ok: false, reason: '分鐘要填數字' };
      if (v < 5) return { ok: false, reason: '每一塊至少要 5 分鐘' };
      if (v % 5) return { ok: false, reason: '分鐘要是 5 的倍數' };
      sum += v;
    }
    if (sum !== total) return { ok: false, reason: '四塊加起來要等於 ' + total };
    if (total >= 300 && split.aerobic + split.micro < 150) return { ok: false, reason: '300 盤的有氧加微型運動至少要 150 分鐘' };
    return { ok: true };
  }

  /** 調整某一塊 delta 分鐘，從其他塊補（先從最多的那塊扣）。不合法回傳 { ok:false, reason } */
  function shiftSplit(total, split, key, delta) {
    var next = {};
    SPLIT_KEYS.forEach(function (k) { next[k] = split[k]; });
    next[key] += delta;
    if (next[key] < 5) return { ok: false, reason: SPLIT_LABEL[key] + '至少要 5 分鐘' };
    var others = SPLIT_KEYS.filter(function (k) { return k !== key; });
    others.sort(function (x, y) { return delta > 0 ? next[y] - next[x] : next[x] - next[y]; });
    if (delta > 0) {
      var remain = delta;
      for (var i = 0; i < others.length && remain > 0; i++) {
        var take = Math.min(remain, Math.max(0, next[others[i]] - 5));
        next[others[i]] -= take; remain -= take;
      }
      if (remain > 0) return { ok: false, reason: '其他塊已經是最少了' };
    } else {
      next[others[0]] += -delta;
    }
    var v = validateSplit(total, next);
    return v.ok ? { ok: true, split: next } : v;
  }

  // ---------- C 骨骼肌肉 ----------
  var AREA_LABEL = { knee: '膝蓋', back: '腰背', shoulder: '肩膀', wrist: '手腕' };
  function mskRules(msk, redFlagDefs) {
    msk = msk || {};
    var areas = (msk.areas || []).slice();
    var applied = [], blocked = [];
    (msk.redFlags || []).forEach(function (fid) {
      var def = (redFlagDefs || []).filter(function (d) { return d.id === fid; })[0];
      var hit = def ? def.areas.filter(function (x) { return areas.indexOf(x) >= 0; }) : areas;
      if (def && hit.length === 0 && def.areas.length === 1) hit = def.areas;
      blocked = blocked.concat(hit);
    });
    blocked = uniq(blocked);
    if (areas.length) {
      applied.push(rule('C-areas', '你勾了' + areas.map(function (a) { return AREA_LABEL[a]; }).join('、') + '不舒服，會避開容易加重的動作、換成替代版本（分鐘不變）。', SRC.NMQ, '文獻'));
    }
    if (areas.indexOf('knee') >= 0) applied.push(rule('C-knee', '膝蓋不舒服：不出深蹲超過 45 度、跳躍、前跨弓箭步，改靠牆微蹲、橋式、蚌殼式；有氧建議低衝擊（固定式腳踏車、快走、水中運動）。', SRC.KNEE, '文獻'));
    if (areas.indexOf('back') >= 0) applied.push(rule('C-back', '腰背不舒服：減少沒有支撐的彎腰、仰臥起坐和過度後仰。', SRC.NMQ, '待查證'));
    if (areas.indexOf('shoulder') >= 0) applied.push(rule('C-shoulder', '肩膀不舒服：不出手舉過頭的動作，伏地挺身改淺一點或靠牆。', SRC.NMQ, '待查證'));
    if (areas.indexOf('wrist') >= 0) applied.push(rule('C-wrist', '手腕不舒服：不出手掌撐地，改前臂撐、啞鈴用中立握法或站姿版本。', SRC.NMQ, '待查證'));
    if (blocked.length) applied.push(rule('C-redflag', blocked.map(function (a) { return AREA_LABEL[a]; }).join('、') + '有危險徵兆，相關動作全部先關掉，建議就醫。', SRC.NMQ, '待查證'));
    if (areas.length) applied.push(rule('C-painmon', '運動中疼痛不超過 3 分（滿分 10）、隔天回到原本程度才算安全；超過就下次降一階。', SRC.PAINMON, '文獻'));
    return { avoid: areas, blocked: blocked, pain: num(msk.pain) || 0, lowImpact: areas.indexOf('knee') >= 0, applied: applied };
  }

  // ---------- D 核心：planPlate ----------
  /**
   * @param {object} profile 問卷結果 { age, sex, height, weight, parq[], acsm{}, godin{}, strengthExp, msk{}, chosenTotal?, customSplit? }
   * @param {object|null} inbody 最新一筆 InBody { date, weight, smm, bodyFat, visceral?, smmPct?, asm? }
   * @returns {{total:number, aerobic:number, strength:number, stretch:number, phenotype:object, applied:Array, reasons:Array}}
   */
  function planPlate(profile, inbody) {
    profile = profile || {};
    var lv = composeLevel(profile);
    var applied = lv.applied.slice();
    var notices = [];

    // 11/11 需求：首頁不寫「建議就醫評估」。篩檢結果的完整說明留在問卷結果頁和「為什麼這樣分」
    if (lv.skipped) notices.push({ kind: 'warn', text: '建議先填寫完問卷，餐盤會照你的身體狀況重排。', fillForm: true });
    else if (lv.parq.redFlag || lv.acsm.stop || lv.acsm.seeDoctor) notices.push({ kind: 'warn', text: '依你的問卷，餐盤先排低強度。' });

    // 總量
    var total = lv.allowedTotals.indexOf(profile.chosenTotal) >= 0 ? profile.chosenTotal : lv.defaultTotal;
    if (total === 300 && lv.defaultTotal === 150 && (lv.locked)) notices.push({ kind: 'info', text: '你選了 300 分鐘，強度會維持在「' + INTENSITY_LABEL[lv.intensityCap] + '」，累了就休息。' });
    if (total === 300) applied.push(rule('D1-300', '300 完整盤的有氧至少 150 分鐘，對上 WHO 成人每週有氧下限。', SRC.WHO, '文獻', WHO_URL));
    else applied.push(rule('D1-150', '150 起步盤：先把每週 150 分鐘養成習慣，再往上加。', SRC.WHO, '設計值', WHO_URL));

    // 表型分配
    var ph = phenotype(profile, inbody);
    applied = applied.concat(ph.applied);
    var base = ph.split[total];
    var split = enforceSplit(total, base[0], base[1], base[2]);
    applied.push(rule('D2-round', '比例換算成分鐘後取 5 的倍數；300 盤有氧低於 150 就補到 150，從伸展先扣。', '規則表 v1 D2', '設計值'));

    var micro = MICRO_DEFAULT[total] || 20;
    split.micro = micro;
    split.aerobic -= micro;
    applied.push(rule('D1-microslice', '從有氧切 ' + micro + ' 分鐘給微型運動（走路去辦事、爬樓梯、外出多走一段）。WHO 2020 起零碎的活動也算有氧，這塊讓排不出整段時間的人也填得滿；切多少是我們訂的。', SRC.WHO + '、' + SRC.PAG, '設計值', WHO_URL));

    if (profile.customSplit && validateSplit(total, profile.customSplit).ok) {
      split = { aerobic: profile.customSplit.aerobic, micro: profile.customSplit.micro, strength: profile.customSplit.strength, stretch: profile.customSplit.stretch };
      applied.push(rule('D-custom', '你在設定裡自己配置了四塊的分鐘（總數不變）。', '使用者設定', '設計值'));
    }

    // 強度：使用者可以選比篩檢上限低或一樣的，不能超過
    var cap = lv.intensityCap;
    if (profile.chosenIntensity && INTENSITY_ORDER.indexOf(profile.chosenIntensity) >= 0 &&
        INTENSITY_ORDER.indexOf(profile.chosenIntensity) < INTENSITY_ORDER.indexOf(cap)) {
      cap = profile.chosenIntensity;
      applied.push(rule('D-intensity', '你在設定裡把強度調成「' + INTENSITY_LABEL[cap] + '」（比篩檢建議的上限低）。', '使用者設定', '設計值'));
    }

    // 有氧換算
    applied.push(rule('D1-convert', '高強度 1 分鐘算 2 分鐘（75 分鐘高強度＝150 分鐘中強度）；輕強度會記錄，但不填進餅裡。', SRC.WHO, '文獻', WHO_URL));
    if (cap === 'light') applied.push(rule('D1-lightcount', '你的強度先排在低強度，所以輕強度的分鐘照算進餐盤（WHO 原本只算中強度以上，這條是為了讓低強度起步的人也能填滿）。', SRC.WHO, '設計值', WHO_URL));
    applied.push(rule('D1-micro', '微型運動不限長度，中強度以上都算有氧。有氧和微型運動任一塊做超過，多的會補到另一塊。', SRC.WHO + '、' + SRC.PAG, '文獻', WHO_URL));
    applied.push(rule('D1-strength2', '肌力每週至少 2 天，大肌群都要練到。', SRC.WHO + '、' + SRC.GARBER, '文獻', WHO_URL));

    // 年齡
    var age = num(profile.age) || 0;
    var balance = age >= 65;
    var holdSeconds = null;
    if (balance) {
      holdSeconds = 30;
      applied.push(rule('D3-balance', '65 歲以上，伸展那塊每週至少 3 天要含平衡動作（例如單腳站、腳跟接腳尖走）。', SRC.WHO, '文獻', WHO_URL));
      applied.push(rule('D3-hold', '65 歲以上，伸展每個動作建議停 30–60 秒。', SRC.GARBER, '文獻'));
      if (ph.body.smiLow || ph.body.smmLow) {
        applied.push(rule('D3-chairstand', '肌肉量偏低：建議做 5 次椅子起坐測秒數，超過 12 秒建議做肌少症評估。', SRC.AWGS, '文獻'));
        notices.push({ kind: 'info', text: '建議做 5 次椅子起坐測秒數，12 秒以上建議找醫師做肌少症評估。' });
      }
    }

    // 骨骼肌肉
    var msk = mskRules(profile.msk, root.PlateQuestions && root.PlateQuestions.msk.redFlags.items);
    applied = applied.concat(msk.applied);
    if (msk.blocked.length) notices.push({ kind: 'warn', text: msk.blocked.map(function (a) { return AREA_LABEL[a]; }).join('、') + '有危險徵兆，相關動作已關閉，建議就醫。' });

    // 動作參數
    applied.push(rule('E-stretch', '伸展每個動作 10–30 秒，每週至少 2–3 天，每天做最好。', SRC.GARBER, '文獻'));
    applied.push(rule('E-strength', '肌力練大肌群，每個動作 8–12 下、1–3 組，同一個肌群隔一天再練。', SRC.GARBER + '、' + SRC.HPA, '文獻'));

    return {
      total: total,
      aerobic: split.aerobic,
      micro: split.micro,
      strength: split.strength,
      stretch: split.stretch,
      phenotype: { id: ph.id, label: ph.label },
      body: ph.body,
      level: lv.level, levelLabel: lv.label,
      allowedTotals: lv.allowedTotals, locked: lv.locked,
      intensityCap: cap, intensityLabel: INTENSITY_LABEL[cap],
      screenCap: lv.intensityCap,
      exerciseLevel: Math.min(lv.exerciseLevel, cap === 'light' ? 1 : (cap === 'moderate' ? 2 : 3)),
      godin: { score: lv.godin.score, label: lv.godin.label },
      avoid: msk.avoid, blocked: msk.blocked, lowImpact: msk.lowImpact,
      balance: balance, holdSeconds: holdSeconds,
      strengthDaysTarget: 2,
      balanceDaysTarget: balance ? 3 : 0,
      notices: notices,
      applied: applied,
      reasons: applied
    };
  }

  // ---------- InBody 建議接口（v0 保守版）----------
  function adjustPlate(inbody, profile) {
    var b = bodyStatus(profile, inbody);
    var lv = composeLevel(profile);
    var out = [];
    if (!b.hasData) return out;
    if ((b.fatHigh || b.visceralHigh) && !lv.locked && lv.level !== 'beginner') {
      out.push(rule('ADJ-aerobic300', '體脂或內臟脂肪偏高，可以考慮把目標改成 300 完整盤，有氧多一點。', '待查證', '待查證'));
    } else if (b.fatHigh || b.visceralHigh) {
      out.push(rule('ADJ-aerobic', '體脂或內臟脂肪偏高，先把 150 盤的有氧穩穩做滿，之後再考慮加量。', '待查證', '待查證'));
    }
    if (b.muscleLow) out.push(rule('ADJ-strength3', '骨骼肌偏低，肌力可以每週做到 3 天（同肌群隔一天）。', '待查證', '待查證'));
    if (!b.muscleKnown) out.push(rule('ADJ-musclemissing', '填上「骨骼肌標準百分比」或「四肢骨骼肌量」，才能判斷肌肉量夠不夠。', 'InBody 判讀指南', '待查證'));
    return out;
  }

  function inbodyCompare(prev, curr) {
    var fields = [
      { key: 'weight', label: '體重', unit: '公斤', better: 0 },
      { key: 'smm', label: '骨骼肌量', unit: '公斤', better: 1 },
      { key: 'bodyFat', label: '體脂率', unit: '%', better: -1 },
      { key: 'visceral', label: '內臟脂肪', unit: '級', better: -1 },
      { key: 'smi', label: 'SMI', unit: 'kg/m²', better: 1 }
    ];
    return fields.map(function (f) {
      var p = prev ? num(prev[f.key]) : null, c = curr ? num(curr[f.key]) : null;
      var delta = (p !== null && c !== null) ? Math.round((c - p) * 10) / 10 : null;
      var improved = null;
      if (delta !== null && delta !== 0 && f.better !== 0) improved = (delta * f.better) > 0;
      return { key: f.key, label: f.label, unit: f.unit, prev: p, curr: c, delta: delta, improved: improved };
    }).filter(function (r) { return r.curr !== null || r.prev !== null; });
  }

  // ---------- 有氧換算 ----------
  /** 高強度 ×2、中強度 ×1、輕強度 0（WHO 2020） */
  function aerobicCredit(intensity, minutes, cap) {
    var m = Math.max(0, num(minutes) || 0);
    if (intensity === 'light' && cap === 'light') return m;
    if (intensity === 'vigorous') return m * 2;
    if (intensity === 'moderate') return m;
    return 0;
  }

  // ---------- 週進度與達標 ----------
  /**
   * @param {Array} logs [{id,date,kind:'aerobic'|'micro'|'strength'|'stretch',intensity?,minutes,balance?}]
   * @param {object} plan planPlate 的結果
   * @param {string} ws 週一日期
   */
  function weekProgress(logs, plan, ws) {
    ws = ws || weekStart();
    var p = { weekStart: ws, aerobic: 0, aerobicMain: 0, aerobicMicro: 0, lightMinutes: 0, strength: 0, stretch: 0,
      strengthDays: 0, stretchDays: 0, balanceDays: 0, logs: [] };
    var sd = {}, td = {}, bd = {};
    (logs || []).forEach(function (l) {
      if (!inWeek(l.date, ws)) return;
      p.logs.push(l);
      var m = Math.max(0, num(l.minutes) || 0);
      if (l.kind === 'aerobic' || l.kind === 'micro') {
        var c = aerobicCredit(l.intensity, m, plan.intensityCap);
        if (l.intensity === 'light') p.lightMinutes += m;
        if (l.kind === 'micro') p.aerobicMicro += c; else p.aerobicMain += c;
      } else if (l.kind === 'strength') {
        p.strength += m; if (m > 0) sd[l.date] = 1;
      } else if (l.kind === 'stretch') {
        p.stretch += m; if (m > 0) td[l.date] = 1;
        if (l.balance) bd[l.date] = 1;
      }
    });
    p.aerobic = p.aerobicMain + p.aerobicMicro;
    // 有氧和微型運動互相補（兩塊都算 WHO 的有氧）：先各填各的，多的再補到另一塊
    var tA = plan.aerobic, tM = plan.micro || 0;
    var fa = Math.min(p.aerobicMain, tA), fm = Math.min(p.aerobicMicro, tM);
    var spareA = p.aerobicMain - fa, spareM = p.aerobicMicro - fm;
    var addA = Math.min(spareM, tA - fa); fa += addA;
    var addM = Math.min(spareA, tM - fm); fm += addM;
    p.aerobicShown = fa; p.microShown = fm;
    p.strengthDays = Object.keys(sd).length;
    p.stretchDays = Object.keys(td).length;
    p.balanceDays = Object.keys(bd).length;
    function ratio(v, t) { return t > 0 ? Math.min(1, v / t) : 1; }
    p.fill = {
      aerobic: ratio(fa, tA),
      micro: ratio(fm, tM),
      strength: ratio(p.strength, plan.strength),
      stretch: ratio(p.stretch, plan.stretch)
    };
    p.full = { aerobic: p.fill.aerobic >= 1, micro: p.fill.micro >= 1, strength: p.fill.strength >= 1, stretch: p.fill.stretch >= 1 };
    p.pizzaFull = p.full.aerobic && p.full.micro && p.full.strength && p.full.stretch;
    p.achieved = isAchieved(p, plan);
    p.remaining = {
      aerobic: Math.max(0, tA - fa),
      micro: Math.max(0, tM - fm),
      strength: Math.max(0, plan.strength - p.strength),
      stretch: Math.max(0, plan.stretch - p.stretch),
      strengthDays: Math.max(0, (plan.strengthDaysTarget || 2) - p.strengthDays)
    };
    return p;
  }

  /**
   * 達標（設計值，2026-11-05 定）：四塊（有氧、微型、肌力、伸展）都填滿才算這週達標、蓋章。
   * 有氧和微型運動互補，所以只要兩塊加起來的有氧分鐘夠就好。
   */
  function isAchieved(progress, plan) {
    return progress.aerobic >= plan.aerobic + (plan.micro || 0) && progress.strength >= plan.strength && progress.stretch >= plan.stretch;
  }

  function weekResults(logs, plan, fromDate, toDate) {
    return listWeeks(fromDate, toDate).map(function (ws) {
      var pr = weekProgress(logs, plan, ws);
      return { weekStart: ws, achieved: pr.achieved, pizzaFull: pr.pizzaFull };
    });
  }

  // ---------- 集章（每月一張，主打當季農產品）----------
  // 一週算哪個月：看那週的週四落在哪個月（ISO 週的算法），跨月的週不會被算兩次
  var MONTH_NEED = 3;      // 設計值：一個月 4～5 週，蓋滿 3 週就能兌換，留一週彈性
  var REST_PER_CARD = 1;   // 設計值：休養券一個月 1 張（受傷、生病沒辦法運動的週）
  var CARD_SIZE = MONTH_NEED;
  function monthOfWeek(ws) { return addDays(ws, 3).slice(0, 7); }
  function weeksOfMonth(mk) {
    var first = weekStart(mk + '-01'), out = [];
    for (var w = addDays(first, -7); ; w = addDays(w, 7)) {
      var m = monthOfWeek(w);
      if (m === mk) out.push(w);
      else if (m > mk) break;
    }
    return out;
  }
  /**
   * @param {Array<{weekStart, achieved}>} weeks 依時間排序
   * @param {string[]} rests 用了休養券的週
   * @param {string} currentWs 本週週一
   * @param {string[]} redeemed 已兌換的月份 'YYYY-MM'
   */
  function stampBook(weeks, rests, currentWs, redeemed) {
    rests = rests || []; redeemed = redeemed || [];
    currentWs = currentWs || weekStart();
    var byMonth = {}, order = [], missed = [];
    function card(mk) {
      if (!byMonth[mk]) {
        byMonth[mk] = { month: mk, index: order.length, weeks: weeksOfMonth(mk), slots: [], restUsed: 0, need: MONTH_NEED,
          full: false, redeemed: redeemed.indexOf(mk) >= 0, current: mk === monthOfWeek(currentWs) };
        order.push(mk);
      }
      return byMonth[mk];
    }
    card(monthOfWeek(currentWs));
    (weeks || []).slice().sort(function (a, b) { return a.weekStart < b.weekStart ? -1 : 1; }).forEach(function (w) {
      if (w.weekStart > currentWs) return;
      var c = card(monthOfWeek(w.weekStart));
      if (w.achieved) { c.slots.push({ weekStart: w.weekStart, kind: 'stamp' }); return; }
      if (w.weekStart === currentWs) return; // 本週還沒結束
      if (rests.indexOf(w.weekStart) >= 0 && c.restUsed < REST_PER_CARD) {
        c.restUsed++;
        c.slots.push({ weekStart: w.weekStart, kind: 'rest' });
        return;
      }
      missed.push({ weekStart: w.weekStart, month: c.month, canUseRest: c.restUsed < REST_PER_CARD });
    });
    order.sort();
    var cards = order.map(function (mk, i) {
      var c = byMonth[mk]; c.index = i;
      c.full = c.slots.length >= c.need;
      // 月份已過、改不了的週不能再用休養券（只開放還在的那張卡和上個月）
      return c;
    });
    var stamps = 0, restCount = 0;
    cards.forEach(function (c) { c.slots.forEach(function (x) { if (x.kind === 'stamp') stamps++; else restCount++; }); });
    var current = byMonth[monthOfWeek(currentWs)];
    return {
      need: MONTH_NEED, restPerCard: REST_PER_CARD,
      cards: cards, current: current, missed: missed,
      redeemable: cards.filter(function (c) { return c.full && !c.redeemed; }).map(function (c) { return c.month; }),
      totalStamps: stamps, totalRests: restCount
    };
  }

  /** 這一週能不能用休息券：已過去、沒達標、而且輪到的那張卡還有休息券 */
  function canUseRest(book, ws) {
    return (book.missed || []).some(function (m) { return m.weekStart === ws && m.canUseRest; });
  }

  // ---------- 跟著做：挑動作 ----------
  function seeded(seed) {
    var s = 0; String(seed).split('').forEach(function (ch) { s = (s * 31 + ch.charCodeAt(0)) >>> 0; });
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  /**
   * @param {Array} exercises PlateExercises
   * @param {{type, equipment[], plan, seed?, count?}} opts
   */
  function pickRoutine(exercises, opts) {
    var plan = opts.plan || {};
    var eq = (opts.equipment && opts.equipment.length ? opts.equipment : ['none']);
    var avoid = uniq((plan.avoid || []).concat(plan.blocked || []));
    var maxLevel = plan.exerciseLevel || 1;
    var pool = (exercises || []).filter(function (e) {
      if (e.type !== opts.type) return false;
      if (!e.equipment.every(function (x) { return x === 'none' || eq.indexOf(x) >= 0; })) return false;
      if (e.level > maxLevel) return false;
      if (e.avoid.some(function (a) { return avoid.indexOf(a) >= 0; })) return false;
      return true;
    });
    var rnd = seeded(opts.seed || today());
    var shuffled = pool.map(function (e) { return { e: e, k: rnd() }; }).sort(function (a, b) { return a.k - b.k; }).map(function (x) { return x.e; });
    if (opts.type === 'stretch' && plan.balance) {
      var bal = shuffled.filter(function (e) { return e.balance; });
      shuffled = bal.slice(0, 2).concat(shuffled.filter(function (e) { return bal.slice(0, 2).indexOf(e) < 0; }));
    }
    var count = opts.count || 6;
    var items = shuffled.slice(0, Math.min(count, shuffled.length));
    var notes = [];
    if (items.length < 5) notes.push('符合你器材和身體狀況的動作只有 ' + items.length + ' 個，多勾幾樣器材可以有更多選擇。');
    return { items: items, poolSize: pool.length, hasBalance: items.some(function (e) { return e.balance; }), notes: notes };
  }

  /**
   * 做成計時步驟。次數型動作用每下 3 秒估時間（設計值）。
   * 65 歲以上伸展每個動作至少 30 秒（Garber 2011）。
   */
  function buildTimeline(items, opts) {
    opts = opts || {};
    var rest = opts.restSeconds === undefined ? 15 : opts.restSeconds;
    var perRep = opts.secondsPerRep || 3;
    var steps = [];
    items.forEach(function (e, i) {
      var secs = e.seconds ? e.seconds : (e.reps || 10) * perRep;
      if (e.type === 'stretch' && opts.holdSeconds) secs = Math.max(secs, opts.holdSeconds);
      var sides = e.sides === 2 ? ['左邊', '右邊'] : [null];
      sides.forEach(function (side, si) {
        steps.push({ kind: 'work', exId: e.id, name: e.name, side: side, switchSide: si === 1, seconds: secs, reps: e.seconds ? null : (e.reps || 10), index: i });
      });
      if (i < items.length - 1 && rest > 0) steps.push({ kind: 'rest', seconds: rest, nextName: items[i + 1].name, index: i });
    });
    var total = steps.reduce(function (s, x) { return s + x.seconds; }, 0);
    return { steps: steps, totalSeconds: total, minutes: Math.max(1, Math.round(total / 60)) };
  }

  /** 跟著做的時間換算記錄分鐘（實際做的秒數） */
  function secondsToMinutes(sec) { return Math.max(1, Math.round((num(sec) || 0) / 60)); }

  root.PlateRules = {
    SOURCES: SRC,
    INTENSITY_LABEL: INTENSITY_LABEL,
    LEVEL_LABEL: LEVEL_LABEL,
    AREA_LABEL: AREA_LABEL,
    PHENOTYPES: PHENOTYPES,
    // 日期
    today: today, toISO: toISO, parseISO: parseISO, addDays: addDays,
    weekStart: weekStart, weekRange: weekRange, weekLabel: weekLabel, listWeeks: listWeeks, inWeek: inWeek,
    // 篩檢與等級
    screenParq: screenParq, screenAcsm: screenAcsm, godinScore: godinScore,
    strengthExperience: strengthExperience, composeLevel: composeLevel,
    // 身體組成與分配
    bodyStatus: bodyStatus, phenotype: phenotype, planPlate: planPlate,
    validateSplit: validateSplit, shiftSplit: shiftSplit, adjustPlate: adjustPlate, inbodyCompare: inbodyCompare,
    // 記錄與達標
    aerobicCredit: aerobicCredit, weekProgress: weekProgress, isAchieved: isAchieved, weekResults: weekResults,
    // 集章
    CARD_SIZE: CARD_SIZE, REST_PER_CARD: REST_PER_CARD, MONTH_NEED: MONTH_NEED, monthOfWeek: monthOfWeek, weeksOfMonth: weeksOfMonth, SPLIT_KEYS: SPLIT_KEYS, SPLIT_LABEL: SPLIT_LABEL, INTENSITY_ORDER: INTENSITY_ORDER, INTENSITY_LABEL: INTENSITY_LABEL, stampBook: stampBook, canUseRest: canUseRest,
    // 跟著做
    pickRoutine: pickRoutine, buildTimeline: buildTimeline, secondsToMinutes: secondsToMinutes
  };
})(typeof window !== 'undefined' ? window : this);
