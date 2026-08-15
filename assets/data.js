/* 行程数据 —— 只改这个文件就能改行程内容。
 *
 * 每天 = { id, label, eyebrow, title, tag, blocks }
 *   tag.kind   : 'plain' 淡灰文字 | 'badge' 主色徽章 | 'muted' 灰底徽章
 *   blocks[]   : 按顺序渲染
 *     { t:'row',      time, kind:'go'|'fixed'|null, place, copy:false?, note, noteWarn, dur, tall }
 *     { t:'fallback', text }                     「如果」备用方案（精简版会隐藏）
 *     { t:'plan',     label, text }              并列方案 A / B
 *     { t:'warn',     text }                     红色警示
 *     { t:'legend' }                             颜色图例（仅 Day 1）
 *     { t:'lodging',  title, rows[], footer[] }  住宿一览（仅 Day 9）
 *
 *   kind:'go'    出发时间 → 主色
 *   kind:'fixed' 已预约·不能迟到 → 红色
 */
window.TRIP = {
  storeKey: 'trip-card-idx-0817',
  days: [
    {
      id: 'day1',
      label: '8/17',
      eyebrow: 'DAY 1 · 8月17日（周一）',
      title: '羽田 → 镰仓',
      tag: { kind: 'plain', text: '首日接机' },
      blocks: [
        { t: 'row', time: '15:00', kind: 'go', place: '羽田空港 接机', note: '航班14:00到，取完行李上车', dur: '▶ 60分' },
        { t: 'row', time: '16:15‒17:15', place: '镰仓 小町通り', dur: '▶ 20分' },
        { t: 'row', time: '17:35‒17:55', place: '七里ヶ浜', dur: '▶ 就近' },
        { t: 'row', time: '18:00‒19:15', place: 'bills 七里ヶ浜 晚餐', dur: '▶ 15分' },
        { t: 'row', time: '19:30', place: '江の島（夜景）→ 送酒店' },
        { t: 'fallback', text: '航班延误、15:30 后才上车 → 跳过小町通，直接开七里ヶ浜，保证 18:00 到 bills' },
        { t: 'legend' }
      ]
    },
    {
      id: 'day2',
      label: '8/18',
      eyebrow: 'DAY 2 · 8月18日（周二）',
      title: '镰仓 → 热海',
      tag: { kind: 'badge', text: '★ 换酒店·装行李' },
      blocks: [
        { t: 'row', time: '08:15 出发', kind: 'go', place: 'HOTEL AO KAMAKURA', dur: '▶ 10分' },
        { t: 'row', time: '08:25‒08:45', place: '七里ヶ浜', dur: '▶ 10分' },
        { t: 'row', time: '08:50‒09:15', place: '镰仓高校前', note: '江ノ電拍照，每约12分一班', dur: '▶ 10分' },
        { t: 'row', time: '09:20', place: '江の島 下车', note: '上行走エスカー约20分到鱼见亭（扶梯只上不下）' },
        { t: 'row', time: '09:40', kind: 'fixed', place: '鱼见亭 排队', note: '10:00开门前必须到位', noteWarn: true },
        { t: 'row', time: '10:00‒11:00', place: '鱼见亭 用餐' },
        { t: 'row', time: '11:10‒11:30', place: '江の島岩屋' },
        { t: 'row', time: '11:35‒11:50', place: '稚児ヶ淵 乘 べんてん丸 回弁天橋', note: '约7分，无固定班次，2艘轮流，一般等5〜10分' },
        { t: 'row', time: '12:00', kind: 'go', place: '弁天橋 本土側 上车 → 热海', note: '船和步行都在同一处上车', dur: '▶ 90分' },
        { t: 'row', time: '13:35‒15:15', place: 'MOA美術館', note: '游客反馈最少需1.5〜2小时；最终入馆16:00', dur: '▶ 10分' },
        { t: 'row', time: '15:30‒16:15', place: '起雲閣', note: '一圈实测约40分；最终入馆16:30', dur: '▶ 5分' },
        { t: 'row', time: '16:25 到店', kind: 'fixed', place: 'Kimonoya', note: '16:30 发型师预约，不可迟到', noteWarn: true },
        { t: 'row', time: '17:45', place: '银座商店街 放下', note: '在此晚餐，之后步行去沙滩看花火，晚上不用车' },
        { t: 'fallback', text: '12:30 后才离开江の島 → 放弃起雲閣，MOA 改 14:10‒15:50，16:25 直接到 Kimonoya' }
      ]
    },
    {
      id: 'day3',
      label: '8/19',
      eyebrow: 'DAY 3 · 8月19日（周三）',
      title: '热海 → 伊东 → 稲取',
      tag: { kind: 'badge', text: '★ 换酒店·装行李' },
      blocks: [
        { t: 'row', time: '08:00 出发', kind: 'go', place: 'Atami Seaside Spa & Resort', note: '赶大室山首班缆车。', dur: '▶ 50分' },
        { t: 'row', time: '08:50 到达', kind: 'fixed', place: '大室山 停车场', note: '缆车09:00开始运行，务必开门前排上队', noteWarn: true },
        { t: 'row', time: '09:00‒10:15', place: '大室山', note: '缆车单程6分＋火口一周；暑假期间迟到会排30〜60分，中午可达1小时以上', dur: '▶ 5分' },
        { t: 'row', time: '10:25‒12:25', place: '伊豆シャボテン動物公園', note: '时间可缩短', dur: '▶ 5分' },
        { t: 'row', time: '12:30‒13:30', place: 'Ohmuro Luncheonette 午餐', dur: '▶ 20分' },
        { t: 'row', time: '13:50‒14:50', place: '城ヶ崎海岸·門脇吊橋', note: '停车场步行5〜10分，吊橋＋灯台一带约30〜60分', dur: '▶ 30分' },
        { t: 'row', time: '15:20‒15:50', place: 'Kazumura（猪排饭）', dur: '▶ 10分' },
        { t: 'row', time: '16:10', place: '稲取荘 入住', note: '当晚泡温泉，时间充裕' },
        { t: 'fallback', text: '山顶有薄雾 → 仍照常09:00上山，在山顶等雾散（上午多会散）；不要为了等雾改到中午，那时排队最长' },
        { t: 'fallback', text: '确定整天大雾∕强风停运 → 09:00‒11:00 先动物公园，午餐11:10‒12:10，13:00 再看情况上大室山（预留排队30分）' },
        { t: 'fallback', text: '动物公园只逛1小时 → 可加回 小室山（约40分）' },
        { t: 'warn', text: '大室山缆车 3〜9月 09:00‒17:00（下行末班17:15），荒天·强风会停运，出发前查官网运行情况。' }
      ]
    },
    {
      id: 'day4',
      label: '8/20',
      eyebrow: 'DAY 4 · 8月20日（周四）',
      title: '南伊豆·下田 一日',
      tag: { kind: 'plain', text: '住同一酒店·行李留房' },
      blocks: [
        { t: 'row', time: '09:30 出发', kind: 'go', place: '稲取荘', note: '前提：8/19 已泡过温泉。石廊崎17:00闭园', dur: '▶ 35分' },
        { t: 'row', time: '10:05‒10:45', place: '白浜海岸·伊古奈比咩命神社', dur: '▶ 15分' },
        { t: 'row', time: '11:00‒11:30', place: '九十浜', dur: '▶ 15分' },
        { t: 'row', time: '11:45‒12:15', place: '爪木崎', dur: '▶ 20分' },
        { t: 'row', time: '12:35‒14:15', place: '下田 黒船·午餐·下田公园', dur: '▶ 25分' },
        { t: 'row', time: '14:45‒15:15', place: '竜宮窟', dur: '▶ 15分' },
        { t: 'row', time: '15:30‒15:50', place: '弓ヶ浜', dur: '▶ 15分' },
        { t: 'row', time: '16:05‒17:00', kind: 'fixed', place: '石廊崎オーシャンパーク', note: '营业8:30‒17:00，务必16:15前入园；停车场到岬角单程约10分', noteWarn: true, dur: '▶ 5分' },
        { t: 'row', time: '17:05‒18:45', place: 'ユウスゲ公園·愛逢岬', note: '距石廊崎仅0.7km；旁边 SOUTHPOINT 咖啡可等日落，日落约18:25', dur: '▶ 70分' },
        { t: 'row', time: '20:00', place: '回稲取荘' },
        { t: 'fallback', text: '8/19 晚上没泡成酒店温泉 → 改 08:30 出发，全天提前1小时，石廊崎 15:05‒16:00，ユウスゲ公園 只停30分（16:05‒16:35，不等日落），17:45 回酒店泡温泉、赶上旅馆晚餐' },
        { t: 'fallback', text: '天气阴看不到日落 → 石廊崎结束后直接返程，18:15 到酒店' }
      ]
    },
    {
      id: 'day5',
      label: '8/21',
      eyebrow: 'DAY 5 · 8月21日（周五）',
      title: '稲取 → 中伊豆 → 箱根',
      tag: { kind: 'badge', text: '★ 换酒店·装行李' },
      blocks: [
        { t: 'row', time: '08:30 出发', kind: 'go', place: '稲取荘', dur: '▶ 60分' },
        { t: 'row', time: '09:30‒10:10', place: '浄蓮の滝', dur: '▶ 10分' },
        { t: 'row', time: '10:20‒10:35', place: '天城わさび村', note: '短停，买纪念品，吃冰淇淋', dur: '▶ 15分' },
        { t: 'row', time: '10:50 到店', kind: 'fixed', place: '浅草じゅうろく 修善寺はなれ', note: '11:00开门前排队', noteWarn: true },
        { t: 'row', time: '11:00‒12:00', place: '午餐', dur: '▶ 10分' },
        { t: 'row', time: '12:15‒12:50', place: '修善寺', dur: '▶ 15分' },
        { t: 'row', time: '13:10‒14:40', place: '伊豆パノラマパーク', note: '缆车往返＋碧テラス，目安60〜120分', dur: '▶ 85分' },
        { t: 'row', time: '16:10‒17:00', place: '成川美術館', note: '最终入馆16:30', dur: '▶ 5分' },
        { t: 'row', time: '17:10‒17:45', place: '箱根神社 平和の鳥居', note: '拍照，天气好务必今天拍完', dur: '▶ 25分' },
        { t: 'row', time: '18:15', place: '翠雲 入住' },
        { t: 'fallback', text: 'じゅうろく 排队超过 30 分 → 缩短修善寺停留，パノラマパーク 改 13:40 上山' },
        { t: 'fallback', text: '16:20 后才到元箱根 → 放弃成川美術館，直接去鳥居拍照，17:00‒17:45' },
        { t: 'fallback', text: '当天下雨拍不成 → 鳥居改到 8/23 早上补，8/23 提前到 08:00 出发' }
      ]
    },
    {
      id: 'day6',
      label: '8/22',
      eyebrow: 'DAY 6 · 8月22日（周六）',
      title: '箱根 一日',
      tag: { kind: 'plain', text: '住同一酒店·行李留房' },
      blocks: [
        { t: 'row', time: '09:00 出发', kind: 'go', place: '翠雲（強羅）', note: '先上山，下午再下山看美术馆', dur: '▶ 10分' },
        { t: 'row', time: '09:20', place: '早雲山 换乘缆车上大涌谷' },
        { t: 'row', time: '09:45‒11:45', place: '大涌谷', note: '山上吃午饭，11:00 前入座避开高峰', dur: '▶ 30分' },
        { t: 'row', time: '12:15 到馆', kind: 'fixed', place: '箱根ラリック美術館', note: '一到就取下午茶整理券（东方快车餐车），先确认剩余场次', noteWarn: true },
        { t: 'plan', label: '方案 A', text: '取到 13:00 前后场：12:20‒14:20 参观＋下午茶 → 14:35‒15:45 ポーラ美術館 → 16:00‒16:45 ガラスの森' },
        { t: 'plan', label: '方案 B', text: '只剩 15:00 以后场：12:30‒14:00 ポーラ美術館 → 14:20 回ラリック，14:30‒16:30 下午茶 → ガラスの森 省略' },
        { t: 'row', time: '17:00', kind: 'fixed', place: 'Beef pot Ukon 晚餐 → 送酒店' },
        { t: 'fallback', text: '16:45 赶不及 → 省略最后一馆，保证 17:00 到 Ukon' },
        { t: 'warn', text: '下午茶预留满 120 分钟。先上山可避开大涌谷的人潮与午后云雾。' }
      ]
    },
    {
      id: 'day7',
      label: '8/23',
      eyebrow: 'DAY 7 · 8月23日（周日）',
      title: '箱根 → 东京',
      tag: { kind: 'badge', text: '★ 退房·行李随车' },
      blocks: [
        { t: 'row', time: '09:00 出发', kind: 'go', place: '翠雲 退房', note: '鳥居已于8/21晚拍完，早上可晚起', dur: '▶ 25分' },
        { t: 'row', time: '09:30‒11:00', place: '箱根園 駒ヶ岳ロープウェー', note: '上行末班16:30，每20分一班', dur: '▶ 25分' },
        { t: 'row', time: '11:45‒12:45', place: '森メシ 午餐', dur: '▶ 10分' },
        { t: 'row', time: '13:00‒14:15', place: '彫刻の森美術館', note: '官方主环线60〜90分，本次只走主环线', dur: '▶ 15分' },
        { t: 'row', time: '14:30‒15:00', place: '箱根湯本 站前商店街', dur: '▶ 115分' },
        { t: 'row', time: '17:00‒17:30', kind: 'fixed', place: 'PÂTISSERIE ASAKO IWAYANAGI', note: '世田谷区等々力4-4-5　03-6432-3878　已预约', noteWarn: true, dur: '▶ 30分' },
        { t: 'row', time: '18:00', place: '六本木酒店 卸行李·入住', dur: '▶ 就近' },
        { t: 'row', time: '18:30', place: '六本木新城 展望台' },
        { t: 'row', time: '20:00', kind: 'fixed', place: '焼肉 うし松', note: '已预约', noteWarn: true },
        { t: 'row', time: '22:00', place: '东京铁塔 → 送酒店' },
        { t: 'fallback', text: '14:30 前出不了汤本 → 跳过商店街，直接上高速，保证 17:00 甜品店' },
        { t: 'fallback', text: '8/21 鳥居没拍成 → 改 08:00 出发，先去箱根神社，其余顺延，湯本商店街取消' },
        { t: 'warn', text: '周日下午东名·首都可能高拥堵' }
      ]
    },
    {
      id: 'day8',
      label: '8/24',
      eyebrow: 'DAY 8 · 8月24日（周一）',
      title: '东京市内',
      tag: { kind: 'muted', text: '不用车' },
      blocks: [
        { t: 'row', tall: true, time: '全天', place: '森美術館 / 表参道 / 涩谷（Shibuya Sky 16:40）/ 麻布十番', copy: false, dur: '地铁·步行' }
      ]
    },
    {
      id: 'day9',
      label: '8/25',
      eyebrow: 'DAY 9 · 8月25日（周二）',
      title: '东京 → 羽田',
      tag: { kind: 'plain', text: '送机' },
      blocks: [
        { t: 'row', tall: true, time: '待定', kind: 'go', place: '三井花园酒店六本木 → 羽田空港', note: '按起飞前3小时到达倒推，另行通知', dur: '▶ 35分' },
        {
          t: 'lodging',
          title: '住宿一览（8晚）',
          rows: [
            ['8/17（1晚）', 'HOTEL AO KAMAKURA', '镰仓·七里ヶ浜'],
            ['8/18（1晚）', 'Atami Seaside Spa & Resort', '热海'],
            ['8/19‒8/20（2晚）', '稲取荘', '东伊豆·稲取'],
            ['8/21‒8/22（2晚）', '強羅温泉 雪月花別邸 翠雲', '箱根·強羅'],
            ['8/23‒8/24（2晚）', '三井ガーデンホテル六本木プレミア', '东京·六本木']
          ],
          footer: [
            '换酒店日（需装行李）：8/18 · 8/19 · 8/21 · 8/23',
            '乘客电话：＿＿＿＿＿＿＿＿＿＿　　司机电话：＿＿＿＿＿＿＿＿＿＿'
          ]
        }
      ]
    }
  ]
};
