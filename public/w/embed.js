// ============================================
// ifiChat — Widget Embed Script
// Served at: https://chat.ifiaas.com/w/[client-id].js
// ============================================
(function () {
  "use strict";
  var s = document.currentScript;
  if (!s) return;
  var m = (s.getAttribute("src") || "").match(/\/w\/([^.]+)\.js/);
  if (!m) return;
  var CID = m[1];
  var BASE = s.getAttribute("data-api") || "https://chat.ifiaas.com";

  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }
    var root = document.createElement("div");
    root.id = "ifichat-widget";
    root.setAttribute("data-client-id", CID);
    document.body.appendChild(root);

    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = BASE + "/widget.css";
    document.head.appendChild(link);

    var script = document.createElement("script");
    script.src = BASE + "/widget-bundle.js";
    script.async = true;
    script.onload = function () {
      if (window.IfiChatWidget) {
        window.IfiChatWidget.mount(root, { clientId: CID, apiBase: BASE });
      }
    };
    document.body.appendChild(script);
  }
  init();
})();
