// ============================================
// ifiChat — Ultimate Widget v4
// ============================================
(function(){
"use strict";
var s=document.currentScript;if(!s)return;
var m=(s.getAttribute("src")||"").match(/\/w\/([^.]+)\.js/);if(!m)return;
var CID=m[1],API="https://twtbdwxixrlspbzqmpva.supabase.co/functions/v1/widget-api";
var CFG={},CONV=null,VID=null,MSGS=[],OPEN=false,POLL=null,ERR=0;
var RECORDING=false,RECORDER=null,CHUNKS=[];

function loadConfig(cb){
  fetch(API+"/config/"+CID).then(function(r){return r.json()}).then(function(d){
    if(d.config){CFG=d.config;cb()}
  }).catch(function(){});
}

function playSound(){
  try{
    var ac=new(window.AudioContext||window.webkitAudioContext)();
    [880,1100].forEach(function(f,i){
      var o=ac.createOscillator(),g=ac.createGain();
      o.connect(g);g.connect(ac.destination);o.frequency.value=f;o.type="sine";
      g.gain.setValueAtTime(0.1,ac.currentTime+i*0.15);
      g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+i*0.15+0.3);
      o.start(ac.currentTime+i*0.15);o.stop(ac.currentTime+i*0.15+0.3);
    });
  }catch(e){}
}

function $(id){return document.getElementById(id)}

// ═══ CSS ═══════════════════════════════════
function injectCSS(){
  var C=CFG.primary_color||"#0D9488";
  var pos=CFG.position||"bottom-right";
  var bot=parseInt(CFG.bottom_offset)||20;
  var sd=parseInt(CFG.side_offset)||20;
  var isL=pos==="bottom-left";

  var css=
'@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");'+
'#ifi *,#ifi *:before,#ifi *:after{box-sizing:border-box;margin:0;padding:0;font-family:"Inter",system-ui,-apple-system,sans-serif}'+

// FAB
'#ifi-fab{position:fixed;bottom:'+bot+'px;'+(isL?'left':'right')+':'+sd+'px;width:56px;height:56px;border-radius:50%;background:'+C+';border:none;cursor:pointer;box-shadow:0 4px 16px '+C+'55;z-index:99998;display:flex;align-items:center;justify-content:center;transition:all .3s;animation:_fi .5s cubic-bezier(.34,1.5,.64,1)}'+
'#ifi-fab:hover{transform:scale(1.08)}'+
'#ifi-fab svg{width:24px;height:24px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:all .3s;position:absolute}'+
'#ifi-fab .i1{opacity:1;transform:scale(1)}'+
'#ifi-fab .i2{opacity:0;transform:scale(0) rotate(-90deg)}'+
'#ifi-fab.on .i1{opacity:0;transform:scale(0) rotate(90deg)}'+
'#ifi-fab.on .i2{opacity:1;transform:scale(1) rotate(0)}'+
'#ifi-bdg{position:absolute;top:-2px;right:-2px;min-width:18px;height:18px;border-radius:9px;background:#EF4444;color:#fff;font:700 10px/18px "Inter",sans-serif;text-align:center;padding:0 4px;display:none;box-shadow:0 2px 6px rgba(239,68,68,.4)}'+

// WINDOW
'#ifi{position:fixed;bottom:'+(bot+64)+'px;'+(isL?'left':'right')+':'+sd+'px;'+
  'width:360px;height:520px;border-radius:16px;overflow:hidden;z-index:99999;'+
  'display:none;flex-direction:column;'+
  'box-shadow:0 16px 48px rgba(0,0,0,.16),0 0 0 1px rgba(0,0,0,.04);'+
  'transform:translateY(12px) scale(.95);opacity:0;transition:all .3s cubic-bezier(.34,1.1,.64,1)}'+
'#ifi.show{transform:translateY(0) scale(1);opacity:1}'+

// HEADER
'#ifi-hd{background:'+C+';color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0}'+
'#ifi-av{width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}'+
'#ifi-av img{width:100%;height:100%;object-fit:cover}'+
'#ifi-av span{font-size:17px}'+
'#ifi-hi{flex:1;min-width:0}'+
'#ifi-nm{font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'#ifi-st{font-size:10px;opacity:.8;display:flex;align-items:center;gap:4px}'+
'#ifi-dot{width:6px;height:6px;border-radius:50%;background:#34D399;animation:_pl 2s infinite}'+
'#ifi-x{background:rgba(255,255,255,.12);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}'+
'#ifi-x:hover{background:rgba(255,255,255,.25)}'+

// BODY
'#ifi-bd{flex:1;overflow-y:auto;overflow-x:hidden;padding:10px;display:flex;flex-direction:column;gap:1px;background:#efeae2}'+
'#ifi-bd::-webkit-scrollbar{width:3px}'+
'#ifi-bd::-webkit-scrollbar-thumb{background:rgba(0,0,0,.1);border-radius:3px}'+

// DATE
'.iD{text-align:center;margin:6px 0 4px}'+
'.iD span{background:rgba(255,255,255,.85);padding:2px 10px;border-radius:6px;font-size:10px;color:#8696a0;font-weight:500}'+

// MESSAGES
'.iR{display:flex;margin-bottom:1px;animation:_mi .2s ease}'+
'.iR.v{justify-content:flex-end}.iR.c{justify-content:flex-start}'+
'.iB{max-width:82%;padding:5px 8px 2px;border-radius:8px;font-size:13px;line-height:1.4;word-wrap:break-word;box-shadow:0 1px 1px rgba(0,0,0,.04)}'+
'.iR.v .iB{background:#d9fdd3;border-top-right-radius:2px}'+
'.iR.c .iB{background:#fff;border-top-left-radius:2px}'+
'.iB img{max-width:100%;border-radius:4px;margin-bottom:2px;cursor:pointer;display:block;max-height:160px;object-fit:cover}'+
'.iB audio{width:100%;height:30px;margin:2px 0}'+
'.iB a{color:#1a73e8;word-break:break-all;font-size:12px}'+
'.iT{font-size:9px;color:#8696a0;display:flex;align-items:center;justify-content:flex-end;gap:2px;margin-top:1px}'+
'.iCk svg{width:14px;height:10px;color:#53bdeb}'+

// WELCOME
'.iWl{text-align:center;padding:20px 12px;color:#667781}'+
'.iWi{width:52px;height:52px;border-radius:14px;background:'+C+'15;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;overflow:hidden}'+
'.iWi img{width:100%;height:100%;object-fit:cover}.iWi span{font-size:22px}'+
'.iWl h4{font-size:14px;color:#111;margin:0 0 4px;font-weight:700}'+
'.iWl p{font-size:12px;line-height:1.5;margin:0}'+

// TYPING
'#ifi-tp{display:none;padding:2px 10px}'+
'#ifi-tpi{background:#fff;display:inline-flex;gap:3px;padding:8px 14px;border-radius:8px;border-top-left-radius:2px;box-shadow:0 1px 1px rgba(0,0,0,.04)}'+
'#ifi-tpi span{width:5px;height:5px;border-radius:50%;background:#90a4ae;animation:_tp 1.4s infinite}'+
'#ifi-tpi span:nth-child(2){animation-delay:.2s}#ifi-tpi span:nth-child(3){animation-delay:.4s}'+

// FORM
'#ifi-fm{display:none;padding:12px;background:#fff;border-top:1px solid #e9ecef;flex-shrink:0}'+
'#ifi-fm label{font-size:10px;font-weight:600;color:#8696a0;margin-bottom:2px;display:block;letter-spacing:.3px}'+
'#ifi-fm input{width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;margin-bottom:6px;outline:none;background:#fafbfc}'+
'#ifi-fm input:focus{border-color:'+C+';background:#fff}'+
'#ifi-fm-e{color:#EF4444;font-size:10px;margin:-2px 0 4px;display:none}'+
'#ifi-fm-b{width:100%;padding:10px;border:none;border-radius:10px;background:'+C+';color:#fff;font:600 13px "Inter",sans-serif;cursor:pointer}'+
'#ifi-fm-b:hover{opacity:.9}'+

// INPUT BAR
'#ifi-br{display:none;padding:6px;background:#f0f2f5;border-top:1px solid #dfe2e6;flex-shrink:0}'+
'#ifi-sf{display:flex;gap:2px;align-items:center;width:100%}'+
'.iBn{width:30px;height:30px;min-width:30px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:none;color:#667781;flex-shrink:0;padding:0}'+
'.iBn:hover{background:rgba(0,0,0,.05)}'+
'.iBn svg{width:18px;height:18px;flex-shrink:0}'+
'#ifi-si{flex:1;min-width:0;width:0;padding:7px 10px;border:none;border-radius:18px;font-size:13px;outline:none;background:#fff}'+
'#ifi-sn{width:32px;height:32px;min-width:32px;border-radius:50%;border:none;background:'+C+';color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0}'+
'#ifi-sn svg{width:14px;height:14px;flex-shrink:0}'+
'#ifi-fi{display:none}'+
'.iRc{color:#EF4444!important;animation:_rp 1s infinite}'+

// EMOJI
'#ifi-em{display:none;position:absolute;bottom:44px;left:4px;right:4px;background:#fff;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.14);padding:6px;z-index:2;max-height:140px;overflow-y:auto}'+
'#ifi-em span{font-size:18px;cursor:pointer;padding:2px;display:inline-block;border-radius:4px}'+
'#ifi-em span:hover{background:#f0f2f5}'+

// POWERED
'#ifi-pw{text-align:center;padding:3px;background:#fff;font-size:8px;color:#b0b8c1;flex-shrink:0;border-top:1px solid #f0f0f0}'+
'#ifi-pw a{color:#8696a0;text-decoration:none;font-weight:600}'+

// ANIMS
'@keyframes _fi{from{transform:scale(0)}to{transform:scale(1)}}'+
'@keyframes _pl{0%,100%{opacity:1}50%{opacity:.4}}'+
'@keyframes _mi{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}'+
'@keyframes _tp{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)}}'+
'@keyframes _rp{0%,100%{opacity:1}50%{opacity:.3}}'+

// MOBILE — not fullscreen, compact bar
'@media(max-width:480px){'+
  '#ifi{width:calc(100vw - 16px);'+(isL?'left:8px':'right:8px')+';height:60vh;max-height:60vh;bottom:'+(bot+62)+'px;border-radius:14px}'+
  '.iBn.hm{display:none}'+
  '.iBn{width:28px;height:28px;min-width:28px}'+
  '.iBn svg{width:16px;height:16px}'+
  '#ifi-sn{width:30px;height:30px;min-width:30px}'+
  '#ifi-sn svg{width:13px;height:13px}'+
  '#ifi-si{padding:6px 8px;font-size:12px}'+
  '#ifi-br{padding:4px 5px}'+
  '#ifi-sf{gap:2px}'+
'}'+
'@media(min-width:481px){'+
  '#ifi{max-height:calc(100vh - '+(bot+80)+'px)}'+
'}';

  var el=document.createElement("style");el.textContent=css;document.head.appendChild(el);
}

// ═══ DOM ═══════════════════════════════════
function buildUI(){
  var fab=document.createElement("button");fab.id="ifi-fab";
  fab.innerHTML='<svg class="i1" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><svg class="i2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span id="ifi-bdg">0</span>';
  fab.onclick=toggle;document.body.appendChild(fab);

  var logo=CFG.logo_url||"";
  var avH=logo?'<img src="'+logo+'" alt="">':'<span>'+(CFG.avatar_emoji||"💬")+'</span>';
  var biz=CFG.business_name||"Support";

  var w=document.createElement("div");w.id="ifi";
  w.innerHTML=
'<div id="ifi-hd"><div id="ifi-av">'+avH+'</div><div id="ifi-hi"><div id="ifi-nm">'+biz+'</div><div id="ifi-st"><span id="ifi-dot"></span>En ligne</div></div><button id="ifi-x"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'+
'<div id="ifi-bd"><div class="iWl"><div class="iWi">'+avH+'</div><h4>'+biz+'</h4><p>'+(CFG.welcome_message||"Bonjour ! Comment pouvons-nous vous aider ?")+'</p></div></div>'+
'<div id="ifi-tp"><div id="ifi-tpi"><span></span><span></span><span></span></div></div>'+
'<div id="ifi-fm"><label>Votre nom</label><input id="ifi-fn" placeholder="Ex: Adama Koné"><label>Téléphone</label><input id="ifi-wa" type="tel" inputmode="numeric" placeholder="229 XX XX XX XX"><div id="ifi-fm-e">Numéro invalide (min 8 chiffres)</div><button id="ifi-fm-b">Démarrer →</button></div>'+
'<div id="ifi-br" style="position:relative"><div id="ifi-em"></div><form id="ifi-sf">'+
  '<button type="button" class="iBn" id="ifi-eb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></button>'+
  '<button type="button" class="iBn" id="ifi-at"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>'+
  '<input type="text" id="ifi-si" placeholder="'+(CFG.placeholder_text||"Message...")+'" autocomplete="off">'+
  '<button type="button" class="iBn hm" id="ifi-rc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></button>'+
  '<button type="submit" id="ifi-sn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'+
  '<input type="file" id="ifi-fi" accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx">'+
'</form></div>'+
'<div id="ifi-pw">⚡ <a href="https://chat.ifiaas.com" target="_blank">ifiChat</a></div>';
  document.body.appendChild(w);

  $("ifi-x").onclick=closeChat;
  $("ifi-fm-b").onclick=startConv;
  $("ifi-sf").onsubmit=sendMsg;
  $("ifi-at").onclick=function(){$("ifi-fi").click()};
  $("ifi-fi").onchange=uploadFile;
  $("ifi-rc").onclick=toggleRec;
  $("ifi-wa").addEventListener("input",function(e){e.target.value=e.target.value.replace(/[^0-9+]/g,"")});

  // Emoji picker
  var emw=$("ifi-em");
  ["😀","😂","🤣","😊","🥰","😍","😘","😉","🤗","🤔","😎","🤩","😅","👍","❤️","🔥","🎉","💯","🙏","👋","✅","⭐","📸","🎁","💰","👏","😢","🙂","😄","🫡"].forEach(function(e){
    var sp=document.createElement("span");sp.textContent=e;
    sp.onclick=function(){$("ifi-si").value+=e;$("ifi-si").focus();emw.style.display="none"};
    emw.appendChild(sp);
  });
  $("ifi-eb").onclick=function(){emw.style.display=emw.style.display==="block"?"none":"block"};
  $("ifi-si").addEventListener("focus",function(){emw.style.display="none"});
}

// ═══ TOGGLE ═══════════════════════════════
function toggle(){OPEN?closeChat():openChat()}
function openChat(){
  OPEN=true;stopBgPoll();$("ifi").style.display="flex";$("ifi-fab").classList.add("on");
  requestAnimationFrame(function(){$("ifi").classList.add("show")});
  if(!CONV)$("ifi-fm").style.display="block";
  else{
    // Re-fetch all messages (catch ones received while closed)
    fetch(API+"/messages/"+CONV).then(function(r){if(!r.ok)return null;return r.json()}).then(function(d){
      if(!d||!d.messages)return;
      var hasNew=false;
      d.messages.forEach(function(m){
        if(!MSGS.some(function(e){return e.id===m.id})){
          // Skip temp duplicates
          if(m.sender_type==="visitor"){
            var idx=MSGS.findIndex(function(e){return String(e.id).startsWith("t_")&&e.content===m.content});
            if(idx>-1){MSGS.splice(idx,1);return}
          }
          addMsg(m,true);hasNew=true;
        }
      });
      if(hasNew)scrl();
    }).catch(function(){});
    startPolling();
  }
  $("ifi-bdg").style.display="none";$("ifi-bdg").textContent="0";scrl();
}
function closeChat(){
  OPEN=false;$("ifi").classList.remove("show");$("ifi-fab").classList.remove("on");
  try{$("ifi-em").style.display="none"}catch(e){}
  setTimeout(function(){if(!OPEN)$("ifi").style.display="none"},350);
  // Switch to slow background polling for badge
  stopPolling();
  if(CONV)startBgPoll();
}
function scrl(){var b=$("ifi-bd");if(b)setTimeout(function(){b.scrollTop=b.scrollHeight},50)}

// Background poll (slow, for badge when chat closed)
var BGPOLL=null;
function startBgPoll(){
  if(BGPOLL||!CONV)return;
  BGPOLL=setInterval(function(){
    if(OPEN){stopBgPoll();return}
    fetch(API+"/messages/"+CONV).then(function(r){if(!r.ok)return null;return r.json()}).then(function(d){
      if(!d||!d.messages)return;
      var nc=0;
      d.messages.forEach(function(m){
        if(!MSGS.some(function(e){return e.id===m.id})){
          if(m.sender_type==="client")nc++;
          MSGS.push(m); // track but don't render
        }
      });
      if(nc>0){
        var b=$("ifi-bdg");b.textContent=String(parseInt(b.textContent||"0")+nc);b.style.display="block";
        playSound();
      }
    }).catch(function(){});
  },8000);
}
function stopBgPoll(){if(BGPOLL){clearInterval(BGPOLL);BGPOLL=null}}

// ═══ START CONVERSATION ═══════════════════
function startConv(){
  var fn=$("ifi-fn").value.trim();
  var wa=$("ifi-wa").value.trim().replace(/[^0-9+]/g,"");
  if(!fn){$("ifi-fn").style.borderColor="#EF4444";setTimeout(function(){$("ifi-fn").style.borderColor=""},2000);return}
  if(!wa||wa.replace(/[^0-9]/g,"").length<8){
    $("ifi-wa").style.borderColor="#EF4444";$("ifi-fm-e").style.display="block";
    setTimeout(function(){$("ifi-wa").style.borderColor="";$("ifi-fm-e").style.display="none"},3000);return;
  }
  var btn=$("ifi-fm-b");btn.textContent="Connexion...";btn.disabled=true;
  fetch(API+"/start-conversation",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},
    body:JSON.stringify({fullName:fn,whatsapp:wa})
  }).then(function(r){return r.json()}).then(function(d){
    if(d.conversationId){
      CONV=d.conversationId;VID=d.visitorId;
      $("ifi-fm").style.display="none";$("ifi-br").style.display="block";
      var wl=document.querySelector(".iWl");if(wl)wl.style.display="none";
      try{localStorage.setItem("ifi_"+CID,JSON.stringify({c:CONV,v:VID,n:fn}))}catch(x){}
      $("ifi-tp").style.display="block";scrl();
      setTimeout(function(){
        $("ifi-tp").style.display="none";
        addMsg({content:"Merci "+fn+" ! Comment puis-je vous aider ?",sender_type:"client",content_type:"text",created_at:new Date().toISOString(),id:"sys"},true);
      },1400);
      startPolling();$("ifi-si").focus();
    }
    btn.textContent="Démarrer →";btn.disabled=false;
  }).catch(function(){btn.textContent="Démarrer →";btn.disabled=false});
}

// ═══ SEND ═════════════════════════════════
function sendMsg(e){
  e.preventDefault();var inp=$("ifi-si");var t=inp.value.trim();if(!t||!CONV)return;
  inp.value="";$("ifi-em").style.display="none";
  addMsg({content:t,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"t_"+Date.now()});
  fetch(API+"/send-message",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},
    body:JSON.stringify({conversationId:CONV,visitorId:VID,content:t,sender:"visitor"})
  }).catch(function(){});
}

// ═══ UPLOAD ═══════════════════════════════
function uploadFile(){
  var fi=$("ifi-fi");var f=fi.files[0];if(!f||!CONV)return;fi.value="";
  var isImg=f.type.startsWith("image/"),isAud=f.type.startsWith("audio/");
  var tid="t_"+Date.now();
  if(isImg){
    var rd=new FileReader();rd.onload=function(ev){
      addMsg({content:"",sender_type:"visitor",content_type:"image",file_url:ev.target.result,created_at:new Date().toISOString(),id:tid},true);
    };rd.readAsDataURL(f);
  } else {
    addMsg({content:isAud?"🎤 Audio":"📎 "+f.name,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:tid},true);
  }
  var fd=new FormData();fd.append("file",f);fd.append("conversationId",CONV);fd.append("visitorId",VID);
  fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(function(){});
}

// ═══ VOICE ════════════════════════════════
function toggleRec(){
  if(RECORDING){stopRec();return}
  if(!navigator.mediaDevices)return;
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(st){
    RECORDING=true;CHUNKS=[];$("ifi-rc").classList.add("iRc");
    RECORDER=new MediaRecorder(st);
    RECORDER.ondataavailable=function(e){if(e.data.size>0)CHUNKS.push(e.data)};
    RECORDER.onstop=function(){
      st.getTracks().forEach(function(t){t.stop()});
      var blob=new Blob(CHUNKS,{type:"audio/webm"});
      var f=new File([blob],"voice_"+Date.now()+".webm",{type:"audio/webm"});
      var fd=new FormData();fd.append("file",f);fd.append("conversationId",CONV);fd.append("visitorId",VID);
      addMsg({content:"🎤 Vocal",sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"t_"+Date.now()},true);
      fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(function(){});
    };
    RECORDER.start();setTimeout(function(){if(RECORDING)stopRec()},60000);
  }).catch(function(){});
}
function stopRec(){RECORDING=false;$("ifi-rc").classList.remove("iRc");if(RECORDER&&RECORDER.state!=="inactive")RECORDER.stop()}

// ═══ ADD MESSAGE ═════════════════════════
var lastD="";
function addMsg(m,noSnd){
  MSGS.push(m);var box=$("ifi-bd");var isV=m.sender_type==="visitor";
  var dt=new Date(m.created_at);var ds=dt.toLocaleDateString("fr-FR");
  if(ds!==lastD){
    lastD=ds;var now=new Date().toLocaleDateString("fr-FR");var y=new Date(Date.now()-864e5).toLocaleDateString("fr-FR");
    var lbl=ds===now?"Aujourd'hui":ds===y?"Hier":dt.toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
    var dd=document.createElement("div");dd.className="iD";dd.innerHTML="<span>"+lbl+"</span>";box.appendChild(dd);
  }
  var row=document.createElement("div");row.className="iR "+(isV?"v":"c");
  var bub=document.createElement("div");bub.className="iB";
  var c=m.content||"";
  // Image
  if(m.content_type==="image"&&m.file_url){
    var img=document.createElement("img");img.src=m.file_url;img.loading="lazy";
    img.onclick=function(){window.open(m.file_url,"_blank")};bub.appendChild(img);
    if(c){var ct=document.createElement("div");ct.style.fontSize="12px";ct.textContent=c;bub.appendChild(ct)}
  }
  // Audio
  else if(m.content_type==="file"&&m.file_url&&(m.file_mime_type||"").startsWith("audio/")){
    var au=document.createElement("audio");au.controls=true;au.src=m.file_url;au.preload="metadata";bub.appendChild(au);
  }
  // File
  else if(m.content_type==="file"&&m.file_url){
    var a=document.createElement("a");a.href=m.file_url;a.target="_blank";
    a.innerHTML="📎 "+(m.file_name||"Fichier");a.style.cssText="font-size:12px;font-weight:500";bub.appendChild(a);
  }
  // Text with links
  else if(c){
    var ur=/(https?:\/\/[^\s]+)/g;
    if(ur.test(c)){c.split(ur).forEach(function(p){
      if(p.match(/^https?:\/\//)){var l=document.createElement("a");l.href=p;l.target="_blank";l.textContent=p.length>35?p.slice(0,35)+"…":p;bub.appendChild(l)}
      else if(p)bub.appendChild(document.createTextNode(p));
    })} else bub.appendChild(document.createTextNode(c));
  }
  // Time + check
  var tm=document.createElement("div");tm.className="iT";
  tm.innerHTML=dt.getHours().toString().padStart(2,"0")+":"+dt.getMinutes().toString().padStart(2,"0")+(isV?'<span class="iCk"><svg viewBox="0 0 16 11" fill="none"><path d="M11 1L4.5 7.5 2 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M14 1L7.5 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>':"");
  bub.appendChild(tm);row.appendChild(bub);box.appendChild(row);scrl();
  if(!isV&&!noSnd&&m.id!=="sys")playSound();
}

// ═══ POLLING ══════════════════════════════
function startPolling(){if(POLL||!CONV)return;ERR=0;pollNow();POLL=setInterval(function(){if(ERR>5){stopPolling();return}pollNow()},3500)}
function stopPolling(){if(POLL){clearInterval(POLL);POLL=null}}
function pollNow(){
  fetch(API+"/messages/"+CONV).then(function(r){if(!r.ok){ERR++;return null}ERR=0;return r.json()}).then(function(d){
    if(!d||!d.messages)return;var nc=0;
    d.messages.forEach(function(m){
      if(!MSGS.some(function(e){return e.id===m.id})){
        if(m.sender_type==="visitor"){
          // Remove temp match
          var idx=MSGS.findIndex(function(e){return String(e.id).startsWith("t_")&&(e.content===m.content||(m.file_url&&e.file_url))});
          if(idx>-1){MSGS.splice(idx,1);return}
        }
        addMsg(m);if(m.sender_type==="client")nc++;
      }
    });
    if(!OPEN&&nc>0){var b=$("ifi-bdg");b.textContent=String(parseInt(b.textContent||"0")+nc);b.style.display="block";playSound()}
  }).catch(function(){ERR++});
}

// ═══ RESTORE ═════════════════════════════
function restoreSession(){
  try{
    var sv=JSON.parse(localStorage.getItem("ifi_"+CID));
    if(sv&&sv.c){
      CONV=sv.c;VID=sv.v;
      $("ifi-fm").style.display="none";$("ifi-br").style.display="block";
      var wl=document.querySelector(".iWl");if(wl)wl.style.display="none";
      fetch(API+"/messages/"+CONV).then(function(r){if(!r.ok)return null;return r.json()}).then(function(d){
        if(d&&d.messages)d.messages.forEach(function(m){addMsg(m,true)});
        startBgPoll(); // Background poll for badge
      }).catch(function(){});
    }
  }catch(x){}
}

loadConfig(function(){injectCSS();buildUI();restoreSession()});
})();
