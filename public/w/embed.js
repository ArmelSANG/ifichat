// ============================================
// ifiChat — Premium Widget v6 (WhatsApp quality)
// ============================================
(function(){
"use strict";
var s=document.currentScript;if(!s)return;
var m=(s.getAttribute("src")||"").match(/\/w\/([^.]+)\.js/);if(!m)return;
var CID=m[1],API="https://twtbdwxixrlspbzqmpva.supabase.co/functions/v1/widget-api";
var CFG={},CONV=null,VID=null,MSGS=[],OPEN=false,POLL=null,BGPOLL=null,ERR=0;
var REC=false,RECR=null,CHUNKS=[],lastSide="",lastDate="";
var $=function(id){return document.getElementById(id)};

function loadCfg(cb){fetch(API+"/config/"+CID).then(function(r){return r.json()}).then(function(d){if(d.config){CFG=d.config;cb()}}).catch(function(){})}

function playSnd(){try{var a=new(window.AudioContext||window.webkitAudioContext)();function b(f,t,d,v){var o=a.createOscillator(),g=a.createGain();o.connect(g);g.connect(a.destination);o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(v,a.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+t+d);o.start(a.currentTime+t);o.stop(a.currentTime+t+d)}b(880,0,.3,.1);b(1100,.15,.25,.08)}catch(e){}}

function compressImg(file,maxW,maxH,q){return new Promise(function(ok){if(!file.type.startsWith("image/")||file.type==="image/gif"){ok(file);return}var img=new Image();img.onload=function(){var w=img.width,h=img.height;if(w>maxW){h=Math.round(h*(maxW/w));w=maxW}if(h>maxH){w=Math.round(w*(maxH/h));h=maxH}var c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);c.toBlob(function(bl){ok(bl&&bl.size<file.size?new File([bl],file.name.replace(/\.[^.]+$/,".jpg"),{type:"image/jpeg"}):file)},"image/jpeg",q)};img.onerror=function(){ok(file)};img.src=URL.createObjectURL(file)})}

function darken(hex,pct){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);r=Math.max(0,Math.round(r*(1-pct)));g=Math.max(0,Math.round(g*(1-pct)));b=Math.max(0,Math.round(b*(1-pct)));return"#"+[r,g,b].map(function(c){return c.toString(16).padStart(2,"0")}).join("")}

// ═══════════════════════════════════════════
//  CSS
// ═══════════════════════════════════════════
function injectCSS(){
var C=CFG.primary_color||"#0D9488";
var C2=darken(C,.15);
var pos=CFG.position||"bottom-right";
var bot=parseInt(CFG.bottom_offset)||20;
var sd=parseInt(CFG.side_offset)||20;
var isL=pos==="bottom-left";

var el=document.createElement("style");
el.textContent='\
@import url("https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap");\
\
/* === SCOPE RESET === */\
#IFI,#IFI *,#IFI *::before,#IFI *::after{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}\
#IFI{font-family:"Nunito","Segoe UI",system-ui,sans-serif;font-size:14px;line-height:1.45;position:fixed;z-index:99990;pointer-events:none}\
#IFI>*{pointer-events:auto}\
\
/* === FAB === */\
#IFI .fab{position:fixed;bottom:'+bot+'px;'+(isL?"left":"right")+':'+sd+'px;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;\
  background:linear-gradient(145deg,'+C+','+C2+');\
  box-shadow:0 4px 14px '+C+'50,0 8px 32px rgba(0,0,0,.1);\
  display:flex;align-items:center;justify-content:center;z-index:99998;\
  transition:transform .25s cubic-bezier(.4,0,.2,1),box-shadow .25s;\
  animation:_fabPop .5s cubic-bezier(.34,1.56,.64,1) both}\
#IFI .fab:hover{transform:scale(1.07);box-shadow:0 6px 24px '+C+'60,0 12px 40px rgba(0,0,0,.12)}\
#IFI .fab::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:2.5px solid '+C+'35;animation:_ring 2.5s ease-out infinite;pointer-events:none}\
#IFI .fab.on::after{display:none}\
#IFI .fab svg{width:26px;height:26px;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none;position:absolute;transition:all .25s cubic-bezier(.4,0,.2,1)}\
#IFI .fab .ic1{opacity:1;transform:scale(1) rotate(0)}\
#IFI .fab .ic2{opacity:0;transform:scale(.4) rotate(-90deg)}\
#IFI .fab.on .ic1{opacity:0;transform:scale(.4) rotate(90deg)}\
#IFI .fab.on .ic2{opacity:1;transform:scale(1) rotate(0)}\
#IFI .badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;border-radius:11px;background:#ef4444;color:#fff;font:800 11px/22px "Nunito";text-align:center;padding:0 6px;display:none;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(239,68,68,.4);animation:_bdg .35s cubic-bezier(.34,1.56,.64,1)}\
\
/* === WINDOW === */\
#IFI .win{position:fixed;bottom:'+(bot+68)+'px;'+(isL?"left":"right")+':'+sd+'px;\
  width:380px;max-width:calc(100vw - 24px);\
  height:560px;max-height:calc(100vh - '+(bot+85)+'px);\
  border-radius:20px;overflow:hidden;\
  display:none;flex-direction:column;\
  background:#fff;\
  box-shadow:0 5px 15px rgba(0,0,0,.08),0 15px 45px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.04);\
  transform:translateY(12px) scale(.97);opacity:0;\
  transition:transform .3s cubic-bezier(.32,1.2,.6,1),opacity .2s ease;z-index:99999}\
#IFI .win.on{transform:translateY(0) scale(1);opacity:1}\
\
/* === HEADER === */\
#IFI .hdr{background:linear-gradient(135deg,'+C+' 0%,'+C2+' 100%);color:#fff;padding:16px 16px 14px;display:flex;align-items:center;gap:12px;flex-shrink:0;position:relative;overflow:hidden}\
#IFI .hdr::before{content:"";position:absolute;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.04);top:-80px;right:-40px}\
#IFI .hdr::after{content:"";position:absolute;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.03);bottom:-50px;left:20px}\
#IFI .avt{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;border:2px solid rgba(255,255,255,.25)}\
#IFI .avt img{width:100%;height:100%;object-fit:cover}\
#IFI .avt em{font-size:20px;font-style:normal}\
#IFI .hinfo{flex:1;min-width:0;position:relative;z-index:1}\
#IFI .hname{font-weight:800;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
#IFI .hstat{font-size:12px;opacity:.9;display:flex;align-items:center;gap:5px;margin-top:2px}\
#IFI .hdot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px rgba(74,222,128,.6);animation:_glow 2s ease infinite}\
#IFI .xbtn{background:rgba(255,255,255,.15);backdrop-filter:blur(8px);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s;position:relative;z-index:1}\
#IFI .xbtn:hover{background:rgba(255,255,255,.3)}\
\
/* === CHAT BODY === */\
#IFI .body{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px 14px;display:flex;flex-direction:column;gap:2px;\
  background:#e5ddd5 url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence baseFrequency=\'.65\' type=\'fractalNoise\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'400\' height=\'400\' filter=\'url(%23n)\' opacity=\'.03\'/%3E%3C/svg%3E")}\
#IFI .body::-webkit-scrollbar{width:5px}\
#IFI .body::-webkit-scrollbar-track{background:transparent}\
#IFI .body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.12);border-radius:5px}\
\
/* === DATE PILL === */\
#IFI .dpill{text-align:center;margin:10px 0 8px}\
#IFI .dpill span{display:inline-block;background:rgba(225,218,208,.92);padding:5px 16px;border-radius:8px;font-size:11.5px;color:#54656f;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.06)}\
\
/* === MESSAGE ROW === */\
#IFI .mrow{display:flex;margin-bottom:2px;animation:_msgIn .2s ease both}\
#IFI .mrow.vis{justify-content:flex-end;padding-left:40px}\
#IFI .mrow.cli{justify-content:flex-start;padding-right:40px}\
#IFI .mrow.vis+.mrow.vis{margin-top:-1px}\
#IFI .mrow.cli+.mrow.cli{margin-top:-1px}\
\
/* === BUBBLE === */\
#IFI .bub{position:relative;max-width:78%;padding:7px 8px 4px;border-radius:10px;overflow:hidden;\
  font-size:13.5px;line-height:1.5;word-wrap:break-word;\
  box-shadow:0 1px 2px rgba(0,0,0,.07)}\
#IFI .mrow.vis .bub{background:#d9fdd3;border-top-right-radius:3px}\
#IFI .mrow.cli .bub{background:#ffffff;border-top-left-radius:3px}\
\
/* Tail (only first in group) */\
#IFI .mrow.vis:not(.mrow.vis+.mrow.vis) .bub::after{content:"";position:absolute;top:0;right:-8px;width:0;height:0;border-style:solid;border-width:0 0 10px 8px;border-color:transparent transparent transparent #d9fdd3}\
#IFI .mrow.cli:not(.mrow.cli+.mrow.cli) .bub::after{content:"";position:absolute;top:0;left:-8px;width:0;height:0;border-style:solid;border-width:0 8px 10px 0;border-color:transparent #ffffff transparent transparent}\
\
/* === BUBBLE CONTENT === */\
#IFI .bub img.mimg{display:block;max-width:100%;width:100%;max-height:220px;object-fit:cover;border-radius:6px;margin-bottom:4px;cursor:pointer}\
#IFI .bub audio{display:block;width:100%;height:36px;margin:4px 0 2px;border-radius:20px}\
#IFI .bub a{color:#027eb5;text-decoration:none;word-break:break-all}\
#IFI .bub a:hover{text-decoration:underline}\
#IFI .fcard{display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(0,0,0,.04);border-radius:8px;margin-bottom:4px;text-decoration:none!important;color:inherit!important}\
#IFI .fcard .fic{width:36px;height:36px;border-radius:10px;background:'+C+'15;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px}\
#IFI .fcard .fnm{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
#IFI .fcard .fsz{font-size:10.5px;color:#8696a0;margin-top:1px}\
\
/* Time & check */\
#IFI .tmst{display:flex;align-items:center;justify-content:flex-end;gap:3px;margin-top:1px;float:right;padding-left:10px;position:relative;bottom:-2px}\
#IFI .tmst time{font-size:10.5px;color:#667781}\
#IFI .tmst .ck svg{width:16px;height:11px;display:block}\
#IFI .mrow.vis .tmst .ck{color:#53bdeb}\
\
/* === WELCOME === */\
#IFI .welc{text-align:center;padding:32px 22px 16px}\
#IFI .welc-av{width:68px;height:68px;border-radius:50%;background:linear-gradient(145deg,'+C+'22,'+C+'0a);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;overflow:hidden;border:2.5px solid '+C+'20}\
#IFI .welc-av img{width:100%;height:100%;object-fit:cover}\
#IFI .welc-av em{font-size:28px;font-style:normal}\
#IFI .welc h4{font-size:17px;color:#111b21;font-weight:800;margin-bottom:8px}\
#IFI .welc p{font-size:13.5px;color:#667781;line-height:1.65}\
\
/* === TYPING === */\
#IFI .typing{display:none;padding:3px 14px}\
#IFI .typbub{background:#fff;display:inline-flex;gap:4px;padding:12px 18px;border-radius:10px;border-top-left-radius:3px;box-shadow:0 1px 2px rgba(0,0,0,.06);position:relative}\
#IFI .typbub::after{content:"";position:absolute;top:0;left:-8px;border-style:solid;border-width:0 8px 10px 0;border-color:transparent #fff transparent transparent}\
#IFI .typbub i{width:7px;height:7px;border-radius:50%;background:#90a4ae;display:block;animation:_dotBounce 1.4s infinite}\
#IFI .typbub i:nth-child(2){animation-delay:.2s}\
#IFI .typbub i:nth-child(3){animation-delay:.4s}\
\
/* === FORM === */\
#IFI .frm{display:none;padding:18px 16px;background:#fff;border-top:1px solid #f0f2f5;flex-shrink:0}\
#IFI .frm label{display:block;font-size:11px;font-weight:700;color:#8696a0;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}\
#IFI .frm input{width:100%;padding:11px 14px;border:2px solid #e8ecf0;border-radius:12px;font:400 14px/1.4 "Nunito",sans-serif;outline:none;background:#fafbfc;transition:border .2s,box-shadow .2s;margin-bottom:12px}\
#IFI .frm input:focus{border-color:'+C+';box-shadow:0 0 0 3px '+C+'15;background:#fff}\
#IFI .frm-e{color:#ef4444;font-size:11px;margin:-8px 0 8px;display:none;font-weight:600}\
#IFI .frm-btn{width:100%;padding:13px;border:none;border-radius:14px;background:linear-gradient(145deg,'+C+','+C2+');color:#fff;font:700 15px "Nunito",sans-serif;cursor:pointer;transition:all .2s;box-shadow:0 4px 14px '+C+'30}\
#IFI .frm-btn:hover{box-shadow:0 6px 20px '+C+'40;transform:translateY(-1px)}\
#IFI .frm-btn:active{transform:translateY(0)}\
\
/* === INPUT BAR === */\
#IFI .bar{display:none;padding:8px 10px;background:#f0f2f5;flex-shrink:0;position:relative}\
#IFI .sf{display:flex;align-items:flex-end;gap:6px}\
#IFI .ibtn{width:36px;height:36px;min-width:36px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:transparent;color:#54656f;flex-shrink:0;transition:background .15s}\
#IFI .ibtn:hover{background:rgba(0,0,0,.06)}\
#IFI .ibtn svg{width:22px;height:22px;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;fill:none}\
#IFI .inp{flex:1;min-width:0;padding:9px 14px;border:none;border-radius:24px;font:400 14px/1.5 "Nunito",sans-serif;outline:none;background:#fff;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04)}\
#IFI .inp::placeholder{color:#a0adb8}\
#IFI .sendbtn{width:40px;height:40px;min-width:40px;border-radius:50%;border:none;background:'+C+';color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,transform .1s;box-shadow:0 2px 8px '+C+'35}\
#IFI .sendbtn:hover{background:'+C2+'}\
#IFI .sendbtn:active{transform:scale(.95)}\
#IFI .sendbtn svg{width:20px;height:20px;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;fill:none}\
#IFI .fhid{display:none}\
#IFI .rec-on{color:#ef4444!important;animation:_recPulse 1s infinite}\
\
/* === EMOJI === */\
#IFI .epick{display:none;position:absolute;bottom:52px;left:8px;right:8px;background:#fff;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.16);padding:10px;max-height:180px;overflow-y:auto;z-index:10}\
#IFI .epick span{font-size:24px;cursor:pointer;padding:4px;display:inline-block;border-radius:6px;transition:transform .15s;line-height:1}\
#IFI .epick span:hover{background:#f0f2f5;transform:scale(1.2)}\
\
/* === FOOTER === */\
#IFI .foot{text-align:center;padding:5px;background:#fff;border-top:1px solid #f0f0f0;flex-shrink:0}\
#IFI .foot a{font-size:10.5px;color:#8696a0;text-decoration:none;font-weight:700;letter-spacing:.2px}\
#IFI .foot a:hover{color:'+C+'}\
\
/* === ANIMATIONS === */\
@keyframes _fabPop{from{transform:scale(0) rotate(-180deg);opacity:0}to{transform:scale(1) rotate(0);opacity:1}}\
@keyframes _ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.5);opacity:0}}\
@keyframes _bdg{0%{transform:scale(.3)}60%{transform:scale(1.15)}100%{transform:scale(1)}}\
@keyframes _glow{0%,100%{box-shadow:0 0 8px rgba(74,222,128,.6)}50%{box-shadow:0 0 3px rgba(74,222,128,.2)}}\
@keyframes _msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}\
@keyframes _dotBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}\
@keyframes _recPulse{0%,100%{opacity:1}50%{opacity:.25}}\
\
/* === MOBILE === */\
@media(max-width:480px){\
  #IFI .win{width:calc(100vw - 16px);max-width:none;'+(isL?"left:8px":"right:8px")+';height:62vh;max-height:62vh;bottom:'+(bot+66)+'px;border-radius:16px}\
  #IFI .sf{gap:3px}\
  #IFI .ibtn{width:32px;height:32px;min-width:32px}\
  #IFI .ibtn svg{width:20px;height:20px}\
  #IFI .inp{font-size:13px;padding:7px 10px}\
  #IFI .sendbtn{width:36px;height:36px;min-width:36px}\
  #IFI .bub{max-width:85%}\
  #IFI .mrow.vis{padding-left:24px}\
  #IFI .mrow.cli{padding-right:24px}\
}\
';
document.head.appendChild(el);
}

// ═══════════════════════════════════════════
//  BUILD DOM
// ═══════════════════════════════════════════
function buildUI(){
var root=document.createElement("div");root.id="IFI";
var logo=CFG.logo_url||"";
var biz=CFG.header_text||CFG.business_name||"Support";
var avH=logo?'<img src="'+logo+'" alt="">':'<em>'+(CFG.avatar_emoji||"💬")+'</em>';

root.innerHTML='\
<button class="fab" id="ifab">\
  <svg class="ic1" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>\
  <svg class="ic2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>\
  <span class="badge" id="ibdg">0</span>\
</button>\
<div class="win" id="iwin">\
  <div class="hdr">\
    <div class="avt">'+avH+'</div>\
    <div class="hinfo"><div class="hname">'+biz+'</div><div class="hstat"><span class="hdot"></span> En ligne</div></div>\
    <button class="xbtn" id="ixb"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>\
  </div>\
  <div class="body" id="ibody">\
    <div class="welc"><div class="welc-av">'+avH+'</div><h4>'+biz+'</h4><p>'+(CFG.welcome_message||"Bonjour ! Comment pouvons-nous vous aider ?")+'</p></div>\
  </div>\
  <div class="typing" id="ityp"><div class="typbub"><i></i><i></i><i></i></div></div>\
  <div class="frm" id="ifrm">\
    <label>Votre nom</label><input id="ifn" placeholder="Ex: Adama Koné">\
    <label>Téléphone / WhatsApp</label><input id="iwa" type="tel" inputmode="numeric" placeholder="229 XX XX XX XX">\
    <div class="frm-e" id="ife">Numéro invalide (minimum 8 chiffres)</div>\
    <button class="frm-btn" id="ifbtn">Démarrer la conversation →</button>\
  </div>\
  <div class="bar" id="ibar">\
    <div class="epick" id="iep"></div>\
    <form class="sf" id="isf">\
      <button type="button" class="ibtn" id="iemb"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></button>\
      <button type="button" class="ibtn" id="iatt"><svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>\
      <input type="text" class="inp" id="iinp" placeholder="'+(CFG.placeholder_text||"Écrivez un message…")+'" autocomplete="off">\
      <button type="button" class="ibtn" id="imic"><svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg></button>\
      <button type="submit" class="sendbtn"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>\
      <input type="file" class="fhid" id="ifh" accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx">\
    </form>\
  </div>\
  <div class="foot"><a href="https://chat.ifiaas.com" target="_blank">⚡ ifiChat</a></div>\
</div>';
document.body.appendChild(root);

// Events
$("ifab").onclick=toggle;
$("ixb").onclick=closeW;
$("ifbtn").onclick=startConv;
$("isf").onsubmit=sendMsg;
$("iatt").onclick=function(){$("ifh").click()};
$("ifh").onchange=uploadFile;
$("imic").onclick=toggleRec;
$("iwa").oninput=function(e){e.target.value=e.target.value.replace(/[^0-9+\s]/g,"")};

// Emoji
var ep=$("iep");
["😀","😂","🤣","😊","🥰","😍","😘","😉","🤗","🤔","😎","🤩","😅","👍","👎","❤️","🔥","🎉","💯","🙏","👋","✅","⭐","💰","👏","😢","🥺","🫡","🤝","💪"].forEach(function(e){
  var s=document.createElement("span");s.textContent=e;
  s.onclick=function(){$("iinp").value+=e;$("iinp").focus();ep.style.display="none"};
  ep.appendChild(s);
});
$("iemb").onclick=function(){ep.style.display=ep.style.display==="block"?"none":"block"};
$("iinp").onfocus=function(){ep.style.display="none"};
}

// ═══════════════════════════════════════════
//  OPEN / CLOSE
// ═══════════════════════════════════════════
function toggle(){OPEN?closeW():openW()}
function openW(){
  OPEN=true;stopBg();$("iwin").style.display="flex";$("ifab").classList.add("on");
  requestAnimationFrame(function(){$("iwin").classList.add("on")});
  if(!CONV)$("ifrm").style.display="block";
  else{refetchMsgs();startPoll()}
  $("ibdg").style.display="none";$("ibdg").textContent="0";scrl();
}
function closeW(){
  OPEN=false;$("iwin").classList.remove("on");$("ifab").classList.remove("on");
  try{$("iep").style.display="none"}catch(x){}
  setTimeout(function(){if(!OPEN)$("iwin").style.display="none"},300);
  stopPoll();if(CONV)startBg();
}
function scrl(){var b=$("ibody");if(b)setTimeout(function(){b.scrollTop=b.scrollHeight},60)}
function refetchMsgs(){
  fetch(API+"/messages/"+CONV).then(function(r){return r.ok?r.json():null}).then(function(d){
    if(!d||!d.messages)return;var added=false;
    d.messages.forEach(function(m){if(!MSGS.some(function(e){return e.id===m.id})){addMsg(m,true);added=true}});
    if(added)scrl();
  }).catch(function(){});
}

// ═══════════════════════════════════════════
//  START CONVERSATION
// ═══════════════════════════════════════════
function startConv(){
  var fn=$("ifn").value.trim(),wa=$("iwa").value.trim().replace(/[^0-9+]/g,"");
  if(!fn){$("ifn").style.borderColor="#ef4444";setTimeout(function(){$("ifn").style.borderColor=""},2e3);return}
  if(!wa||wa.replace(/\D/g,"").length<8){
    $("iwa").style.borderColor="#ef4444";$("ife").style.display="block";
    setTimeout(function(){$("iwa").style.borderColor="";$("ife").style.display="none"},3e3);return;
  }
  var btn=$("ifbtn");btn.textContent="Connexion…";btn.disabled=true;
  fetch(API+"/start-conversation",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},body:JSON.stringify({fullName:fn,whatsapp:wa})}).then(function(r){return r.json()}).then(function(d){
    if(d.conversationId){
      CONV=d.conversationId;VID=d.visitorId;
      $("ifrm").style.display="none";$("ibar").style.display="block";
      var wl=document.querySelector("#IFI .welc");if(wl)wl.style.display="none";
      try{localStorage.setItem("ifi_"+CID,JSON.stringify({c:CONV,v:VID,n:fn}))}catch(x){}
      $("ityp").style.display="block";scrl();
      setTimeout(function(){$("ityp").style.display="none";addMsg({content:"Bonjour "+fn+" ! 👋 Comment puis-je vous aider ?",sender_type:"client",content_type:"text",created_at:new Date().toISOString(),id:"sys"},true)},1500);
      startPoll();$("iinp").focus();
    }
    btn.textContent="Démarrer la conversation →";btn.disabled=false;
  }).catch(function(){btn.textContent="Démarrer la conversation →";btn.disabled=false});
}

// ═══════════════════════════════════════════
//  SEND / UPLOAD / VOICE
// ═══════════════════════════════════════════
function sendMsg(e){
  e.preventDefault();var inp=$("iinp"),t=inp.value.trim();if(!t||!CONV)return;
  inp.value="";$("iep").style.display="none";
  addMsg({content:t,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"t_"+Date.now()});
  fetch(API+"/send-message",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},body:JSON.stringify({conversationId:CONV,visitorId:VID,content:t,sender:"visitor"})}).catch(function(){});
}

function uploadFile(){
  var fi=$("ifh"),f=fi.files[0];if(!f||!CONV)return;fi.value="";
  var isI=f.type.startsWith("image/"),isA=f.type.startsWith("audio/"),tid="t_"+Date.now();
  if(isI){var rd=new FileReader();rd.onload=function(ev){addMsg({content:"",sender_type:"visitor",content_type:"image",file_url:ev.target.result,created_at:new Date().toISOString(),id:tid},true)};rd.readAsDataURL(f)}
  else{addMsg({content:isA?"🎤 Envoi…":"📎 "+f.name,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:tid},true)}
  var ready=isI?compressImg(f,1200,1200,.7):Promise.resolve(f);
  ready.then(function(cf){var fd=new FormData();fd.append("file",cf);fd.append("conversationId",CONV);fd.append("visitorId",VID);fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(function(){})});
}

function toggleRec(){
  if(REC){stopRec();return}
  if(!navigator.mediaDevices)return;
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(st){
    REC=true;CHUNKS=[];$("imic").classList.add("rec-on");
    RECR=new MediaRecorder(st);
    RECR.ondataavailable=function(e){if(e.data.size>0)CHUNKS.push(e.data)};
    RECR.onstop=function(){st.getTracks().forEach(function(t){t.stop()});
      var blob=new Blob(CHUNKS,{type:"audio/webm"});
      var f=new File([blob],"voice_"+Date.now()+".webm",{type:"audio/webm"});
      addMsg({content:"🎤 Vocal",sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"t_"+Date.now()},true);
      var fd=new FormData();fd.append("file",f);fd.append("conversationId",CONV);fd.append("visitorId",VID);
      fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(function(){});
    };
    RECR.start();setTimeout(function(){if(REC)stopRec()},60000);
  }).catch(function(){});
}
function stopRec(){REC=false;$("imic").classList.remove("rec-on");if(RECR&&RECR.state!=="inactive")RECR.stop()}

// ═══════════════════════════════════════════
//  ADD MESSAGE TO DOM
// ═══════════════════════════════════════════
function addMsg(m,noSnd){
  MSGS.push(m);
  var box=$("ibody"),isV=m.sender_type==="visitor";
  var dt=new Date(m.created_at),ds=dt.toLocaleDateString("fr-FR");

  // Date pill
  if(ds!==lastDate){
    lastDate=ds;
    var now=new Date(),y=new Date(Date.now()-864e5);
    var lbl=ds===now.toLocaleDateString("fr-FR")?"Aujourd'hui":ds===y.toLocaleDateString("fr-FR")?"Hier":dt.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"});
    var dp=document.createElement("div");dp.className="dpill";dp.innerHTML="<span>"+lbl+"</span>";box.appendChild(dp);
  }

  var row=document.createElement("div");
  row.className="mrow "+(isV?"vis":"cli");

  var bub=document.createElement("div");
  bub.className="bub";
  var c=m.content||"";

  // Render content
  if(m.content_type==="image"&&m.file_url){
    var img=document.createElement("img");img.className="mimg";img.src=m.file_url;img.loading="lazy";img.alt="";
    img.onclick=function(){window.open(m.file_url,"_blank")};
    bub.appendChild(img);
    if(c){var cap=document.createElement("div");cap.style.cssText="font-size:12.5px;margin:2px 0";cap.textContent=c;bub.appendChild(cap)}
  }
  else if(m.content_type==="file"&&m.file_url){
    var mime=m.file_mime_type||"";
    if(mime.startsWith("audio/")){
      var au=document.createElement("audio");au.controls=true;au.src=m.file_url;au.preload="metadata";bub.appendChild(au);
    }else{
      var a=document.createElement("a");a.href=m.file_url;a.target="_blank";a.className="fcard";
      var sz=m.file_size?Math.round(m.file_size/1024)+" KB":"";
      a.innerHTML='<div class="fic">📄</div><div><div class="fnm">'+(m.file_name||"Fichier")+'</div>'+(sz?'<div class="fsz">'+sz+'</div>':'')+'</div>';
      bub.appendChild(a);
    }
  }
  else if(c){
    var urlRe=/(https?:\/\/[^\s]+)/g;
    if(urlRe.test(c)){
      c.split(urlRe).forEach(function(p){
        if(p.match(/^https?:\/\//)){var l=document.createElement("a");l.href=p;l.target="_blank";l.textContent=p.length>40?p.slice(0,40)+"…":p;bub.appendChild(l)}
        else if(p){bub.appendChild(document.createTextNode(p))}
      });
    }else{bub.appendChild(document.createTextNode(c))}
  }

  // Timestamp + checkmark
  var ts=document.createElement("span");ts.className="tmst";
  var h=String(dt.getHours()).padStart(2,"0"),mn=String(dt.getMinutes()).padStart(2,"0");
  ts.innerHTML='<time>'+h+':'+mn+'</time>'+(isV?'<span class="ck"><svg viewBox="0 0 16 11" fill="none"><path d="M11 1L4.5 7.5 2 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M14 1L7.5 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>':'');
  bub.appendChild(ts);

  row.appendChild(bub);box.appendChild(row);scrl();
  lastSide=isV?"v":"c";
  if(!isV&&!noSnd&&m.id!=="sys")playSnd();
}

// ═══════════════════════════════════════════
//  POLLING
// ═══════════════════════════════════════════
function startPoll(){if(POLL||!CONV)return;ERR=0;doPoll();POLL=setInterval(function(){if(ERR>5){stopPoll();return}doPoll()},3000)}
function stopPoll(){if(POLL){clearInterval(POLL);POLL=null}}
function doPoll(){
  fetch(API+"/messages/"+CONV).then(function(r){if(!r.ok){ERR++;return null}ERR=0;return r.json()}).then(function(d){
    if(!d||!d.messages)return;var nc=0;
    d.messages.forEach(function(m){
      if(!MSGS.some(function(e){return e.id===m.id})){
        if(m.sender_type==="visitor"){var i=MSGS.findIndex(function(e){return String(e.id).startsWith("t_")&&(e.content===m.content||(m.file_url&&e.file_url))});if(i>-1){MSGS[i].id=m.id;return}}
        addMsg(m);if(m.sender_type==="client")nc++;
      }
    });
    if(!OPEN&&nc>0){var b=$("ibdg");b.textContent=String(parseInt(b.textContent||"0")+nc);b.style.display="block";playSnd()}
  }).catch(function(){ERR++});
}

function startBg(){if(BGPOLL||!CONV)return;BGPOLL=setInterval(function(){
  if(OPEN){stopBg();return}
  fetch(API+"/messages/"+CONV).then(function(r){return r.ok?r.json():null}).then(function(d){
    if(!d||!d.messages)return;var nc=0;
    d.messages.forEach(function(m){if(!MSGS.some(function(e){return e.id===m.id})){MSGS.push(m);if(m.sender_type==="client")nc++}});
    if(nc>0){var b=$("ibdg");b.textContent=String(parseInt(b.textContent||"0")+nc);b.style.display="block";playSnd()}
  }).catch(function(){});
},8000)}
function stopBg(){if(BGPOLL){clearInterval(BGPOLL);BGPOLL=null}}

// ═══════════════════════════════════════════
//  RESTORE SESSION
// ═══════════════════════════════════════════
function restore(){
  try{
    var sv=JSON.parse(localStorage.getItem("ifi_"+CID));
    if(sv&&sv.c){
      CONV=sv.c;VID=sv.v;
      $("ifrm").style.display="none";$("ibar").style.display="block";
      var wl=document.querySelector("#IFI .welc");if(wl)wl.style.display="none";
      fetch(API+"/messages/"+CONV).then(function(r){return r.ok?r.json():null}).then(function(d){
        if(d&&d.messages)d.messages.forEach(function(m){addMsg(m,true)});
        startBg();
      }).catch(function(){});
    }
  }catch(x){}
}

// ═══════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════
loadCfg(function(){injectCSS();buildUI();restore()});
})();
