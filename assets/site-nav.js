/* LAUNCH site menu: the one place the list of views lives.
 *
 * Load it at the top of <body>, where the bar should appear, and say which page
 * it is on:
 *   <script src="assets/site-nav.js" data-current="pipeline"></script>
 *
 * It builds a top bar ("LAUNCH" plus one link per view, the current one marked)
 * and, on a phone, collapses the links into a "Views" button. It scrolls away with
 * the page and is hidden in print. Colours come from each page's own tokens
 * (--surface, --line, --accent, --ink-2 ...) with the dashboard's values as
 * fallbacks, so the bar matches whichever page hosts it.
 *
 * A page can align the bar with its own content column by setting
 * --nav-pad (side padding) and --nav-max (inner width) on :root.
 *
 * Language switch (opt-in): add data-languages="en,fr,pt" to the script tag and the
 * bar gets a language button at its right-hand end. Only the illustrated journey
 * page has translated copies, so only that page asks for it. Which languages are
 * live is set in LANGS below, or at run time with
 *   window.LAUNCH_LOCALES_LIVE = { fr: true, pt: true }   (before this script)
 * A language that is not live shows as "coming soon" rather than linking to a page
 * that does not exist yet.
 *
 * LANGS keeps fr and pt off on purpose: the fr/ and pt/ folders exist only in a
 * build. scripts/build-public-site.sh writes them, and then prepends that
 * window.LAUNCH_LOCALES_LIVE line to every copy of this file in its output, so
 * the deployed site (Vercel, production and previews) links them. The repo
 * served as it is keeps "coming soon".
 */
(function () {
  "use strict";

  var PAGES = [
    { id: "illustrated", href: "illustrated-journey-dashboard.html", name: "Illustrated journey", desc: "Follow each medicine through the seven steps to patients." },
    { id: "pipeline", href: "pipeline.html", name: "Pipeline", desc: "Where each product is, trial to launch." },
    { id: "story", href: "story.html", name: "Story", desc: "How long each medicine waited." }
  ];

  var script = document.currentScript;
  if (!script || !script.parentNode) return;
  var current = script.getAttribute("data-current") || "";

  // Translated copies are written by scripts/build-locale-pages.js to fr/ and pt/ folders
  // beside the English page. Flip `live` to true once those folders are deployed.
  var LANGS = [
    { code: "en", name: "English", live: true },
    { code: "fr", name: "Fran\u00e7ais", live: false },
    { code: "pt", name: "Portugu\u00eas", live: false }
  ];
  var liveOverride = window.LAUNCH_LOCALES_LIVE || {};
  LANGS.forEach(function (l) { if (liveOverride[l.code] !== undefined) l.live = !!liveOverride[l.code]; });
  var wanted = (script.getAttribute("data-languages") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  var langs = LANGS.filter(function (l) { return wanted.indexOf(l.code) >= 0; });
  // A translated copy declares its language on <html lang>; the English page says "en".
  var curLang = ((document.documentElement.lang || "en").toLowerCase().split("-")[0]);
  if (!LANGS.some(function (l) { return l.code === curLang; })) curLang = "en";

  // The Unitaid and synthetic editions are generated copies in subfolders and do
  // not include the illustrated journey page, so leave it out there rather than
  // link to a page that is not built.
  if (/\/(unitaid|synthetic)\//.test(location.pathname)) {
    PAGES = PAGES.filter(function (p) { return p.id !== "illustrated"; });
  }

  var CSS = [
    ".sitenav{position:relative;display:block;background:var(--surface,#fff);border-bottom:1px solid var(--line,#DCE3E7);padding-inline:var(--nav-pad,clamp(24px,4vw,64px));font:15px/1.5 -apple-system,'Segoe UI',system-ui,Roboto,'Helvetica Neue',sans-serif}",
    ".sitenav .sn-in{display:flex;align-items:stretch;max-width:var(--nav-max,none);margin-inline:auto}",
    ".sitenav .sn-brand{display:flex;align-items:center;margin-right:6px;padding:10px 14px 10px 0;border-right:1px solid var(--line,#DCE3E7);font-size:14px;font-weight:800;letter-spacing:.02em;color:var(--accent,#0F5A72)}",
    ".sitenav ul{list-style:none;margin:0;padding:0;display:flex;gap:2px;min-width:0;overflow-x:auto}",
    ".sitenav li a{display:flex;align-items:center;height:100%;padding:10px 14px;text-decoration:none;white-space:nowrap;font-size:13.5px;font-weight:600;color:var(--ink-2,#3F5564)}",
    ".sitenav li a:hover{color:var(--accent,#0F5A72)}",
    ".sitenav li a[aria-current=page]{color:var(--accent,#0F5A72);box-shadow:inset 0 -3px 0 var(--accent,#0F5A72)}",
    ".sitenav a:focus-visible,.sitenav .sn-views:focus-visible{outline:2px solid var(--accent,#0F5A72);outline-offset:-2px}",
    ".sitenav .sn-views{display:none;margin-left:auto;align-self:center;align-items:center;gap:6px;background:var(--surface,#fff);border:1px solid var(--line,#DCE3E7);border-radius:8px;padding:6px 12px;font:inherit;font-size:13px;font-weight:650;color:var(--accent,#0F5A72);cursor:pointer}",
    ".sitenav .sn-views[aria-expanded=true]{background:var(--accent-soft,#E6F1F4);border-color:var(--accent,#0F5A72)}",
    ".sitenav .sn-pop{display:none;position:absolute;left:0;right:0;top:100%;z-index:30;background:var(--surface,#fff);border-bottom:1px solid var(--line,#DCE3E7);box-shadow:var(--shadow,0 8px 24px rgba(22,48,63,.08));padding:4px 14px 10px}",
    ".sitenav .sn-pop.open{display:block}",
    ".sitenav .sn-pop a{display:block;padding:9px 4px;border-bottom:1px solid var(--line,#DCE3E7);text-decoration:none;font-size:14px;font-weight:650;color:var(--ink,#16303F)}",
    ".sitenav .sn-pop a:last-child{border-bottom:0}",
    ".sitenav .sn-pop a small{display:block;font-weight:400;font-size:12px;color:var(--ink-3,#566A77)}",
    ".sitenav .sn-pop a[aria-current=page]{color:var(--accent,#0F5A72)}",
    ".sitenav .sn-lang{position:relative;margin-left:auto;align-self:center}",
    ".sitenav .sn-lbtn{display:inline-flex;align-items:center;gap:7px;background:var(--surface,#fff);border:1px solid var(--line,#DCE3E7);border-radius:8px;padding:6px 11px;font:inherit;font-size:13px;font-weight:650;color:var(--ink-2,#3F5564);cursor:pointer}",
    ".sitenav .sn-lbtn:hover,.sitenav .sn-lbtn[aria-expanded=true]{border-color:var(--accent,#0F5A72);color:var(--accent,#0F5A72)}",
    ".sitenav .sn-lbtn:focus-visible,.sitenav .sn-lmenu a:focus-visible{outline:2px solid var(--accent,#0F5A72);outline-offset:2px}",
    ".sitenav .sn-lcode{display:none}",
    ".sitenav .sn-lmenu{display:none;position:absolute;right:0;top:calc(100% + 6px);z-index:40;min-width:180px;background:var(--surface,#fff);border:1px solid var(--line,#DCE3E7);border-radius:10px;box-shadow:var(--shadow,0 8px 24px rgba(22,48,63,.12));padding:4px}",
    ".sitenav .sn-lmenu.open{display:block}",
    ".sitenav .sn-lmenu a,.sitenav .sn-lmenu .sn-off{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:8px 10px;border-radius:7px;text-decoration:none;font-size:14px;font-weight:600;color:var(--ink,#16303F)}",
    ".sitenav .sn-lmenu a:hover{background:var(--accent-soft,#E6F1F4)}",
    ".sitenav .sn-lmenu a[aria-current=true]{color:var(--accent,#0F5A72)}",
    ".sitenav .sn-lmenu a[aria-current=true]::after{content:'\\2713';font-weight:800}",
    ".sitenav .sn-lmenu .sn-off{color:var(--ink-3,#566A77);cursor:default}",
    ".sitenav .sn-lmenu .sn-off small{font-weight:400;font-size:12px}",
    "@media (max-width:640px){.sitenav{padding-inline:14px}.sitenav ul{display:none}.sitenav .sn-views{display:inline-flex}.sitenav .sn-lang{margin-left:8px}}",
    "@media (max-width:480px){.sitenav .sn-lname{display:none}.sitenav .sn-lcode{display:inline}.sitenav .sn-vp{display:none}.sitenav .sn-views{white-space:nowrap}}",
    "@media print{.sitenav{display:none!important}}"
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  var cur = PAGES.filter(function (p) { return p.id === current; })[0] || PAGES[0];
  // Inside fr/ or pt/ only the translated page itself exists, so the other views link up to the English ones.
  function pageHref(p) { return curLang !== "en" && p.id !== current ? "../" + p.href : p.href; }
  // Where the same page lives in another language.
  function langHref(code) {
    if (code === curLang) return cur.href;
    var up = curLang === "en" ? "" : "../";
    return up + (code === "en" ? "" : code + "/") + cur.href;
  }
  var curLangName = (LANGS.filter(function (l) { return l.code === curLang; })[0] || LANGS[0]).name;
  var langHtml = !langs.length ? "" :
    '<div class="sn-lang">' +
      '<button class="sn-lbtn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="sn-lmenu" aria-label="Language: ' + esc(curLangName) + '">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.7 3.9 5.7 3.9 9s-1.3 6.3-3.9 9c-2.6-2.7-3.9-5.7-3.9-9S9.4 5.7 12 3z"/></svg>' +
        '<span class="sn-lname">' + esc(curLangName) + '</span><span class="sn-lcode">' + curLang.toUpperCase() + '</span><span aria-hidden="true">\u25be</span></button>' +
      '<div class="sn-lmenu" id="sn-lmenu">' + langs.map(function (l) {
        if (l.code === curLang) return '<a href="' + langHref(l.code) + '" lang="' + l.code + '" hreflang="' + l.code + '" aria-current="true">' + esc(l.name) + '</a>';
        if (!l.live) return '<span class="sn-off" lang="' + l.code + '" aria-disabled="true">' + esc(l.name) + '<small>coming soon</small></span>';
        return '<a href="' + langHref(l.code) + '" lang="' + l.code + '" hreflang="' + l.code + '">' + esc(l.name) + '</a>';
      }).join("") + '</div>' +
    '</div>';

  var nav = document.createElement("nav");
  nav.className = "sitenav";
  nav.setAttribute("aria-label", "LAUNCH views");
  nav.innerHTML =
    '<div class="sn-in">' +
      '<span class="sn-brand">LAUNCH</span>' +
      "<ul>" + PAGES.map(function (p) {
        return '<li><a href="' + pageHref(p) + '"' + (p.id === current ? ' aria-current="page"' : "") + ">" + esc(p.name) + "</a></li>";
      }).join("") + "</ul>" +
      '<button class="sn-views" type="button" aria-expanded="false" aria-controls="sn-pop"><span class="sn-vp">Views: </span>' + esc(cur.name) + ' <span aria-hidden="true">▾</span></button>' + langHtml +
    "</div>" +
    '<div class="sn-pop" id="sn-pop">' + PAGES.map(function (p) {
      return '<a href="' + pageHref(p) + '"' + (p.id === current ? ' aria-current="page"' : "") + ">" + esc(p.name) + "<small>" + esc(p.desc) + "</small></a>";
    }).join("") + "</div>";
  // Normally the script sits inside <body> and the bar goes right where it is. A
  // page that has no <body> tag, loading this before any content, would have the
  // parser park the script in <head>, where a bar cannot show; in that case put the
  // bar at the very top of the body once it exists.
  if (script.parentNode === document.head) {
    document.addEventListener("DOMContentLoaded", function () { document.body.insertBefore(nav, document.body.firstChild); });
  } else {
    script.parentNode.insertBefore(nav, script);
  }

  var btn = nav.querySelector(".sn-views"), pop = nav.querySelector(".sn-pop");
  btn.addEventListener("click", function () {
    var open = btn.getAttribute("aria-expanded") !== "true";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    pop.classList.toggle("open", open);
  });
  var lbtn = nav.querySelector(".sn-lbtn"), lmenu = nav.querySelector(".sn-lmenu");
  function setLang(open) { lbtn.setAttribute("aria-expanded", open ? "true" : "false"); lmenu.classList.toggle("open", open); }
  if (lbtn) {
    lbtn.addEventListener("click", function (ev) { ev.stopPropagation(); setLang(lbtn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("click", function (ev) { if (!lmenu.contains(ev.target)) setLang(false); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && lmenu.classList.contains("open")) { setLang(false); lbtn.focus(); } });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pop.classList.contains("open")) {
      pop.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    }
  });
})();
