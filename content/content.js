(() => {
  if (window.__ssdDomainScore) return;
  window.__ssdDomainScore = true;

  const ENDPOINT = "https://www.spaceship.com/gateway/api/v1/instantsearch-domainscore/domains/getScores";
  const BATCH_SIZE = 30;
  const CACHE_LIMIT = 2000;
  const STORAGE_KEY = "ssd-domain-scores-v1";
  const SEARCH_PATH = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?domain-search(?:\/|$)/i;
  const DOMAIN_RE = /^(?=.{1,253}$)(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+[\p{L}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;

  const COPY = {
    en: { title: "Domain score", brand: "Brand fit", demand: "Market demand", memory: "Memorability", loading: "Scoring", unavailable: "No score" },
    zh: { title: "域名评分", brand: "品牌适配度", demand: "市场需求", memory: "易记性", loading: "评分中", unavailable: "暂无评分" },
    "zh-hk": { title: "域名評分", brand: "品牌適配度", demand: "市場需求", memory: "易記性", loading: "評分中", unavailable: "暫無評分" },
    ja: { title: "ドメインスコア", brand: "ブランド適合度", demand: "市場需要", memory: "覚えやすさ", loading: "採点中", unavailable: "スコアなし" },
    ko: { title: "도메인 점수", brand: "브랜드 적합성", demand: "시장 수요", memory: "기억하기 쉬움", loading: "채점 중", unavailable: "점수 없음" },
    de: { title: "Domain-Score", brand: "Markenfit", demand: "Marktnachfrage", memory: "Einprägsamkeit", loading: "Bewertung", unavailable: "Kein Score" },
    es: { title: "Puntuación", brand: "Ajuste de marca", demand: "Demanda de mercado", memory: "Memorabilidad", loading: "Calculando", unavailable: "Sin puntuación" },
    fr: { title: "Score du domaine", brand: "Adéquation marque", demand: "Demande du marché", memory: "Mémorabilité", loading: "Calcul", unavailable: "Pas de score" },
    it: { title: "Punteggio", brand: "Adattamento al brand", demand: "Domanda di mercato", memory: "Memorabilità", loading: "Calcolo", unavailable: "Nessun punteggio" },
    nl: { title: "Domeinscore", brand: "Merkfit", demand: "Marktvraag", memory: "Memorabiliteit", loading: "Beoordelen", unavailable: "Geen score" },
    pt: { title: "Pontuação", brand: "Adequação à marca", demand: "Procura de mercado", memory: "Memorabilidade", loading: "A calcular", unavailable: "Sem pontuação" },
    pl: { title: "Ocena domeny", brand: "Dopasowanie marki", demand: "Popyt rynkowy", memory: "Łatwość zapamiętania", loading: "Liczenie", unavailable: "Brak oceny" },
    tr: { title: "Alan adı skoru", brand: "Marka uyumu", demand: "Pazar talebi", memory: "Akılda kalıcılık", loading: "Hesaplanıyor", unavailable: "Skor yok" },
    vi: { title: "Điểm tên miền", brand: "Độ hợp thương hiệu", demand: "Nhu cầu thị trường", memory: "Dễ nhớ", loading: "Đang chấm", unavailable: "Chưa có điểm" },
    th: { title: "คะแนนโดเมน", brand: "ความเข้ากันของแบรนด์", demand: "ความต้องการตลาด", memory: "จดจำง่าย", loading: "กำลังให้คะแนน", unavailable: "ไม่มีคะแนน" },
    id: { title: "Skor domain", brand: "Kesesuaian merek", demand: "Permintaan pasar", memory: "Mudah diingat", loading: "Menilai", unavailable: "Tidak ada skor" },
    uk: { title: "Оцінка домену", brand: "Відповідність бренду", demand: "Ринковий попит", memory: "Запам'ятовуваність", loading: "Оцінювання", unavailable: "Немає оцінки" },
    cs: { title: "Skóre domény", brand: "Shoda se značkou", demand: "Tržní poptávka", memory: "Zapamatovatelnost", loading: "Hodnocení", unavailable: "Bez skóre" },
    sv: { title: "Domänpoäng", brand: "Varumärkespassning", demand: "Marknadsefterfrågan", memory: "Minnesvärdhet", loading: "Beräknar", unavailable: "Ingen poäng" },
    nb: { title: "Domenescore", brand: "Merketilpasning", demand: "Markedsetterspørsel", memory: "Minneverdighet", loading: "Beregner", unavailable: "Ingen score" },
    ro: { title: "Scor domeniu", brand: "Potrivire de brand", demand: "Cerere de piață", memory: "Memorabilitate", loading: "Se calculează", unavailable: "Fără scor" },
    hu: { title: "Domainpont", brand: "Márkailleszkedés", demand: "Piaci kereslet", memory: "Megjegyezhetőség", loading: "Pontozás", unavailable: "Nincs pont" },
    el: { title: "Βαθμολογία", brand: "Ταίριασμα brand", demand: "Ζήτηση αγοράς", memory: "Απομνημόνευση", loading: "Υπολογισμός", unavailable: "Χωρίς βαθμό" },
    hi: { title: "डोमेन स्कोर", brand: "ब्रांड फिट", demand: "बाज़ार मांग", memory: "याद रखने में आसान", loading: "स्कोर हो रहा है", unavailable: "कोई स्कोर नहीं" },
    bn: { title: "ডোমেইন স্কোর", brand: "ব্র্যান্ড মিল", demand: "বাজার চাহিদা", memory: "মনে রাখা সহজ", loading: "স্কোর হচ্ছে", unavailable: "স্কোর নেই" },
    bg: { title: "Оценка на домейна", brand: "Съответствие с марката", demand: "Пазарно търсене", memory: "Запомняемост", loading: "Оценяване", unavailable: "Няма оценка" }
  };

  const cache = new Map();
  const pending = new Set();
  const queue = new Set();
  let flushing = false;
  let scanTimer = 0;
  let flushTimer = 0;
  let retryTimer = 0;
  let saveTimer = 0;
  let hideTimer = 0;
  let lastHref = location.href;
  let activeBadge = null;
  let tip = null;

  function detectLocale() {
    const match = location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(?=\/)/i);
    return (match ? match[1] : document.documentElement.lang || "en").toLowerCase();
  }

  function strings() {
    const locale = detectLocale();
    if (COPY[locale]) return COPY[locale];
    if (locale.startsWith("zh")) {
      return locale.includes("hk") || locale.includes("tw") || locale.includes("mo") || locale.includes("hant")
        ? COPY["zh-hk"]
        : COPY.zh;
    }
    return COPY[locale.split("-")[0]] || COPY.en;
  }

  function isSearchPage() {
    return SEARCH_PATH.test(location.pathname);
  }

  function syncTheme() {
    const bodyStyle = getComputedStyle(document.body);
    const scheme = `${bodyStyle.colorScheme || ""} ${getComputedStyle(document.documentElement).colorScheme || ""}`;
    let dark = scheme.includes("dark");
    if (!scheme.includes("light") && !dark) {
      const match = bodyStyle.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const luminance = 0.2126 * Number(match[1]) + 0.7152 * Number(match[2]) + 0.0722 * Number(match[3]);
        dark = luminance > 180;
      }
    }
    const next = dark ? "dark" : "light";
    if (document.documentElement.dataset.ssdTheme !== next) {
      document.documentElement.dataset.ssdTheme = next;
    }
  }

  function normalizeDomain(value) {
    return String(value || "").trim().replace(/\.$/, "").replace(/\s+/g, "").toLowerCase();
  }

  function isDomain(value) {
    return DOMAIN_RE.test(value);
  }

  function tone(score) {
    if (score < 40) return "low";
    if (score <= 70) return "mid";
    return "high";
  }

  function readDomain(root) {
    const label = root.querySelector("[data-zid='instantSearchDomainNameLabel'], .domain-name-label, .main-result-domain-label");
    const tld = root.querySelector("[data-zid='instantSearchDomainNameTld'], .domain-name-tld, .main-result-domain-tld");
    if (!label || !tld) return null;
    const left = label.textContent.replace(/\s+/g, "");
    let right = tld.textContent.replace(/\s+/g, "");
    if (!left || !right || left.includes("…") || left.includes("...")) return null;
    if (!right.startsWith(".")) right = `.${right}`;
    const domain = normalizeDomain(left + right);
    return isDomain(domain) ? domain : null;
  }

  function loadCache() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (!stored || typeof stored !== "object") return;
      for (const [domain, item] of Object.entries(stored)) {
        if (item && item.status === "scored" && isDomain(domain)) cache.set(domain, item);
      }
    } catch {
      /* ignore private mode and malformed cache */
    }
  }

  function persistSoon() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        const stored = {};
        for (const [domain, item] of cache) {
          if (item && item.status === "scored") stored[domain] = item;
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      } catch {
        /* ignore quota errors */
      }
    }, 300);
  }

  function remember(domain, item) {
    if (cache.has(domain)) cache.delete(domain);
    cache.set(domain, item);
    while (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
    if (item && item.status === "scored") persistSoon();
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function requestScores(domains, attempt = 0) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: {
        accept: "*/*",
        "content-type": "application/json"
      },
      body: JSON.stringify({ domains })
    });
    const json = await response.json().catch(() => null);
    const retryable = response.status === 429 || response.status >= 500 || !json;
    if (retryable && attempt < 2) {
      await wait(400 * (attempt + 1));
      return requestScores(domains, attempt + 1);
    }
    if (json && Array.isArray(json.items)) return json.items;
    const invalid = json && json.detail && Array.isArray(json.data?.errors);
    if (invalid && domains.length > 1) {
      const mid = Math.ceil(domains.length / 2);
      const [left, right] = await Promise.all([
        requestScores(domains.slice(0, mid), attempt),
        requestScores(domains.slice(mid), attempt)
      ]);
      return [...left, ...right];
    }
    return domains.map((domain) => ({ domain, status: "error" }));
  }

  function enqueue(domain) {
    const current = cache.get(domain);
    if (!domain || pending.has(domain) || queue.has(domain)) return;
    if (current && current.status !== "error") return;
    if (current?.status === "error" && Date.now() - current.at < 8000) return;
    queue.add(domain);
  }

  function scheduleFlush() {
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      if (!flushing) flush();
    }, 100);
  }

  function scheduleRetry() {
    window.clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => {
      let changed = false;
      for (const [domain, item] of cache) {
        if (item?.status === "error" && Date.now() - item.at >= 8000) {
          cache.delete(domain);
          changed = true;
        }
      }
      if (changed) scheduleScan();
    }, 8000);
  }

  async function flush() {
    if (flushing) return;
    flushing = true;
    try {
      while (queue.size) {
        const chunk = [...queue].slice(0, BATCH_SIZE);
        chunk.forEach((domain) => {
          queue.delete(domain);
          pending.add(domain);
        });
        try {
          const items = await requestScores(chunk);
          const byDomain = new Map();
          for (const item of items) {
            if (item?.domain) byDomain.set(normalizeDomain(item.domain), item);
          }
          let failed = false;
          for (const domain of chunk) {
            const item = byDomain.get(domain) || { domain, status: "missing" };
            if (item.status === "error") {
              item.at = Date.now();
              failed = true;
            }
            remember(domain, item);
          }
          if (failed) scheduleRetry();
        } catch {
          const at = Date.now();
          for (const domain of chunk) remember(domain, { domain, status: "error", at });
          scheduleRetry();
        } finally {
          chunk.forEach((domain) => pending.delete(domain));
        }
        apply();
      }
    } finally {
      flushing = false;
      if (queue.size) scheduleFlush();
    }
  }

  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "ssd-tip";
    tip.hidden = true;
    document.documentElement.appendChild(tip);
    return tip;
  }

  function metricNumber(record, key) {
    const value = record?.[key]?.score;
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  function renderTip(badge) {
    const copy = strings();
    const record = cache.get(badge.dataset.domain);
    const node = ensureTip();
    if (!record || record.status !== "scored" || !Number.isFinite(record.overall)) {
      node.innerHTML = `<p class="ssd-tip-empty"></p>`;
      node.querySelector("p").textContent = copy.unavailable;
      return;
    }
    const overall = Math.round(record.overall);
    const rows = [
      [copy.brand, metricNumber(record, "brandability")],
      [copy.demand, metricNumber(record, "marketDemand")],
      [copy.memory, metricNumber(record, "memorability")]
    ];
    node.replaceChildren();
    const title = document.createElement("div");
    title.className = "ssd-tip-title";
    title.textContent = copy.title;
    const layout = document.createElement("div");
    layout.className = "ssd-tip-layout";
    const ring = document.createElement("div");
    ring.className = "ssd-ring";
    ring.style.setProperty("--ssd-value", String(Math.max(0, Math.min(100, overall))));
    ring.style.setProperty("--ssd-color", toneColor(overall));
    const hole = document.createElement("div");
    hole.className = "ssd-ring-hole";
    hole.textContent = `${overall}%`;
    ring.appendChild(hole);
    const metrics = document.createElement("div");
    metrics.className = "ssd-metrics";
    for (const [label, value] of rows) {
      const metric = document.createElement("div");
      const row = document.createElement("div");
      row.className = "ssd-metric-row";
      const name = document.createElement("span");
      name.className = "ssd-metric-label";
      name.textContent = label;
      const score = document.createElement("span");
      score.className = "ssd-metric-value";
      score.textContent = value == null ? "–" : `${value}/100`;
      row.append(name, score);
      const bar = document.createElement("div");
      bar.className = `ssd-bar${value == null ? "" : ` ssd-bar--${tone(value)}`}`;
      const fill = document.createElement("span");
      fill.style.width = `${value == null ? 0 : Math.max(0, Math.min(100, value))}%`;
      bar.appendChild(fill);
      metric.append(row, bar);
      metrics.appendChild(metric);
    }
    layout.append(ring, metrics);
    node.append(title, layout);
  }

  function toneColor(score) {
    const level = tone(score);
    if (level === "low") return "#ef4444";
    if (level === "mid") return "#f59e0b";
    return "#10b981";
  }

  function positionTip(badge) {
    const rect = badge.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const margin = 8;
    let left = rect.right - tipRect.width;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));
    let top = rect.bottom + margin;
    if (top + tipRect.height > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - margin - tipRect.height);
    }
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  function showTip(badge) {
    if (!badge || badge.classList.contains("ssd-score--loading")) return;
    window.clearTimeout(hideTimer);
    activeBadge = badge;
    renderTip(badge);
    tip.hidden = false;
    tip.style.visibility = "hidden";
    positionTip(badge);
    tip.style.visibility = "visible";
  }

  function hideTip() {
    window.clearTimeout(hideTimer);
    activeBadge = null;
    if (tip) tip.hidden = true;
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideTip, 80);
  }

  function badgeFrom(target) {
    const element = target?.nodeType === 1 ? target : target?.parentElement;
    return element?.closest?.(".ssd-score") || null;
  }

  function paint(badge, domain) {
    const copy = strings();
    const record = cache.get(domain);
    let state = "loading";
    let text = "…";
    let label = copy.loading;
    if (record) {
      const overall = Number(record.overall);
      if (record.status === "scored" && Number.isFinite(overall)) {
        const score = Math.round(overall);
        state = tone(score);
        text = String(score);
        label = `${copy.title} ${score}`;
      } else {
        state = "empty";
        text = "–";
        label = copy.unavailable;
      }
    }
    if (badge.dataset.state === state && badge.textContent === text && badge.getAttribute("aria-label") === label) return;
    badge.dataset.state = state;
    badge.textContent = text;
    badge.className = `ssd-score ssd-score--${state}`;
    badge.setAttribute("aria-label", label);
    if (activeBadge === badge && tip && !tip.hidden) renderTip(badge);
    else if (state !== "loading" && badge.matches(":hover")) showTip(badge);
  }

  function placeBadge(parent, domain, after) {
    let badge = after
      ? after.nextElementSibling?.classList?.contains("ssd-score") ? after.nextElementSibling : parent.querySelector(":scope > .ssd-score")
      : parent.querySelector(":scope > .ssd-score");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "ssd-score ssd-score--loading";
      badge.textContent = "…";
    }
    badge.dataset.domain = domain;
    if (after) {
      if (badge.previousElementSibling !== after) after.insertAdjacentElement("afterend", badge);
    } else if (parent.firstElementChild !== badge) {
      parent.prepend(badge);
    }
    paint(badge, domain);
    return badge;
  }

  function anchors() {
    const found = [];
    document.querySelectorAll("[data-zid='instantSearchDomainListItem']").forEach((item) => {
      const domain = readDomain(item);
      const parent = item.querySelector(":scope > .domain-list-item-aside") || item.querySelector(".domain-list-item-pricing");
      if (domain && parent) found.push({ domain, parent });
    });
    const main = document.querySelector("[data-zid='instantSearchMainResult']");
    if (main) {
      const domain = readDomain(main);
      const domainNode = main.querySelector(".main-result-domain, [data-zid='instantSearchMainResultName']");
      const parent = domainNode?.parentElement;
      if (domain && parent) found.push({ domain, parent, after: domainNode });
    }
    return found;
  }

  function clearBadges() {
    document.querySelectorAll(".ssd-score").forEach((badge) => badge.remove());
    hideTip();
  }

  function apply() {
    syncTheme();
    if (!isSearchPage()) {
      clearBadges();
      return;
    }
    const seen = new Set();
    for (const anchor of anchors()) {
      seen.add(placeBadge(anchor.parent, anchor.domain, anchor.after));
      enqueue(anchor.domain);
    }
    document.querySelectorAll(".ssd-score").forEach((badge) => {
      if (!seen.has(badge)) badge.remove();
    });
    if (queue.size && !flushing) scheduleFlush();
  }

  function scheduleScan() {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(apply, 80);
  }

  function onViewportChange() {
    if (!activeBadge || !tip || tip.hidden) return;
    const rect = activeBadge.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      hideTip();
      return;
    }
    positionTip(activeBadge);
  }

  function bindEvents() {
    document.addEventListener("pointerdown", (event) => {
      if (badgeFrom(event.target)) event.stopPropagation();
    }, true);
    document.addEventListener("mousedown", (event) => {
      if (badgeFrom(event.target)) event.stopPropagation();
    }, true);
    document.addEventListener("click", (event) => {
      const badge = badgeFrom(event.target);
      if (!badge) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    document.addEventListener("mouseover", (event) => {
      const badge = badgeFrom(event.target);
      if (!badge || badge === activeBadge) return;
      showTip(badge);
    }, true);
    document.addEventListener("mouseout", (event) => {
      const badge = badgeFrom(event.target);
      if (!badge) return;
      const next = event.relatedTarget;
      if (next && (badge.contains(next) || tip?.contains(next))) return;
      scheduleHide();
    }, true);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
  }

  function boot() {
    loadCache();
    ensureTip();
    bindEvents();
    const observer = new MutationObserver(scheduleScan);
    const watch = () => {
      if (!isSearchPage()) {
        observer.disconnect();
        clearBadges();
        return;
      }
      observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
      scheduleScan();
    };
    watch();
    window.setInterval(() => {
      if (location.href === lastHref) return;
      lastHref = location.href;
      observer.disconnect();
      watch();
    }, 400);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
