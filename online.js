// Load Supabase safely: an unavailable CDN must not silently disable every button.
let createClient;
try {
  ({createClient} = await import('https://esm.sh/@supabase/supabase-js@2'));
} catch (error) {
  document.addEventListener('DOMContentLoaded', () => {
    const msg='온라인 기능 연결 실패: Supabase 라이브러리를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.';
    for (const id of ['onlineStatus','authStatus','ranks']) {
      const el=document.getElementById(id); if(el) el.textContent=msg;
    }
  });
  throw error;
}
const cfg=window.TODAYWORD_SUPABASE;
const $=id=>document.getElementById(id);
const status=message=>{const online=$('onlineStatus');if(online)online.textContent=message;const el=$('authStatus');if(el)el.textContent=message};
if(!cfg?.url||!cfg?.key){
  const msg='Supabase 설정 오류: config.js를 확인해 주세요.';
  for(const id of ['onlineStatus','authStatus','ranks']){const el=$(id);if(el)el.textContent=msg;}
  throw Error(msg);
}
const client=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let user=null,period='day',currentProfile=null;
const friendly=e=>e?.message||String(e);
async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
async function loadProfile(){if(!user)return;const {data,error}=await client.from('profiles').select('nickname,points,username').eq('id',user.id).single();if(error)throw error;currentProfile=data;$('profileUsername').textContent=data.username;$('profilePoints').textContent=`${Number(data.points).toLocaleString('ko-KR')}P`;$('memberSummary').textContent=`${data.nickname} · ${data.points}P`;renderHeaderEmblem(data.nickname);$('headerPoints').textContent=`${Number(data.points).toLocaleString('ko-KR')}P`;$('memberStats').textContent='아이디는 다른 사용자에게 공개되지 않습니다.';}
async function renderHeaderEmblem(nickname){
 const target=$('headerNickname');target.textContent=nickname;
 if(!user)return;
 try{
  const {data,error}=await client.from('emblem_equipment').select('shape,pattern,crown,wings,effect,namefx').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  if(user&&currentProfile?.nickname===nickname)target.replaceChildren(emblemArt(data||{shape:'shield1'},nickname,true));
 }catch(e){console.warn('앰블럼 표시 실패:',e)}
}
async function loadPointLogs(){
 const area=$('pointLogItems');area.textContent='내역을 불러오는 중…';
 const {data,error}=await client.from('point_logs').select('delta,reason,balance_after,created_at').order('created_at',{ascending:false}).limit(100);
 if(error)throw error;
 area.replaceChildren();
 if(!data?.length){area.textContent='기록된 포인트 내역이 없습니다. (기존 기록은 소급 생성되지 않습니다.)';return;}
 for(const item of data){const row=document.createElement('div');row.className='point-log-row';
  const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.created_at)).replaceAll('-','/');
  const left=document.createElement('span');left.textContent=`${date} ${item.reason}`;
  const right=document.createElement('strong');right.textContent=`${item.delta>0?'+':''}${item.delta.toLocaleString('ko-KR')}P`;
  right.className=item.delta>0?'point-positive':'point-negative';row.append(left,right);area.append(row);
 }
}
$('shopNav').addEventListener('click',()=>{$('shopDialog').showModal();loadShop().catch(e=>{console.error('상점 표시 오류',e);$('shop').textContent='상점 표시 오류: '+friendly(e)})});
$('shopClose').addEventListener('click',()=>$('shopDialog').close());
$('shopDialog').addEventListener('click',e=>{if(e.target===$('shopDialog'))e.target.close()});
$('headerPoints').addEventListener('click',async()=>{if(!user)return;$('pointLogDialog').showModal();try{await loadPointLogs()}catch(e){$('pointLogItems').textContent='포인트 내역 조회 실패: '+friendly(e)}});
$('pointLogClose').addEventListener('click',()=>$('pointLogDialog').close());
$('pointLogDialog').addEventListener('click',e=>{if(e.target===$('pointLogDialog'))e.target.close()});
const EMBLEM_GROUPS=[
 {key:'shape',label:'모양',items:[['낡은 방패','shield1',10],['찌그러진 원','circle',20],['방패 1','shield1',0],['방패 2','shield2',400],['방패 3','shield3',1500],['하트','heart',100],['원','circle',0],['스페이스','space',1800],['다이아몬드','diamond',3000]]},
 {key:'pattern',label:'문양',items:[['낙서 고양이','cat',15],['흐릿한 토끼','rabbit',30],['없음','',0],['드래곤','dragon',3500],['호랑이','tiger',2000],['사자','lion',2000],['독수리','eagle',1500],['사슴','deer',500],['토끼','rabbit',100],['고양이','cat',100],['강아지','dog',100]]},
 {key:'crown',label:'왕관',items:[['종이 왕관','crown1',50],['없음','',0],['전설 왕관 1','crown1',5000],['전설 왕관 2','crown2',10000],['전설 왕관 3','crown3',20000]]},
 {key:'wings',label:'날개',items:[['삐뚤어진 날개','angel-small',25],['없음','',0],['작은 천사','angel-small',200],['작은 악마','demon-small',200],['작은 요정','fairy-small',200],['중간 천사','angel-mid',1200],['중간 악마','demon-mid',1200],['중간 요정','fairy-mid',1200],['큰 천사','angel-big',5000],['큰 악마','demon-big',5000],['큰 요정','fairy-big',5000]]},
 {key:'effect',label:'이펙트',items:[['희미한 반짝임','sparkle',20],['없음','',0],['오로라','aurora',3000],['별빛','starlight',1000],['불꽃','fire',3000],['눈꽃','snow',2000],['번개','lightning',4000],['반짝임','sparkle',500]]},
 {key:'namefx',label:'닉네임 효과',items:[['기본','',0],['빨강','red',300],['파랑','blue',300],['초록','green',300],['무지개','rainbow',1200],['오로라','aurora',3000]]}
];
// 레거시 장착 ID는 새 픽셀 PNG 경로로 변환 (오래된 PNG 파일 불필요).
const PIXEL_LEGACY_ASSETS = {"shield1":"frames/frame_001.png","shield2":"frames/frame_002.png","shield3":"frames/frame_003.png","heart":"frames/frame_004.png","circle":"frames/frame_005.png","space":"frames/frame_006.png","diamond":"frames/frame_007.png","dragon":"patterns/pattern_001.png","tiger":"patterns/pattern_002.png","lion":"patterns/pattern_003.png","eagle":"patterns/pattern_004.png","deer":"patterns/pattern_005.png","rabbit":"patterns/pattern_006.png","cat":"patterns/pattern_007.png","dog":"patterns/pattern_008.png","wing_small_angel":"wings/wing_001.png","wing_small_demon":"wings/wing_002.png","wing_small_fairy":"wings/wing_003.png","wing_medium_angel":"wings/wing_004.png","wing_medium_demon":"wings/wing_005.png","wing_medium_fairy":"wings/wing_006.png","wing_large_angel":"wings/wing_007.png","wing_large_demon":"wings/wing_008.png","wing_large_fairy":"wings/wing_009.png","crown1":"crowns/crown_001.png","crown2":"crowns/crown_002.png","crown3":"crowns/crown_003.png","effect_red":"effects/effect_001.png","effect_blue":"effects/effect_002.png","effect_green":"effects/effect_003.png","effect_rainbow":"effects/effect_004.png","effect_aurora":"effects/effect_005.png"};
const asset=(key)=>{
 if(typeof key==='string' && /^(frames\/frame|patterns\/pattern|wings\/wing|crowns\/crown|effects\/effect)_\d{3}\.png$/.test(key))return './emblems/'+key;
 return './emblems/'+(PIXEL_LEGACY_ASSETS[key]||PIXEL_LEGACY_ASSETS.shield1);
};

function emblemArt(config,nickname,compact=false){
 const el=document.createElement('span');el.className='emblem-identity'+(compact?' compact':'');
 const badge=document.createElement('span');badge.className='png-emblem'+(compact?' compact':'');badge.setAttribute('aria-hidden','true');
 const image=(key,cls)=>{if(!key)return;const im=document.createElement('img');im.src=asset(key);im.alt='';im.className=cls;im.loading='lazy';badge.append(im)};
 // Background to foreground: effect, wings, crown, shape, pattern.
 // Crown is visually raised above the shape while its overlap stays behind the shape.
 image(config.effect,'png-effect');image(config.wings,'png-wings');image(config.crown,'png-crown');image(config.shape,'png-shape');image(config.pattern,'png-pattern');
 const name=document.createElement('span');name.className='emblem-nickname fx-'+(config.namefx||'basic');name.textContent=nickname;
 el.append(badge,name);return el;
}
async function saveFreeEmblem(config){return rpc('equip_owned_free_emblem',{p_shape:config.shape,p_pattern:config.pattern,p_crown:config.crown,p_wings:config.wings,p_effect:config.effect,p_namefx:config.namefx});}
const SHOP_GROUPS = [
 {key:'frames',label:'모양',field:'shape'},
 {key:'patterns',label:'문양',field:'pattern'},
 {key:'wings',label:'날개',field:'wings'},
 {key:'crowns',label:'왕관',field:'crown'},
 {key:'effects',label:'이펙트',field:'effect'}
];
const SHOP_NAMEFX=[['기본',''],['빨강','red'],['파랑','blue'],['초록','green'],['무지개','rainbow'],['오로라','aurora']];
// Bundled product metadata: the shop does not depend on catalog.json being uploaded.
// Actual PNG images remain in emblems/<category>/; missing images are handled per item.
const SHOP_CATALOG = [{"id":"frames_frame_001","category":"frames","name":"파랑 방패 I","price":0,"tier":"기본","source":"shield1","file":"frames/frame_001.png"},{"id":"frames_frame_002","category":"frames","name":"파랑 방패 II","price":0,"tier":"기본","source":"shield2","file":"frames/frame_002.png"},{"id":"frames_frame_003","category":"frames","name":"주황 방패 III","price":30,"tier":"기본","source":"shield3","file":"frames/frame_003.png"},{"id":"frames_frame_004","category":"frames","name":"분홍 하트","price":30,"tier":"기본","source":"heart","file":"frames/frame_004.png"},{"id":"frames_frame_005","category":"frames","name":"주황 원형","price":30,"tier":"기본","source":"circle","file":"frames/frame_005.png"},{"id":"frames_frame_006","category":"frames","name":"보라 우주","price":30,"tier":"기본","source":"space","file":"frames/frame_006.png"},{"id":"frames_frame_007","category":"frames","name":"주황 다이아","price":30,"tier":"기본","source":"diamond","file":"frames/frame_007.png"},{"id":"frames_frame_008","category":"frames","name":"분홍 방패 I","price":30,"tier":"기본","source":"shield1","file":"frames/frame_008.png"},{"id":"frames_frame_009","category":"frames","name":"분홍 방패 II","price":100,"tier":"일반","source":"shield2","file":"frames/frame_009.png"},{"id":"frames_frame_010","category":"frames","name":"초록 방패 III","price":100,"tier":"일반","source":"shield3","file":"frames/frame_010.png"},{"id":"frames_frame_011","category":"frames","name":"초록 하트","price":100,"tier":"일반","source":"heart","file":"frames/frame_011.png"},{"id":"frames_frame_012","category":"frames","name":"초록 원형","price":100,"tier":"일반","source":"circle","file":"frames/frame_012.png"},{"id":"frames_frame_013","category":"frames","name":"분홍 우주","price":100,"tier":"일반","source":"space","file":"frames/frame_013.png"},{"id":"frames_frame_014","category":"frames","name":"초록 다이아","price":100,"tier":"일반","source":"diamond","file":"frames/frame_014.png"},{"id":"frames_frame_015","category":"frames","name":"파랑 방패 I","price":100,"tier":"일반","source":"shield1","file":"frames/frame_015.png"},{"id":"frames_frame_016","category":"frames","name":"초록 방패 II","price":100,"tier":"일반","source":"shield2","file":"frames/frame_016.png"},{"id":"frames_frame_017","category":"frames","name":"파랑 방패 III","price":250,"tier":"고급","source":"shield3","file":"frames/frame_017.png"},{"id":"frames_frame_018","category":"frames","name":"파랑 하트","price":250,"tier":"고급","source":"heart","file":"frames/frame_018.png"},{"id":"frames_frame_019","category":"frames","name":"파랑 원형","price":250,"tier":"고급","source":"circle","file":"frames/frame_019.png"},{"id":"frames_frame_020","category":"frames","name":"초록 우주","price":250,"tier":"고급","source":"space","file":"frames/frame_020.png"},{"id":"frames_frame_021","category":"frames","name":"파랑 다이아","price":250,"tier":"고급","source":"diamond","file":"frames/frame_021.png"},{"id":"frames_frame_022","category":"frames","name":"초록 방패 I","price":250,"tier":"고급","source":"shield1","file":"frames/frame_022.png"},{"id":"frames_frame_023","category":"frames","name":"초록 방패 II","price":250,"tier":"고급","source":"shield2","file":"frames/frame_023.png"},{"id":"frames_frame_024","category":"frames","name":"보라 방패 III","price":250,"tier":"고급","source":"shield3","file":"frames/frame_024.png"},{"id":"frames_frame_025","category":"frames","name":"파랑 하트","price":800,"tier":"희귀","source":"heart","file":"frames/frame_025.png"},{"id":"frames_frame_026","category":"frames","name":"보라 원형","price":800,"tier":"희귀","source":"circle","file":"frames/frame_026.png"},{"id":"frames_frame_027","category":"frames","name":"초록 우주","price":800,"tier":"희귀","source":"space","file":"frames/frame_027.png"},{"id":"frames_frame_028","category":"frames","name":"보라 다이아","price":800,"tier":"희귀","source":"diamond","file":"frames/frame_028.png"},{"id":"frames_frame_029","category":"frames","name":"보라 방패 I","price":800,"tier":"희귀","source":"shield1","file":"frames/frame_029.png"},{"id":"frames_frame_030","category":"frames","name":"보라 방패 II","price":800,"tier":"희귀","source":"shield2","file":"frames/frame_030.png"},{"id":"frames_frame_031","category":"frames","name":"초록 방패 III","price":800,"tier":"희귀","source":"shield3","file":"frames/frame_031.png"},{"id":"frames_frame_032","category":"frames","name":"초록 하트","price":800,"tier":"희귀","source":"heart","file":"frames/frame_032.png"},{"id":"frames_frame_033","category":"frames","name":"황금 원형","price":2000,"tier":"전설","source":"circle","file":"frames/frame_033.png"},{"id":"frames_frame_034","category":"frames","name":"분홍 우주","price":2000,"tier":"전설","source":"space","file":"frames/frame_034.png"},{"id":"frames_frame_035","category":"frames","name":"초록 다이아","price":2000,"tier":"전설","source":"diamond","file":"frames/frame_035.png"},{"id":"frames_frame_036","category":"frames","name":"주황 방패 I","price":2000,"tier":"전설","source":"shield1","file":"frames/frame_036.png"},{"id":"frames_frame_037","category":"frames","name":"황금 방패 II","price":2000,"tier":"전설","source":"shield2","file":"frames/frame_037.png"},{"id":"frames_frame_038","category":"frames","name":"청록 방패 III","price":2000,"tier":"전설","source":"shield3","file":"frames/frame_038.png"},{"id":"frames_frame_039","category":"frames","name":"초록 하트","price":2000,"tier":"전설","source":"heart","file":"frames/frame_039.png"},{"id":"frames_frame_040","category":"frames","name":"청록 원형","price":2000,"tier":"전설","source":"circle","file":"frames/frame_040.png"},{"id":"patterns_pattern_001","category":"patterns","name":"주황 드래곤","price":0,"tier":"기본","source":"dragon","file":"patterns/pattern_001.png"},{"id":"patterns_pattern_002","category":"patterns","name":"파랑 호랑이","price":0,"tier":"기본","source":"tiger","file":"patterns/pattern_002.png"},{"id":"patterns_pattern_003","category":"patterns","name":"주황 사자","price":40,"tier":"기본","source":"lion","file":"patterns/pattern_003.png"},{"id":"patterns_pattern_004","category":"patterns","name":"주황 독수리","price":40,"tier":"기본","source":"eagle","file":"patterns/pattern_004.png"},{"id":"patterns_pattern_005","category":"patterns","name":"주황 사슴","price":40,"tier":"기본","source":"deer","file":"patterns/pattern_005.png"},{"id":"patterns_pattern_006","category":"patterns","name":"보라 토끼","price":40,"tier":"기본","source":"rabbit","file":"patterns/pattern_006.png"},{"id":"patterns_pattern_007","category":"patterns","name":"보라 고양이","price":40,"tier":"기본","source":"cat","file":"patterns/pattern_007.png"},{"id":"patterns_pattern_008","category":"patterns","name":"주황 강아지","price":40,"tier":"기본","source":"dog","file":"patterns/pattern_008.png"},{"id":"patterns_pattern_009","category":"patterns","name":"황금 드래곤","price":40,"tier":"기본","source":"dragon","file":"patterns/pattern_009.png"},{"id":"patterns_pattern_010","category":"patterns","name":"보라 호랑이","price":40,"tier":"기본","source":"tiger","file":"patterns/pattern_010.png"},{"id":"patterns_pattern_011","category":"patterns","name":"황금 사자","price":40,"tier":"기본","source":"lion","file":"patterns/pattern_011.png"},{"id":"patterns_pattern_012","category":"patterns","name":"황금 독수리","price":40,"tier":"기본","source":"eagle","file":"patterns/pattern_012.png"},{"id":"patterns_pattern_013","category":"patterns","name":"황금 사슴","price":40,"tier":"기본","source":"deer","file":"patterns/pattern_013.png"},{"id":"patterns_pattern_014","category":"patterns","name":"황금 토끼","price":40,"tier":"기본","source":"rabbit","file":"patterns/pattern_014.png"},{"id":"patterns_pattern_015","category":"patterns","name":"보라 고양이","price":130,"tier":"일반","source":"cat","file":"patterns/pattern_015.png"},{"id":"patterns_pattern_016","category":"patterns","name":"황금 강아지","price":130,"tier":"일반","source":"dog","file":"patterns/pattern_016.png"},{"id":"patterns_pattern_017","category":"patterns","name":"초록 드래곤","price":130,"tier":"일반","source":"dragon","file":"patterns/pattern_017.png"},{"id":"patterns_pattern_018","category":"patterns","name":"분홍 호랑이","price":130,"tier":"일반","source":"tiger","file":"patterns/pattern_018.png"},{"id":"patterns_pattern_019","category":"patterns","name":"초록 사자","price":130,"tier":"일반","source":"lion","file":"patterns/pattern_019.png"},{"id":"patterns_pattern_020","category":"patterns","name":"초록 독수리","price":130,"tier":"일반","source":"eagle","file":"patterns/pattern_020.png"},{"id":"patterns_pattern_021","category":"patterns","name":"초록 사슴","price":130,"tier":"일반","source":"deer","file":"patterns/pattern_021.png"},{"id":"patterns_pattern_022","category":"patterns","name":"초록 토끼","price":130,"tier":"일반","source":"rabbit","file":"patterns/pattern_022.png"},{"id":"patterns_pattern_023","category":"patterns","name":"초록 고양이","price":130,"tier":"일반","source":"cat","file":"patterns/pattern_023.png"},{"id":"patterns_pattern_024","category":"patterns","name":"초록 강아지","price":130,"tier":"일반","source":"dog","file":"patterns/pattern_024.png"},{"id":"patterns_pattern_025","category":"patterns","name":"파랑 드래곤","price":130,"tier":"일반","source":"dragon","file":"patterns/pattern_025.png"},{"id":"patterns_pattern_026","category":"patterns","name":"초록 호랑이","price":130,"tier":"일반","source":"tiger","file":"patterns/pattern_026.png"},{"id":"patterns_pattern_027","category":"patterns","name":"파랑 사자","price":130,"tier":"일반","source":"lion","file":"patterns/pattern_027.png"},{"id":"patterns_pattern_028","category":"patterns","name":"파랑 독수리","price":130,"tier":"일반","source":"eagle","file":"patterns/pattern_028.png"},{"id":"patterns_pattern_029","category":"patterns","name":"파랑 사슴","price":350,"tier":"고급","source":"deer","file":"patterns/pattern_029.png"},{"id":"patterns_pattern_030","category":"patterns","name":"초록 토끼","price":350,"tier":"고급","source":"rabbit","file":"patterns/pattern_030.png"},{"id":"patterns_pattern_031","category":"patterns","name":"초록 고양이","price":350,"tier":"고급","source":"cat","file":"patterns/pattern_031.png"},{"id":"patterns_pattern_032","category":"patterns","name":"파랑 강아지","price":350,"tier":"고급","source":"dog","file":"patterns/pattern_032.png"},{"id":"patterns_pattern_033","category":"patterns","name":"보라 드래곤","price":350,"tier":"고급","source":"dragon","file":"patterns/pattern_033.png"},{"id":"patterns_pattern_034","category":"patterns","name":"초록 호랑이","price":350,"tier":"고급","source":"tiger","file":"patterns/pattern_034.png"},{"id":"patterns_pattern_035","category":"patterns","name":"보라 사자","price":350,"tier":"고급","source":"lion","file":"patterns/pattern_035.png"},{"id":"patterns_pattern_036","category":"patterns","name":"보라 독수리","price":350,"tier":"고급","source":"eagle","file":"patterns/pattern_036.png"},{"id":"patterns_pattern_037","category":"patterns","name":"보라 사슴","price":350,"tier":"고급","source":"deer","file":"patterns/pattern_037.png"},{"id":"patterns_pattern_038","category":"patterns","name":"보라 토끼","price":350,"tier":"고급","source":"rabbit","file":"patterns/pattern_038.png"},{"id":"patterns_pattern_039","category":"patterns","name":"초록 고양이","price":350,"tier":"고급","source":"cat","file":"patterns/pattern_039.png"},{"id":"patterns_pattern_040","category":"patterns","name":"보라 강아지","price":350,"tier":"고급","source":"dog","file":"patterns/pattern_040.png"},{"id":"patterns_pattern_041","category":"patterns","name":"분홍 드래곤","price":350,"tier":"고급","source":"dragon","file":"patterns/pattern_041.png"},{"id":"patterns_pattern_042","category":"patterns","name":"파랑 호랑이","price":350,"tier":"고급","source":"tiger","file":"patterns/pattern_042.png"},{"id":"patterns_pattern_043","category":"patterns","name":"빨강 사자","price":1100,"tier":"희귀","source":"lion","file":"patterns/pattern_043.png"},{"id":"patterns_pattern_044","category":"patterns","name":"분홍 독수리","price":1100,"tier":"희귀","source":"eagle","file":"patterns/pattern_044.png"},{"id":"patterns_pattern_045","category":"patterns","name":"분홍 사슴","price":1100,"tier":"희귀","source":"deer","file":"patterns/pattern_045.png"},{"id":"patterns_pattern_046","category":"patterns","name":"파랑 토끼","price":1100,"tier":"희귀","source":"rabbit","file":"patterns/pattern_046.png"},{"id":"patterns_pattern_047","category":"patterns","name":"파랑 고양이","price":1100,"tier":"희귀","source":"cat","file":"patterns/pattern_047.png"},{"id":"patterns_pattern_048","category":"patterns","name":"빨강 강아지","price":1100,"tier":"희귀","source":"dog","file":"patterns/pattern_048.png"},{"id":"patterns_pattern_049","category":"patterns","name":"빨강 드래곤","price":1100,"tier":"희귀","source":"dragon","file":"patterns/pattern_049.png"},{"id":"patterns_pattern_050","category":"patterns","name":"파랑 호랑이","price":1100,"tier":"희귀","source":"tiger","file":"patterns/pattern_050.png"},{"id":"patterns_pattern_051","category":"patterns","name":"주황 사자","price":1100,"tier":"희귀","source":"lion","file":"patterns/pattern_051.png"},{"id":"patterns_pattern_052","category":"patterns","name":"보라 독수리","price":1100,"tier":"희귀","source":"eagle","file":"patterns/pattern_052.png"},{"id":"patterns_pattern_053","category":"patterns","name":"주황 사슴","price":1100,"tier":"희귀","source":"deer","file":"patterns/pattern_053.png"},{"id":"patterns_pattern_054","category":"patterns","name":"보라 토끼","price":1100,"tier":"희귀","source":"rabbit","file":"patterns/pattern_054.png"},{"id":"patterns_pattern_055","category":"patterns","name":"보라 고양이","price":1100,"tier":"희귀","source":"cat","file":"patterns/pattern_055.png"},{"id":"patterns_pattern_056","category":"patterns","name":"주황 강아지","price":1100,"tier":"희귀","source":"dog","file":"patterns/pattern_056.png"},{"id":"patterns_pattern_057","category":"patterns","name":"초록 드래곤","price":3500,"tier":"전설","source":"dragon","file":"patterns/pattern_057.png"},{"id":"patterns_pattern_058","category":"patterns","name":"보라 호랑이","price":3500,"tier":"전설","source":"tiger","file":"patterns/pattern_058.png"},{"id":"patterns_pattern_059","category":"patterns","name":"초록 사자","price":3500,"tier":"전설","source":"lion","file":"patterns/pattern_059.png"},{"id":"patterns_pattern_060","category":"patterns","name":"초록 독수리","price":3500,"tier":"전설","source":"eagle","file":"patterns/pattern_060.png"},{"id":"patterns_pattern_061","category":"patterns","name":"황금 사슴","price":3500,"tier":"전설","source":"deer","file":"patterns/pattern_061.png"},{"id":"patterns_pattern_062","category":"patterns","name":"분홍 토끼","price":3500,"tier":"전설","source":"rabbit","file":"patterns/pattern_062.png"},{"id":"patterns_pattern_063","category":"patterns","name":"보라 고양이","price":3500,"tier":"전설","source":"cat","file":"patterns/pattern_063.png"},{"id":"patterns_pattern_064","category":"patterns","name":"초록 강아지","price":3500,"tier":"전설","source":"dog","file":"patterns/pattern_064.png"},{"id":"patterns_pattern_065","category":"patterns","name":"오로라 드래곤","price":3500,"tier":"전설","source":"dragon","file":"patterns/pattern_065.png"},{"id":"patterns_pattern_066","category":"patterns","name":"오로라 호랑이","price":3500,"tier":"전설","source":"tiger","file":"patterns/pattern_066.png"},{"id":"patterns_pattern_067","category":"patterns","name":"오로라 사자","price":3500,"tier":"전설","source":"lion","file":"patterns/pattern_067.png"},{"id":"patterns_pattern_068","category":"patterns","name":"오로라 독수리","price":3500,"tier":"전설","source":"eagle","file":"patterns/pattern_068.png"},{"id":"patterns_pattern_069","category":"patterns","name":"오로라 사슴","price":3500,"tier":"전설","source":"deer","file":"patterns/pattern_069.png"},{"id":"patterns_pattern_070","category":"patterns","name":"오로라 토끼","price":3500,"tier":"전설","source":"rabbit","file":"patterns/pattern_070.png"},{"id":"wings_wing_001","category":"wings","name":"보라 천사 소형","price":0,"tier":"기본","source":"wing_small_angel","file":"wings/wing_001.png"},{"id":"wings_wing_002","category":"wings","name":"분홍 악마 소형","price":80,"tier":"기본","source":"wing_small_demon","file":"wings/wing_002.png"},{"id":"wings_wing_003","category":"wings","name":"보라 요정 소형","price":80,"tier":"기본","source":"wing_small_fairy","file":"wings/wing_003.png"},{"id":"wings_wing_004","category":"wings","name":"보라 천사 중형","price":80,"tier":"기본","source":"wing_medium_angel","file":"wings/wing_004.png"},{"id":"wings_wing_005","category":"wings","name":"분홍 악마 중형","price":80,"tier":"기본","source":"wing_medium_demon","file":"wings/wing_005.png"},{"id":"wings_wing_006","category":"wings","name":"보라 요정 중형","price":80,"tier":"기본","source":"wing_medium_fairy","file":"wings/wing_006.png"},{"id":"wings_wing_007","category":"wings","name":"보라 천사 대형","price":200,"tier":"일반","source":"wing_large_angel","file":"wings/wing_007.png"},{"id":"wings_wing_008","category":"wings","name":"분홍 악마 대형","price":200,"tier":"일반","source":"wing_large_demon","file":"wings/wing_008.png"},{"id":"wings_wing_009","category":"wings","name":"보라 요정 대형","price":200,"tier":"일반","source":"wing_large_fairy","file":"wings/wing_009.png"},{"id":"wings_wing_010","category":"wings","name":"초록 천사 소형","price":200,"tier":"일반","source":"wing_small_angel","file":"wings/wing_010.png"},{"id":"wings_wing_011","category":"wings","name":"초록 악마 소형","price":200,"tier":"일반","source":"wing_small_demon","file":"wings/wing_011.png"},{"id":"wings_wing_012","category":"wings","name":"초록 요정 소형","price":200,"tier":"일반","source":"wing_small_fairy","file":"wings/wing_012.png"},{"id":"wings_wing_013","category":"wings","name":"초록 천사 중형","price":500,"tier":"고급","source":"wing_medium_angel","file":"wings/wing_013.png"},{"id":"wings_wing_014","category":"wings","name":"초록 악마 중형","price":500,"tier":"고급","source":"wing_medium_demon","file":"wings/wing_014.png"},{"id":"wings_wing_015","category":"wings","name":"초록 요정 중형","price":500,"tier":"고급","source":"wing_medium_fairy","file":"wings/wing_015.png"},{"id":"wings_wing_016","category":"wings","name":"초록 천사 대형","price":500,"tier":"고급","source":"wing_large_angel","file":"wings/wing_016.png"},{"id":"wings_wing_017","category":"wings","name":"초록 악마 대형","price":500,"tier":"고급","source":"wing_large_demon","file":"wings/wing_017.png"},{"id":"wings_wing_018","category":"wings","name":"초록 요정 대형","price":500,"tier":"고급","source":"wing_large_fairy","file":"wings/wing_018.png"},{"id":"wings_wing_019","category":"wings","name":"초록 천사 소형","price":1800,"tier":"희귀","source":"wing_small_angel","file":"wings/wing_019.png"},{"id":"wings_wing_020","category":"wings","name":"파랑 악마 소형","price":1800,"tier":"희귀","source":"wing_small_demon","file":"wings/wing_020.png"},{"id":"wings_wing_021","category":"wings","name":"초록 요정 소형","price":1800,"tier":"희귀","source":"wing_small_fairy","file":"wings/wing_021.png"},{"id":"wings_wing_022","category":"wings","name":"초록 천사 중형","price":1800,"tier":"희귀","source":"wing_medium_angel","file":"wings/wing_022.png"},{"id":"wings_wing_023","category":"wings","name":"파랑 악마 중형","price":1800,"tier":"희귀","source":"wing_medium_demon","file":"wings/wing_023.png"},{"id":"wings_wing_024","category":"wings","name":"초록 요정 중형","price":1800,"tier":"희귀","source":"wing_medium_fairy","file":"wings/wing_024.png"},{"id":"wings_wing_025","category":"wings","name":"초록 천사 대형","price":5500,"tier":"전설","source":"wing_large_angel","file":"wings/wing_025.png"},{"id":"wings_wing_026","category":"wings","name":"파랑 악마 대형","price":5500,"tier":"전설","source":"wing_large_demon","file":"wings/wing_026.png"},{"id":"wings_wing_027","category":"wings","name":"초록 요정 대형","price":5500,"tier":"전설","source":"wing_large_fairy","file":"wings/wing_027.png"},{"id":"wings_wing_028","category":"wings","name":"분홍 천사 소형","price":5500,"tier":"전설","source":"wing_small_angel","file":"wings/wing_028.png"},{"id":"wings_wing_029","category":"wings","name":"빨강 악마 소형","price":5500,"tier":"전설","source":"wing_small_demon","file":"wings/wing_029.png"},{"id":"wings_wing_030","category":"wings","name":"분홍 요정 소형","price":5500,"tier":"전설","source":"wing_small_fairy","file":"wings/wing_030.png"},{"id":"crowns_crown_001","category":"crowns","name":"보라 왕관 I","price":0,"tier":"기본","source":"crown1","file":"crowns/crown_001.png"},{"id":"crowns_crown_002","category":"crowns","name":"주황 왕관 II","price":100,"tier":"기본","source":"crown2","file":"crowns/crown_002.png"},{"id":"crowns_crown_003","category":"crowns","name":"주황 왕관 III","price":100,"tier":"기본","source":"crown3","file":"crowns/crown_003.png"},{"id":"crowns_crown_004","category":"crowns","name":"보라 왕관 I","price":100,"tier":"기본","source":"crown1","file":"crowns/crown_004.png"},{"id":"crowns_crown_005","category":"crowns","name":"황금 왕관 II","price":500,"tier":"일반","source":"crown2","file":"crowns/crown_005.png"},{"id":"crowns_crown_006","category":"crowns","name":"황금 왕관 III","price":500,"tier":"일반","source":"crown3","file":"crowns/crown_006.png"},{"id":"crowns_crown_007","category":"crowns","name":"분홍 왕관 I","price":500,"tier":"일반","source":"crown1","file":"crowns/crown_007.png"},{"id":"crowns_crown_008","category":"crowns","name":"초록 왕관 II","price":500,"tier":"일반","source":"crown2","file":"crowns/crown_008.png"},{"id":"crowns_crown_009","category":"crowns","name":"초록 왕관 III","price":1500,"tier":"고급","source":"crown3","file":"crowns/crown_009.png"},{"id":"crowns_crown_010","category":"crowns","name":"초록 왕관 I","price":1500,"tier":"고급","source":"crown1","file":"crowns/crown_010.png"},{"id":"crowns_crown_011","category":"crowns","name":"파랑 왕관 II","price":1500,"tier":"고급","source":"crown2","file":"crowns/crown_011.png"},{"id":"crowns_crown_012","category":"crowns","name":"파랑 왕관 III","price":1500,"tier":"고급","source":"crown3","file":"crowns/crown_012.png"},{"id":"crowns_crown_013","category":"crowns","name":"초록 왕관 I","price":5000,"tier":"희귀","source":"crown1","file":"crowns/crown_013.png"},{"id":"crowns_crown_014","category":"crowns","name":"보라 왕관 II","price":5000,"tier":"희귀","source":"crown2","file":"crowns/crown_014.png"},{"id":"crowns_crown_015","category":"crowns","name":"보라 왕관 III","price":5000,"tier":"희귀","source":"crown3","file":"crowns/crown_015.png"},{"id":"crowns_crown_016","category":"crowns","name":"파랑 왕관 I","price":5000,"tier":"희귀","source":"crown1","file":"crowns/crown_016.png"},{"id":"crowns_crown_017","category":"crowns","name":"분홍 왕관 II","price":15000,"tier":"전설","source":"crown2","file":"crowns/crown_017.png"},{"id":"crowns_crown_018","category":"crowns","name":"빨강 왕관 III","price":15000,"tier":"전설","source":"crown3","file":"crowns/crown_018.png"},{"id":"crowns_crown_019","category":"crowns","name":"보라 왕관 I","price":15000,"tier":"전설","source":"crown1","file":"crowns/crown_019.png"},{"id":"crowns_crown_020","category":"crowns","name":"주황 왕관 II","price":15000,"tier":"전설","source":"crown2","file":"crowns/crown_020.png"},{"id":"effects_effect_001","category":"effects","name":"기본 붉은 별빛","price":0,"tier":"기본","source":"effect_red","file":"effects/effect_001.png"},{"id":"effects_effect_002","category":"effects","name":"기본 푸른 유성","price":80,"tier":"기본","source":"effect_blue","file":"effects/effect_002.png"},{"id":"effects_effect_003","category":"effects","name":"기본 초록 빛무리","price":80,"tier":"기본","source":"effect_green","file":"effects/effect_003.png"},{"id":"effects_effect_004","category":"effects","name":"기본 무지개","price":80,"tier":"기본","source":"effect_rainbow","file":"effects/effect_004.png"},{"id":"effects_effect_005","category":"effects","name":"기본 오로라","price":80,"tier":"기본","source":"effect_aurora","file":"effects/effect_005.png"},{"id":"effects_effect_006","category":"effects","name":"청동 붉은 별빛","price":80,"tier":"기본","source":"effect_red","file":"effects/effect_006.png"},{"id":"effects_effect_007","category":"effects","name":"청동 푸른 유성","price":80,"tier":"기본","source":"effect_blue","file":"effects/effect_007.png"},{"id":"effects_effect_008","category":"effects","name":"청동 초록 빛무리","price":80,"tier":"기본","source":"effect_green","file":"effects/effect_008.png"},{"id":"effects_effect_009","category":"effects","name":"청동 무지개","price":300,"tier":"일반","source":"effect_rainbow","file":"effects/effect_009.png"},{"id":"effects_effect_010","category":"effects","name":"청동 오로라","price":300,"tier":"일반","source":"effect_aurora","file":"effects/effect_010.png"},{"id":"effects_effect_011","category":"effects","name":"초록 붉은 별빛","price":300,"tier":"일반","source":"effect_red","file":"effects/effect_011.png"},{"id":"effects_effect_012","category":"effects","name":"초록 푸른 유성","price":300,"tier":"일반","source":"effect_blue","file":"effects/effect_012.png"},{"id":"effects_effect_013","category":"effects","name":"초록 초록 빛무리","price":300,"tier":"일반","source":"effect_green","file":"effects/effect_013.png"},{"id":"effects_effect_014","category":"effects","name":"초록 무지개","price":300,"tier":"일반","source":"effect_rainbow","file":"effects/effect_014.png"},{"id":"effects_effect_015","category":"effects","name":"초록 오로라","price":300,"tier":"일반","source":"effect_aurora","file":"effects/effect_015.png"},{"id":"effects_effect_016","category":"effects","name":"푸른 붉은 별빛","price":300,"tier":"일반","source":"effect_red","file":"effects/effect_016.png"},{"id":"effects_effect_017","category":"effects","name":"푸른 푸른 유성","price":800,"tier":"고급","source":"effect_blue","file":"effects/effect_017.png"},{"id":"effects_effect_018","category":"effects","name":"푸른 초록 빛무리","price":800,"tier":"고급","source":"effect_green","file":"effects/effect_018.png"},{"id":"effects_effect_019","category":"effects","name":"푸른 무지개","price":800,"tier":"고급","source":"effect_rainbow","file":"effects/effect_019.png"},{"id":"effects_effect_020","category":"effects","name":"푸른 오로라","price":800,"tier":"고급","source":"effect_aurora","file":"effects/effect_020.png"},{"id":"effects_effect_021","category":"effects","name":"보라 붉은 별빛","price":800,"tier":"고급","source":"effect_red","file":"effects/effect_021.png"},{"id":"effects_effect_022","category":"effects","name":"보라 푸른 유성","price":800,"tier":"고급","source":"effect_blue","file":"effects/effect_022.png"},{"id":"effects_effect_023","category":"effects","name":"보라 초록 빛무리","price":800,"tier":"고급","source":"effect_green","file":"effects/effect_023.png"},{"id":"effects_effect_024","category":"effects","name":"보라 무지개","price":800,"tier":"고급","source":"effect_rainbow","file":"effects/effect_024.png"},{"id":"effects_effect_025","category":"effects","name":"보라 오로라","price":3000,"tier":"희귀","source":"effect_aurora","file":"effects/effect_025.png"},{"id":"effects_effect_026","category":"effects","name":"분홍 붉은 별빛","price":3000,"tier":"희귀","source":"effect_red","file":"effects/effect_026.png"},{"id":"effects_effect_027","category":"effects","name":"분홍 푸른 유성","price":3000,"tier":"희귀","source":"effect_blue","file":"effects/effect_027.png"},{"id":"effects_effect_028","category":"effects","name":"분홍 초록 빛무리","price":3000,"tier":"희귀","source":"effect_green","file":"effects/effect_028.png"},{"id":"effects_effect_029","category":"effects","name":"분홍 무지개","price":3000,"tier":"희귀","source":"effect_rainbow","file":"effects/effect_029.png"},{"id":"effects_effect_030","category":"effects","name":"분홍 오로라","price":3000,"tier":"희귀","source":"effect_aurora","file":"effects/effect_030.png"},{"id":"effects_effect_031","category":"effects","name":"홍염 붉은 별빛","price":3000,"tier":"희귀","source":"effect_red","file":"effects/effect_031.png"},{"id":"effects_effect_032","category":"effects","name":"홍염 푸른 유성","price":3000,"tier":"희귀","source":"effect_blue","file":"effects/effect_032.png"},{"id":"effects_effect_033","category":"effects","name":"홍염 초록 빛무리","price":10000,"tier":"전설","source":"effect_green","file":"effects/effect_033.png"},{"id":"effects_effect_034","category":"effects","name":"홍염 무지개","price":10000,"tier":"전설","source":"effect_rainbow","file":"effects/effect_034.png"},{"id":"effects_effect_035","category":"effects","name":"홍염 오로라","price":10000,"tier":"전설","source":"effect_aurora","file":"effects/effect_035.png"},{"id":"effects_effect_036","category":"effects","name":"황금 붉은 별빛","price":10000,"tier":"전설","source":"effect_red","file":"effects/effect_036.png"},{"id":"effects_effect_037","category":"effects","name":"황금 푸른 유성","price":10000,"tier":"전설","source":"effect_blue","file":"effects/effect_037.png"},{"id":"effects_effect_038","category":"effects","name":"황금 초록 빛무리","price":10000,"tier":"전설","source":"effect_green","file":"effects/effect_038.png"},{"id":"effects_effect_039","category":"effects","name":"황금 무지개","price":10000,"tier":"전설","source":"effect_rainbow","file":"effects/effect_039.png"},{"id":"effects_effect_040","category":"effects","name":"황금 오로라","price":10000,"tier":"전설","source":"effect_aurora","file":"effects/effect_040.png"}];
function fetchShopCatalog(){return Promise.resolve(SHOP_CATALOG);}
const shopAsset=item=>'./emblems/'+item.file;
function shopPreviewArt(selected,nickname,namefx){
 const container=document.createElement('div');container.className='shop-200-art';
 const layer=document.createElement('span');layer.className='shop-200-layer';layer.setAttribute('aria-hidden','true');
 // 뒤 -> 앞: 이펙트(30%) / 날개 / 왕관(상단) / 틀 / 문양
 for(const key of ['effects','wings','crowns','frames','patterns']){
  const item=selected[key];if(!item)continue;
  const img=document.createElement('img');img.src=shopAsset(item);img.alt='';img.className='shop-layer shop-layer-'+key;img.decoding='async';
  layer.append(img);
 }
 const label=document.createElement('strong');label.className='emblem-nickname fx-'+(namefx||'basic');label.textContent=nickname||'내 닉네임';
 container.append(layer,label);return container;
}
async function loadShop(){
 const area=$('shop');area.replaceChildren();
 const loading=document.createElement('p');loading.className='shop-note';loading.textContent='200종 앰블럼 불러오는 중…';area.append(loading);
 let catalog;
 try{catalog=await fetchShopCatalog()}catch(e){loading.textContent='앰블럼 불러오기 실패: '+friendly(e)+' · GitHub에 emblems 폴더 전체와 catalog.json을 올렸는지 확인하세요.';return;}
 // 상점이 닫힌 동안 응답이 온 경우 불필요한 렌더 방지
 if(!$('shopDialog').open)return;
 const groups=Object.fromEntries(SHOP_GROUPS.map(g=>[g.key,catalog.filter(it=>it.category===g.key)]));
 const selected={frames:groups.frames[0],patterns:null,wings:null,crowns:null,effects:null};
 try {
  if(user){
   const {data:owned}=await client.from('emblem_equipment').select('shape,pattern,wings,crown,effect,namefx').eq('user_id',user.id).maybeSingle();
   if(owned){
    for(const group of SHOP_GROUPS){
     const saved=owned[group.field];
     selected[group.key]=groups[group.key].find(it=>it.file===saved||it.source===saved)|| (group.key==='frames'?groups.frames[0]:null);
    }
   }
  }
 }catch(e){console.warn('기존 장착 아이템 확인 실패',e)}
 let selectedNamefx='',activeCategory='frames',activeTier='전체';
 const wrap=document.createElement('section');wrap.className='emblem-shop shop-200';
 const note=document.createElement('p');note.className='shop-note';note.textContent='무료 아이템은 소유 상태로 장착 가능 · 유료 아이템은 미리보기만 가능하며 구매는 잠겨 있습니다.';wrap.append(note);
 const preview=document.createElement('div');preview.className='emblem-preview shop-preview-200';preview.setAttribute('aria-live','polite');wrap.append(preview);
 const tabs=document.createElement('div');tabs.className='shop-categories';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','아이템 종류');wrap.append(tabs);
 const filter=document.createElement('div');filter.className='shop-tier-filter';wrap.append(filter);
 const grid=document.createElement('div');grid.className='emblem-grid shop-grid-200';wrap.append(grid);
 const footer=document.createElement('div');footer.className='shop-footer';
 const total=document.createElement('span');total.className='shop-price';footer.append(total);
 const locked=document.createElement('button');locked.type='button';locked.disabled=true;locked.className='shop-locked';locked.textContent='🔒 구매 준비 중 (미리보기 전용)';footer.append(locked);
 const freeBtn=document.createElement('button');freeBtn.type='button';freeBtn.className='emblem-free';freeBtn.textContent='장착';freeBtn.disabled=!user;freeBtn.title='소유한 무료 아이템 조합을 계정과 랭킹에 저장합니다.';footer.append(freeBtn);
 const nameRow=document.createElement('div');nameRow.className='shop-namefx-row';
 const nameTitle=document.createElement('span');nameTitle.textContent='닉네임 색상';nameRow.append(nameTitle);
 for(const [label,id] of SHOP_NAMEFX){const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.dataset.namefx=id;btn.addEventListener('click',()=>{selectedNamefx=id;updatePreview()});nameRow.append(btn);}
 wrap.append(nameRow,footer);
 const nav={};
 for(const group of SHOP_GROUPS){const btn=document.createElement('button');btn.type='button';btn.textContent=group.label+' ('+groups[group.key].length+')';btn.setAttribute('role','tab');btn.addEventListener('click',()=>{activeCategory=group.key;activeTier='전체';renderGrid()});tabs.append(btn);nav[group.key]=btn;}
 function updatePreview(){
  preview.replaceChildren(shopPreviewArt(selected,currentProfile?.nickname||'내 닉네임',selectedNamefx));
  const sum=Object.values(selected).reduce((total,it)=>total+(it?.price||0),0);
  total.textContent=sum===0?'소유한 무료 아이템 조합':'유료 아이템 포함: '+sum.toLocaleString('ko-KR')+'P (장착 불가)';
  freeBtn.disabled=!user||sum!==0;
  freeBtn.textContent=sum===0?'장착':'유료 아이템 장착 불가';
  for(const btn of nameRow.querySelectorAll('button'))btn.setAttribute('aria-pressed',String(btn.dataset.namefx===selectedNamefx));
  for(const btn of grid.querySelectorAll('button[data-id]')){const curr=selected[activeCategory];btn.setAttribute('aria-pressed',String((curr?.id||'')===btn.dataset.id));}
 }
 function renderGrid(){
  for(const group of SHOP_GROUPS)nav[group.key].setAttribute('aria-selected',String(group.key===activeCategory));
  filter.replaceChildren();
  for(const tier of ['전체','기본','일반','고급','희귀','전설']){
   const btn=document.createElement('button');btn.type='button';btn.textContent=tier;btn.setAttribute('aria-pressed',String(activeTier===tier));btn.addEventListener('click',()=>{activeTier=tier;renderGrid()});filter.append(btn);
  }
  grid.replaceChildren();
  // 종류별 빈 슬롯: 앞/뒤 장식 없이 조합해 볼 수 있음.
  if(activeCategory!=='frames'){
   const blank=document.createElement('button');blank.type='button';blank.className='emblem-option';blank.dataset.id='';
   const mark=document.createElement('span');mark.className='emblem-option-img blank';mark.textContent='—';
   const label=document.createElement('span');label.textContent='없음';const price=document.createElement('small');price.textContent='무료';
   blank.append(mark,label,price);blank.addEventListener('click',()=>{selected[activeCategory]=null;updatePreview()});grid.append(blank);
  }
  for(const it of groups[activeCategory]){
   if(activeTier!=='전체'&&it.tier!==activeTier)continue;
   const btn=document.createElement('button');btn.type='button';btn.className='emblem-option';btn.dataset.id=it.id;btn.title=it.name+' · '+it.tier;
   const img=document.createElement('img');img.src=shopAsset(it);img.alt='';img.className='emblem-option-img shop-200-thumb';img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>{img.style.display='none';btn.classList.add('image-missing');btn.title='이미지 누락: '+it.file+' (PNG 업로드 경로를 확인하세요)';});
   const label=document.createElement('span');label.textContent=it.name;
   const price=document.createElement('small');price.textContent=it.price===0?'소유':Number(it.price).toLocaleString('ko-KR')+'P';
   const tierTag=document.createElement('em');tierTag.textContent=it.tier;tierTag.className='shop-tier shop-tier-'+it.tier;
   btn.append(img,label,tierTag,price);btn.addEventListener('click',()=>{selected[activeCategory]=it;updatePreview()});grid.append(btn);
  }
  updatePreview();
 }
 freeBtn.addEventListener('click',async()=>{
  if(!user)return;
  freeBtn.disabled=true;
  try{
   if(Object.values(selected).some(it=>it&&it.price!==0)){status('유료 아이템은 아직 장착할 수 없습니다.');return;}
   const value=(key)=>selected[key]?.file||'';
   await saveFreeEmblem({shape:value('frames'),pattern:value('patterns'),crown:value('crowns'),wings:value('wings'),effect:value('effects'),namefx:''});
   status('장착 완료 · 계정에 저장되어 다시 로그인해도 유지됩니다.');
   await renderHeaderEmblem(currentProfile?.nickname||'');await loadRanks();
  }catch(e){status('무료 앰블럼 장착 실패: '+friendly(e));}finally{freeBtn.disabled=!user||Object.values(selected).some(it=>it&&it.price!==0);}
 });
 area.replaceChildren(wrap);renderGrid();
}
async function loadRanks(){const {data,error}=await client.rpc('get_leaderboard',{p_period:period});if(error){$('ranks').textContent='랭킹 조회 실패: '+friendly(error);throw error;}const el=$('ranks');el.replaceChildren();if(!data?.length){el.textContent='아직 기록이 없습니다.';return;}data.forEach((entry,i)=>{const row=document.createElement('div');row.className='rankrow';const left=document.createElement('span');left.className='rank-identity';const rank=document.createElement('b');rank.textContent=(i+1)+'위';left.append(rank);left.append(emblemArt({shape:entry.emblem_shape||'shield1',pattern:entry.emblem_pattern||'',crown:entry.emblem_crown||'',wings:entry.emblem_wings||'',effect:entry.emblem_effect||'',namefx:entry.emblem_namefx||''},entry.nickname,true));const right=document.createElement('span');right.textContent=`${entry.score}점 · ${entry.wins}/${entry.plays}승 · ${entry.win_rate}%`;row.append(left,right);el.append(row)})}
async function refresh(){
 const {data:{user:current},error:authError}=await client.auth.getUser();
 if(authError)throw authError;
 user=current;
 $('authArea').classList.toggle('hidden',!!user);
 $('openAccount').classList.toggle('hidden',!!user);
 $('openLogin').classList.toggle('hidden',!!user);
 $('headerProfile').classList.toggle('hidden',!user);
 if(!user){currentProfile=null;$('headerNickname').textContent='';$('headerPoints').textContent='';if($('profileDialog').open)$('profileDialog').close();}
 if(user&&window.todaywordAccountDialog?.open)window.todaywordAccountDialog.close();
 $('memberArea').classList.toggle('hidden',!user);
 // Unlock game immediately after authenticated user is confirmed, even if profile/rank APIs fail.
 window.dispatchEvent(new Event('todayword-auth-ready'));
 try{
  if(user){await loadProfile();status('로그인됨 · 온라인 기록 연결 완료');}
  else status('회원가입하거나 로그인하면 출석·포인트·랭킹을 이용할 수 있어요.');
  await loadRanks();
 }catch(e){status('로그인 상태는 확인됐지만 온라인 정보 불러오기 실패: '+friendly(e));}
}

// Supabase Auth requires an email internally. Use a deterministic, non-deliverable
// address derived from the private username; no real email is requested or sent.
const usernameEmail=name=>`${name.toLowerCase()}@pynscyjkjiwjmaanbeie.supabase.co`;
const normalizeUsername=value=>value.trim().toLowerCase();
const authError=e=>{
 const msg=friendly(e);
 if(/duplicate|unique|already registered|already exists|already been registered/i.test(msg))return '이미 사용 중인 아이디 또는 닉네임입니다.';
 if(/invalid login credentials/i.test(msg))return '아이디 또는 비밀번호가 일치하지 않습니다. 이전 버전에서 가입했다면 로그인 주소 형식이 달랐을 수도 있습니다. ('+msg+')';
 if(/invalid email|email address.*invalid|email.*not valid/i.test(msg))return '인증 이메일 설정 오류입니다. 새 버전으로 업데이트하고 다시 시도하세요.';
 if(/email.*not.*confirm|email_not_confirmed/i.test(msg))return '이 계정은 이메일 미인증 상태입니다. Supabase Authentication → Users에서 해당 사용자를 확인해 주세요. (원본 오류: '+msg+')';
 return msg;
};
$('signup').onclick=async()=>{
 const username=normalizeUsername($('username').value),nickname=$('nickname').value.trim(),password=$('password').value;
 if(!/^[a-z0-9]{4,24}$/.test(username)){status('아이디는 영문·숫자 4~24자로 입력하세요.');return;}
 if(!nickname||nickname.length>24){status('닉네임은 1~24자로 입력하세요.');return;}
 if(password.length<8){status('비밀번호는 8자 이상 입력하세요.');return;}
 try{
  const {data:check,error:checkError}=await client.rpc('check_signup_names',{p_username:username,p_nickname:nickname});
  if(checkError)throw checkError;
  if(check.username_taken){status('이미 사용 중인 아이디입니다.');return;}
  if(check.nickname_taken){status('이미 사용 중인 닉네임입니다.');return;}
  const {data,error}=await client.auth.signUp({email:usernameEmail(username),password,options:{data:{username,nickname}}});
  if(error)throw error;
  if(!data.user){status('회원가입을 완료하지 못했습니다. 다시 시도해주세요.');return;}
  if(!data.session){status('계정은 생성됐지만 인증 세션이 없습니다. Supabase Authentication → Users에서 사용자 확인 상태를 확인해 주세요.');return;}
  // Keep signup separate from login, and show a dedicated success screen.
  await client.auth.signOut();
  user=null;
  $('memberArea').classList.add('hidden');
  $('authArea').classList.add('hidden');
  $('signupSuccess').classList.remove('hidden');
  $('accountTitle').textContent='회원가입 완료';
  $('authStatus').textContent='';
 }catch(e){status(authError(e));console.error('인증 오류',e)}
};
$('signin').onclick=async()=>{
 const username=normalizeUsername($('username').value),password=$('password').value;
 if(!/^[a-z0-9]{4,24}$/.test(username)){status('아이디를 확인하세요.');return;}
 try{
  const {error}=await client.auth.signInWithPassword({email:usernameEmail(username),password});
  if(error)throw error;
  await refresh();
 }catch(e){status(authError(e));console.error('인증 오류',e)}
};

// Account management: require password reauthentication before sensitive changes.
const profileDialog=$('profileDialog');
const profileStatus=message=>{$('profileMessage').textContent=message};
const profileBusy=(button,busy)=>{button.disabled=busy;button.setAttribute('aria-busy',String(busy))};
async function reauthenticate(password){
 if(!user||!currentProfile)throw Error('로그인이 필요합니다.');
 if(!password)throw Error('현재 비밀번호를 입력하세요.');
 const {error}=await client.auth.signInWithPassword({email:user.email||usernameEmail(currentProfile.username),password});
 if(error)throw Error('현재 비밀번호가 올바르지 않습니다.');
}
$('profileOpen').addEventListener('click',async()=>{
 if(!user)return;
 profileStatus('');$('profileDeleteArea').classList.add('hidden');
 $('profileOldPassword').value='';$('profileNewPassword').value='';$('profileConfirmPassword').value='';$('profileDeletePassword').value='';$('profileDeleteConfirm').value='';
 try{await loadProfile();$('profileNewNickname').value=currentProfile.nickname}catch(e){profileStatus(friendly(e))}
 profileDialog.showModal();
});
$('profileClose').addEventListener('click',()=>profileDialog.close());
profileDialog.addEventListener('click',event=>{if(event.target===profileDialog)profileDialog.close()});
$('profileSaveNickname').addEventListener('click',async()=>{
 const button=$('profileSaveNickname'),nickname=$('profileNewNickname').value.trim();
 if(!nickname||nickname.length>24){profileStatus('닉네임은 1~24자로 입력하세요.');return}
 if(nickname===currentProfile?.nickname){profileStatus('현재 닉네임과 같습니다.');return}
 profileBusy(button,true);
 try{await rpc('change_nickname',{p_nickname:nickname});await loadProfile();await loadRanks();profileStatus('닉네임이 변경되었습니다.')}catch(e){profileStatus(/unique|duplicate/i.test(friendly(e))?'이미 사용 중인 닉네임입니다.':friendly(e))}finally{profileBusy(button,false)}
});
$('profileSavePassword').addEventListener('click',async()=>{
 const button=$('profileSavePassword'),old=$('profileOldPassword').value,pass=$('profileNewPassword').value,confirm=$('profileConfirmPassword').value;
 if(pass.length<8){profileStatus('새 비밀번호는 8자 이상 입력하세요.');return}
 if(pass!==confirm){profileStatus('새 비밀번호 확인이 일치하지 않습니다.');return}
 if(old===pass){profileStatus('현재 비밀번호와 다른 비밀번호를 입력하세요.');return}
 profileBusy(button,true);
 try{await reauthenticate(old);const {error}=await client.auth.updateUser({password:pass});if(error)throw error;
  $('profileOldPassword').value='';$('profileNewPassword').value='';$('profileConfirmPassword').value='';profileStatus('비밀번호가 변경되었습니다.')
 }catch(e){profileStatus(friendly(e))}finally{profileBusy(button,false)}
});
$('profileLogout').addEventListener('click',async()=>{try{await client.auth.signOut();profileDialog.close();await refresh()}catch(e){profileStatus(friendly(e))}});
$('profileDeleteToggle').addEventListener('click',()=>{$('profileDeleteArea').classList.toggle('hidden');profileStatus('')});
$('profileDelete').addEventListener('click',async()=>{
 const button=$('profileDelete');
 if($('profileDeleteConfirm').value.trim()!=='탈퇴합니다'){profileStatus('확인 문구에 탈퇴합니다를 정확히 입력하세요.');return}
 if(!window.confirm('정말 회원 탈퇴하시겠습니까? 모든 계정 기록이 영구 삭제됩니다.'))return;
 profileBusy(button,true);
 try{await reauthenticate($('profileDeletePassword').value);await rpc('delete_my_account');await client.auth.signOut({scope:'local'});profileDialog.close();await refresh();status('회원 탈퇴가 완료되었습니다.')}
 catch(e){profileStatus('회원 탈퇴 실패: '+friendly(e))}finally{profileBusy(button,false)}
});

$('signout').onclick=async()=>{await client.auth.signOut();await refresh()};
$('checkin').onclick=async()=>{try{const points=await rpc('daily_checkin');status(`출석 완료! 현재 ${points}P`);await loadProfile()}catch(e){status(friendly(e))}};
document.querySelectorAll('[data-rank]').forEach(button=>button.onclick=async()=>{period=button.dataset.rank;document.querySelectorAll('[data-rank]').forEach(b=>(b.setAttribute('aria-pressed',String(b===button)),b.setAttribute('aria-selected',String(b===button))));try{await loadRanks()}catch(e){status(friendly(e))}});
window.todaywordOnline={openShop:()=>loadShop().catch(e=>{$('shop').textContent='상점 조회 오류: '+friendly(e)}),recordPractice:async({puzzleId})=>{if(!user){status('무제한 정답 +1P는 로그인 후 적립됩니다.');return;}try{const points=await rpc('record_practice_win',{p_puzzle_id:puzzleId});status(`무제한 정답 +1P! 현재 ${Number(points).toLocaleString('ko-KR')}P`);await loadProfile();await loadRanks()}catch(e){status('무제한 점수 저장 실패: '+friendly(e))}},recordDaily:async({date,length,attempts,won,puzzleId})=>{if(!user)return;try{await rpc('record_daily_attempt',{p_day:date,p_length:length,p_attempts:attempts,p_won:won,p_puzzle_id:puzzleId});status('오늘의 도전 기록을 온라인에 저장했어요.');await loadProfile();await loadRanks()}catch(e){status('기록 저장 실패: '+friendly(e))}}};
client.auth.onAuthStateChange(()=>{setTimeout(()=>refresh().catch(e=>status(friendly(e))),0)});
refresh().catch(e=>status('온라인 연결 실패: '+friendly(e)));

window.todaywordSecure={
 isLoggedIn:()=>!!user,
 state:async(n)=>rpc('daily_game_state',{p_length:n}),
 guess:async(n,guess)=>{const data=await rpc('daily_game_guess',{p_length:n,p_guess:guess});if(data.finished){await loadProfile();await loadRanks();}return data;}
};
window.dispatchEvent(new Event('todayword-auth-ready'));
