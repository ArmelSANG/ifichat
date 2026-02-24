// ============================================
// ifiChat — Self-contained Widget Embed
// Usage: <script src="https://chat.ifiaas.com/w/{clientId}.js" async></script>
// ============================================
(function(){
"use strict";
var s=document.currentScript;if(!s)return;
var m=(s.getAttribute("src")||"").match(/\/w\/([^.]+)\.js/);if(!m)return;
var CID=m[1],API="https://twtbdwxixrlspbzqmpva.supabase.co/functions/v1/widget-api";
var CFG={},CONV=null,VID=null,MSGS=[],OPEN=false,POLL=null;

// ─── Fetch config ───────────────────────────
function loadConfig(cb){
  fetch(API+"/config/"+CID).then(function(r){return r.json()}).then(function(d){
    if(d.config){CFG=d.config;cb()}
    else if(d.code==="EXPIRED"){console.log("ifiChat: subscription expired")}
  }).catch(function(){});
}

// ─── Styles ─────────────────────────────────
function injectCSS(){
  var color=CFG.primary_color||"#0D9488";
  var pos=CFG.position||"bottom-right";
  var bot=(CFG.bottom_offset||20)+"px";
  var side=(CFG.side_offset||20)+"px";
  var posCSS=pos==="bottom-left"?"left:"+side:"right:"+side;
  var css="\n#ific-btn{position:fixed;bottom:"+bot+";"+posCSS+";width:56px;height:56px;border-radius:50%;background:"+color+";border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.25);z-index:99998;display:flex;align-items:center;justify-content:center;transition:transform .2s}\n#ific-btn:hover{transform:scale(1.08)}\n#ific-btn svg{width:24px;height:24px;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}\n#ific-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#EF4444;color:#fff;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;font-family:sans-serif}\n#ific-win{position:fixed;bottom:"+(parseInt(bot)+66)+"px;"+posCSS+";width:370px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 100px);background:#fff;border-radius:20px;box-shadow:0 12px 50px rgba(0,0,0,0.18);z-index:99999;display:none;flex-direction:column;overflow:hidden;font-family:'Segoe UI',system-ui,-apple-system,sans-serif}\n#ific-hdr{background:"+color+";color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0}\n#ific-hdr-name{font-weight:700;font-size:15px}\n#ific-hdr-status{font-size:11px;opacity:.8}\n#ific-close{background:none;border:none;color:#fff;cursor:pointer;margin-left:auto;opacity:.7;padding:4px}\n#ific-close:hover{opacity:1}\n#ific-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;background:#f8f9fb}\n.ific-m{max-width:82%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.5;word-wrap:break-word;animation:ificIn .2s ease}\n.ific-mv{background:#fff;align-self:flex-start;border:1px solid #e8e8e8;border-radius:16px 16px 16px 4px;color:#333}\n.ific-mc{background:"+color+";color:#fff;align-self:flex-end;border-radius:16px 16px 4px 16px}\n.ific-mt{font-size:10px;color:#999;margin-top:2px}\n#ific-form-wrap{display:none;border-top:1px solid #f0f0f0;padding:14px 16px;flex-shrink:0;background:#fff}\n#ific-form label{display:block;font-size:12px;font-weight:600;color:#555;margin-bottom:4px}\n#ific-form input{width:100%;padding:9px 12px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:13px;font-family:inherit;margin-bottom:8px;box-sizing:border-box}\n#ific-form button{width:100%;padding:10px;border:none;border-radius:10px;background:"+color+";color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}\n#ific-inp{border-top:1px solid #f0f0f0;padding:10px 14px;display:none;flex-shrink:0;background:#fff}\n#ific-inp form{display:flex;gap:8px}\n#ific-inp input{flex:1;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:12px;font-size:14px;font-family:inherit;outline:none}\n#ific-inp input:focus{border-color:"+color+"}\n#ific-inp button{width:40px;height:40px;border-radius:12px;border:none;background:"+color+";color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}\n#ific-welc{padding:20px;text-align:center;color:#666;font-size:14px;line-height:1.6}\n@keyframes ificIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}\n@media(max-width:480px){#ific-win{width:100vw;max-width:100vw;height:100vh;max-height:100vh;bottom:0;left:0;right:0;border-radius:0}}\n";
  var el=document.createElement("style");el.textContent=css;document.head.appendChild(el);
}

// ─── Build DOM ──────────────────────────────
function buildUI(){
  // Button
  var btn=document.createElement("button");btn.id="ific-btn";
  btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span id="ific-badge">0</span>';
  btn.onclick=toggleChat;document.body.appendChild(btn);

  // Window
  var win=document.createElement("div");win.id="ific-win";
  win.innerHTML='\
<div id="ific-hdr">\
  <div><div id="ific-hdr-name">'+(CFG.business_name||"Chat")+'</div><div id="ific-hdr-status">En ligne</div></div>\
  <button id="ific-close" onclick="document.getElementById(\'ific-win\').style.display=\'none\'">✕</button>\
</div>\
<div id="ific-msgs"><div id="ific-welc">'+(CFG.welcome_message||"Bonjour ! Comment pouvons-nous vous aider ?")+'</div></div>\
<div id="ific-form-wrap"><form id="ific-form">\
  <label>Nom</label><input id="ific-fn" placeholder="Votre nom" required>\
  <label>WhatsApp / Téléphone</label><input id="ific-wa" placeholder="+229..." required>\
  <button type="submit">Démarrer le chat</button>\
</form></div>\
<div id="ific-inp"><form id="ific-sf">\
  <input id="ific-si" placeholder="'+(CFG.placeholder_text||"Écrivez votre message...")+'" autocomplete="off">\
  <button type="submit"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>\
</form></div>';
  document.body.appendChild(win);

  // Events
  document.getElementById("ific-form").onsubmit=startConv;
  document.getElementById("ific-sf").onsubmit=sendMsg;
}

// ─── Toggle ─────────────────────────────────
function toggleChat(){
  var w=document.getElementById("ific-win");
  OPEN=!OPEN;w.style.display=OPEN?"flex":"none";
  if(OPEN&&!CONV){
    document.getElementById("ific-form-wrap").style.display="block";
  }
}

// ─── Start conversation ─────────────────────
function startConv(e){
  e.preventDefault();
  var fn=document.getElementById("ific-fn").value.trim();
  var wa=document.getElementById("ific-wa").value.trim();
  if(!fn||!wa)return;
  fetch(API+"/start-conversation",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},
    body:JSON.stringify({fullName:fn,whatsapp:wa})
  }).then(function(r){return r.json()}).then(function(d){
    if(d.conversationId){
      CONV=d.conversationId;VID=d.visitorId;
      document.getElementById("ific-form-wrap").style.display="none";
      document.getElementById("ific-inp").style.display="block";
      document.getElementById("ific-welc").style.display="none";
      // Save to localStorage
      try{localStorage.setItem("ific_"+CID,JSON.stringify({conv:CONV,vid:VID,fn:fn}))}catch(e){}
      startPolling();
      document.getElementById("ific-si").focus();
    }
  }).catch(function(err){console.error("ifiChat:",err)});
}

// ─── Send message ───────────────────────────
function sendMsg(e){
  e.preventDefault();
  var inp=document.getElementById("ific-si");
  var txt=inp.value.trim();if(!txt||!CONV)return;
  inp.value="";
  addBubble(txt,"mc");
  fetch(API+"/send-message",{method:"POST",headers:{"Content-Type":"application/json","x-client-id":CID},
    body:JSON.stringify({conversationId:CONV,visitorId:VID,content:txt,sender:"visitor"})
  }).catch(function(err){console.error("ifiChat:",err)});
}

// ─── Add bubble ─────────────────────────────
function addBubble(txt,cls){
  var box=document.getElementById("ific-msgs");
  var d=document.createElement("div");d.className="ific-m "+cls;d.textContent=txt;
  box.appendChild(d);box.scrollTop=box.scrollHeight;
}

// ─── Poll for new messages ──────────────────
function startPolling(){
  if(POLL)return;
  POLL=setInterval(function(){
    if(!CONV)return;
    fetch(API+"/messages/"+CONV).then(function(r){return r.json()}).then(function(d){
      if(!d.messages)return;
      var box=document.getElementById("ific-msgs");
      var newMsgs=d.messages.filter(function(m){
        return !MSGS.some(function(e){return e.id===m.id});
      });
      newMsgs.forEach(function(m){
        MSGS.push(m);
        if(m.sender==="client"){addBubble(m.content,"mv")}
      });
      // Badge for unread when closed
      if(!OPEN){
        var unread=newMsgs.filter(function(m){return m.sender==="client"}).length;
        if(unread>0){
          var b=document.getElementById("ific-badge");
          b.textContent=unread;b.style.display="flex";
        }
      }
    }).catch(function(){});
  },3000);
}

// ─── Restore session ────────────────────────
function restoreSession(){
  try{
    var saved=JSON.parse(localStorage.getItem("ific_"+CID));
    if(saved&&saved.conv){
      CONV=saved.conv;VID=saved.vid;
      document.getElementById("ific-form-wrap").style.display="none";
      document.getElementById("ific-inp").style.display="block";
      document.getElementById("ific-welc").style.display="none";
      // Load existing messages
      fetch(API+"/messages/"+CONV).then(function(r){return r.json()}).then(function(d){
        if(!d.messages)return;
        d.messages.forEach(function(m){
          MSGS.push(m);
          addBubble(m.content,m.sender==="visitor"?"mc":"mv");
        });
      });
      startPolling();
    }
  }catch(e){}
}

// ─── Init ───────────────────────────────────
loadConfig(function(){
  injectCSS();buildUI();restoreSession();
});
})();
