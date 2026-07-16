/* AI PULSE - article page: renders one story from news-index.json in the chosen language */
(function () {
  const LS_KEY = "ai-pulse-lang";
  let lang = localStorage.getItem(LS_KEY) === "bg" ? "bg" : "en";
  let item = null;

  const $ = (id) => document.getElementById(id);
  const slug = new URLSearchParams(location.search).get("slug");

  const UI = {
    en: {
      htmlLang: "en",
      tagline: "Curated AI news from leading publications and AI labs — summarized daily",
      back: "← All news",
      readAt: (s) => `Read the original at ${s} →`,
      footer: "AI PULSE — hand-picked AI news, summarized with Claude. Each story links to its original source.",
      notFound: "Article not found.",
    },
    bg: {
      htmlLang: "bg",
      tagline: "Подбрани AI новини от водещи издания и AI лаборатории — обобщени всеки ден",
      back: "← Всички новини",
      readAt: (s) => `Прочети оригинала в ${s} →`,
      footer: "AI PULSE — ръчно подбрани AI новини, обобщени с Claude. Всяка новина води към оригиналния източник.",
      notFound: "Новината не е намерена.",
    },
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return d && m ? `${d}.${m}.${y}` : y;
  };

  function render() {
    const u = UI[lang];
    document.documentElement.lang = u.htmlLang;
    $("tagline").textContent = u.tagline;
    $("backlink").textContent = u.back;
    $("footer-text").textContent = u.footer;
    document.querySelectorAll("#lang-toggle button").forEach((b) =>
      b.classList.toggle("active", b.dataset.lang === lang));

    if (!item) {
      $("title").textContent = u.notFound;
      return;
    }
    const t = item[lang];
    document.title = `${t.title} — GATE AI PULSE`;
    $("hero").src = item.image;
    $("hero").alt = t.title;
    $("title").textContent = t.title;
    $("date").textContent = fmtDate(item.published);
    const badge = $("src-badge");
    badge.textContent = item.source;
    badge.href = item.sourceUrl;

    // intro (lead) styled, then body paragraphs
    const body = $("body");
    body.innerHTML = "";
    const intro = document.createElement("p");
    intro.className = "intro";
    intro.textContent = t.lead;
    body.appendChild(intro);
    (t.body || []).forEach((para) => {
      const p = document.createElement("p");
      p.textContent = para;
      body.appendChild(p);
    });

    $("keywords").innerHTML = (t.keywords || [])
      .map((k) => `<span></span>`).join("");
    [...$("keywords").children].forEach((el, i) => { el.textContent = t.keywords[i]; });

    const cta = $("cta");
    cta.textContent = u.readAt(item.source);
    cta.href = item.sourceUrl;
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    localStorage.setItem(LS_KEY, lang);
    render();
  }

  document.querySelectorAll("#lang-toggle button").forEach((b) =>
    b.addEventListener("click", () => setLang(b.dataset.lang)));

  fetch("data/news-index.json", { cache: "no-store" })
    .then((r) => r.json())
    .then((data) => {
      item = (data.items || []).find((x) => x.slug === slug) || null;
      render();
    })
    .catch(() => { $("title").textContent = "Could not load the article."; });
})();
