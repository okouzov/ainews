/* AI PULSE - home page: grid, search, pagination */
(function () {
  const PER_PAGE = 12;
  let ALL = [];
  let page = Math.max(1, parseInt(new URLSearchParams(location.search).get("page") || "1", 10) || 1);

  const $ = (id) => document.getElementById(id);
  const grid = $("grid"), pager = $("pager"), statusEl = $("status");

  const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return d && m ? `${d}.${m}.${y}` : y;
  };

  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function card(item) {
    return `<a class="card" href="news/${esc(item.slug)}.html">
      <div class="thumb"><img src="images/${esc(item.slug)}.svg" alt="" loading="lazy"></div>
      <div class="card-body">
        <h3>${esc(item.title)}</h3>
        <p class="lead">${esc(item.lead)}</p>
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
    return (f.title && (item.title || "").toLowerCase().includes(q))
      || (f.description && (item.lead || "").toLowerCase().includes(q))
      || (f.keywords && (item.keywords || []).join(" ").toLowerCase().includes(q))
      || (f.text && (item.text || "").toLowerCase().includes(q));
  }

  function render() {
    const q = $("q").value.trim().toLowerCase();

    if (q) {
      const hits = ALL.filter((it) => matches(it, q, fields()));
      statusEl.hidden = false;
      statusEl.innerHTML = `${hits.length} result${hits.length === 1 ? "" : "s"} for &ldquo;${esc(q)}&rdquo;
        <button type="button" id="clear-q">Clear</button>`;
      $("clear-q").onclick = () => { $("q").value = ""; render(); };
      grid.innerHTML = hits.map(card).join("") || "";
      pager.innerHTML = "";
      if (!hits.length) grid.innerHTML = `<p class="empty">Nothing found. Try different words or enable &ldquo;in Text&rdquo;.</p>`;
      return;
    }

    statusEl.hidden = true;
    statusEl.innerHTML = "";
    const pages = Math.max(1, Math.ceil(ALL.length / PER_PAGE));
    page = Math.min(page, pages);
    const slice = ALL.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    grid.innerHTML = slice.map(card).join("") || `<p class="empty">No news published yet.</p>`;

    if (pages > 1) {
      pager.innerHTML = `
        <button type="button" id="pg-prev" ${page <= 1 ? "disabled" : ""}>&larr; Newer</button>
        <span>Page ${page} of ${pages}</span>
        <button type="button" id="pg-next" ${page >= pages ? "disabled" : ""}>Older &rarr;</button>`;
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

  let debounce;
  function wireSearch() {
    $("q").addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(render, 160);
    });
    ["f-title", "f-desc", "f-keys", "f-text"].forEach((id) =>
      $(id).addEventListener("change", render));
  }

  fetch("data/news-index.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      ALL = (data.items || []).slice().sort((a, b) =>
        b.added === a.added
          ? (b.published || "").localeCompare(a.published || "")
          : (b.added || "").localeCompare(a.added || ""));
      wireSearch();
      render();
    })
    .catch(() => { grid.innerHTML = `<p class="empty">Could not load the news index.</p>`; });
})();
