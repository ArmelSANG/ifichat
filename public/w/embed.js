// ============================================
// ifiChat — Premium Widget v5
// ============================================
(function(){
"use strict";
var s=document.currentScript;if(!s)return;
var m=(s.getAttribute("src")||"").match(/\/w\/([^.]+)\.js/);if(!m)return;
var CID=m[1],API="https://twtbdwxixrlspbzqmpva.supabase.co/functions/v1/widget-api";
var CFG={},CONV=null,VID=null,MSGS=[],OPEN=false,POLL=null,BGPOLL=null,ERR=0;
var REC=false,RECR=null,CHUNKS=[];
function $(id){return document.getElementById(id)}
function loadCfg(cb){fetch(API+"/config/"+CID).then(r=>r.json()).then(d=>{if(d.config){CFG=d.config;cb()}}).catch(()=>{})}

function snd(){try{var a=new(window.AudioContext||window.webkitAudioContext)();[[880,0,.3,.12],[1100,.14,.25,.09]].forEach(([f,s,d,v])=>{var o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(v,a.currentTime+s);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+s+d);o.start(a.currentTime+s);o.stop(a.currentTime+s+d)})}catch(e){}}

// ═══ CSS ═══════════════════════════════════
function css(){
var C=CFG.primary_color||"#0D9488",pos=CFG.position||"bottom-right",bot=parseInt(CFG.bottom_offset)||20,sd=parseInt(CFG.side_offset)||20,L=pos==="bottom-left";
var st=document.createElement("style");
st.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
#ifi-z,#ifi-z *{box-sizing:border-box;margin:0;padding:0}
#ifi-z{font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.4;-webkit-font-smoothing:antialiased}

/* ── FAB ── */
.ifi-fab{position:fixed;bottom:${bot}px;${L?'left':'right'}:${sd}px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,${C},${adjust(C,-.12)});border:none;cursor:pointer;box-shadow:0 4px 15px ${C}40,0 2px 4px rgba(0,0,0,.1);z-index:99998;display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.4,0,.2,1);animation:_fabIn .6s cubic-bezier(.34,1.56,.64,1)}
.ifi-fab:hover{transform:scale(1.08);box-shadow:0 6px 25px ${C}55}
.ifi-fab:after{content:'';position:absolute;inset:-5px;border-radius:50%;border:2px solid ${C}30;animation:_pulse 2.5s ease infinite;pointer-events:none}
.ifi-fab.on:after{display:none}
.ifi-fab svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;position:absolute;transition:all .3s cubic-bezier(.4,0,.2,1)}
.ifi-fab .f1{opacity:1;transform:scale(1) rotate(0)}.ifi-fab .f2{opacity:0;transform:scale(.5) rotate(-90deg)}
.ifi-fab.on .f1{opacity:0;transform:scale(.5) rotate(90deg)}.ifi-fab.on .f2{opacity:1;transform:scale(1) rotate(0)}
.ifi-bdg{position:absolute;top:-5px;right:-5px;min-width:22px;height:22px;border-radius:11px;background:#EF4444;color:#fff;font:700 11px/22px 'Inter';text-align:center;padding:0 6px;display:none;box-shadow:0 2px 8px rgba(239,68,68,.5);animation:_bdgIn .3s cubic-bezier(.34,1.56,.64,1);border:2px solid #fff}

/* ── WINDOW ── */
.ifi-w{position:fixed;bottom:${bot+70}px;${L?'left':'right'}:${sd}px;width:375px;height:550px;border-radius:16px;overflow:hidden;z-index:99999;display:none;flex-direction:column;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.04);transform:translateY(16px) scale(.96);opacity:0;transition:transform .3s cubic-bezier(.34,1.1,.64,1),opacity .25s ease}
.ifi-w.on{transform:translateY(0) scale(1);opacity:1}

/* ── HEADER ── */
.ifi-hd{background:linear-gradient(135deg,${C},${adjust(C,-.15)});color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative;overflow:hidden}
.ifi-hd:before{content:'';position:absolute;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.05);top:-60%;right:-15%}
.ifi-av{width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:2px solid rgba(255,255,255,.2);backdrop-filter:blur(4px)}
.ifi-av img{width:100%;height:100%;object-fit:cover;border-radius:50%}.ifi-av span{font-size:18px}
.ifi-hi{flex:1;min-width:0}.ifi-nm{font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ifi-st{font-size:11px;opacity:.85;display:flex;align-items:center;gap:5px;margin-top:1px}
.ifi-dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 6px #4ade80aa;animation:_glow 2s ease infinite}
.ifi-xb{background:rgba(255,255,255,.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;backdrop-filter:blur(4px);transition:background .2s}
.ifi-xb:hover{background:rgba(255,255,255,.3)}

/* ── BODY ── */
.ifi-bd{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 10px;display:flex;flex-direction:column;gap:1px;background:#e5ddd5;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cdefs%3E%3Cpattern id='p' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M20 2a2 2 0 100 4 2 2 0 000-4zm-8 8a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm18 4a1 1 0 100 2 1 1 0 000-2zm-12 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm22 2a2 2 0 100 4 2 2 0 000-4zM8 32a1 1 0 100 2 1 1 0 000-2z' fill='%23d1c7b7' fill-opacity='.2'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='200' height='200' fill='url(%23p)'/%3E%3C/svg%3E")}
.ifi-bd::-webkit-scrollbar{width:4px}.ifi-bd::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:4px}

/* ── DATE SEP ── */
.ifi-ds{text-align:center;margin:8px 0 6px}
.ifi-ds span{background:rgba(225,218,208,.9);padding:4px 14px;border-radius:8px;font-size:11px;color:#54656f;font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,.06)}

/* ── MESSAGES ── */
.ifi-mr{display:flex;margin-bottom:2px;animation:_msgIn .25s ease both}
.ifi-mr.v{justify-content:flex-end;padding-left:30px}.ifi-mr.c{justify-content:flex-start;padding-right:30px}
.ifi-mb{max-width:85%;padding:6px 8px 2px;border-radius:8px;font-size:13.5px;line-height:1.45;word-wrap:break-word;position:relative;box-shadow:0 1px 1px rgba(0,0,0,.08)}
.ifi-mr.v .ifi-mb{background:#d9fdd3;border-top-right-radius:0}
.ifi-mr.c .ifi-mb{background:#fff;border-top-left-radius:0}
.ifi-mr.v .ifi-mb:before{content:'';position:absolute;top:0;right:-6px;border:6px solid transparent;border-top-color:#d9fdd3;border-left-color:#d9fdd3}
.ifi-mr.c .ifi-mb:before{content:'';position:absolute;top:0;left:-6px;border:6px solid transparent;border-top-color:#fff;border-right-color:#fff}

/* Content */
.ifi-mb img{max-width:100%;border-radius:6px;margin-bottom:3px;cursor:pointer;display:block;max-height:200px;object-fit:cover}
.ifi-mb audio{width:100%;height:36px;margin:3px 0;border-radius:18px}
.ifi-mb a{color:#027eb5;word-break:break-all;text-decoration:none}
.ifi-mb a:hover{text-decoration:underline}
.ifi-fl{display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(0,0,0,.04);border-radius:6px;margin-bottom:3px;text-decoration:none;color:inherit}
.ifi-fl-icon{width:32px;height:32px;border-radius:8px;background:${C}18;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.ifi-fl-info{font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ifi-fl-sz{font-size:10px;color:#8696a0;font-weight:400}

/* Time + check */
.ifi-tm{font-size:10px;color:#667781;display:flex;align-items:center;justify-content:flex-end;gap:3px;margin-top:2px;float:right;margin-left:8px;position:relative;bottom:-3px}
.ifi-mr.v .ifi-tm .ck{color:#53bdeb}

/* ── WELCOME ── */
.ifi-wl{text-align:center;padding:28px 18px;color:#667781}
.ifi-wl-ic{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,${C}20,${C}10);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;overflow:hidden;border:2px solid ${C}15}
.ifi-wl-ic img{width:100%;height:100%;object-fit:cover;border-radius:50%}.ifi-wl-ic span{font-size:26px}
.ifi-wl h4{font-size:16px;color:#111b21;margin:0 0 6px;font-weight:700}
.ifi-wl p{font-size:13px;line-height:1.6;margin:0;color:#667781}

/* ── TYPING ── */
.ifi-tp{display:none;padding:2px 10px}
.ifi-tpb{background:#fff;display:inline-flex;gap:4px;padding:10px 16px;border-radius:8px;border-top-left-radius:0;box-shadow:0 1px 1px rgba(0,0,0,.06);position:relative}
.ifi-tpb:before{content:'';position:absolute;top:0;left:-6px;border:6px solid transparent;border-top-color:#fff;border-right-color:#fff}
.ifi-tpb i{width:6px;height:6px;border-radius:50%;background:#8696a0;display:block;animation:_tp 1.4s infinite}
.ifi-tpb i:nth-child(2){animation-delay:.2s}.ifi-tpb i:nth-child(3){animation-delay:.4s}

/* ── FORM ── */
.ifi-fm{display:none;padding:16px;background:#fff;border-top:1px solid #e9ecef;flex-shrink:0}
.ifi-fm label{font-size:11px;font-weight:600;color:#8696a0;margin-bottom:4px;display:block;text-transform:uppercase;letter-spacing:.5px}
.ifi-fm input{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font:400 14px/1.4 'Inter';margin-bottom:10px;outline:none;background:#fff;transition:all .2s}
.ifi-fm input:focus{border-color:${C};box-shadow:0 0 0 3px ${C}12}
.ifi-fm-e{color:#dc3545;font-size:10px;margin:-6px 0 6px;display:none}
.ifi-fm-btn{width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,${C},${adjust(C,-.12)});color:#fff;font:600 14px 'Inter';cursor:pointer;transition:all .2s;box-shadow:0 2px 8px ${C}30}
.ifi-fm-btn:hover{box-shadow:0 4px 16px ${C}40;transform:translateY(-1px)}.ifi-fm-btn:active{transform:translateY(0)}

/* ── INPUT BAR ── */
.ifi-br{display:none;padding:6px 8px;background:#f0f2f5;flex-shrink:0;position:relative}
.ifi-sf{display:flex;gap:4px;align-items:flex-end}
.ifi-ib{width:34px;height:34px;min-width:34px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:#54656f;flex-shrink:0;padding:0;transition:all .15s}
.ifi-ib:hover{background:rgba(0,0,0,.06)}
.ifi-ib svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
.ifi-in{flex:1;min-width:0;padding:8px 12px;border:none;border-radius:22px;font:400 14px/1.4 'Inter';outline:none;background:#fff;resize:none;max-height:100px;overflow-y:auto}
.ifi-sb{width:36px;height:36px;min-width:36px;border-radius:50%;border:none;background:${C};color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;transition:all .2s;box-shadow:0 1px 3px ${C}40}
.ifi-sb:hover{background:${adjust(C,-.08)};box-shadow:0 2px 8px ${C}50}
.ifi-sb svg{width:18px;height:18px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ifi-rc-on{color:#ef4444!important;animation:_recPls 1s infinite}
.ifi-fh{display:none}

/* ── EMOJI ── */
.ifi-ep{display:none;position:absolute;bottom:50px;left:6px;right:6px;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.15);padding:8px;z-index:5;max-height:170px;overflow-y:auto;scrollbar-width:thin}
.ifi-ep span{font-size:22px;cursor:pointer;padding:3px 4px;display:inline-block;border-radius:6px;transition:transform .15s,background .15s;line-height:1}
.ifi-ep span:hover{background:#f0f2f5;transform:scale(1.2)}

/* ── FOOTER ── */
.ifi-ft{text-align:center;padding:4px;background:#fff;border-top:1px solid #f0f0f0;flex-shrink:0}
.ifi-ft a{font-size:10px;color:#8696a0;text-decoration:none;font-weight:600;letter-spacing:.3px}
.ifi-ft a:hover{color:${C}}

/* ── ANIMATIONS ── */
@keyframes _fabIn{from{transform:scale(0) rotate(-180deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}
@keyframes _pulse{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.6);opacity:0}}
@keyframes _bdgIn{0%{transform:scale(.3)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes _glow{0%,100%{opacity:1;box-shadow:0 0 6px #4ade80aa}50%{opacity:.6;box-shadow:0 0 2px #4ade8044}}
@keyframes _msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes _tp{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
@keyframes _recPls{0%,100%{opacity:1}50%{opacity:.3}}

/* ── MOBILE ── */
@media(max-width:480px){
  .ifi-w{width:calc(100vw - 16px);${L?'left:8px':'right:8px'};height:65vh;max-height:65vh;bottom:${bot+66}px;border-radius:14px}
  .ifi-ib.hm{display:none}
  .ifi-in{font-size:13px;padding:7px 10px}
  .ifi-sb{width:34px;height:34px;min-width:34px}
}
@media(min-width:481px){
  .ifi-w{max-height:calc(100vh - ${bot+85}px)}
}
`;
document.head.appendChild(st);
}

function adjust(hex,amt){
  var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  r=Math.max(0,Math.min(255,r+Math.round(255*amt)));
  g=Math.max(0,Math.min(255,g+Math.round(255*amt)));
  b=Math.max(0,Math.min(255,b+Math.round(255*amt)));
  return"#"+[r,g,b].map(c=>c.toString(16).padStart(2,"0")).join("");
}

// ═══ EMOJIS ═══════════════════════════════
var EMS=["😀","😂","🤣","😊","🥰","😍","😘","😉","🤗","🤔","😎","🤩","😅","👍","👎","❤️","🔥","🎉","💯","🙏","👋","✅","⭐","💰","👏","😢","🥺","😭","🤝","💪"];

// ═══ BUILD ════════════════════════════════
function build(){
  var root=document.createElement("div");root.id="ifi-z";
  var logo=CFG.logo_url||"",biz=CFG.business_name||"Support";
  var avH=logo?'<img src="'+logo+'" alt="">':'<span>'+(CFG.avatar_emoji||"💬")+'</span>';

  // FAB
  root.innerHTML=
  '<button class="ifi-fab" id="ifi-fab">'+
    '<svg class="f1" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'+
    '<svg class="f2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'+
    '<span class="ifi-bdg" id="ifi-bdg">0</span>'+
  '</button>'+
  '<div class="ifi-w" id="ifi-w">'+
    '<div class="ifi-hd">'+
      '<div class="ifi-av">'+avH+'</div>'+
      '<div class="ifi-hi"><div class="ifi-nm">'+biz+'</div><div class="ifi-st"><span class="ifi-dot"></span> En ligne</div></div>'+
      '<button class="ifi-xb" id="ifi-xb"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>'+
    '</div>'+
    '<div class="ifi-bd" id="ifi-bd">'+
      '<div class="ifi-wl">'+
        '<div class="ifi-wl-ic">'+avH+'</div>'+
        '<h4>'+biz+'</h4>'+
        '<p>'+(CFG.welcome_message||"Bonjour ! Comment pouvons-nous vous aider ?")+'</p>'+
      '</div>'+
    '</div>'+
    '<div class="ifi-tp" id="ifi-tp"><div class="ifi-tpb"><i></i><i></i><i></i></div></div>'+
    '<div class="ifi-fm" id="ifi-fm">'+
      '<label>Votre nom</label><input id="ifi-fn" placeholder="Ex: Adama Koné">'+
      '<label>Téléphone / WhatsApp</label><input id="ifi-wa" type="tel" inputmode="numeric" placeholder="229 XX XX XX XX">'+
      '<div class="ifi-fm-e" id="ifi-fe">Numéro invalide (min 8 chiffres)</div>'+
      '<button class="ifi-fm-btn" id="ifi-fb">Démarrer la conversation</button>'+
    '</div>'+
    '<div class="ifi-br" id="ifi-br">'+
      '<div class="ifi-ep" id="ifi-ep"></div>'+
      '<form class="ifi-sf" id="ifi-sf">'+
        '<button type="button" class="ifi-ib" id="ifi-emb"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></button>'+
        '<button type="button" class="ifi-ib" id="ifi-at"><svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>'+
        '<input type="text" class="ifi-in" id="ifi-in" placeholder="'+(CFG.placeholder_text||"Écrivez un message…")+'" autocomplete="off">'+
        '<button type="button" class="ifi-ib hm" id="ifi-mic"><svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></button>'+
        '<button type="submit" class="ifi-sb" id="ifi-sn"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'+
        '<input type="file" class="ifi-fh" id="ifi-fh" accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx">'+
      '</form>'+
    '</div>'+
    '<div class="ifi-ft"><a href="https://chat.ifiaas.com" target="_blank">⚡ ifiChat</a></div>'+
  '</div>';
  document.body.appendChild(root);

  // Events
  $("ifi-fab").onclick=toggle;
  $("ifi-xb").onclick=close;
  $("ifi-fb").onclick=startConv;
  $("ifi-sf").onsubmit=sendMsg;
  $("ifi-at").onclick=()=>$("ifi-fh").click();
  $("ifi-fh").onchange=uploadFile;
  $("ifi-mic").onclick=toggleRec;
  $("ifi-wa").oninput=e=>{e.target.value=e.target.value.replace(/[^0-9+\s]/g,"")};

  // Emoji
  var ep=$("ifi-ep");
  EMS.forEach(e=>{var s=document.createElement("span");s.textContent=e;s.onclick=()=>{$("ifi-in").value+=e;$("ifi-in").focus();ep.style.display="none"};ep.appendChild(s)});
  $("ifi-emb").onclick=()=>{ep.style.display=ep.style.display==="block"?"none":"block"};
  $("ifi-in").onfocus=()=>{ep.style.display="none"};
}

// ═══ TOGGLE ═══════════════════════════════
function toggle(){OPEN?close():open()}
function open(){
  OPEN=true;stopBg();$("ifi-w").style.display="flex";$("ifi-fab").classList.add("on");
  requestAnimationFrame(()=>$("ifi-w").classList.add("on"));
  if(!CONV)$("ifi-fm").style.display="block";
  else{refetch();startPoll()}
  $("ifi-bdg").style.display="none";$("ifi-bdg").textContent="0";scrl();
}
function close(){
  OPEN=false;$("ifi-w").classList.remove("on");$("ifi-fab").classList.remove("on");
  try{$("ifi-ep").style.display="none"}catch(e){}
  setTimeout(()=>{if(!OPEN)$("ifi-w").style.display="none"},300);
  stopPoll();if(CONV)startBg();
}
function scrl(){var b=$("ifi-bd");if(b)setTimeout(()=>{b.scrollTop=b.scrollHeight},60)}

function refetch(){
  fetch(API+"/messages/"+CONV).then(r=>r.ok?r.json():null).then(d=>{
    if(!d||!d.messages)return;var added=false;
    d.messages.forEach(m=>{
      if(!MSGS.some(e=>e.id===m.id)){
        if(m.sender_type==="visitor"&&MSGS.some(e=>String(e.id).startsWith("t_")&&e.content===m.content))return;
        addMsg(m,true);added=true;
      }
    });
    if(added)scrl();
  }).catch(()=>{});
}

// ═══ START ════════════════════════════════
function startConv(){
  var fn=$("ifi-fn").value.trim(),wa=$("ifi-wa").value.trim().replace(/[^0-9+]/g,"");
  if(!fn){$("ifi-fn").style.borderColor="#ef4444";setTimeout(()=>$("ifi-fn").style.borderColor="",2000);return}
  if(!wa||wa.replace(/\D/g,"").length<8){
    $("ifi-wa").style.borderColor="#ef4444";$("ifi-fe").style.display="block";
    setTimeout(()=>{$("ifi-wa").style.borderColor="";$("ifi-fe").style.display="none"},3000);return;
  }
  var btn=$("ifi-fb");btn.textContent="Connexion…";btn.disabled=true;
  fetch(API+"/start-conversation",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},body:JSON.stringify({fullName:fn,whatsapp:wa})}).then(r=>r.json()).then(d=>{
    if(d.conversationId){
      CONV=d.conversationId;VID=d.visitorId;
      $("ifi-fm").style.display="none";$("ifi-br").style.display="block";
      var wl=document.querySelector(".ifi-wl");if(wl)wl.style.display="none";
      try{localStorage.setItem("ifi_"+CID,JSON.stringify({c:CONV,v:VID,n:fn}))}catch(x){}
      // Typing animation
      $("ifi-tp").style.display="block";scrl();
      setTimeout(()=>{$("ifi-tp").style.display="none";addMsg({content:"Bonjour "+fn+" ! 👋 Comment puis-je vous aider ?",sender_type:"client",content_type:"text",created_at:new Date().toISOString(),id:"sys"},true)},1500);
      startPoll();$("ifi-in").focus();
    }
    btn.textContent="Démarrer la conversation";btn.disabled=false;
  }).catch(()=>{btn.textContent="Démarrer la conversation";btn.disabled=false});
}

// ═══ SEND ═════════════════════════════════
function sendMsg(e){
  e.preventDefault();var inp=$("ifi-in"),t=inp.value.trim();if(!t||!CONV)return;
  inp.value="";$("ifi-ep").style.display="none";
  addMsg({content:t,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"t_"+Date.now()});
  fetch(API+"/send-message",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},body:JSON.stringify({conversationId:CONV,visitorId:VID,content:t,sender:"visitor"})}).catch(()=>{});
}

// ═══ UPLOAD ═══════════════════════════════
// ═══ COMPRESS IMAGE ═══════════════════════
function compressImg(file,maxW,maxH,quality){
  return new Promise(function(resolve){
    if(!file.type.startsWith("image/")||file.type==="image/gif"){resolve(file);return}
    var img=new Image();img.onload=function(){
      var w=img.width,h=img.height;
      if(w>maxW){h=Math.round(h*(maxW/w));w=maxW}
      if(h>maxH){w=Math.round(w*(maxH/h));h=maxH}
      var cv=document.createElement("canvas");cv.width=w;cv.height=h;
      cv.getContext("2d").drawImage(img,0,0,w,h);
      cv.toBlob(function(blob){
        if(blob&&blob.size<file.size){
          resolve(new File([blob],file.name.replace(/\.[^.]+$/,".jpg"),{type:"image/jpeg"}));
        }else{resolve(file)}
      },"image/jpeg",quality);
    };
    img.onerror=function(){resolve(file)};
    img.src=URL.createObjectURL(file);
  });
}

function uploadFile(){
  var fi=$("ifi-fh"),f=fi.files[0];if(!f||!CONV)return;fi.value="";
  var isI=f.type.startsWith("image/"),isA=f.type.startsWith("audio/"),tid="t_"+Date.now();
  if(isI){var rd=new FileReader();rd.onload=ev=>addMsg({content:"",sender_type:"visitor",content_type:"image",file_url:ev.target.result,created_at:new Date().toISOString(),id:tid},true);rd.readAsDataURL(f)}
  else addMsg({content:isA?"🎤 Envoi…":"📎 "+f.name,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:tid},true);

  // Compress images before upload (1200px max, quality 0.7)
  var ready=isI?compressImg(f,1200,1200,0.7):Promise.resolve(f);
  ready.then(function(compressed){
    var fd=new FormData();fd.append("file",compressed);fd.append("conversationId",CONV);fd.append("visitorId",VID);
    fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(()=>{});
  });
}

// ═══ VOICE ════════════════════════════════
function toggleRec(){
  if(REC){stopRec();return}
  if(!navigator.mediaDevices)return;
  navigator.mediaDevices.getUserMedia({audio:true}).then(st=>{
    REC=true;CHUNKS=[];$("ifi-mic").classList.add("ifi-rc-on");
    RECR=new MediaRecorder(st);
    RECR.ondataavailable=e=>{if(e.data.size>0)CHUNKS.push(e.data)};
    RECR.onstop=()=>{
      st.getTracks().forEach(t=>t.stop());
      var blob=new Blob(CHUNKS,{type:"audio/webm"});
      var f=new File([blob],"voice_"+Date.now()+".webm",{type:"audio/webm"});
      var fd=new FormData();fd.append("file",f);fd.append("conversationId",CONV);fd.append("visitorId",VID);
      addMsg({content:"🎤 Vocal",sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"t_"+Date.now()},true);
      fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(()=>{});
    };
    RECR.start();setTimeout(()=>{if(REC)stopRec()},60000);
  }).catch(()=>{});
}
function stopRec(){REC=false;$("ifi-mic").classList.remove("ifi-rc-on");if(RECR&&RECR.state!=="inactive")RECR.stop()}

// ═══ ADD MESSAGE ═════════════════════════
var lastD="",lastS="";
function addMsg(m,noSnd){
  MSGS.push(m);var box=$("ifi-bd"),isV=m.sender_type==="visitor";
  var dt=new Date(m.created_at),ds=dt.toLocaleDateString("fr-FR");

  // Date separator
  if(ds!==lastD){
    lastD=ds;var now=new Date().toLocaleDateString("fr-FR"),y=new Date(Date.now()-864e5).toLocaleDateString("fr-FR");
    var lbl=ds===now?"Aujourd'hui":ds===y?"Hier":dt.toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
    var dd=document.createElement("div");dd.className="ifi-ds";dd.innerHTML="<span>"+lbl+"</span>";box.appendChild(dd);
  }

  var row=document.createElement("div");row.className="ifi-mr "+(isV?"v":"c");
  // Only show tail on first message of a group
  var side=isV?"v":"c";
  if(side===lastS){row.querySelector&&(row.style.marginTop="-1px");
    // Remove tail
    row.classList.add("nt");
  }
  lastS=side;

  var bub=document.createElement("div");bub.className="ifi-mb";
  var c=m.content||"";

  // Render content
  if(m.content_type==="image"&&m.file_url){
    var img=document.createElement("img");img.src=m.file_url;img.loading="lazy";
    img.onclick=()=>window.open(m.file_url,"_blank");bub.appendChild(img);
    if(c){var ct=document.createElement("div");ct.style.cssText="font-size:12px;margin-top:2px";ct.textContent=c;bub.appendChild(ct)}
  }
  else if(m.content_type==="file"&&m.file_url){
    var mime=m.file_mime_type||"";
    if(mime.startsWith("audio/")){
      var au=document.createElement("audio");au.controls=true;au.src=m.file_url;au.preload="metadata";bub.appendChild(au);
    }else{
      var a=document.createElement("a");a.href=m.file_url;a.target="_blank";a.className="ifi-fl";
      a.innerHTML='<div class="ifi-fl-icon">📄</div><div><div class="ifi-fl-info">'+(m.file_name||"Fichier")+'</div>'+(m.file_size?'<div class="ifi-fl-sz">'+Math.round(m.file_size/1024)+' KB</div>':'')+'</div>';
      bub.appendChild(a);
    }
  }
  else if(c){
    var ur=/(https?:\/\/[^\s]+)/g;
    if(ur.test(c)){c.split(ur).forEach(p=>{
      if(p.match(/^https?:\/\//)){var l=document.createElement("a");l.href=p;l.target="_blank";l.textContent=p.length>40?p.slice(0,40)+"…":p;bub.appendChild(l)}
      else if(p)bub.appendChild(document.createTextNode(p))
    })}else bub.appendChild(document.createTextNode(c))
  }

  // Timestamp + read receipt
  var tm=document.createElement("span");tm.className="ifi-tm";
  var h=dt.getHours().toString().padStart(2,"0"),mn=dt.getMinutes().toString().padStart(2,"0");
  tm.innerHTML=h+":"+mn+(isV?' <span class="ck"><svg width="16" height="11" viewBox="0 0 16 11" fill="none"><path d="M11 1L4.5 7.5 2 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M14 1L7.5 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>':"");
  bub.appendChild(tm);

  row.appendChild(bub);box.appendChild(row);scrl();
  if(!isV&&!noSnd&&m.id!=="sys")snd();
}

// ═══ POLLING ══════════════════════════════
function startPoll(){if(POLL||!CONV)return;ERR=0;pollNow();POLL=setInterval(()=>{if(ERR>5){stopPoll();return}pollNow()},3000)}
function stopPoll(){if(POLL){clearInterval(POLL);POLL=null}}
function pollNow(){
  fetch(API+"/messages/"+CONV).then(r=>r.ok?(ERR=0,r.json()):(ERR++,null)).then(d=>{
    if(!d||!d.messages)return;var nc=0;
    d.messages.forEach(m=>{
      if(!MSGS.some(e=>e.id===m.id)){
        if(m.sender_type==="visitor"){var i=MSGS.findIndex(e=>String(e.id).startsWith("t_")&&(e.content===m.content||(m.file_url&&e.file_url)));if(i>-1){MSGS.splice(i,1);return}}
        addMsg(m);if(m.sender_type==="client")nc++;
      }
    });
    if(!OPEN&&nc>0){var b=$("ifi-bdg");b.textContent=String(parseInt(b.textContent||"0")+nc);b.style.display="block";snd()}
  }).catch(()=>ERR++);
}

// Background poll
function startBg(){if(BGPOLL||!CONV)return;BGPOLL=setInterval(()=>{
  if(OPEN){stopBg();return}
  fetch(API+"/messages/"+CONV).then(r=>r.ok?r.json():null).then(d=>{
    if(!d||!d.messages)return;var nc=0;
    d.messages.forEach(m=>{if(!MSGS.some(e=>e.id===m.id)){MSGS.push(m);if(m.sender_type==="client")nc++}});
    if(nc>0){var b=$("ifi-bdg");b.textContent=String(parseInt(b.textContent||"0")+nc);b.style.display="block";snd()}
  }).catch(()=>{});
},8000)}
function stopBg(){if(BGPOLL){clearInterval(BGPOLL);BGPOLL=null}}

// ═══ RESTORE ═════════════════════════════
function restore(){
  try{
    var sv=JSON.parse(localStorage.getItem("ifi_"+CID));
    if(sv&&sv.c){
      CONV=sv.c;VID=sv.v;
      $("ifi-fm").style.display="none";$("ifi-br").style.display="block";
      var wl=document.querySelector(".ifi-wl");if(wl)wl.style.display="none";
      fetch(API+"/messages/"+CONV).then(r=>r.ok?r.json():null).then(d=>{
        if(d&&d.messages)d.messages.forEach(m=>addMsg(m,true));startBg();
      }).catch(()=>{});
    }
  }catch(x){}
}

// ═══ INIT ═════════════════════════════════
loadCfg(()=>{css();build();restore()});
})();
