/* 팔레트 · 프리셋 데이터 */
const PAL = {
  ink:'#14110E', white:'#FFFFFF', lime:'#D8FF2A', yellow:'#FFE23D', butter:'#FCFFB3',
  pink:'#FF3CCE', hotpink:'#FF5E9C', rose:'#FFB3C7', mint:'#4EF0C8', aqua:'#7FE8FF',
  sky:'#BFE9FF', cream:'#FFF4D6', beige:'#EBDCC4', brown:'#6B4423', navy:'#1B1B4D',
  purple:'#B79BFF', lav:'#E3D7FF', coral:'#FF8A5C', grey:'#DCD5C6'
};

const SWATCHES = [
  PAL.ink, PAL.white, PAL.lime, PAL.yellow, PAL.butter,
  PAL.pink, PAL.hotpink, PAL.rose, PAL.coral, PAL.mint,
  PAL.aqua, PAL.sky, PAL.purple, PAL.lav, PAL.cream,
  PAL.beige, PAL.brown, PAL.navy
];

const FONTS = [
  {name:'BM꾸불림체', group:'손글씨', weights:[400]},
  {name:'온글잎 류류체', group:'손글씨', weights:[400]},
  {name:'감다살체', group:'손글씨', weights:[400]},
  {name:'이서윤체', group:'손글씨', weights:[400]},
  {name:'온글잎 쑴체', group:'손글씨', weights:[400]},
  {name:'온글잎 콘콘체', group:'손글씨', weights:[400]},
  {name:'온글잎 의청수 다경체', group:'손글씨', weights:[400]},
  {name:'나눔바른펜 B', group:'손글씨', weights:[700]},
  {name:'나눔바른펜 R', group:'손글씨', weights:[400]},
  {name:'그리운 야옹이엄마 손글씨', group:'손글씨', weights:[400]},
  {name:'그리운 프롬솔', group:'손글씨', weights:[400]},
  {name:'상상토끼 꽃집 막내딸', group:'손글씨', weights:[400]},
  {name:'개구 Gaegu', group:'손글씨', weights:[400]},
  {name:'주아 Jua', group:'손글씨', weights:[400]},
  {name:'하이멜로디', group:'손글씨', weights:[400]},
  {name:'은 디나루', group:'손글씨', weights:[300,400,700]},
  {name:'느좋체', group:'손글씨', weights:[400,700]},
  {name:'대구북성로', group:'손글씨', weights:[300,800]},
  {name:'김씨 김정대2벌체', group:'손글씨', weights:[400]},
  {name:'히피체', group:'손글씨', weights:[400]},
  {name:'ELAND 초이스 M', group:'손글씨', weights:[500]},
  {name:'한겨레결체', group:'손글씨', weights:[400]},
  {name:'속초바다 바탕', group:'손글씨', weights:[400]},
  {name:'조선굴림체', group:'고딕', weights:[400]},
  {name:'Pretendard', group:'고딕', weights:[400,600,700,800]},
  {name:'Freesentation', group:'고딕', weights:[400,500,700,900]},
  {name:'넥슨Lv2고딕', group:'고딕', weights:[500]},
  {name:'페이퍼로지 8', group:'고딕', weights:[800]},
  {name:'Instrument Serif', group:'영문', weights:[400]},
  {name:'Aquiline Two', group:'영문', weights:[400]}
];

/* 글씨 프리셋 — 오뜨(크로플) 스타일 + 직각 형광 박스 */
const TEXT_PRESETS = [
  {id:'ohtt-yellow', label:'옐로우 이중획', sample:'크로플',
   st:{color:PAL.yellow, font:'BM꾸불림체', size:150,
       s1:{c:PAL.ink, w:0.15}, s2:{c:PAL.white, w:0.03},
       shadow:{c:'rgba(20,17,14,.42)', dx:0.045, dy:0.07, blur:0.02}}},
  {id:'ohtt-lime', label:'라임 팝', sample:'크로플',
   st:{color:PAL.lime, font:'주아 Jua', size:150,
       s1:{c:PAL.ink, w:0.14}, shadow:{c:'rgba(20,17,14,.35)', dx:0.05, dy:0.065, blur:0.01}}},
  {id:'ohtt-pink', label:'핑크 팝', sample:'크로플',
   st:{color:PAL.pink, font:'BM꾸불림체', size:150,
       s1:{c:PAL.white, w:0.17}, s2:{c:PAL.ink, w:0.035}}},
  {id:'ohtt-mint', label:'민트 글로우', sample:'크로플',
   st:{color:PAL.white, font:'온글잎 쑴체', size:150, s1:{c:PAL.mint, w:0.19},
       shadow:{c:'rgba(78,240,200,.85)', dx:0, dy:0, blur:0.22}}},
  {id:'ohtt-cream', label:'크림 버터', sample:'크로플',
   st:{color:PAL.cream, font:'개구 Gaegu', size:150, s1:{c:PAL.brown, w:0.10}}},
  {id:'ohtt-navy', label:'네이비 아웃', sample:'croffle',
   st:{color:PAL.white, font:'Pretendard', weight:800, size:130,
       s1:{c:PAL.navy, w:0.13}, shadow:{c:'rgba(27,27,77,.4)', dx:0.04, dy:0.06, blur:0.02}}},
  {id:'ohtt-aqua', label:'아쿠아 더블', sample:'크로플',
   st:{color:PAL.sky, font:'온글잎 류류체', size:150,
       s1:{c:'#0E7A8C', w:0.12}, s2:{c:PAL.white, w:0.04}}},
  {id:'ohtt-brown', label:'밤색 손글씨', sample:'크로플',
   st:{color:PAL.brown, font:'그리운 야옹이엄마 손글씨', size:150,
       shadow:{c:'rgba(255,255,255,.7)', dx:0.02, dy:0.03, blur:0.08}}},
  {id:'ohtt-whitepink', label:'화이트+핑크', sample:'크로플',
   st:{color:PAL.white, font:'온글잎 의청수 다경체', size:150, s1:{c:PAL.hotpink, w:0.16}}},
  {id:'ohtt-blackbox', label:'블랙 직각박스', sample:'크로플',
   st:{color:PAL.white, font:'Pretendard', weight:800, size:96,
       bg:{c:PAL.ink, pad:0.34, r:0, bw:0}}},
  {id:'ohtt-limebox', label:'라임 직각박스', sample:'크로플',
   st:{color:PAL.ink, font:'Pretendard', weight:800, size:96,
       bg:{c:PAL.lime, pad:0.34, r:0, bw:0}}},
  {id:'ohtt-pinkbox', label:'핑크 직각박스', sample:'크로플',
   st:{color:PAL.white, font:'Pretendard', weight:800, size:96,
       bg:{c:PAL.pink, pad:0.34, r:0, bw:0}}},
  {id:'ohtt-creambox', label:'크림 직각박스', sample:'크로플',
   st:{color:PAL.ink, font:'나눔바른펜 B', size:104,
       bg:{c:PAL.cream, pad:0.3, r:0, bw:3, bc:PAL.ink}}},
  {id:'ohtt-hl', label:'형광 밑줄', sample:'크로플',
   st:{color:PAL.ink, font:'온글잎 콘콘체', size:130, hl:PAL.lime}},
  {id:'ohtt-outline-ink', label:'잉크 외곽선', sample:'croffle',
   st:{color:PAL.white, font:'Aquiline Two', size:150,
       s1:{c:PAL.ink, w:0.07}, shadow:{c:'rgba(20,17,14,.3)', dx:0.03, dy:0.05, blur:0.03}}},
  {id:'ohtt-letter', label:'영문 세리프', sample:'croffle',
   st:{color:PAL.ink, font:'Instrument Serif', size:150}},
  {id:'chosun', label:'조선굴림 클린', sample:'오늘의 기록',
   st:{color:PAL.ink, font:'조선굴림체', size:110}},
  {id:'chosun-cream', label:'조선굴림 크림', sample:'오늘의 기록',
   st:{color:PAL.ink, font:'조선굴림체', size:92,
       bg:{c:PAL.cream, pad:0.32, r:0, bw:2, bc:PAL.ink}}}
];

/* 박스 프리셋 — 전부 완전 직각(radius 0) */
const BOX_COLORS = [
  {c:PAL.lime, n:'라임'}, {c:PAL.yellow, n:'옐로우'}, {c:PAL.butter, n:'버터'},
  {c:PAL.pink, n:'핑크'}, {c:PAL.hotpink, n:'핫핑크'}, {c:PAL.rose, n:'로즈'},
  {c:PAL.mint, n:'민트'}, {c:PAL.aqua, n:'아쿠아'}, {c:PAL.sky, n:'하늘'},
  {c:PAL.cream, n:'크림'}, {c:PAL.beige, n:'베이지'}, {c:PAL.lav, n:'라벤더'},
  {c:PAL.purple, n:'퍼플'}, {c:PAL.coral, n:'코랄'}, {c:PAL.navy, n:'네이비'},
  {c:PAL.brown, n:'밤색'}, {c:PAL.ink, n:'검정'}, {c:PAL.white, n:'화이트'}
];
const BOX_STYLES = [
  {id:'solid', label:'실선'}, {id:'dashed', label:'점선'}, {id:'double', label:'이중선'},
  {id:'tape', label:'테이프'}, {id:'badge', label:'배지'}, {id:'frame', label:'테두리'}
];

const BUBBLES = [
  {id:'wobble', label:'삐뚤 말풍선'},
  {id:'cloud', label:'구름 말풍선'},
  {id:'sharp', label:'각진 메모'},
  {id:'oval', label:'동그란 말풍선'}
];

const DECOS = [
  {id:'music', label:'음악 플레이어', w:480, h:158, text:'오늘의 BGM'},
  {id:'datetag', label:'날짜·장소 태그', w:360, h:64, text:'2026.11.27 · 온천동'},
  {id:'badge', label:'PLUS 배지', w:140, h:52, text:'PLUS'},
  {id:'stamp', label:'스탬프', w:200, h:200, text:'TODAY'},
  {id:'sparkle', label:'반짝이 띠', w:400, h:54},
  {id:'tape', label:'테이프', w:220, h:54},
  {id:'arrow', label:'손그림 화살표', w:250, h:150},
  {id:'polaroid', label:'폴라로이드', w:250, h:310}
];

const EMOJIS = ['♡','♥','✦','✧','★','☆','✶','✿','❀','☺','☻','☼','♪','♫','☁','☂','✈','☕','🍞','🍰','🍓','🍒','🍋','🥐','🍜','🍙','🧋','🍿','🎧','📷','📚','✏️','🖊️','📎','📌','🎀','🕯️','🌷','🌼','🌿','🍀','🌈','⭐','💫','✨','💌','💐','🫧','🩷','🩵','🖤','🤍','😴','🥹','😳','😵‍💫','🫠','🙃','🐰','🐱','🐶','🐻','🐤','🐸','🌙','🪐'];
