/* 運動餐盤 問卷題目（照規則表 v1 的 A、B、C 原文）
 * PAR-Q+ 題目文字之後會換成查證過的正式版，結構（id、順序、goto）不要動。
 */
(function (root) {
  'use strict';

  root.PlateQuestions = {
    version: 'v1',

    basic: [
      { id: 'age', label: '年齡', type: 'number', unit: '歲', min: 10, max: 110 },
      { id: 'sex', label: '性別', type: 'choice', options: [
        { value: 'female', label: '女' },
        { value: 'male', label: '男' }
      ] },
      { id: 'height', label: '身高', type: 'number', unit: '公分', min: 100, max: 230 },
      { id: 'weight', label: '體重', type: 'number', unit: '公斤', min: 25, max: 250 }
    ],

    // A1 PAR-Q+ 第一頁 7 題（是／否）。出處：PAR-Q+ Collaboration, eparmedx.com
    parq: {
      title: '健康篩檢（PAR-Q+）',
      intro: '請依照實際情況回答「是」或「否」。',
      source: 'PAR-Q+ Collaboration, eparmedx.com',
      items: [
        { id: 'parq1', no: 1, text: '您的醫師是否曾說過您患有心臟疾病或高血壓？' },
        { id: 'parq2', no: 2, text: '您在休息時、日常生活活動時，或運動時，是否會感到胸口疼痛？', redFlag: true },
        { id: 'parq3', no: 3, text: '您是否曾因頭暈而失去平衡，或在過去 12 個月內曾失去意識？', note: '若頭暈是因為換氣過度，包含激烈運動時，請答「否」' },
        { id: 'parq4', no: 4, text: '您是否曾被診斷出患有其他慢性疾病（心臟病或高血壓以外）？' },
        { id: 'parq5', no: 5, text: '您目前是否正在服用治療慢性疾病的處方藥物？' },
        { id: 'parq6', no: 6, text: '您目前（或過去 12 個月內）是否有骨骼、關節或軟組織（肌肉、韌帶、肌腱）的問題，可能因為增加活動量而惡化？', note: '舊傷但目前不影響活動，請答「否」', goto: 'msk' },
        { id: 'parq7', no: 7, text: '您的醫師是否曾說過，您只能在醫療監督下進行身體活動？', redFlag: true }
      ]
    },

    // A2 ACSM 運動前篩檢（Riebe et al. 2015）
    acsm: {
      title: '運動前篩檢（ACSM）',
      source: 'Riebe et al. 2015（ACSM 運動前篩檢建議）',
      regular: {
        id: 'regular',
        text: '過去 3 個月，您是否每週至少 3 天、每次至少 30 分鐘，做中等強度以上的運動？',
        note: '中等強度＝會微微喘、還能講話'
      },
      disease: {
        id: 'disease',
        text: '您是否已知患有心血管疾病、代謝疾病（例如糖尿病）或腎臟疾病？'
      },
      symptoms: {
        id: 'symptoms',
        text: '您最近是否有下列任何一種狀況？（可複選，沒有就不用選）',
        items: [
          { id: 'ischemia', text: '胸口、頸部、下顎或手臂有疑似缺血的疼痛或壓迫感' },
          { id: 'dyspnea', text: '休息或輕微活動就喘' },
          { id: 'syncope', text: '頭暈或昏倒' },
          { id: 'orthopnea', text: '平躺時呼吸困難，或半夜喘醒' },
          { id: 'edema', text: '腳踝水腫' },
          { id: 'palpitation', text: '心悸或心跳過快' },
          { id: 'claudication', text: '走路時小腿抽痛，停下來就好（間歇性跛行）' },
          { id: 'murmur', text: '已知有心雜音' },
          { id: 'fatigue', text: '日常活動時異常疲累或喘' }
        ]
      },
      clearance: {
        id: 'clearance',
        text: '我已經取得醫師許可'
      }
    },

    // B1 Godin 休閒運動問卷（Amireault & Godin 2015）
    godin: {
      title: '運動經驗',
      intro: '想一個典型的一週，在休閒時間裡，每次超過 15 分鐘的運動，大概做幾次？',
      source: 'Amireault & Godin 2015（Godin Leisure-Time Exercise Questionnaire）',
      items: [
        { id: 'strenuous', label: '費力', desc: '心跳很快，例如跑步、籃球、快速游泳', weight: 9 },
        { id: 'moderate', label: '中度', desc: '不累、微微流汗，例如快走、輕鬆騎車', weight: 5 },
        { id: 'light', label: '輕度', desc: '幾乎不費力，例如散步、伸展（只記錄，不算分）', weight: 0 }
      ]
    },

    // B2 肌力訓練經驗（ACSM 2009 progression models）
    strengthExp: {
      id: 'strengthExp',
      text: '您練肌力（重量訓練、徒手肌力）的經驗是？',
      source: 'ACSM 2009 Progression Models in Resistance Training',
      options: [
        { value: 'none', label: '沒練過，或中斷很久了' },
        { value: '6m', label: '規律練 6 個月以上' },
        { value: '2y', label: '系統化練 1–2 年以上' }
      ]
    },

    // C 骨骼肌肉（Kuorinka 1987 NMQ 架構）
    msk: {
      title: '骨骼肌肉',
      source: 'Kuorinka et al. 1987（Nordic Musculoskeletal Questionnaire）',
      areas: {
        id: 'areas',
        text: '下列部位目前有疼痛或受傷嗎？（可複選，沒有就不用選）',
        items: [
          { id: 'knee', label: '膝蓋' },
          { id: 'back', label: '腰背' },
          { id: 'shoulder', label: '肩膀' },
          { id: 'wrist', label: '手腕' }
        ]
      },
      pain: {
        id: 'pain',
        text: '過去 7 天，這些部位還在痛嗎？請打分數（0＝不痛，10＝最痛）',
        min: 0, max: 10
      },
      redFlags: {
        id: 'mskRedFlags',
        text: '有沒有下列狀況？（可複選，有任一項，該部位的動作會全部關掉）',
        items: [
          { id: 'hotSwollen', text: '關節紅、腫、熱', areas: ['knee', 'back', 'shoulder', 'wrist'] },
          { id: 'cannotBear', text: '受傷後無法承重', areas: ['knee', 'back', 'shoulder', 'wrist'] },
          { id: 'kneeLock', text: '膝蓋卡住伸不直，或突然軟腳', areas: ['knee'] },
          { id: 'backNeuro', text: '腰痛合併腿麻、無力，或大小便異常', areas: ['back'] },
          { id: 'nightPain', text: '休息或夜間仍然劇痛', areas: ['knee', 'back', 'shoulder', 'wrist'] }
        ]
      }
    },

    // 器材（跟著做用）
    equipment: [
      { id: 'none', label: '徒手' },
      { id: 'bottle', label: '水壺' },
      { id: 'dumbbell', label: '啞鈴' },
      { id: 'band', label: '彈力帶' },
      { id: 'chair', label: '椅子' }
    ],

    // 強度與談話測試
    intensity: [
      { id: 'light', label: '輕', talk: '可以輕鬆講話、唱歌', counts: false },
      { id: 'moderate', label: '中', talk: '能講話，但不能唱歌', counts: true },
      { id: 'vigorous', label: '高', talk: '講不完一句完整的話', counts: true }
    ]
  };

  // 有氧活動清單（記錄有氧用）。lowImpact：膝蓋有狀況時優先建議
  root.PlateActivities = [
    { id: 'walk', name: '散步', defaultIntensity: 'light', lowImpact: true },
    { id: 'brisk-walk', name: '快走', defaultIntensity: 'moderate', lowImpact: true },
    { id: 'bike', name: '騎腳踏車', defaultIntensity: 'moderate', lowImpact: true },
    { id: 'stationary-bike', name: '固定式腳踏車', defaultIntensity: 'moderate', lowImpact: true },
    { id: 'swim', name: '游泳／水中運動', defaultIntensity: 'moderate', lowImpact: true },
    { id: 'stairs', name: '爬樓梯', defaultIntensity: 'vigorous', lowImpact: false },
    { id: 'jog', name: '慢跑／跑步', defaultIntensity: 'vigorous', lowImpact: false },
    { id: 'dance', name: '跳舞／有氧舞蹈', defaultIntensity: 'moderate', lowImpact: false },
    { id: 'ball', name: '球類運動', defaultIntensity: 'vigorous', lowImpact: false },
    { id: 'hike', name: '爬山', defaultIntensity: 'moderate', lowImpact: false },
    { id: 'other', name: '其他', defaultIntensity: 'moderate', lowImpact: true }
  ];
})(typeof window !== 'undefined' ? window : this);
