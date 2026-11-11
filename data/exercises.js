/* 運動餐盤 動作資料
 * avoid：照規則表 C 的替換原則標註，使用者勾選的疼痛部位跟 avoid 有交集就不推薦。
 *   膝：深蹲 >45°、跳躍、前跨弓箭步、跪姿 → knee
 *   腰背：無支撐彎腰、仰臥起坐、過度後仰、負重前彎 → back
 *   肩：手舉過頭、伏地挺身 → shoulder
 *   手腕：手掌撐地 → wrist
 * balance：平衡動作（65 歲以上伸展塊要含，WHO 2020）
 * pose：示意火柴人的姿勢代號（畫面用）
 * 微型運動的 intensity 是「一般人做起來」的預設值，使用者記錄時可以自己改。
 */
(function (root) {
  'use strict';

  var stretch = [
    { id: 'st-neck', name: '頸部側伸', type: 'stretch', equipment: ['none'], level: 1, avoid: [], seconds: 20, sides: 2, pose: 'stand-neck',
      steps: ['坐或站直，肩膀放鬆往下沉。', '頭慢慢往一側倒，耳朵靠向肩膀。', '感覺脖子側邊拉開就停，不要用手硬壓。'] },
    { id: 'st-chest', name: '胸口打開', type: 'stretch', equipment: ['none'], level: 1, avoid: ['shoulder'], seconds: 20, sides: 1, pose: 'stand-chest',
      steps: ['雙手在背後交握，手臂伸直。', '肩胛骨往中間夾，胸口往前挺。', '保持自然呼吸，不要聳肩。'] },
    { id: 'st-crossarm', name: '手臂橫胸伸展', type: 'stretch', equipment: ['none'], level: 1, avoid: ['shoulder'], seconds: 20, sides: 2, pose: 'stand-crossarm',
      steps: ['一手伸直橫過胸前。', '另一手扶在手肘上方，輕輕往身體帶。', '感覺肩膀後側拉開就好。'] },
    { id: 'st-tricep', name: '手臂後側伸展', type: 'stretch', equipment: ['none'], level: 2, avoid: ['shoulder'], seconds: 20, sides: 2, pose: 'arms-up',
      steps: ['一手舉高，手肘彎曲，手掌放到背後。', '另一手扶住手肘，輕輕往後帶。', '身體保持直立，不要往後仰。'] },
    { id: 'st-hamstring', name: '坐姿腿後側伸展', type: 'stretch', equipment: ['chair'], level: 1, avoid: [], seconds: 30, sides: 2, pose: 'sit-reach',
      steps: ['坐在椅子前緣，一腳往前伸直、腳跟著地。', '雙手扶在大腿上，背打直，從髖部往前傾。', '大腿後側有拉感就停住。'] },
    { id: 'st-quad', name: '扶椅大腿前側伸展', type: 'stretch', equipment: ['chair'], level: 2, avoid: ['knee'], seconds: 20, sides: 2, pose: 'quad',
      steps: ['一手扶椅背站穩。', '另一手抓住同側腳踝，把腳跟拉向臀部。', '兩邊膝蓋靠攏，身體站直。'] },
    { id: 'st-calf', name: '扶牆小腿伸展', type: 'stretch', equipment: ['none'], level: 1, avoid: [], seconds: 30, sides: 2, pose: 'calf',
      steps: ['雙手扶牆，一腳往後踩一大步。', '後腳打直、腳跟踩地，前腳膝蓋微彎。', '身體往牆靠，感覺小腿拉開。'] },
    { id: 'st-catcow', name: '貓牛式', type: 'stretch', equipment: ['none'], level: 2, avoid: ['wrist', 'knee'], seconds: 30, sides: 1, pose: 'all-fours',
      steps: ['雙手雙膝跪在地上，手在肩膀正下方。', '吐氣時背拱起來、低頭；吸氣時背慢慢放平、抬頭。', '動作放慢，範圍以舒服為主。'] },
    { id: 'st-child', name: '嬰兒式', type: 'stretch', equipment: ['none'], level: 2, avoid: ['knee'], seconds: 30, sides: 1, pose: 'child',
      steps: ['跪坐，臀部坐向腳跟。', '上身往前趴，雙手往前延伸放在地上。', '額頭靠地或靠在手上，慢慢呼吸。'] },
    { id: 'st-twist', name: '坐姿轉體', type: 'stretch', equipment: ['chair'], level: 1, avoid: ['back'], seconds: 20, sides: 2, pose: 'sit-twist',
      steps: ['坐直，雙腳踩穩地面。', '上身慢慢轉向一側，手扶椅背。', '轉到有拉感就停，不要用力扭。'] },
    { id: 'st-oneleg', name: '扶椅單腳站', type: 'stretch', equipment: ['chair'], level: 1, avoid: [], seconds: 20, sides: 2, balance: true, pose: 'oneleg',
      steps: ['站在椅子旁，一手輕扶椅背。', '一腳慢慢離地，站穩後保持。', '熟練後可以只用一根手指扶，或短暫放手。'] },
    { id: 'st-heeltoe', name: '腳跟接腳尖走', type: 'stretch', equipment: ['none'], level: 1, avoid: [], seconds: 30, sides: 1, balance: true, pose: 'walk',
      steps: ['靠牆或桌邊，找一條直線。', '前腳腳跟貼著後腳腳尖，一步一步往前走。', '眼睛看前方，需要時扶牆。'] }
  ];

  var strength = [
    { id: 'sg-wallsit', name: '靠牆微蹲', type: 'strength', equipment: ['none'], level: 1, avoid: [], seconds: 20, sides: 1, pose: 'wallsit',
      steps: ['背靠牆，雙腳往前踩一步、與肩同寬。', '沿著牆往下滑一點點，膝蓋彎不超過 45 度。', '膝蓋對準腳尖，保持不動。'] },
    { id: 'sg-chairstand', name: '椅子坐站', type: 'strength', equipment: ['chair'], level: 1, avoid: ['knee'], reps: 10, sides: 1, pose: 'squat',
      steps: ['坐在椅子前緣，雙腳與肩同寬。', '雙手交叉放胸前，身體微前傾站起來。', '慢慢坐回去，臀部輕碰椅面再站起。'] },
    { id: 'sg-squat', name: '徒手深蹲', type: 'strength', equipment: ['none'], level: 2, avoid: ['knee'], reps: 12, sides: 1, pose: 'squat',
      steps: ['雙腳與肩同寬，腳尖微微朝外。', '臀部往後坐，蹲到大腿接近平行地面。', '膝蓋對準腳尖，踩穩站起來。'] },
    { id: 'sg-bridge', name: '橋式', type: 'strength', equipment: ['none'], level: 1, avoid: [], reps: 12, sides: 1, pose: 'bridge',
      steps: ['躺平，雙膝彎曲，腳掌踩地。', '用臀部力量把屁股抬起，身體成一直線。', '停一秒，慢慢放下。'] },
    { id: 'sg-clamshell', name: '蚌殼式', type: 'strength', equipment: ['none'], level: 1, avoid: [], reps: 12, sides: 2, pose: 'side-lie',
      steps: ['側躺，雙膝彎曲疊在一起。', '腳跟併攏，上面的膝蓋像蚌殼一樣打開。', '骨盆不要往後倒，慢慢合起。'] },
    { id: 'sg-wallpush', name: '靠牆伏地挺身', type: 'strength', equipment: ['none'], level: 1, avoid: ['wrist'], reps: 10, sides: 1, pose: 'wallpush',
      steps: ['面對牆站一步遠，雙手扶牆與肩同高。', '手肘彎曲，身體一直線靠向牆。', '推回原位，肚子收緊。'] },
    { id: 'sg-kneepush', name: '跪姿伏地挺身', type: 'strength', equipment: ['none'], level: 2, avoid: ['wrist', 'shoulder', 'knee'], reps: 8, sides: 1, pose: 'plank',
      steps: ['雙膝跪地，雙手撐地比肩膀寬一點。', '身體從頭到膝蓋一直線，慢慢往下。', '胸口接近地面再推起。'] },
    { id: 'sg-lunge', name: '前跨弓箭步', type: 'strength', equipment: ['none'], level: 2, avoid: ['knee'], reps: 8, sides: 2, pose: 'lunge',
      steps: ['站直，一腳往前跨一大步。', '兩腿膝蓋彎曲往下，前膝不超過腳尖太多。', '前腳用力推回原位。'] },
    { id: 'sg-bottlerow', name: '水壺單手划船', type: 'strength', equipment: ['bottle', 'chair'], level: 1, avoid: [], reps: 10, sides: 2, pose: 'row',
      steps: ['一手扶椅子，身體微前傾、背打直。', '另一手拿水壺，往腰側拉起，手肘貼身。', '慢慢放下，肩膀不要聳起。'] },
    { id: 'sg-bottlepress', name: '水壺過頭推舉', type: 'strength', equipment: ['bottle'], level: 2, avoid: ['shoulder'], reps: 10, sides: 1, pose: 'arms-up',
      steps: ['雙手各拿一個水壺，放在肩膀高度。', '往上推到手臂伸直，不要拱腰。', '慢慢放回肩膀。'] },
    { id: 'sg-hammercurl', name: '啞鈴錘式彎舉', type: 'strength', equipment: ['dumbbell'], level: 1, avoid: [], reps: 10, sides: 1, pose: 'curl',
      steps: ['雙手握啞鈴，掌心相對（手腕保持中立）。', '手肘貼身，把啞鈴往上彎到胸前。', '慢慢放下，不要甩。'] },
    { id: 'sg-rdl', name: '啞鈴羅馬尼亞硬舉', type: 'strength', equipment: ['dumbbell'], level: 3, avoid: ['back'], reps: 10, sides: 1, pose: 'hinge',
      steps: ['雙手拿啞鈴在大腿前，膝蓋微彎。', '背打直，臀部往後推，啞鈴沿著腿往下。', '大腿後側有拉感就用臀部力量站回來。'] },
    { id: 'sg-bandpull', name: '彈力帶胸前拉開', type: 'strength', equipment: ['band'], level: 1, avoid: [], reps: 12, sides: 1, pose: 'stand-chest',
      steps: ['雙手握彈力帶，手臂伸直在胸前。', '往兩側拉開，肩胛骨往中間夾。', '慢慢回到原位。'] },
    { id: 'sg-forearmplank', name: '前臂棒式', type: 'strength', equipment: ['none'], level: 2, avoid: [], seconds: 20, sides: 1, pose: 'plank',
      steps: ['前臂撐地，手肘在肩膀正下方。', '雙腳往後伸直（或膝蓋著地），身體一直線。', '肚子收緊，不要塌腰。'] },
    { id: 'sg-jumpsquat', name: '跳躍深蹲', type: 'strength', equipment: ['none'], level: 3, avoid: ['knee', 'back'], reps: 8, sides: 1, pose: 'squat',
      steps: ['先蹲下，雙手擺在身體兩側。', '用力往上跳，手往上擺。', '落地時膝蓋微彎，輕輕接住再蹲下。'] }
  ];

  var micro = [
    { id: 'mc-stairs', name: '爬樓梯', type: 'micro', equipment: ['none'], level: 2, avoid: ['knee'], seconds: 120, sides: 1, intensity: 'vigorous', pose: 'walk',
      steps: ['不搭電梯，一階一階往上走。', '走到會喘、講不完整句子就算高強度。'] },
    { id: 'mc-briskwalk', name: '快走去辦事', type: 'micro', equipment: ['none'], level: 1, avoid: [], seconds: 300, sides: 1, intensity: 'moderate', pose: 'walk',
      steps: ['去買東西、倒垃圾時加快腳步。', '走到能講話、不能唱歌的速度。'] },
    { id: 'mc-march', name: '原地踏步', type: 'micro', equipment: ['none'], level: 1, avoid: [], seconds: 120, sides: 1, intensity: 'moderate', pose: 'walk',
      steps: ['站著原地踏步，膝蓋抬高一點。', '手跟著前後擺動。'] },
    { id: 'mc-tvchair', name: '廣告時間椅子坐站', type: 'micro', equipment: ['chair'], level: 1, avoid: ['knee'], seconds: 60, sides: 1, intensity: 'moderate', pose: 'squat',
      steps: ['看電視進廣告時，從椅子站起再坐下。', '連續做到廣告結束。'] },
    { id: 'mc-calfraise', name: '等水煮開踮腳尖', type: 'micro', equipment: ['none'], level: 1, avoid: [], seconds: 60, sides: 1, intensity: 'light', pose: 'stand',
      steps: ['扶著流理台，腳跟抬起再放下。', '慢慢做，感覺小腿出力。'] },
    { id: 'mc-dance', name: '放一首歌跳舞', type: 'micro', equipment: ['none'], level: 1, avoid: [], seconds: 210, sides: 1, intensity: 'moderate', pose: 'arms-up',
      steps: ['放一首喜歡的歌，跟著音樂動。', '動到微微流汗、呼吸變快。'] },
    { id: 'mc-jacks', name: '開合跳', type: 'micro', equipment: ['none'], level: 2, avoid: ['knee', 'shoulder'], seconds: 60, sides: 1, intensity: 'vigorous', pose: 'arms-up',
      steps: ['雙腳跳開、雙手往上拍，再跳回併攏。', '連續做 1 分鐘，不行就改原地踏步。'] },
    { id: 'mc-shadowbox', name: '原地空拳', type: 'micro', equipment: ['none'], level: 1, avoid: ['shoulder'], seconds: 90, sides: 1, intensity: 'moderate', pose: 'stand',
      steps: ['雙腳前後站，雙手握拳在臉前。', '左右輪流往前出拳，腳步跟著輕輕移動。'] },
    { id: 'mc-mop', name: '用力拖地', type: 'micro', equipment: ['none'], level: 1, avoid: ['back'], seconds: 300, sides: 1, intensity: 'moderate', pose: 'stand',
      steps: ['拖地或吸地時動作放大、速度加快。', '膝蓋微彎，用腳移動，不要一直彎腰。'] },
    { id: 'mc-carry', name: '提購物袋走路', type: 'micro', equipment: ['none'], level: 1, avoid: ['back', 'wrist'], seconds: 300, sides: 1, intensity: 'moderate', pose: 'walk',
      steps: ['兩手各提一袋，重量平均分配。', '背挺直，穩穩走回家。'] }
  ];

  root.PlateExercises = stretch.concat(strength, micro);
})(typeof window !== 'undefined' ? window : this);
