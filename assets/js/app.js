/* AI PULSE - home page: bilingual grid, search, pagination, language toggle */
(function () {
  const PER_PAGE = 12;
  const LS_KEY = "ai-pulse-lang";
  let ALL = [];
  let lang = localStorage.getItem(LS_KEY) === "bg" ? "bg" : "en";
  let page = Math.max(1, parseInt(new URLSearchParams(location.search).get("page") || "1", 10) || 1);

  const $ = (id) => document.getElementById(id);
  const grid = $("grid"), pager = $("pager"), statusEl = $("status");

  const UI = {
    en: {
      htmlLang: "en",
      tagline: "Curated AI news from leading publications and AI labs — summarized daily",
      search: "Search",
      inTitle: "in Title", inDesc: "in Description", inKeys: "in Keywords", inText: "in Text",
      newer: "← Newer", older: "Older →",
      pageOf: (a, b) => `Page ${a} of ${b}`,
      results: (n, q) => `${n} result${n === 1 ? "" : "s"} for “${q}”`,
      clear: "Clear",
      nothing: "Nothing found. Try different words or enable “in Text”.",
      empty: "No news published yet.",
      footer: "AI PULSE — hand-picked AI news, summarized with Claude. Each story links to its original source.",
    },
    bg: {
      htmlLang: "bg",
      tagline: "Подбрани AI новини от водещи издания и AI лаборатории — обобщени всеки ден",
      search: "Търсене",
      inTitle: "в заглавието", inDesc: "в описанието", inKeys: "в ключови думи", inText: "в текста",
      newer: "← По-нови", older: "По-стари →",
      pageOf: (a, b) => `Страница ${a} от ${b}`,
      results: (n, q) => `${n} ${n === 1 ? "резултат" : "резултата"} за „${q}“`,
      clear: "Изчисти",
      nothing: "Няма намерени резултати. Опитай други думи или включи „в текста“.",
      empty: "Още няма публикувани новини.",
      footer: "AI PULSE — ръчно подбрани AI новини, обобщени с Claude. Всяка новина води към оригиналния източник.",
    },
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return d && m ? `${d}.${m}.${y}` : y;
  };

  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function card(item) {
    const t = item[lang];
    return `<a class="card" href="article.html?slug=${encodeURIComponent(item.slug)}">
      <div class="thumb"><img src="${esc(item.image)}" alt="" loading="lazy"></div>
      <div class="card-body">
        <h3>${esc(t.title)}</h3>
        <p class="lead">${esc(t.lead)}</p>
        <div class="meta"><span>${fmtDate(item.published)}</span><span class="src">${esc(item.source)}</span></div>
      </div>
    </a>`;
  }

  function fields() {
    return {
      title: $("f-title").checked,
      description: $("f-desc").checked,
      keywords: $("f-keys").checked,
      text: $("f-text").checked,
    };
  }

  function matches(item, q, f) {
    const t = item[lang];
    return (f.title && (t.title || "").toLowerCase().includes(q))
      || (f.description && (t.lead || "").toLowerCase().includes(q))
      || (f.keywords && (t.keywords || []).join(" ").toLowerCase().includes(q))
      || (f.text && (t.body || []).join(" ").toLowerCase().includes(q));
  }

  function applyStaticI18n() {
    const u = UI[lang];
    document.documentElement.lang = u.htmlLang;
    $("tagline").textContent = u.tagline;
    $("q").placeholder = u.search;
    $("lbl-title").textContent = u.inTitle;
    $("lbl-desc").textContent = u.inDesc;
    $("lbl-keys").textContent = u.inKeys;
    $("lbl-text").textContent = u.inText;
    $("footer-text").textContent = u.footer;
    document.querySelectorAll("#lang-toggle button").forEach((b) =>
      b.classList.toggle("active", b.dataset.lang === lang));
  }

  function render() {
    const u = UI[lang];
    const q = $("q").value.trim().toLowerCase();

    if (q) {
      const hits = ALL.filter((it) => matches(it, q, fields()));
      statusEl.hidden = false;
      statusEl.innerHTML = `${u.results(hits.length, esc(q))} <button type="button" id="clear-q">${u.clear}</button>`;
      $("clear-q").onclick = () => { $("q").value = ""; render(); };
      grid.innerHTML = hits.map(card).join("") || `<p class="empty">${u.nothing}</p>`;
      pager.innerHTML = "";
      return;
    }

    statusEl.hidden = true;
    statusEl.innerHTML = "";
    const pages = Math.max(1, Math.ceil(ALL.length / PER_PAGE));
    page = Math.min(page, pages);
    const slice = ALL.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    grid.innerHTML = slice.map(card).join("") || `<p class="empty">${u.empty}</p>`;

    if (pages > 1) {
      pager.innerHTML = `
        <button type="button" id="pg-prev" ${page <= 1 ? "disabled" : ""}>${u.newer}</button>
        <span>${u.pageOf(page, pages)}</span>
        <button type="button" id="pg-next" ${page >= pages ? "disabled" : ""}>${u.older}</button>`;
      $("pg-prev").onclick = () => { page--; syncUrl(); render(); scrollTo({ top: 0, behavior: "smooth" }); };
      $("pg-next").onclick = () => { page++; syncUrl(); render(); scrollTo({ top: 0, behavior: "smooth" }); };
    } else {
      pager.innerHTML = "";
    }
  }

  function syncUrl() {
    const url = page > 1 ? `?page=${page}` : location.pathname;
    history.replaceState(null, "", url);
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    localStorage.setItem(LS_KEY, lang);
    applyStaticI18n();
    render();
  }

  let debounce;
  function wire() {
    $("q").addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(render, 160);
    });
    ["f-title", "f-desc", "f-keys", "f-text"].forEach((id) =>
      $(id).addEventListener("change", render));
    document.querySelectorAll("#lang-toggle button").forEach((b) =>
      b.addEventListener("click", () => setLang(b.dataset.lang)));
  }

  fetch("data/news-index.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      ALL = (data.items || []).slice().sort((a, b) =>
        b.added === a.added
          ? (b.published || "").localeCompare(a.published || "")
          : (b.added || "").localeCompare(a.added || ""));
      applyStaticI18n();
      wire();
      render();
    })
    .catch(() => { grid.innerHTML = `<p class="empty">Could not load the news index.</p>`; });
})();
