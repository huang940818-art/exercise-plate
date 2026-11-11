/* 每月主打的當季農產品（集章冊兌換用）
 * 狀態：示意。產季是一般常見說法，還沒跟在地農會／小農確認，也還沒有合作對象。
 * 之後跟屏東運動護照案或在地農會談好，再換成真的品項和產地。
 */
(function (root) {
  'use strict';
  root.PlateProduce = {
    status: '示意（產季待跟在地農會確認）',
    months: {
      1: { name: '蓮霧', note: '冬天到春天是盛產期', color: '#C8323C', shape: 'bell' },
      2: { name: '洋蔥', note: '恆春洋蔥冬春採收', color: '#C98A4B', shape: 'onion' },
      3: { name: '番茄', note: '冬春的牛番茄、小番茄', color: '#E2483A', shape: 'round' },
      4: { name: '鳳梨', note: '春天開始進入產季', color: '#F2B53A', shape: 'pine' },
      5: { name: '芒果', note: '愛文芒果初夏上市', color: '#F59A3E', shape: 'drop' },
      6: { name: '荔枝', note: '夏初的季節水果', color: '#D9465A', shape: 'round' },
      7: { name: '檸檬', note: '夏天是檸檬盛產期', color: '#E8C93A', shape: 'drop' },
      8: { name: '火龍果', note: '夏秋產季', color: '#D6417F', shape: 'drop' },
      9: { name: '芭樂', note: '一年多產，秋天好吃', color: '#7FB24E', shape: 'round' },
      10: { name: '可可', note: '屏東可可秋天採收', color: '#8A5A3C', shape: 'pod' },
      11: { name: '毛豆', note: '秋作毛豆採收', color: '#6FA84A', shape: 'pod' },
      12: { name: '紅豆', note: '萬丹紅豆冬天採收', color: '#9E2F3A', shape: 'bean' }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
