// ─── RUNTIME CONFIG ─────────────────────────────────
// Nothing secret goes here. The Groq API key lives only in
// the backend's environment (see api/chat.js / server.js).

(function () {
  var isLocal = ['localhost', '127.0.0.1', ''].indexOf(location.hostname) !== -1;

  window.DDM_CONFIG = {
    // Where the AI backend lives.
    //  • Local dev: `node server.js` serves the site AND /api/chat on :8787,
    //    so same-origin works automatically.
    //  • Production (e.g. GitHub Pages): replace the ''  below with your
    //    deployed backend origin, e.g. 'https://your-app.vercel.app'.
    //    Leave it '' to disable the AI tabs cleanly.
    apiBase: isLocal ? location.origin : '',

    // Client-side guards (the backend enforces its own limits too).
    maxChatChars:     500,
    maxChatHistory:   12,
    maxSequenceChars: 500,
    requestTimeoutMs: 20000
  };
})();
