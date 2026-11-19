import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.TODAYWORD_SUPABASE;
const $=id=>document.getElementById(id);
const status=message=>{$('onlineStatus').textContent=message;const el=$('authStatus');if(el)el.textContent=message};
const client=createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let user=null,period='day',currentProfile=null;
const friendly=e=>e?.message||String(e);
async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);if(error)throw error;return data;}
async function loadProfile(){if(!user)return;const {data,error}=await client.from('profiles').select('nickname,points,username').eq('id',user.id).single();if(error)throw error;currentProfile=data;$('profileUsername').textContent=data.username;$('profilePoints').textContent=`${Number(data.points).toLocaleString('ko-KR')}P`;$('memberSummary').textContent=`${data.nickname} · ${data.points}P`;$('headerNickname').textContent=data.nickname;$('headerPoints').textContent=`${Number(data.points).toLocaleString('ko-KR')}P`;$('memberStats').textContent='아이디는 다른 사용자에게 공개되지 않습니다.';}
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
$('headerPoints').addEventListener('click',async()=>{if(!user)return;$('pointLogDialog').showModal();try{await loadPointLogs()}catch(e){$('pointLogItems').textContent='포인트 내역 조회 실패: '+friendly(e)}});
$('pointLogClose').addEventListener('click',()=>$('pointLogDialog').close());
$('pointLogDialog').addEventListener('click',e=>{if(e.target===$('pointLogDialog'))e.target.close()});
async function loadShop(){const {data,error}=await client.from('shop_items').select('id,title,cost,description').eq('active',true).order('cost');if(error)throw error;const area=$('shop');area.replaceChildren();for(const item of data){const row=document.createElement('div');row.className='rankrow';const info=document.createElement('span');info.textContent=`${item.title} · ${item.cost}P (${item.description||''})`;const btn=document.createElement('button');btn.type='button';btn.textContent='구매';btn.onclick=async()=>{try{await rpc('buy_item',{p_item_id:item.id});status('아이템 구매 완료');await loadProfile()}catch(e){status(friendly(e))}};row.append(info,btn);area.append(row)}}
async function loadRanks(){const {data,error}=await client.rpc('get_leaderboard',{p_period:period});if(error)throw error;const el=$('ranks');el.replaceChildren();if(!data?.length){el.textContent='아직 기록이 없습니다.';return;}data.forEach((entry,i)=>{const row=document.createElement('div');row.className='rankrow';const left=document.createElement('span');left.textContent=`${i+1}위 ${entry.nickname}`;const right=document.createElement('span');right.textContent=`${entry.score}점 · ${entry.wins}/${entry.plays}승 · ${entry.win_rate}%`;row.append(left,right);el.append(row)})}
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
  if(user){await loadProfile();await loadShop();status('로그인됨 · 온라인 기록 연결 완료');}
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
