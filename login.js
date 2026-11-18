(()=>{
 'use strict';
 const form=document.getElementById('login-form'),input=document.getElementById('password'),submit=document.getElementById('submit'),message=document.getElementById('message'),toggle=document.getElementById('toggle-password');
 const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 let sending=false,frame=null,urls=[],timer=null,expires=0;
 function lock(reason=''){
  clearTimeout(timer);timer=null;expires=0;
  if(frame){frame.remove();frame=null;}
  for(const url of urls)URL.revokeObjectURL(url);urls=[];
  document.body.classList.remove('app-open');input.value='';message.textContent=reason;input.focus();
 }
 window.addEventListener('message',event=>{if(frame&&event.source===frame.contentWindow&&event.origin===location.origin&&event.data?.type==='jiayu-lock')lock('已退出，请重新输入访问密码。');});
 document.addEventListener('visibilitychange',()=>{if(expires&&Date.now()>=expires)lock('本次访问已到期，请重新输入密码。');});
 toggle.addEventListener('click',()=>{const show=input.type==='password';input.type=show?'text':'password';toggle.textContent=show?'隐藏':'显示';toggle.setAttribute('aria-label',show?'隐藏密码':'显示密码');toggle.setAttribute('aria-pressed',String(show));});
 input.addEventListener('input',()=>{message.textContent='';input.removeAttribute('aria-invalid');});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending||!input.value)return;
  sending=true;submit.disabled=true;submit.textContent='正在验证…';message.textContent='';
  let stage='download';
  try{
   if(!window.isSecureContext||!crypto.subtle||!window.DecompressionStream)throw Error('browser');
   const response=await fetch(new URL('./payload.json',location.href),{cache:'no-store'});
   if(!response.ok)throw Error('download');
   const packet=await response.json();
   if(packet.version!==1||packet.algorithm!=='AES-256-GCM'||packet.kdf!=='PBKDF2-SHA256'||packet.iterations!==600000)throw Error('format');
   const passwordBytes=new TextEncoder().encode(input.value);
   const material=await crypto.subtle.importKey('raw',passwordBytes,'PBKDF2',false,['deriveKey']);passwordBytes.fill(0);
   const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(packet.salt),iterations:packet.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
   stage='decrypt';
   const compressed=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(packet.iv),additionalData:new TextEncoder().encode('JIAYU-DEMO-V8:1'),tagLength:128},key,decode(packet.data));
   stage='open';
   const payload=JSON.parse(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
   const js=URL.createObjectURL(new Blob([payload.js],{type:'text/javascript'})),css=URL.createObjectURL(new Blob([payload.css],{type:'text/css'}));urls=[js,css];
   const pending=document.createElement('iframe');pending.id='demo-frame';pending.title='家裕化工生产工作台';pending.allow='fullscreen';pending.setAttribute('allowfullscreen','');
   frame=pending;
   pending.srcdoc='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>家裕 · 生产智能体 V8</title><link rel="stylesheet" href="'+css+'"></head><body><div id="root"></div><script>window.__JIAYU_LOCK__=()=>parent.postMessage({type:"jiayu-lock"},parent.location.origin);<\/script><script src="'+js+'"><\/script></body></html>';
   input.value='';input.type='password';toggle.textContent='显示';toggle.setAttribute('aria-label','显示密码');toggle.setAttribute('aria-pressed','false');
   document.body.append(pending);document.body.classList.add('app-open');
   expires=Date.now()+8*60*60*1000;timer=setTimeout(()=>lock('本次访问已到期，请重新输入密码。'),8*60*60*1000);
  }catch(error){
   if(frame||urls.length)lock();
   message.textContent=stage==='decrypt'?'访问密码不正确，请重新输入。':error.message==='browser'?'请使用新版 Chrome、Edge 或 Safari 打开此页面。':stage==='open'?'演示内容未能打开，请刷新后重试。':'页面资源暂时无法下载，请检查网络后重试。';
   input.setAttribute('aria-invalid','true');input.focus();
  }finally{sending=false;submit.disabled=false;submit.innerHTML='登录并进入 <span aria-hidden="true">→</span>';}
 });
})();
