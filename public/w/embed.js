// ============================================
// ifiChat — Premium Widget v2
// ============================================
(function(){
"use strict";
var s=document.currentScript;if(!s)return;
var m=(s.getAttribute("src")||"").match(/\/w\/([^.]+)\.js/);if(!m)return;
var CID=m[1],API="https://twtbdwxixrlspbzqmpva.supabase.co/functions/v1/widget-api";
var CFG={},CONV=null,VID=null,MSGS=[],OPEN=false,POLL=null,ERR=0;

function loadConfig(cb){
  fetch(API+"/config/"+CID).then(function(r){return r.json()}).then(function(d){
    if(d.config){CFG=d.config;cb()}
  }).catch(function(){});
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
#ifi-fab{position:fixed;bottom:${bot};${P};width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,${C},${C}dd);border:none;cursor:pointer;box-shadow:0 6px 24px ${C}55;z-index:99998;display:flex;align-items:center;justify-content:center;transition:all .3s cubic-bezier(.4,0,.2,1);animation:ifiFabIn .5s ease}
#ifi-fab:hover{transform:scale(1.1);box-shadow:0 8px 32px ${C}77}
#ifi-fab:active{transform:scale(.95)}
#ifi-fab svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:all .3s}
#ifi-fab.open svg.ico-chat{display:none}
#ifi-fab.open svg.ico-x{display:block}
#ifi-fab svg.ico-x{display:none}
#ifi-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;border-radius:11px;background:#EF4444;color:#fff;font:700 11px/22px 'Inter',sans-serif;text-align:center;padding:0 6px;display:none;box-shadow:0 2px 8px rgba(239,68,68,.5);animation:ifiBounce .4s ease}

#ifi-win{position:fixed;bottom:${parseInt(bot)+72}px;${P};width:380px;max-width:calc(100vw - 20px);height:560px;max-height:calc(100dvh - 100px);border-radius:20px;overflow:hidden;z-index:99999;display:none;flex-direction:column;font-family:'Inter',system-ui,sans-serif;
  box-shadow:0 20px 60px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.05);
  transform:translateY(20px) scale(.95);opacity:0;transition:all .35s cubic-bezier(.4,0,.2,1)}
#ifi-win.show{transform:translateY(0) scale(1);opacity:1}

#ifi-hdr{background:linear-gradient(135deg,${C},${C}cc);color:#fff;padding:18px 20px;display:flex;align-items:center;gap:14px;flex-shrink:0;position:relative;overflow:hidden}
#ifi-hdr::after{content:'';position:absolute;top:-50%;right:-30%;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.08)}
#ifi-hdr-av{width:42px;height:42px;border-radius:14px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);flex-shrink:0;font-size:18px}
#ifi-hdr-name{font-weight:700;font-size:16px;letter-spacing:-.3px}
#ifi-hdr-dot{width:8px;height:8px;border-radius:50%;background:#34D399;display:inline-block;margin-right:6px;animation:ifiPulse 2s ease infinite}
#ifi-hdr-status{font-size:12px;opacity:.85;display:flex;align-items:center}
#ifi-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,.15);border:none;color:#fff;width:32px;height:32px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);transition:all .2s}
#ifi-close:hover{background:rgba(255,255,255,.3)}

#ifi-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:4px;background:linear-gradient(180deg,#f0f2f5 0%,#e8ecf0 100%);scroll-behavior:smooth}
#ifi-body::-webkit-scrollbar{width:4px}
#ifi-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px}

.ifi-day{text-align:center;margin:12px 0 8px;font-size:11px;color:#8696a0;font-weight:500}
.ifi-day span{background:#fff;padding:4px 14px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.06)}

.ifi-row{display:flex;margin-bottom:2px;animation:ifiMsgIn .3s ease}
.ifi-row.vis{justify-content:flex-end}
.ifi-row.cli{justify-content:flex-start}

.ifi-bub{max-width:78%;padding:9px 14px;border-radius:12px;font-size:14px;line-height:1.45;word-wrap:break-word;position:relative;box-shadow:0 1px 2px rgba(0,0,0,.06)}
.ifi-row.vis .ifi-bub{background:#d9fdd3;color:#111;border-bottom-right-radius:4px}
.ifi-row.cli .ifi-bub{background:#fff;color:#111;border-bottom-left-radius:4px}
.ifi-bub img{max-width:100%;border-radius:8px;margin-top:4px;cursor:pointer}
.ifi-time{font-size:10px;color:#667781;margin-top:3px;text-align:right}

.ifi-welc{text-align:center;padding:30px 20px;color:#667781}
.ifi-welc-icon{width:70px;height:70px;border-radius:20px;background:linear-gradient(135deg,${C}22,${C}11);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px}
.ifi-welc h4{font-size:16px;color:#111;margin:0 0 6px;font-weight:700}
.ifi-welc p{font-size:13px;line-height:1.6;margin:0}

#ifi-form{display:none;padding:16px;background:#fff;border-top:1px solid #e9ecef;flex-shrink:0}
#ifi-form label{font-size:12px;font-weight:600;color:#667781;margin-bottom:4px;display:block}
#ifi-form input{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font:400 14px/1.4 'Inter',sans-serif;margin-bottom:10px;box-sizing:border-box;transition:border .2s;outline:none}
#ifi-form input:focus{border-color:${C}}
#ifi-form-btn{width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,${C},${C}dd);color:#fff;font:600 14px 'Inter',sans-serif;cursor:pointer;transition:all .2s;box-shadow:0 4px 12px ${C}33}
#ifi-form-btn:hover{box-shadow:0 6px 20px ${C}55;transform:translateY(-1px)}

#ifi-bar{display:none;padding:10px 12px;background:#fff;border-top:1px solid #e9ecef;flex-shrink:0}
#ifi-bar form{display:flex;gap:8px;align-items:center}
#ifi-bar-attach{width:38px;height:38px;border-radius:12px;border:none;background:#f0f2f5;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#667781;transition:all .2s;flex-shrink:0}
#ifi-bar-attach:hover{background:#e2e5e9}
#ifi-bar input[type=text]{flex:1;padding:10px 16px;border:1.5px solid #e2e8f0;border-radius:24px;font:400 14px/1.4 'Inter',sans-serif;outline:none;transition:border .2s;box-sizing:border-box}
#ifi-bar input[type=text]:focus{border-color:${C}}
#ifi-bar-send{width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg,${C},${C}dd);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .2s;box-shadow:0 3px 10px ${C}33}
#ifi-bar-send:hover{transform:scale(1.08);box-shadow:0 5px 16px ${C}55}
#ifi-bar-file{display:none}
.ifi-typing{display:flex;gap:4px;padding:4px 0 4px 8px;align-items:center}
.ifi-typing span{width:7px;height:7px;border-radius:50%;background:#90a4ae;animation:ifiType 1.4s infinite}
.ifi-typing span:nth-child(2){animation-delay:.2s}
.ifi-typing span:nth-child(3){animation-delay:.4s}

@keyframes ifiFabIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes ifiBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
@keyframes ifiPulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes ifiMsgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes ifiType{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}

@media(max-width:480px){
  #ifi-win{width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;bottom:0!important;left:0!important;right:0!important;border-radius:0;transform:translateY(100%);opacity:1}
  #ifi-win.show{transform:translateY(0)}
  #ifi-fab.open{display:none!important}
}
`;
  var el=document.createElement("style");el.textContent=css;document.head.appendChild(el);
}

// ═══ DOM ═══════════════════════════════════
function buildUI(){
  // FAB
  var fab=document.createElement("button");fab.id="ifi-fab";
  fab.innerHTML='<svg class="ico-chat" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><svg class="ico-x" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span id="ifi-badge">0</span>';
  fab.onclick=toggle;document.body.appendChild(fab);

  // Window
  var w=document.createElement("div");w.id="ifi-win";
  var biz=CFG.business_name||"Support";
  w.innerHTML=`
<div id="ifi-hdr">
  <div id="ifi-hdr-av">💬</div>
  <div><div id="ifi-hdr-name">${biz}</div><div id="ifi-hdr-status"><span id="ifi-hdr-dot"></span>En ligne</div></div>
  <button id="ifi-close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
</div>
<div id="ifi-body">
  <div class="ifi-welc">
    <div class="ifi-welc-icon">👋</div>
    <h4>${biz}</h4>
    <p>${CFG.welcome_message||"Bonjour ! Comment pouvons-nous vous aider aujourd'hui ?"}</p>
  </div>
</div>
<div id="ifi-form">
  <label>Votre nom</label>
  <input id="ifi-fn" placeholder="Ex: Adama Koné" required>
  <label>WhatsApp / Téléphone</label>
  <input id="ifi-wa" placeholder="+229 XX XX XX XX" required>
  <button type="button" id="ifi-form-btn">Démarrer la conversation</button>
</div>
<div id="ifi-bar">
  <form id="ifi-sf">
    <button type="button" id="ifi-bar-attach"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
    <input type="text" id="ifi-si" placeholder="${CFG.placeholder_text||"Écrivez un message..."}" autocomplete="off">
    <button type="submit" id="ifi-bar-send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
    <input type="file" id="ifi-bar-file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar">
  </form>
</div>`;
  document.body.appendChild(w);

  document.getElementById("ifi-close").onclick=function(){closeChat()};
  document.getElementById("ifi-form-btn").onclick=startConv;
  document.getElementById("ifi-sf").onsubmit=sendMsg;
  document.getElementById("ifi-bar-attach").onclick=function(){document.getElementById("ifi-bar-file").click()};
  document.getElementById("ifi-bar-file").onchange=uploadFile;
}

// ═══ TOGGLE ═══════════════════════════════
function toggle(){
  OPEN?closeChat():openChat();
}
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
  setTimeout(function(){if(!OPEN)w.style.display="none"},350);
  stopPolling();
}

function scrollBottom(){
  var b=document.getElementById("ifi-body");
  if(b)setTimeout(function(){b.scrollTop=b.scrollHeight},50);
}

// ═══ START CONVERSATION ═══════════════════
function startConv(){
  var fn=document.getElementById("ifi-fn").value.trim();
  var wa=document.getElementById("ifi-wa").value.trim();
  if(!fn||!wa)return;
  var btn=document.getElementById("ifi-form-btn");
  btn.textContent="Connexion...";btn.disabled=true;

  fetch(API+"/start-conversation",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},
    body:JSON.stringify({fullName:fn,whatsapp:wa})
  }).then(function(r){return r.json()}).then(function(d){
    if(d.conversationId){
      CONV=d.conversationId;VID=d.visitorId;
      document.getElementById("ifi-form").style.display="none";
      document.getElementById("ifi-bar").style.display="block";
      document.querySelector(".ifi-welc").style.display="none";
      try{localStorage.setItem("ifi_"+CID,JSON.stringify({conv:CONV,vid:VID,fn:fn}))}catch(x){}
      startPolling();
      document.getElementById("ifi-si").focus();
    }
    btn.textContent="Démarrer la conversation";btn.disabled=false;
  }).catch(function(){btn.textContent="Démarrer la conversation";btn.disabled=false});
}

// ═══ SEND MESSAGE ═════════════════════════
function sendMsg(e){
  e.preventDefault();
  var inp=document.getElementById("ifi-si");
  var txt=inp.value.trim();if(!txt||!CONV)return;
  inp.value="";
  addMsg({content:txt,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"tmp_"+Date.now()});

  fetch(API+"/send-message",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},
    body:JSON.stringify({conversationId:CONV,visitorId:VID,content:txt,sender:"visitor"})
  }).catch(function(){});
}

// ═══ UPLOAD FILE ══════════════════════════
function uploadFile(){
  var fileInput=document.getElementById("ifi-bar-file");
  var file=fileInput.files[0];if(!file||!CONV)return;
  fileInput.value="";

  // Show preview immediately
  var isImg=file.type.startsWith("image/");
  if(isImg){
    var reader=new FileReader();
    reader.onload=function(e){
      addMsg({content:"",sender_type:"visitor",content_type:"image",file_url:e.target.result,file_name:file.name,created_at:new Date().toISOString(),id:"tmp_"+Date.now()});
    };
    reader.readAsDataURL(file);
  } else {
    addMsg({content:"📎 "+file.name,sender_type:"visitor",content_type:"text",created_at:new Date().toISOString(),id:"tmp_"+Date.now()});
  }

  var fd=new FormData();
  fd.append("file",file);
  fd.append("conversationId",CONV);
  fd.append("visitorId",VID);

  fetch(API+"/upload-file",{method:"POST",headers:{"x-client-id":CID},body:fd}).catch(function(){});
}

// ═══ ADD MESSAGE BUBBLE ═══════════════════
function addMsg(m){
  MSGS.push(m);
  var box=document.getElementById("ifi-body");
  var isVis=m.sender_type==="visitor";
  var row=document.createElement("div");
  row.className="ifi-row "+(isVis?"vis":"cli");
  row.setAttribute("data-id",m.id);

  var bub=document.createElement("div");
  bub.className="ifi-bub";

  // Content
  if(m.content_type==="image"&&m.file_url){
    var img=document.createElement("img");
    img.src=m.file_url;img.alt="Photo";img.loading="lazy";
    img.onclick=function(){window.open(m.file_url,"_blank")};
    bub.appendChild(img);
    if(m.content){var t=document.createElement("div");t.textContent=m.content;bub.appendChild(t)}
  } else if(m.content_type==="file"&&m.file_url){
    var a=document.createElement("a");
    a.href=m.file_url;a.target="_blank";a.textContent="📎 "+(m.file_name||"Fichier");
    a.style.cssText="color:inherit;text-decoration:underline";
    bub.appendChild(a);
  } else {
    bub.textContent=m.content||"";
  }

  // Time
  var tm=document.createElement("div");
  tm.className="ifi-time";
  var d=new Date(m.created_at);
  tm.textContent=d.getHours().toString().padStart(2,"0")+":"+d.getMinutes().toString().padStart(2,"0");
  bub.appendChild(tm);

  row.appendChild(bub);
  box.appendChild(row);
  scrollBottom();
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
    var newCount=0;
    d.messages.forEach(function(m){
      if(!MSGS.some(function(e){return e.id===m.id})){
        // Don't re-add visitor temp messages
        if(m.sender_type==="visitor"){
          // Check if we have a temp version
          var hasTmp=MSGS.some(function(e){return e.id&&e.id.startsWith("tmp_")&&e.content===m.content});
          if(hasTmp)return;
        }
        addMsg(m);
        if(m.sender_type==="client")newCount++;
      }
    });
    if(!OPEN&&newCount>0){
      var b=document.getElementById("ifi-badge");
      var c=parseInt(b.textContent||"0")+newCount;
      b.textContent=String(c);b.style.display="block";
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
        d.messages.forEach(function(m){addMsg(m)});
      }).catch(function(){});
    }
  }catch(x){}
}

// ═══ INIT ═════════════════════════════════
loadConfig(function(){injectCSS();buildUI();restoreSession()});
})();
