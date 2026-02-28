// ============================================
// ifiChat — Ultimate Widget v3
// ============================================
(function(){
"use strict";
var s=document.currentScript;if(!s)return;
var m=(s.getAttribute("src")||"").match(/\/w\/([^.]+)\.js/);if(!m)return;
var CID=m[1],API="https://twtbdwxixrlspbzqmpva.supabase.co/functions/v1/widget-api";
var CFG={},CONV=null,VID=null,MSGS=[],OPEN=false,POLL=null,ERR=0,RECORDING=false,RECORDER=null,AUDIO_CHUNKS=[];
var LAST_MSG_COUNT=0;

function loadConfig(cb){
  fetch(API+"/config/"+CID).then(function(r){return r.json()}).then(function(d){
    if(d.config){CFG=d.config;cb()}
  }).catch(function(){});
}

// ═══ NOTIFICATION SOUND ═══════════════════
function playNotifSound(){
  try{
    var ctx=new(window.AudioContext||window.webkitAudioContext)();
    var osc=ctx.createOscillator();var gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.frequency.value=880;osc.type="sine";
    gain.gain.setValueAtTime(0.15,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.4);
    setTimeout(function(){
      var o2=ctx.createOscillator();var g2=ctx.createGain();
      o2.connect(g2);g2.connect(ctx.destination);
      o2.frequency.value=1100;o2.type="sine";
      g2.gain.setValueAtTime(0.12,ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);
      o2.start(ctx.currentTime);o2.stop(ctx.currentTime+0.3);
    },150);
  }catch(e){}
}

// ═══ CSS ═══════════════════════════════════
function injectCSS(){
  var C=CFG.primary_color||"#0D9488";
  var pos=CFG.position||"bottom-right";
  var bot=(CFG.bottom_offset||20)+"px";
  var sd=(CFG.side_offset||20)+"px";
  var P=pos==="bottom-left"?"left:"+sd:"right:"+sd;

  var css=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

#ifi-fab{position:fixed;bottom:${bot};${P};width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,${C},${C}dd);border:none;cursor:pointer;box-shadow:0 6px 24px ${C}55;z-index:99998;display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.4,0,.2,1);animation:ifiFabIn .6s cubic-bezier(.34,1.56,.64,1)}
#ifi-fab:hover{transform:scale(1.1) rotate(5deg);box-shadow:0 8px 32px ${C}77}
#ifi-fab:active{transform:scale(.92)}
#ifi-fab svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:all .3s}
#ifi-fab.open svg.ico-chat{opacity:0;transform:rotate(90deg) scale(0)}
#ifi-fab.open svg.ico-x{opacity:1;transform:rotate(0) scale(1)}
#ifi-fab svg.ico-x{position:absolute;opacity:0;transform:rotate(-90deg) scale(0);transition:all .3s cubic-bezier(.4,0,.2,1)}
#ifi-fab svg.ico-chat{transition:all .3s cubic-bezier(.4,0,.2,1)}
#ifi-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;border-radius:11px;background:#EF4444;color:#fff;font:700 11px/22px 'Inter',sans-serif;text-align:center;padding:0 6px;display:none;box-shadow:0 2px 8px rgba(239,68,68,.5);animation:ifiBounce .5s cubic-bezier(.34,1.56,.64,1)}

#ifi-win{position:fixed;bottom:${parseInt(bot)+72}px;${P};width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100dvh - ${parseInt(bot)+90}px);border-radius:20px;overflow:hidden;z-index:99999;display:none;flex-direction:column;font-family:'Inter',system-ui,sans-serif;
  box-shadow:0 25px 70px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.04);
  transform:translateY(20px) scale(.92);opacity:0;transition:all .4s cubic-bezier(.34,1.15,.64,1)}
#ifi-win.show{transform:translateY(0) scale(1);opacity:1}

#ifi-hdr{background:linear-gradient(135deg,${C} 0%,${C}cc 100%);color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative;overflow:hidden}
#ifi-hdr::before{content:'';position:absolute;top:-40%;right:-20%;width:140px;height:140px;border-radius:50%;background:rgba(255,255,255,.06)}
#ifi-hdr::after{content:'';position:absolute;bottom:-60%;left:-10%;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.04)}
#ifi-hdr-av{width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);flex-shrink:0;font-size:20px;border:2px solid rgba(255,255,255,.15)}
#ifi-hdr-info{flex:1;min-width:0}
#ifi-hdr-name{font-weight:700;font-size:15px;letter-spacing:-.3px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}
#ifi-hdr-dot{width:7px;height:7px;border-radius:50%;background:#34D399;display:inline-block;margin-right:5px;box-shadow:0 0 6px #34D39988;animation:ifiPulse 2s ease infinite}
#ifi-hdr-status{font-size:11px;opacity:.85;display:flex;align-items:center}
#ifi-close{position:absolute;top:12px;right:12px;background:rgba(255,255,255,.12);border:none;color:#fff;width:30px;height:30px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);transition:all .2s}
#ifi-close:hover{background:rgba(255,255,255,.25);transform:scale(1.1)}

#ifi-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:2px;
  background:#efeae2;
  background-image:url("data:image/svg+xml,%3Csvg width='400' height='400' viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4cdc4' fill-opacity='.13'%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3Ccircle cx='60' cy='50' r='1.5'/%3E%3Ccircle cx='100' cy='30' r='2'/%3E%3Ccircle cx='140' cy='70' r='1'/%3E%3Ccircle cx='180' cy='20' r='1.5'/%3E%3Ccircle cx='220' cy='55' r='2'/%3E%3Ccircle cx='260' cy='35' r='1'/%3E%3Ccircle cx='300' cy='65' r='1.5'/%3E%3Ccircle cx='340' cy='25' r='2'/%3E%3Ccircle cx='380' cy='50' r='1'/%3E%3Ccircle cx='40' cy='100' r='1.5'/%3E%3Ccircle cx='80' cy='130' r='2'/%3E%3Ccircle cx='120' cy='110' r='1'/%3E%3Ccircle cx='160' cy='140' r='1.5'/%3E%3Ccircle cx='200' cy='90' r='2'/%3E%3Ccircle cx='240' cy='120' r='1'/%3E%3Ccircle cx='280' cy='100' r='1.5'/%3E%3Ccircle cx='320' cy='135' r='2'/%3E%3Ccircle cx='360' cy='95' r='1'/%3E%3C/g%3E%3C/svg%3E")}
#ifi-body::-webkit-scrollbar{width:4px}
#ifi-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}

.ifi-day{text-align:center;margin:10px 0 6px}
.ifi-day span{background:rgba(255,255,255,.85);backdrop-filter:blur(8px);padding:4px 14px;border-radius:8px;font-size:11px;color:#8696a0;font-weight:500;box-shadow:0 1px 4px rgba(0,0,0,.04)}

.ifi-row{display:flex;margin-bottom:2px;animation:ifiMsgIn .25s ease}
.ifi-row.vis{justify-content:flex-end}
.ifi-row.cli{justify-content:flex-start}

.ifi-bub{max-width:80%;padding:7px 10px 4px;border-radius:10px;font-size:13.5px;line-height:1.45;word-wrap:break-word;position:relative;box-shadow:0 1px 1px rgba(0,0,0,.06)}
.ifi-row.vis .ifi-bub{background:#d9fdd3;color:#111;border-top-right-radius:3px}
.ifi-row.cli .ifi-bub{background:#fff;color:#111;border-top-left-radius:3px}
.ifi-bub img{max-width:100%;border-radius:6px;margin-bottom:3px;cursor:pointer;display:block}
.ifi-bub audio{width:100%;max-width:220px;height:34px;margin:2px 0}
.ifi-time{font-size:10px;color:#8696a0;margin-top:1px;display:flex;align-items:center;justify-content:flex-end;gap:3px}
.ifi-read{color:#53bdeb}
.ifi-link-prev{border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:4px;cursor:pointer}
.ifi-link-prev div{padding:6px 10px;font-size:12px;color:#1a73e8;font-weight:500;text-overflow:ellipsis;overflow:hidden;white-space:nowrap}

.ifi-welc{text-align:center;padding:24px 16px;color:#667781}
.ifi-welc-icon{width:64px;height:64px;border-radius:18px;background:linear-gradient(135deg,${C}22,${C}11);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:28px;border:2px solid ${C}15}
.ifi-welc h4{font-size:16px;color:#111;margin:0 0 6px;font-weight:700}
.ifi-welc p{font-size:13px;line-height:1.6;margin:0}

#ifi-typing{display:none;padding:4px 14px}
#ifi-typing-inner{background:#fff;display:inline-flex;gap:4px;padding:10px 16px;border-radius:10px;border-top-left-radius:3px;box-shadow:0 1px 1px rgba(0,0,0,.06);align-items:center}
#ifi-typing-inner span{width:6px;height:6px;border-radius:50%;background:#90a4ae;animation:ifiType 1.4s infinite}
#ifi-typing-inner span:nth-child(2){animation-delay:.2s}
#ifi-typing-inner span:nth-child(3){animation-delay:.4s}

#ifi-form{display:none;padding:14px 16px;background:#fff;border-top:1px solid #e9ecef;flex-shrink:0}
#ifi-form label{font-size:11px;font-weight:600;color:#8696a0;margin-bottom:3px;display:block;text-transform:uppercase;letter-spacing:.5px}
#ifi-form input{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font:400 14px/1.4 'Inter',sans-serif;margin-bottom:8px;box-sizing:border-box;transition:all .2s;outline:none;background:#fafbfc}
#ifi-form input:focus{border-color:${C};background:#fff;box-shadow:0 0 0 3px ${C}15}
#ifi-form-btn{width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,${C},${C}cc);color:#fff;font:600 14px 'Inter',sans-serif;cursor:pointer;transition:all .25s;box-shadow:0 4px 14px ${C}33}
#ifi-form-btn:hover{box-shadow:0 6px 22px ${C}55;transform:translateY(-1px)}
#ifi-form-btn:active{transform:translateY(0);box-shadow:0 2px 8px ${C}33}
#ifi-form-err{color:#EF4444;font-size:11px;margin-top:-4px;margin-bottom:6px;display:none}

#ifi-bar{display:none;padding:8px 10px;background:#f0f2f5;border-top:1px solid #e2e5e9;flex-shrink:0}
#ifi-bar form{display:flex;gap:6px;align-items:center}
.ifi-bar-btn{width:36px;height:36px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;background:none;color:#667781}
.ifi-bar-btn:hover{background:rgba(0,0,0,.06)}
#ifi-bar input[type=text]{flex:1;padding:9px 14px;border:none;border-radius:22px;font:400 14px/1.4 'Inter',sans-serif;outline:none;background:#fff;box-sizing:border-box}
#ifi-bar-send{width:38px;height:38px;border-radius:50%;border:none;background:${C};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s}
#ifi-bar-send:hover{transform:scale(1.08)}
#ifi-bar-send:active{transform:scale(.95)}
#ifi-bar-file{display:none}
#ifi-bar-rec{color:#667781}
#ifi-bar-rec.recording{color:#EF4444;animation:ifiRecPulse 1s infinite}

#ifi-emoji{display:none;position:absolute;bottom:56px;left:8px;right:8px;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.15);padding:10px;z-index:2;max-height:180px;overflow-y:auto}
#ifi-emoji span{font-size:22px;cursor:pointer;padding:4px;display:inline-block;border-radius:6px;transition:all .15s}
#ifi-emoji span:hover{background:#f0f2f5;transform:scale(1.2)}

#ifi-powered{text-align:center;padding:5px;background:#fff;font-size:10px;color:#b0b8c1;flex-shrink:0;border-top:1px solid #f0f0f0}
#ifi-powered a{color:#8696a0;text-decoration:none;font-weight:600}
#ifi-powered a:hover{color:${C}}

@keyframes ifiFabIn{from{transform:scale(0) rotate(-180deg)}to{transform:scale(1) rotate(0)}}
@keyframes ifiBounce{0%{transform:scale(.5)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes ifiPulse{0%,100%{opacity:1;box-shadow:0 0 6px #34D39988}50%{opacity:.5;box-shadow:0 0 2px #34D39944}}
@keyframes ifiMsgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes ifiType{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
@keyframes ifiRecPulse{0%,100%{opacity:1}50%{opacity:.4}}

@media(max-width:480px){
  #ifi-win{width:calc(100vw - 16px);max-width:calc(100vw - 16px);height:70vh;max-height:70vh;bottom:${parseInt(bot)+68}px;border-radius:16px}
}
`;
  var el=document.createElement("style");el.textContent=css;document.head.appendChild(el);
}

// ═══ EMOJIS ═══════════════════════════════
var EMOJIS=["😀","😂","🤣","😊","🥰","😍","😘","😉","🤗","🤔","😏","😎","🤩","🙄","😅","😬","👍","👎","❤️","🔥","🎉","💯","🙏","👋","✅","⭐","💬","📸","🎁","💰"];

// ═══ DOM ═══════════════════════════════════
function buildUI(){
  var fab=document.createElement("button");fab.id="ifi-fab";
  fab.innerHTML='<svg class="ico-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><svg class="ico-x" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span id="ifi-badge">0</span>';
  fab.onclick=toggle;document.body.appendChild(fab);

  var w=document.createElement("div");w.id="ifi-win";
  var biz=CFG.business_name||"Support";
  w.innerHTML=
'<div id="ifi-hdr">'+
'  <div id="ifi-hdr-av">'+(CFG.avatar_emoji||"💬")+'</div>'+
'  <div id="ifi-hdr-info"><div id="ifi-hdr-name">'+biz+'</div><div id="ifi-hdr-status"><span id="ifi-hdr-dot"></span>En ligne</div></div>'+
'  <button id="ifi-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'+
'</div>'+
'<div id="ifi-body">'+
'  <div class="ifi-welc">'+
'    <div class="ifi-welc-icon">👋</div>'+
'    <h4>'+biz+'</h4>'+
'    <p>'+(CFG.welcome_message||"Bonjour ! Comment pouvons-nous vous aider ?")+'</p>'+
'  </div>'+
'</div>'+
'<div id="ifi-typing"><div id="ifi-typing-inner"><span></span><span></span><span></span></div></div>'+
'<div id="ifi-form">'+
'  <label>Votre nom</label>'+
'  <input id="ifi-fn" placeholder="Ex: Adama Koné" required>'+
'  <label>WhatsApp / Téléphone</label>'+
'  <input id="ifi-wa" type="tel" inputmode="numeric" placeholder="229 XX XX XX XX" required>'+
'  <div id="ifi-form-err">Numéro invalide (minimum 8 chiffres)</div>'+
'  <button type="button" id="ifi-form-btn">Démarrer la conversation →</button>'+
'</div>'+
'<div id="ifi-bar" style="position:relative">'+
'  <div id="ifi-emoji"></div>'+
'  <form id="ifi-sf">'+
'    <button type="button" class="ifi-bar-btn" id="ifi-bar-emoji"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></button>'+
'    <button type="button" class="ifi-bar-btn" id="ifi-bar-attach"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>'+
'    <input type="text" id="ifi-si" placeholder="'+(CFG.placeholder_text||"Message...")+'" autocomplete="off">'+
'    <button type="button" class="ifi-bar-btn" id="ifi-bar-rec"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>'+
'    <button type="submit" id="ifi-bar-send"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'+
'    <input type="file" id="ifi-bar-file" accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar">'+
'  </form>'+
'</div>'+
'<div id="ifi-powered">⚡ Propulsé par <a href="https://chat.ifiaas.com" target="_blank">ifiChat</a></div>';
  document.body.appendChild(w);

  // Events
  document.getElementById("ifi-close").onclick=closeChat;
  document.getElementById("ifi-form-btn").onclick=startConv;
  document.getElementById("ifi-sf").onsubmit=sendMsg;
  document.getElementById("ifi-bar-attach").onclick=function(){document.getElementById("ifi-bar-file").click()};
  document.getElementById("ifi-bar-file").onchange=uploadFile;
  document.getElementById("ifi-bar-rec").onclick=toggleRecord;

  // WhatsApp: numbers only
  var waInput=document.getElementById("ifi-wa");
  waInput.addEventListener("input",function(e){e.target.value=e.target.value.replace(/[^0-9+]/g,"")});

  // Emoji picker
  var emojiWrap=document.getElementById("ifi-emoji");
  EMOJIS.forEach(function(em){
    var sp=document.createElement("span");sp.textContent=em;
    sp.onclick=function(){
      var si=document.getElementById("ifi-si");
      si.value+=em;si.focus();
      emojiWrap.style.display="none";
    };
    emojiWrap.appendChild(sp);
  });
  document.getElementById("ifi-bar-emoji").onclick=function(){
    var ep=document.getElementById("ifi-emoji");
    ep.style.display=ep.style.display==="block"?"none":"block";
  };
  // Close emoji on input focus
  document.getElementById("ifi-si").addEventListener("focus",function(){document.getElementById("ifi-emoji").style.display="none"});
}

// ═══ TOGGLE ═══════════════════════════════
function toggle(){OPEN?closeChat():openChat()}
function openChat(){
  OPEN=true;
  var w=document.getElementById("ifi-win");
  var f=document.getElementById("ifi-fab");
  w.style.display="flex";
  f.classList.add("open");
  requestAnimationFrame(function(){w.classList.add("show")});
  if(!CONV)document.getElementById("ifi-form").style.display="block";
  else startPolling();
  var b=document.getElementById("ifi-badge");b.style.display="none";b.textContent="0";
  scrollBottom();
}
function closeChat(){
  OPEN=false;
  var w=document.getElementById("ifi-win");
  var f=document.getElementById("ifi-fab");
  w.classList.remove("show");
  f.classList.remove("open");
  document.getElementById("ifi-emoji").style.display="none";
  setTimeout(function(){if(!OPEN)w.style.display="none"},400);
  stopPolling();
}
function scrollBottom(){
  var b=document.getElementById("ifi-body");
  if(b)setTimeout(function(){b.scrollTop=b.scrollHeight},60);
}

// ═══ TYPING INDICATOR ════════════════════
function showTyping(){
  var el=document.getElementById("ifi-typing");
  el.style.display="block";scrollBottom();
  setTimeout(function(){el.style.display="none"},3000);
}

// ═══ START CONVERSATION ═══════════════════
function startConv(){
  var fn=document.getElementById("ifi-fn").value.trim();
  var wa=document.getElementById("ifi-wa").value.trim().replace(/[^0-9+]/g,"");
  var errEl=document.getElementById("ifi-form-err");

  if(!fn){document.getElementById("ifi-fn").style.borderColor="#EF4444";setTimeout(function(){document.getElementById("ifi-fn").style.borderColor=""},2000);return}
  if(!wa||wa.replace(/[^0-9]/g,"").length<8){
    document.getElementById("ifi-wa").style.borderColor="#EF4444";
    errEl.style.display="block";
    setTimeout(function(){document.getElementById("ifi-wa").style.borderColor="";errEl.style.display="none"},3000);
    return;
  }

  var btn=document.getElementById("ifi-form-btn");
  btn.textContent="Connexion...";btn.disabled=true;btn.style.opacity=".7";

  fetch(API+"/start-conversation",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},
    body:JSON.stringify({fullName:fn,whatsapp:wa})
  }).then(function(r){return r.json()}).then(function(d){
    if(d.conversationId){
      CONV=d.conversationId;VID=d.visitorId;
      document.getElementById("ifi-form").style.display="none";
      document.getElementById("ifi-bar").style.display="block";
      document.querySelector(".ifi-welc").style.display="none";
      try{localStorage.setItem("ifi_"+CID,JSON.stringify({conv:CONV,vid:VID,fn:fn}))}catch(x){}
      // Fake typing then welcome
      showTyping();
      setTimeout(function(){
        document.getElementById("ifi-typing").style.display="none";
        addMsg({content:"Merci "+fn+" ! Comment puis-je vous aider ?",sender_type:"client",content_type:"text",created_at:new Date().toISOString(),id:"sys_welc"},true);
      },1500);
      startPolling();
      document.getElementById("ifi-si").focus();
    }
    btn.textContent="Démarrer la conversation →";btn.disabled=false;btn.style.opacity="1";
  }).catch(function(){btn.textContent="Démarrer la conversation →";btn.disabled=false;btn.style.opacity="1"});
}

// ═══ SEND MESSAGE ═════════════════════════
function sendMsg(e){
  e.preventDefault();
  var inp=document.getElementById("ifi-si");
  var txt=inp.value.trim();if(!txt||!CONV)return;
  inp.value="";
  document.getElementById("ifi-emoji").style.display="none";
  addMsg({content:txt,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"tmp_"+Date.now()});

  fetch(API+"/send-message",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},
    body:JSON.stringify({conversationId:CONV,visitorId:VID,content:txt,sender:"visitor"})
  }).catch(function(){});
}

// ═══ UPLOAD FILE ══════════════════════════
function uploadFile(){
  var fi=document.getElementById("ifi-bar-file");
  var file=fi.files[0];if(!file||!CONV)return;fi.value="";

  var isImg=file.type.startsWith("image/");
  var isAudio=file.type.startsWith("audio/");

  if(isImg){
    var reader=new FileReader();
    reader.onload=function(e){
      addMsg({content:"",sender_type:"visitor",content_type:"image",file_url:e.target.result,file_name:file.name,created_at:new Date().toISOString(),id:"tmp_"+Date.now()});
    };reader.readAsDataURL(file);
  } else if(isAudio){
    addMsg({content:"🎤 Audio",sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"tmp_"+Date.now()});
  } else {
    addMsg({content:"📎 "+file.name,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"tmp_"+Date.now()});
  }

  var fd=new FormData();fd.append("file",file);fd.append("conversationId",CONV);fd.append("visitorId",VID);
  fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(function(){});
}

// ═══ VOICE RECORDING ═════════════════════
function toggleRecord(){
  if(RECORDING){stopRecord();return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){return}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
    RECORDING=true;AUDIO_CHUNKS=[];
    var btn=document.getElementById("ifi-bar-rec");btn.classList.add("recording");
    RECORDER=new MediaRecorder(stream);
    RECORDER.ondataavailable=function(e){if(e.data.size>0)AUDIO_CHUNKS.push(e.data)};
    RECORDER.onstop=function(){
      stream.getTracks().forEach(function(t){t.stop()});
      var blob=new Blob(AUDIO_CHUNKS,{type:"audio/webm"});
      var file=new File([blob],"voice_"+Date.now()+".webm",{type:"audio/webm"});
      // Upload
      var fd=new FormData();fd.append("file",file);fd.append("conversationId",CONV);fd.append("visitorId",VID);
      addMsg({content:"🎤 Message vocal",sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"tmp_"+Date.now()});
      fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(function(){});
    };
    RECORDER.start();
    // Auto-stop after 60s
    setTimeout(function(){if(RECORDING)stopRecord()},60000);
  }).catch(function(){});
}
function stopRecord(){
  RECORDING=false;
  var btn=document.getElementById("ifi-bar-rec");btn.classList.remove("recording");
  if(RECORDER&&RECORDER.state!=="inactive")RECORDER.stop();
}

// ═══ ADD MESSAGE BUBBLE ═══════════════════
var lastDateStr="";
function addMsg(m,skipSound){
  MSGS.push(m);
  var box=document.getElementById("ifi-body");
  var isVis=m.sender_type==="visitor";

  // Date separator
  var dt=new Date(m.created_at);
  var dStr=dt.toLocaleDateString("fr-FR");
  if(dStr!==lastDateStr){
    lastDateStr=dStr;
    var today=new Date().toLocaleDateString("fr-FR");
    var yest=new Date(Date.now()-86400000).toLocaleDateString("fr-FR");
    var label=dStr===today?"Aujourd'hui":dStr===yest?"Hier":dt.toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
    var dayDiv=document.createElement("div");dayDiv.className="ifi-day";
    dayDiv.innerHTML="<span>"+label+"</span>";box.appendChild(dayDiv);
  }

  var row=document.createElement("div");
  row.className="ifi-row "+(isVis?"vis":"cli");

  var bub=document.createElement("div");
  bub.className="ifi-bub";

  // Detect links in text
  var content=m.content||"";
  var urlRegex=/(https?:\/\/[^\s<]+)/g;

  if(m.content_type==="image"&&m.file_url){
    var img=document.createElement("img");
    img.src=m.file_url;img.alt="Photo";img.loading="lazy";
    img.style.maxHeight="200px";img.style.objectFit="cover";
    img.onclick=function(){window.open(m.file_url,"_blank")};
    bub.appendChild(img);
    if(content){var ct=document.createElement("div");ct.textContent=content;bub.appendChild(ct)}
  } else if(m.content_type==="file"&&m.file_url){
    if(m.file_mime_type&&m.file_mime_type.startsWith("audio/")){
      var aud=document.createElement("audio");aud.controls=true;aud.src=m.file_url;aud.preload="metadata";
      bub.appendChild(aud);
    } else {
      var a=document.createElement("a");a.href=m.file_url;a.target="_blank";
      a.style.cssText="display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit;padding:4px 0";
      a.innerHTML='<span style="font-size:20px">📎</span><span style="font-size:13px;font-weight:500">'+(m.file_name||"Fichier")+'</span>';
      bub.appendChild(a);
    }
  } else if(content){
    // Text with link detection
    if(urlRegex.test(content)){
      var parts=content.split(urlRegex);
      parts.forEach(function(p){
        if(p.match(urlRegex)){
          var lnk=document.createElement("a");lnk.href=p;lnk.target="_blank";lnk.textContent=p;
          lnk.style.cssText="color:#1a73e8;word-break:break-all";
          bub.appendChild(lnk);
        } else if(p){
          bub.appendChild(document.createTextNode(p));
        }
      });
    } else {
      bub.appendChild(document.createTextNode(content));
    }
  }

  // Time + read receipt
  var tm=document.createElement("div");tm.className="ifi-time";
  var h=dt.getHours().toString().padStart(2,"0");
  var mn=dt.getMinutes().toString().padStart(2,"0");
  tm.innerHTML=h+":"+mn+(isVis?' <svg class="ifi-read" width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M11.07.94L4.5 7.5 1.93 4.94" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.07.94L7.5 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>':"");
  bub.appendChild(tm);

  row.appendChild(bub);box.appendChild(row);scrollBottom();

  // Sound for incoming client messages
  if(!isVis&&!skipSound&&m.id&&!m.id.startsWith("sys_")){
    playNotifSound();
  }
}

// ═══ POLLING ══════════════════════════════
function startPolling(){
  if(POLL||!CONV)return;ERR=0;
  pollNow();
  POLL=setInterval(function(){
    if(!OPEN||ERR>5){stopPolling();return}
    pollNow();
  },3000);
}
function stopPolling(){if(POLL){clearInterval(POLL);POLL=null}}

function pollNow(){
  fetch(API+"/messages/"+CONV).then(function(r){
    if(!r.ok){ERR++;return null}ERR=0;return r.json();
  }).then(function(d){
    if(!d||!d.messages)return;
    var newClient=0;
    d.messages.forEach(function(m){
      if(!MSGS.some(function(e){return e.id===m.id})){
        if(m.sender_type==="visitor"){
          var hasTmp=MSGS.some(function(e){return e.id&&e.id.toString().startsWith("tmp_")&&e.content===m.content});
          if(hasTmp)return;
        }
        addMsg(m);
        if(m.sender_type==="client")newClient++;
      }
    });
    if(!OPEN&&newClient>0){
      var b=document.getElementById("ifi-badge");
      var c=parseInt(b.textContent||"0")+newClient;
      b.textContent=String(c);b.style.display="block";
      playNotifSound();
    }
  }).catch(function(){ERR++});
}

// ═══ RESTORE SESSION ═════════════════════
function restoreSession(){
  try{
    var saved=JSON.parse(localStorage.getItem("ifi_"+CID));
    if(saved&&saved.conv){
      CONV=saved.conv;VID=saved.vid;
      document.getElementById("ifi-form").style.display="none";
      document.getElementById("ifi-bar").style.display="block";
      document.querySelector(".ifi-welc").style.display="none";
      fetch(API+"/messages/"+CONV).then(function(r){
        if(!r.ok)return null;return r.json();
      }).then(function(d){
        if(!d||!d.messages)return;
        d.messages.forEach(function(m){addMsg(m,true)});
      }).catch(function(){});
    }
  }catch(x){}
}

// ═══ INIT ═════════════════════════════════
loadConfig(function(){injectCSS();buildUI();restoreSession()});
})();
