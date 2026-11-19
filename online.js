import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.TODAYWORD_SUPABASE;
const $=id=>document.getElementById(id);
const status=message=>{$('onlineStatus').textContent=message;const el=$('authStatus');if(el)el.textContent=message};
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
$('shopNav').addEventListener('click',()=>{$('shopDialog').showModal();loadShop()});
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
const asset=(key)=>'emblems/'+encodeURIComponent(key)+'.png';
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
async function saveFreeEmblem(config){return rpc('equip_free_emblem',{p_shape:config.shape,p_pattern:config.pattern,p_crown:config.crown,p_wings:config.wings,p_effect:config.effect,p_namefx:config.namefx});}
function loadShop(){
 const area=$('shop');area.replaceChildren();
 const selected={shape:2,pattern:1,crown:1,wings:1,effect:1,namefx:0};
 const wrap=document.createElement('section');wrap.className='emblem-shop';
 const title=document.createElement('h3');title.textContent='✨ 레이어드 PNG 앰블럼 미리보기';wrap.append(title);
 const note=document.createElement('p');note.className='shop-note';note.textContent='구매는 잠금 상태입니다. 무료 기본 앰블럼만 랭킹에 장착할 수 있으며, 유료 구성은 미리보기만 가능합니다.';wrap.append(note);
 const preview=document.createElement('div');preview.className='emblem-preview';preview.setAttribute('aria-live','polite');wrap.append(preview);
 const tabs=document.createElement('div');tabs.className='shop-categories';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','상점 카테고리');wrap.append(tabs);const sections={};const tabButtons={};let activeCategory='shape';
 const buttons={};const footer=document.createElement('div');footer.className='shop-footer';
 const total=document.createElement('span');total.className='shop-price';footer.append(total);
 const freeBtn=document.createElement('button');freeBtn.type='button';freeBtn.className='emblem-free';freeBtn.textContent='무료 앰블럼 장착';footer.append(freeBtn);
 const locked=document.createElement('button');locked.type='button';locked.className='shop-locked';locked.disabled=true;locked.textContent='🔒 유료 구매 잠금';footer.append(locked);
 const getConfig=()=>Object.fromEntries(EMBLEM_GROUPS.map(g=>[g.key,g.items[selected[g.key]][1]]));
 function render(){const config=getConfig();preview.replaceChildren(emblemArt(config,currentProfile?.nickname||'내 닉네임'));
  const price=EMBLEM_GROUPS.reduce((sum,g)=>sum+g.items[selected[g.key]][2],0);
  total.textContent='선택 조합: '+price.toLocaleString('ko-KR')+'P · 미리보기';
  freeBtn.disabled=price!==0||!user;freeBtn.title=price?'유료 아이템은 현재 장착할 수 없습니다.':'무료 기본 앰블럼을 랭킹에 표시합니다.';
  for(const g of EMBLEM_GROUPS)buttons[g.key].forEach((btn,i)=>btn.setAttribute('aria-pressed',String(selected[g.key]===i)));
  for(const g of EMBLEM_GROUPS){sections[g.key].hidden=g.key!==activeCategory;tabButtons[g.key].setAttribute('aria-selected',String(g.key===activeCategory));}
 }
 for(const g of EMBLEM_GROUPS){const tab=document.createElement('button');tab.type='button';tab.textContent=g.label;tab.setAttribute('role','tab');tab.addEventListener('click',()=>{activeCategory=g.key;render()});tabs.append(tab);tabButtons[g.key]=tab;const section=document.createElement('div');sections[g.key]=section;section.className='emblem-group';const label=document.createElement('strong');label.textContent=g.label;section.append(label);
  const grid=document.createElement('div');grid.className='emblem-grid';buttons[g.key]=[];
  g.items.forEach((item,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='emblem-option'+(/낡은|찌그러진|낙서|흐릿한|종이|삐뚤어진|희미한/.test(item[0])?' rough':'');
   if(item[1]){const img=document.createElement('img');img.className='emblem-option-img';img.src=asset(item[1]==='rainbow'?'aurora':item[1]);img.alt='';img.loading='lazy';btn.append(img)}else{const blank=document.createElement('span');blank.className='emblem-option-img blank';blank.textContent='—';btn.append(blank)}
   const name=document.createElement('span');name.textContent=item[0];const cost=document.createElement('small');cost.textContent=item[2]===0?'무료':item[2].toLocaleString('ko-KR')+'P';
   btn.append(name,cost);btn.addEventListener('click',()=>{selected[g.key]=i;render()});buttons[g.key].push(btn);grid.append(btn);
  });section.append(grid);wrap.append(section);
 }
 freeBtn.addEventListener('click',async()=>{freeBtn.disabled=true;try{await saveFreeEmblem(getConfig());status('무료 앰블럼 장착 완료 · 랭킹에 표시됩니다.');await renderHeaderEmblem(currentProfile?.nickname||'');await loadRanks()}catch(e){status('앰블럼 장착 실패: '+friendly(e))}finally{render()}});
 wrap.append(footer);area.append(wrap);render();
}
async function loadRanks(){const {data,error}=await client.rpc('get_leaderboard',{p_period:period});if(error)throw error;const el=$('ranks');el.replaceChildren();if(!data?.length){el.textContent='아직 기록이 없습니다.';return;}data.forEach((entry,i)=>{const row=document.createElement('div');row.className='rankrow';const left=document.createElement('span');left.className='rank-identity';const rank=document.createElement('b');rank.textContent=(i+1)+'위';left.append(rank);left.append(emblemArt({shape:entry.emblem_shape||'shield1',pattern:entry.emblem_pattern||'',crown:entry.emblem_crown||'',wings:entry.emblem_wings||'',effect:entry.emblem_effect||'',namefx:entry.emblem_namefx||''},entry.nickname,true));const right=document.createElement('span');right.textContent=`${entry.score}점 · ${entry.wins}/${entry.plays}승 · ${entry.win_rate}%`;row.append(left,right);el.append(row)})}
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
 }catch(e){status(authError(e))}
};
$('signin').onclick=async()=>{
 const username=normalizeUsername($('username').value),password=$('password').value;
 if(!/^[a-z0-9]{4,24}$/.test(username)){status('아이디를 확인하세요.');return;}
 try{
  const {error}=await client.auth.signInWithPassword({email:usernameEmail(username),password});
  if(error)throw error;
  await refresh();
 }catch(e){status(authError(e))}
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
window.todaywordOnline={recordPractice:async({puzzleId})=>{if(!user){status('무제한 정답 +1P는 로그인 후 적립됩니다.');return;}try{const points=await rpc('record_practice_win',{p_puzzle_id:puzzleId});status(`무제한 정답 +1P! 현재 ${Number(points).toLocaleString('ko-KR')}P`);await loadProfile();await loadRanks()}catch(e){status('무제한 점수 저장 실패: '+friendly(e))}},recordDaily:async({date,length,attempts,won,puzzleId})=>{if(!user)return;try{await rpc('record_daily_attempt',{p_day:date,p_length:length,p_attempts:attempts,p_won:won,p_puzzle_id:puzzleId});status('오늘의 도전 기록을 온라인에 저장했어요.');await loadProfile();await loadRanks()}catch(e){status('기록 저장 실패: '+friendly(e))}}};
client.auth.onAuthStateChange(()=>{setTimeout(()=>refresh().catch(e=>status(friendly(e))),0)});
refresh().catch(e=>status('온라인 연결 실패: '+friendly(e)));

window.todaywordSecure={
 isLoggedIn:()=>!!user,
 state:async(n)=>rpc('daily_game_state',{p_length:n}),
 guess:async(n,guess)=>{const data=await rpc('daily_game_guess',{p_length:n,p_guess:guess});if(data.finished){await loadProfile();await loadRanks();}return data;}
};
window.dispatchEvent(new Event('todayword-auth-ready'));
