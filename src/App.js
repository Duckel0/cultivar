/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useMemo, useEffect, useCallback, useRef, memo, Suspense, lazy } from "react";

// ---------- CONFIG ----------
const SUPABASE_URL = "https://ewyfhousutslimzwoflk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eWZob3VzdXRzbGltendvZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzQ1OTksImV4cCI6MjA5MTM1MDU5OX0.SMq04MDpT-FLSHbWA6i_2meJ56cJfITTy4ig37K7R-s";

// ---------- PERSISTENCE (safe in browser, falls back silently in artifacts) ----------
const storage = {
  get(k, fallback) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* artifact mode */ }
  },
};

// ---------- API LAYER (cached, typed, retries) ----------
const cache = new Map();
const inflight = new Map();

async function api(table, options = {}, cacheKey = null, ttl = 60_000) {
  const key = cacheKey ?? `${table}:${JSON.stringify(options)}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.data;
  if (inflight.has(key)) return inflight.get(key);

  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (options.select) url.searchParams.set("select", options.select);
  if (options.order) url.searchParams.set("order", options.order);
  if (options.limit) url.searchParams.set("limit", options.limit);
  if (options.filters) for (const [k, v] of Object.entries(options.filters)) url.searchParams.set(k, v);

  const run = (async () => {
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "count=exact",
          },
        });
        if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
        const data = await res.json();
        cache.set(key, { data, expires: Date.now() + ttl });
        return data;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }
    throw lastErr;
  })();

  inflight.set(key, run);
  try { return await run; } finally { inflight.delete(key); }
}

async function rpc(fn, params) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
  } catch { /* fire and forget */ }
}

// ---------- RETAILER LINKS ----------
const retailerLink = (retailer, plant) => {
  const q = encodeURIComponent(`${plant} plant`);
  const p = encodeURIComponent(plant);
  const map = {
    "Amazon": `https://www.amazon.com/s?k=${q}&tag=thecultivar-20`,
    "Home Depot": `https://www.homedepot.com/s/${p}`,
    "Etsy": `https://www.etsy.com/search?q=${q}`,
    "Lowe's": `https://www.lowes.com/search?searchTerm=${p}`,
    "Walmart": `https://www.walmart.com/search?q=${q}`,
    "Costa Farms": `https://costafarms.com/search?q=${p}`,
    "Bloomscape": `https://bloomscape.com/search/?search=${p}`,
    "Leaf & Clay": `https://leafandclay.com/search?q=${p}`,
    "Rare Rootz": `https://rarerootz.com/search?q=${p}`,
    "Logee's": `https://logees.com/search?q=${p}`,
    "Steve's Leaves": `https://stevesleaves.com/search?q=${p}`,
    "California Carnivores": `https://californiacarnivores.com/search?q=${p}`,
    "Predatory Plants": `https://predatoryplants.com/search?q=${p}`,
    "Pistils Nursery": `https://pistilsnursery.com/search?q=${p}`,
    "Mountain Crest Gardens": `https://mountaincrestgardens.com/search?q=${p}`,
    "Plantvine": `https://plantvine.com/search?q=${p}`,
    "Nature Hills": `https://naturehills.com/search?q=${p}`,
    "IKEA": `https://www.ikea.com/us/en/search/?q=${p}`,
    "Trader Joe's": "https://www.traderjoes.com/home/products/category/plants",
  };
  return map[retailer] || `https://www.google.com/search?q=${encodeURIComponent(retailer + " " + plant)}`;
};

// ---------- DESIGN TOKENS ----------
const RARITY = {
  "Common":         { c: "#5a8a3c", bg: "#edf5e8" },
  "Uncommon":       { c: "#2a7a6a", bg: "#e4f5f2" },
  "Rare":           { c: "#5a3a8a", bg: "#f0ecfa" },
  "Very Rare":      { c: "#8a2a2a", bg: "#faeaea" },
  "Extremely Rare": { c: "#1a1a1a", bg: "#f0f0f0" },
};
const DIFF = {
  "Very Easy": { c: "#3d7a2a", d: "#5aaa3c" },
  "Easy":      { c: "#5a8a3c", d: "#7ac44a" },
  "Moderate":  { c: "#8a6a1a", d: "#c49a2a" },
  "Hard":      { c: "#8a2a2a", d: "#c44a3c" },
  "Expert":    { c: "#1a1a2a", d: "#3a3a5a" },
};

// ---------- ICONS ----------
const Icon = memo(({ n, s = 16 }) => {
  const icons = {
    search:  <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    leaf:    <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></>,
    sun:     <><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></>,
    drop:    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>,
    heart:   <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    compare: <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    grid:    <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    list:    <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
    back:    <polyline points="15 18 9 12 15 6"/>,
    next:    <polyline points="9 18 15 12 9 6"/>,
    x:       <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    map:     <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></>,
    sparkle: <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>,
    share:   <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    star:    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    bell:    <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    trend:   <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    trophy:  <><line x1="6" y1="9" x2="18" y2="9"/><path d="M6 9a6 6 0 0 0 12 0"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="8" y1="21" x2="16" y2="21"/></>,
    check:   <polyline points="20 6 9 17 4 12"/>,
  };
  const content = icons[n];
  if (!content) return null;
  const fillIcons = ["heart", "sparkle", "star"];
  const filled = fillIcons.includes(n);
  return (
    <svg width={s} height={s} viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {content}
    </svg>
  );
});

// ---------- HOOKS ----------
function useDebounced(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function usePersistedState(key, initial) {
  const [v, setV] = useState(() => storage.get(key, initial));
  useEffect(() => { storage.set(key, v); }, [key, v]);
  return [v, setV];
}

// URL-synced state for shareable filters
function useUrlState() {
  const read = () => {
    const p = new URLSearchParams(window.location.search);
    return {
      search: p.get("q") ?? "",
      type: p.get("cat") ?? "All",
      diff: p.get("diff") ?? "All",
      tox: p.get("tox") ?? "All",
      trait: p.get("trait") ?? "All",
      sort: p.get("sort") ?? "name",
    };
  };
  const [state, setState] = useState(read);
  const update = useCallback((patch) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      const p = new URLSearchParams();
      if (next.search) p.set("q", next.search);
      if (next.type !== "All") p.set("cat", next.type);
      if (next.diff !== "All") p.set("diff", next.diff);
      if (next.tox !== "All") p.set("tox", next.tox);
      if (next.trait !== "All") p.set("trait", next.trait);
      if (next.sort !== "name") p.set("sort", next.sort);
      const qs = p.toString();
      const url = window.location.pathname + (qs ? "?" + qs : "");
      window.history.replaceState({}, "", url);
      return next;
    });
  }, []);
  return [state, update];
}

// Intersection observer: lazy load images only when visible
function useInView(options = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || inView) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { rootMargin: "200px", ...options });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [inView]);
  return [ref, inView];
}

// ---------- LAZY IMAGE with skeleton + fallback ----------
const LazyImage = memo(({ src, alt, fallbackEmoji, style, height = 160 }) => {
  const [ref, inView] = useInView();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div ref={ref} style={{
      position: "relative", width: "100%", height,
      background: "linear-gradient(90deg, #ece8df 0%, #f5f1ea 50%, #ece8df 100%)",
      backgroundSize: "200% 100%",
      animation: !loaded && !error ? "shimmer 1.4s ease infinite" : "none",
      overflow: "hidden", borderRadius: 8,
      display: "flex", alignItems: "center", justifyContent: "center",
      ...style,
    }}>
      {(!src || error) && (
        <div style={{ fontSize: 40, opacity: 0.5 }}>{fallbackEmoji ?? "🌿"}</div>
      )}
      {inView && src && !error && (
        <img src={src} alt={alt} loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        />
      )}
    </div>
  );
});

// ---------- IMAGE CAROUSEL (for detail view) ----------
function ImageCarousel({ images, fallbackEmoji, height = 320 }) {
  const [i, setI] = useState(0);
  if (!images || images.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 72, background: "#1a3a28" }}>
        {fallbackEmoji}
      </div>
    );
  }
  const img = images[i];
  return (
    <div style={{ position: "relative", height, overflow: "hidden" }}>
      <img src={img.url} alt={img.attribution ?? ""}
        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(15,35,24,0.95))" }} />
      {images.length > 1 && (
        <>
          <button className="btn" onClick={() => setI((i - 1 + images.length) % images.length)}
            style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.5)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)",
            }}>
            <Icon n="back" s={16} />
          </button>
          <button className="btn" onClick={() => setI((i + 1) % images.length)}
            style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.5)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)",
            }}>
            <Icon n="next" s={16} />
          </button>
          <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
            {images.map((_, j) => (
              <button key={j} onClick={() => setI(j)}
                style={{
                  width: j === i ? 18 : 6, height: 6, borderRadius: 99,
                  background: j === i ? "#fff" : "rgba(255,255,255,0.5)",
                  border: "none", cursor: "pointer", transition: "all 0.2s",
                }}/>
            ))}
          </div>
        </>
      )}
      {img.attribution && (
        <div style={{
          position: "absolute", bottom: 6, right: 10,
          fontSize: 10, color: "rgba(255,255,255,0.6)",
          background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: 4, backdropFilter: "blur(4px)",
        }}>
          📷 {img.attribution.slice(0, 40)}{img.license ? ` · ${img.license}` : ""}
        </div>
      )}
    </div>
  );
}

// ---------- TOAST ----------
function useToast() {
  const [msg, setMsg] = useState(null);
  const show = useCallback((text, tone = "info") => {
    setMsg({ text, tone, id: Date.now() });
    setTimeout(() => setMsg(null), 2600);
  }, []);
  const el = msg && (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: msg.tone === "error" ? "#c1392b" : "#1a3a28",
      color: "#fff", padding: "10px 18px", borderRadius: 99,
      fontSize: 13, fontWeight: 500, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
      animation: "slideUp 0.3s ease",
    }}>
      {msg.text}
    </div>
  );
  return { show, el };
}

// ---------- URL ROUTING ----------
function getRoute() {
  const path = window.location.pathname;
  if (path.startsWith("/plant/")) return { view: "detail", slug: path.replace("/plant/", "") };
  return { view: "catalog" };
}

// ---------- MAIN APP ----------
export default function Cultivar() {
  const [view, setView] = useState("catalog");
  const [selected, setSelected] = useState(null);
  const [plants, setPlants] = useState([]);
  const [imagesByPlant, setImagesByPlant] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [layout, setLayout] = usePersistedState("cultivar:layout", "grid");
  const [compareList, setCompareList] = usePersistedState("cultivar:compare", []);
  const [wishlist, setWishlist] = usePersistedState("cultivar:wishlist", []);
  const [activeTab, setActiveTab] = useState("varieties");
  const [filters, setFilters] = useUrlState();
  const debouncedSearch = useDebounced(filters.search, 180);
  const toast = useToast();

  // ---- Load data ----
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel fetch: plants + all images + stats
      const [plantsData, imagesData, statsData] = await Promise.all([
        api("plants", {
          select: "id,common_name,scientific_name,emoji,category,description,sunlight,watering,difficulty,toxicity,slug,tags,rare,air_purifying,low_light,drought_tolerant,flowering,fragrant,outdoor_ok,fast_growing,edible,image_url,care_notes,soil,fertilizer,propagation,temperature,common_problems,native_region,bloom_season,mature_height,companion_plants,fun_fact",
          filters: { published: "eq.true" },
          order: "common_name.asc",
          limit: 2000,
        }, "plants:all"),
        api("plant_images", {
          select: "plant_id,variety_id,url,attribution,license,is_primary,rank",
          order: "rank.asc",
          limit: 5000,
        }, "images:all", 300_000).catch(() => []),
        api("v_plant_stats", {
          select: "id,avg_rating,review_count,views_7d",
          limit: 2000,
        }, "stats:all", 300_000).catch(() => []),
      ]);

      // Group images by plant_id
      const imgMap = {};
      for (const img of imagesData ?? []) {
        if (img.plant_id) {
          (imgMap[img.plant_id] ??= []).push(img);
        }
      }
      setImagesByPlant(imgMap);

      // Stats lookup
      const statMap = {};
      for (const s of statsData ?? []) statMap[s.id] = s;
      setStats(statMap);

      setPlants(plantsData ?? []);

      // Deep link?
      const route = getRoute();
      if (route.view === "detail" && route.slug) {
        const found = (plantsData ?? []).find(p => p.slug === route.slug);
        if (found) {
          setSelected(found);
          setView("detail");
          rpc("bump_plant_view", { p_plant_id: found.id });
        }
      }
    } catch (e) {
      console.error("Load error", e);
      setError(e.message ?? "Could not load plants. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const onPop = () => {
      const r = getRoute();
      if (r.view === "detail" && r.slug) {
        setPlants(prev => {
          const found = prev.find(p => p.slug === r.slug);
          if (found) { setSelected(found); setView("detail"); }
          return prev;
        });
      } else {
        setView("catalog");
        setSelected(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [loadData]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches("input, textarea, select")) return;
      if (e.key === "/" ) {
        e.preventDefault();
        document.querySelector('input[type="text"]')?.focus();
      }
      if (e.key === "Escape" && view === "detail") goHome();
      if (e.key === "g" && view === "catalog") setLayout(l => l === "grid" ? "list" : "grid");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  // ---- Derived ----
  const types = useMemo(
    () => ["All", ...Array.from(new Set(plants.map(p => p.category).filter(Boolean))).sort()],
    [plants]
  );
  const diffs = ["All", "Very Easy", "Easy", "Moderate", "Hard", "Expert"];

  const resetFilters = useCallback(() => {
    setFilters({ search: "", type: "All", diff: "All", tox: "All", trait: "All" });
  }, [setFilters]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    let list = plants.filter(p => {
      const ms = !q || p.common_name?.toLowerCase().includes(q)
        || p.scientific_name?.toLowerCase().includes(q)
        || p.tags?.some(t => t.toLowerCase().includes(q));
      const mt = filters.type === "All" || p.category === filters.type;
      const md = filters.diff === "All" || p.difficulty === filters.diff;
      const mx = filters.tox === "All" || p.toxicity === filters.tox;
      const mtr = filters.trait === "All" ||
        (filters.trait === "low_light" && p.low_light) ||
        (filters.trait === "air_purifying" && p.air_purifying) ||
        (filters.trait === "edible" && p.edible);
      return ms && mt && md && mx && mtr;
    });
    const sorted = [...list];
    const { sort } = filters;
    if (sort === "name") sorted.sort((a, b) => (a.common_name ?? "").localeCompare(b.common_name ?? ""));
    else if (sort === "difficulty") sorted.sort((a, b) => diffs.indexOf(a.difficulty) - diffs.indexOf(b.difficulty));
    else if (sort === "difficulty_desc") sorted.sort((a, b) => diffs.indexOf(b.difficulty) - diffs.indexOf(a.difficulty));
    else if (sort === "rare") sorted.sort((a, b) => (b.rare ? 1 : 0) - (a.rare ? 1 : 0));
    else if (sort === "category") sorted.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""));
    else if (sort === "pet_safe") sorted.sort((a, b) => (b.toxicity === "Pet Safe" ? 1 : 0) - (a.toxicity === "Pet Safe" ? 1 : 0));
    else if (sort === "trending") sorted.sort((a, b) => (stats[b.id]?.views_7d ?? 0) - (stats[a.id]?.views_7d ?? 0));
    else if (sort === "rating") sorted.sort((a, b) => (stats[b.id]?.avg_rating ?? 0) - (stats[a.id]?.avg_rating ?? 0));
    return sorted;
  }, [plants, debouncedSearch, filters, stats]);

  const collections = useMemo(() => [
    { emoji: "🐾", label: "Pet Safe", filter: { tox: "Pet Safe" }, count: plants.filter(p => p.toxicity === "Pet Safe").length },
    { emoji: "💡", label: "Beginner Friendly", filter: { diff: "Very Easy" }, count: plants.filter(p => p.difficulty === "Very Easy").length },
    { emoji: "✦", label: "Rare Collectors", filter: { type: "Rare & Collector" }, count: plants.filter(p => p.category === "Rare & Collector").length },
    { emoji: "🌑", label: "Low Light", filter: { trait: "low_light" }, count: plants.filter(p => p.low_light).length },
    { emoji: "🌿", label: "Air Purifying", filter: { trait: "air_purifying" }, count: plants.filter(p => p.air_purifying).length },
    { emoji: "🍽️", label: "Edible Plants", filter: { trait: "edible" }, count: plants.filter(p => p.edible).length },
    { emoji: "🌵", label: "Succulents", filter: { type: "Succulent" }, count: plants.filter(p => p.category === "Succulent").length },
    { emoji: "🪴", label: "Houseplants", filter: { type: "Houseplant" }, count: plants.filter(p => p.category === "Houseplant").length },
    { emoji: "🌺", label: "Orchids", filter: { type: "Orchid" }, count: plants.filter(p => p.category === "Orchid").length },
    { emoji: "🪲", label: "Carnivorous", filter: { type: "Carnivorous" }, count: plants.filter(p => p.category === "Carnivorous").length },
    { emoji: "💧", label: "Aquatic", filter: { type: "Aquatic" }, count: plants.filter(p => p.category === "Aquatic").length },
    { emoji: "🎋", label: "Bonsai", filter: { type: "Bonsai" }, count: plants.filter(p => p.category === "Bonsai").length },
  ], [plants]);

  const trending = useMemo(() => {
    return plants
      .filter(p => stats[p.id]?.views_7d > 0)
      .sort((a, b) => (stats[b.id]?.views_7d ?? 0) - (stats[a.id]?.views_7d ?? 0))
      .slice(0, 6);
  }, [plants, stats]);

  // ---- Actions ----
  const toggleCompare = useCallback((p) => {
    setCompareList(prev => {
      if (prev.find(c => c.id === p.id)) {
        toast.show(`Removed ${p.common_name} from compare`);
        return prev.filter(c => c.id !== p.id);
      }
      if (prev.length >= 3) {
        toast.show("Max 3 plants in compare", "error");
        return prev;
      }
      toast.show(`Added to compare · ${prev.length + 1}/3`);
      return [...prev, p];
    });
  }, [toast]);

  const toggleWish = useCallback((p) => {
    setWishlist(prev => {
      if (prev.find(w => w.id === p.id)) {
        toast.show(`Removed ${p.common_name}`);
        return prev.filter(w => w.id !== p.id);
      }
      toast.show(`Saved ${p.common_name} ♥`);
      return [...prev, p];
    });
  }, [toast]);

  const openPlant = useCallback((p) => {
    setSelected(p);
    setView("detail");
    setActiveTab("varieties");
    window.history.pushState({}, "", `/plant/${p.slug}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.title = `${p.common_name} — Cultivar`;
    rpc("bump_plant_view", { p_plant_id: p.id });
  }, []);

  const goHome = useCallback(() => {
    setView("catalog");
    setSelected(null);
    const qs = window.location.search;
    window.history.pushState({}, "", "/" + qs);
    document.title = "Cultivar — Plant Intelligence Database";
  }, []);

  const isWished = useCallback(id => wishlist.some(w => w.id === id), [wishlist]);
  const isCompared = useCallback(id => compareList.some(c => c.id === id), [compareList]);

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "var(--bg)", minHeight: "100vh", color: "var(--ink)" }}>
      <GlobalStyles />
      {toast.el}

      <Header
        view={view}
        plantCount={plants.length}
        compareCount={compareList.length}
        wishCount={wishlist.length}
        onNav={(id) => { if (id === "catalog") goHome(); else setView(id); }}
        onHome={goHome}
      />

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 48px" }}>
        {error && (
          <div style={{
            padding: "14px 18px", background: "#fdecea", border: "1.5px solid #f0cccc",
            borderRadius: 10, color: "#8a2a2a", fontSize: 13, marginBottom: 16,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>⚠ {error}</span>
            <button className="btn" onClick={loadData} style={{ color: "#8a2a2a", fontWeight: 600 }}>Retry</button>
          </div>
        )}

        {view === "catalog" && (
          <Catalog
            loading={loading}
            plants={plants}
            filtered={filtered}
            filters={filters}
            setFilters={setFilters}
            resetFilters={resetFilters}
            types={types}
            diffs={diffs}
            layout={layout}
            setLayout={setLayout}
            collections={collections}
            trending={trending}
            compareList={compareList}
            imagesByPlant={imagesByPlant}
            stats={stats}
            openPlant={openPlant}
            toggleWish={toggleWish}
            toggleCompare={toggleCompare}
            isWished={isWished}
            isCompared={isCompared}
          />
        )}

        {view === "detail" && selected && (
          <PlantDetail
            plant={selected}
            images={imagesByPlant[selected.id] ?? []}
            statsRow={stats[selected.id]}
            onBack={goHome}
            onWish={toggleWish}
            onCompare={toggleCompare}
            wished={isWished(selected.id)}
            compared={isCompared(selected.id)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onToast={toast.show}
          />
        )}

        {view === "compare" && (
          <CompareView
            plants={compareList}
            onRemove={(id) => setCompareList(compareList.filter(p => p.id !== id))}
            onOpen={openPlant}
            allPlants={plants}
            onAdd={(p) => compareList.length < 3 && setCompareList([...compareList, p])}
            imagesByPlant={imagesByPlant}
          />
        )}

        {view === "wishlist" && (
          <WishlistView
            plants={wishlist}
            imagesByPlant={imagesByPlant}
            onOpen={openPlant}
            onRemove={(id) => setWishlist(wishlist.filter(p => p.id !== id))}
          />
        )}

        {view === "quiz" && (
          <QuizView plants={plants} onOpen={openPlant} imagesByPlant={imagesByPlant} />
        )}
      </main>

      <Footer plantCount={plants.length} />
    </div>
  );
}

// ---------- HEADER ----------
const Header = memo(({ view, plantCount, compareCount, wishCount, onNav, onHome }) => (
  <header className="hero-bg" style={{
    position: "sticky", top: 0, zIndex: 100,
    boxShadow: "0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.25)",
  }}>
    <div style={{
      maxWidth: 960, margin: "0 auto", padding: "0 16px",
      height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", minWidth: 0 }} onClick={onHome}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: "linear-gradient(135deg, #52b788, #2d6a4f)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(82,183,136,0.4)", color: "#fff",
        }}>
          <Icon n="leaf" s={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="wm" style={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>Cultivar</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 400, marginTop: 2 }}>
            Plant Intelligence
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 5, fontSize: 11,
          color: plantCount > 0 ? "rgba(82,183,136,0.9)" : "rgba(255,255,255,0.35)",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: plantCount > 0 ? "#52b788" : "#666",
            boxShadow: plantCount > 0 ? "0 0 6px #52b788" : "none",
          }} />
          {plantCount > 0 ? `${plantCount.toLocaleString()} plants` : "connecting…"}
        </div>
        <nav style={{ display: "flex", gap: 2 }}>
          {[
            { id: "catalog", label: "Catalog" },
            { id: "quiz", label: "Find My Plant" },
            { id: "compare", label: compareCount ? `Compare · ${compareCount}` : "Compare" },
            { id: "wishlist", label: wishCount ? `Saved · ${wishCount}` : "Saved" },
          ].map(t => (
            <button key={t.id} className={`btn pill ${view === t.id ? "on" : ""}`} onClick={() => onNav(t.id)}
              style={{ color: view === t.id ? "#fff" : "rgba(255,255,255,0.55)" }}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  </header>
));

// ---------- CATALOG ----------
function Catalog({
  loading, plants, filtered, filters, setFilters, resetFilters,
  types, diffs, layout, setLayout, collections, trending,
  compareList, imagesByPlant, stats,
  openPlant, toggleWish, toggleCompare, isWished, isCompared,
}) {
  const hasActiveFilters = filters.search || filters.type !== "All" || filters.diff !== "All" || filters.tox !== "All" || filters.trait !== "All";

  return (
    <div className="fade">
      <div style={{ marginBottom: 22 }}>
        <h1 className="wm" style={{ fontSize: 34, fontWeight: 300, letterSpacing: "-0.035em", lineHeight: 1.05 }}>
          The Plant <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Intelligence</em> Database
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink3)", marginTop: 6, fontWeight: 300 }}>
          {loading ? "Loading database…" : `${plants.length} species · prices updated weekly · press `}
          {!loading && <kbd style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontFamily: "inherit" }}>/</kbd>}
          {!loading && " to search"}
        </p>
      </div>

      {loading && <LoadingState />}

      {!loading && plants.length > 0 && (
        <>
          {trending.length > 0 && !hasActiveFilters && (
            <section style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Icon n="trend" s={14} />
                <span style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                  Trending this week
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, scrollSnapType: "x mandatory" }}>
                {trending.map(p => (
                  <button key={p.id} className="btn" onClick={() => openPlant(p)}
                    style={{
                      flexShrink: 0, width: 220, scrollSnapAlign: "start",
                      background: "var(--surface)", border: "1.5px solid var(--border)",
                      borderRadius: 10, padding: 10, textAlign: "left",
                      display: "flex", gap: 10, alignItems: "center", boxShadow: "var(--shadow)",
                    }}>
                    <div style={{ flexShrink: 0 }}>
                      <LazyImage src={imagesByPlant[p.id]?.[0]?.url ?? p.image_url} alt={p.common_name}
                        fallbackEmoji={p.emoji} height={52} style={{ width: 52, borderRadius: 6 }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="wm" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.common_name}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink3)", marginTop: 2 }}>
                        🔥 {stats[p.id]?.views_7d ?? 0} views this week
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section style={{ marginBottom: 22 }}>
            <p style={{ fontSize: 11, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, marginBottom: 10 }}>
              Browse Collections
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
              {collections.map(c => (
                <button key={c.label} className="btn lift" onClick={() => setFilters({ search: "", type: "All", diff: "All", tox: "All", trait: "All", ...c.filter })}
                  style={{
                    background: "var(--surface)", border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)", padding: "10px 12px",
                    textAlign: "left", boxShadow: "var(--shadow)",
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{c.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3)" }}>{c.count} plants</div>
                </button>
              ))}
            </div>
          </section>

          <FilterBar
            filters={filters} setFilters={setFilters}
            types={types} diffs={diffs}
            layout={layout} setLayout={setLayout}
            resultCount={filtered.length} compareCount={compareList.length}
            hasActiveFilters={hasActiveFilters} onReset={resetFilters}
          />

          {filtered.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : layout === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {filtered.map(p => (
                <PlantCard key={p.id} plant={p}
                  image={imagesByPlant[p.id]?.find(i => i.is_primary)?.url ?? imagesByPlant[p.id]?.[0]?.url ?? p.image_url}
                  rating={stats[p.id]?.avg_rating}
                  reviewCount={stats[p.id]?.review_count}
                  onOpen={openPlant} onWish={toggleWish} onCompare={toggleCompare}
                  wished={isWished(p.id)} compared={isCompared(p.id)}
                />
              ))}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map(p => (
                <PlantRow key={p.id} plant={p}
                  image={imagesByPlant[p.id]?.find(i => i.is_primary)?.url ?? imagesByPlant[p.id]?.[0]?.url ?? p.image_url}
                  rating={stats[p.id]?.avg_rating}
                  onOpen={openPlant} onWish={toggleWish} onCompare={toggleCompare}
                  wished={isWished(p.id)} compared={isCompared(p.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const FilterBar = memo(({ filters, setFilters, types, diffs, layout, setLayout, resultCount, compareCount, hasActiveFilters, onReset }) => (
  <div style={{
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: 14, marginBottom: 18, boxShadow: "var(--shadow)",
  }}>
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <div style={{ flex: 1, position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink3)", pointerEvents: "none", display: "flex" }}>
          <Icon n="search" s={15} />
        </span>
        <input value={filters.search} onChange={e => setFilters({ search: e.target.value })}
          placeholder="Search plants, species, tags…" type="text"
          style={{
            width: "100%", padding: "9px 12px 9px 36px",
            border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
            background: "var(--surface2)", fontSize: 13, color: "var(--ink)",
          }}/>
        {filters.search && (
          <button className="btn" onClick={() => setFilters({ search: "" })}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink3)" }}>
            <Icon n="x" s={13} />
          </button>
        )}
      </div>
      <button className="btn" onClick={() => setLayout(layout === "grid" ? "list" : "grid")}
        style={{
          padding: "9px 13px", background: "var(--surface2)",
          border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
          color: "var(--ink2)",
        }}
        title={`Switch to ${layout === "grid" ? "list" : "grid"} view (press G)`}>
        <Icon n={layout === "grid" ? "list" : "grid"} s={15} />
      </button>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {[
        { label: "Category", val: filters.type, key: "type", opts: types },
        { label: "Difficulty", val: filters.diff, key: "diff", opts: diffs },
        { label: "Safety", val: filters.tox, key: "tox", opts: ["All", "Pet Safe", "Toxic to Pets", "Toxic to Both"] },
        { label: "Sort", val: filters.sort, key: "sort", isTuple: true, opts: [
          ["name", "Name A–Z"],
          ["trending", "🔥 Trending"],
          ["rating", "★ Top rated"],
          ["difficulty", "Easiest first"],
          ["difficulty_desc", "Hardest first"],
          ["rare", "Rare first"],
          ["pet_safe", "Pet safe first"],
          ["category", "By category"],
        ]},
      ].map(f => (
        <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 130px" }}>
          <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 500, whiteSpace: "nowrap" }}>{f.label}</span>
          <select value={f.val} onChange={e => setFilters({ [f.key]: e.target.value })}
            style={{
              flex: 1, padding: "5px 8px", border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-sm)", background: "var(--surface)",
              fontSize: 12, color: "var(--ink)", cursor: "pointer",
            }}>
            {f.isTuple ? f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>) : f.opts.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
      <span>
        {resultCount} result{resultCount !== 1 ? "s" : ""}
        {compareCount > 0 && <span style={{ color: "var(--accent)", fontWeight: 500, marginLeft: 10 }}>· {compareCount}/3 in compare</span>}
      </span>
      {hasActiveFilters && (
        <button className="btn" onClick={onReset} style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>
          Clear filters ×
        </button>
      )}
    </div>
  </div>
));

// ---------- CARD / ROW ----------
const PlantCard = memo(({ plant, image, rating, reviewCount, onOpen, onWish, onCompare, wished, compared }) => {
  const dc = DIFF[plant.difficulty] ?? DIFF.Easy;
  return (
    <a href={`/plant/${plant.slug}`} className="plant-card-link lift"
      onClick={e => { e.preventDefault(); onOpen(plant); }}
      style={{
        background: "var(--surface)",
        border: `1.5px solid ${compared ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius)", overflow: "hidden",
        boxShadow: compared ? "0 0 0 3px var(--accent-bg)" : "var(--shadow)",
        position: "relative", textDecoration: "none", color: "inherit", display: "block",
      }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${dc.d}, ${dc.d}44)` }} />
      <div style={{ position: "relative" }}>
        <LazyImage src={image} alt={plant.common_name} fallbackEmoji={plant.emoji} height={170} style={{ borderRadius: 0 }} />
        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
          <button className="btn" onClick={() => onWish(plant)} title={wished ? "Remove from saved" : "Save"}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: wished ? "var(--red)" : "rgba(255,255,255,0.9)",
              border: "none", color: wished ? "#fff" : "var(--ink3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}>
            <Icon n="heart" s={13} />
          </button>
          <button className="btn" onClick={() => onCompare(plant)} title={compared ? "Remove from compare" : "Add to compare"}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: compared ? "var(--accent)" : "rgba(255,255,255,0.9)",
              border: "none", color: compared ? "#fff" : "var(--ink3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(4px)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}>
            <Icon n="compare" s={13} />
          </button>
        </div>
        {plant.rare && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(138,42,42,0.92)", color: "#fff",
            fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 99,
            backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 3,
          }}>
            <Icon n="sparkle" s={9} /> Rare
          </div>
        )}
      </div>
      <div style={{ padding: "12px 14px 14px" }}>
        <div className="wm" style={{ fontSize: 18, fontWeight: 400, color: "var(--ink)", marginBottom: 2, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          {plant.common_name}
        </div>
        <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)", marginBottom: 8 }}>
          {plant.scientific_name}
        </div>
        {rating > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            <Icon n="star" s={11} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink2)" }}>
              {Number(rating).toFixed(1)}
            </span>
            {reviewCount > 0 && <span style={{ fontSize: 10, color: "var(--ink3)" }}>({reviewCount})</span>}
          </div>
        )}
        <p style={{
          fontSize: 12, color: "var(--ink2)", lineHeight: 1.55, marginBottom: 12,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          overflow: "hidden", fontWeight: 300,
        }}>
          {plant.description}
        </p>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
          {[{ i: "sun", v: plant.sunlight }, { i: "drop", v: plant.watering }].map(s => (
            <span key={s.i} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 8px", borderRadius: 99,
              background: "var(--surface2)", border: "1px solid var(--border)",
              fontSize: 11, color: "var(--ink2)",
            }}>
              <Icon n={s.i} s={10} /> {s.v}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: dc.c, fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dc.d, display: "inline-block" }} />
            {plant.difficulty}
          </span>
          {plant.toxicity === "Pet Safe" && (
            <span style={{ fontSize: 11, color: "var(--accent2)", background: "var(--accent-bg)", padding: "1px 7px", borderRadius: 99, fontWeight: 500 }}>
              🐾 Pet safe
            </span>
          )}
        </div>
      </div>
    </a>
  );
});

const PlantRow = memo(({ plant, image, rating, onOpen, onWish, onCompare, wished, compared }) => {
  const dc = DIFF[plant.difficulty] ?? DIFF.Easy;
  return (
    <div className="lift" onClick={() => onOpen(plant)}
      style={{
        background: "var(--surface)",
        border: `1.5px solid ${compared ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm)", padding: "10px 14px",
        display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow)",
      }}>
      <div style={{ flexShrink: 0 }}>
        <LazyImage src={image} alt={plant.common_name} fallbackEmoji={plant.emoji} height={44} style={{ width: 44, borderRadius: 8 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span className="wm" style={{ fontWeight: 400, fontSize: 15, letterSpacing: "-0.01em" }}>{plant.common_name}</span>
          <span style={{ fontStyle: "italic", fontSize: 12, color: "var(--ink3)" }}>{plant.scientific_name}</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 3, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>{plant.category}</span>
          <span style={{ fontSize: 11, color: dc.c, fontWeight: 500 }}>● {plant.difficulty}</span>
          {rating > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--ink2)" }}>
              <Icon n="star" s={10} /> {Number(rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
        <button className="btn" onClick={() => onWish(plant)}
          style={{
            width: 32, height: 32, borderRadius: "var(--radius-sm)",
            background: wished ? "var(--red-bg)" : "var(--surface2)",
            border: `1px solid ${wished ? "var(--red)" : "var(--border)"}`,
            color: wished ? "var(--red)" : "var(--ink3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <Icon n="heart" s={13} />
        </button>
        <button className="btn" onClick={() => onCompare(plant)}
          style={{
            width: 32, height: 32, borderRadius: "var(--radius-sm)",
            background: compared ? "var(--accent-bg)" : "var(--surface2)",
            border: `1px solid ${compared ? "var(--accent)" : "var(--border)"}`,
            color: compared ? "var(--accent)" : "var(--ink3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
          <Icon n="compare" s={13} />
        </button>
      </div>
    </div>
  );
});

// ---------- PLANT DETAIL ----------
function PlantDetail({ plant, images, statsRow, onBack, onWish, onCompare, wished, compared, activeTab, setActiveTab, onToast }) {
  const [varieties, setVarieties] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingVars, setLoadingVars] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const dc = DIFF[plant.difficulty] ?? DIFF.Easy;

  // Merge plant images with legacy image_url
  const mergedImages = useMemo(() => {
    const list = [...(images ?? [])];
    if (plant.image_url && !list.find(i => i.url === plant.image_url)) {
      list.push({ url: plant.image_url, attribution: null });
    }
    return list;
  }, [images, plant.image_url]);

  useEffect(() => {
    async function load() {
      setLoadingVars(true);
      try {
        // ONE query instead of N+1: fetch all varieties and their prices in two parallel queries
        const [vars, allPrices, allReviews, varietyImages] = await Promise.all([
          api("varieties", {
            filters: { plant_id: `eq.${plant.id}` },
            select: "id,name,rarity,description,special_traits",
          }, `varieties:${plant.id}`, 60_000),
          api("prices", {
            select: "variety_id,price_usd,in_stock,retailers(name)",
            filters: { variety_id: `in.(${"SKIP"})` },
          }, null, 0).catch(() => []),  // placeholder; we'll fetch below
          api("reviews", {
            filters: { plant_id: `eq.${plant.id}` },
            select: "id,user_name,user_avatar,rating,title,body,helpful,verified,created_at",
            order: "created_at.desc",
            limit: 20,
          }, `reviews:${plant.id}`, 60_000).catch(() => []),
          api("plant_images", {
            select: "variety_id,url,is_primary",
            order: "rank.asc",
            limit: 200,
          }, `variety_images:${plant.id}`, 300_000).catch(() => []),
        ]);

        // Now fetch prices properly — in a single call using `in.(...)` filter
        let prices = [];
        if (vars?.length) {
          const ids = vars.map(v => v.id).join(",");
          prices = await api("prices", {
            select: "variety_id,price_usd,in_stock,retailers(name)",
            filters: { variety_id: `in.(${ids})` },
          }, `prices:${plant.id}`, 60_000).catch(() => []);
        }

        // Join
        const byVariety = {};
        for (const p of prices) {
          (byVariety[p.variety_id] ??= []).push(p);
        }
        const imgsByVariety = {};
        for (const img of varietyImages ?? []) {
          if (img.variety_id) (imgsByVariety[img.variety_id] ??= []).push(img);
        }

        const enriched = (vars ?? []).map(v => {
          const seen = new Set();
          const uniquePrices = (byVariety[v.id] ?? []).filter(p => {
            const key = p.retailers?.name;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return { ...v, prices: uniquePrices, images: imgsByVariety[v.id] ?? [] };
        });

        setVarieties(enriched);
        setReviews(allReviews ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingVars(false);
      }
    }
    load();
  }, [plant.id]);

  const allLocations = useMemo(
    () => [...new Set(varieties.flatMap(v => v.prices.map(p => p.retailers?.name).filter(Boolean)))].sort(),
    [varieties]
  );

  const shareUrl = `${window.location.origin}/plant/${plant.slug}`;

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: plant.common_name, text: plant.description, url: shareUrl });
      } catch { /* user canceled */ }
    } else {
      navigator.clipboard.writeText(shareUrl);
      onToast("Link copied to clipboard");
    }
  };

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button className="btn" onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>
          <Icon n="back" s={15} /> Back to catalog
        </button>
        <button className="btn" onClick={share}
          style={{
            display: "flex", alignItems: "center", gap: 5, color: "var(--ink3)",
            fontSize: 12, padding: "6px 12px", background: "var(--surface)",
            border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
          }}>
          <Icon n="share" s={13} /> Share
        </button>
      </div>

      <div className="hero-bg" style={{ borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 14, boxShadow: "var(--shadow-lg)" }}>
        <ImageCarousel images={mergedImages} fallbackEmoji={plant.emoji} height={260} />
        <div style={{ padding: "20px 20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="wm" style={{ fontSize: 30, fontWeight: 400, color: "#fff", letterSpacing: "-0.03em", marginBottom: 3, lineHeight: 1.1 }}>
                {plant.common_name}
              </h1>
              <div style={{ fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>
                {plant.scientific_name}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Chip>{plant.category}</Chip>
                <Chip color={dc.d}>{plant.difficulty}</Chip>
                <Chip color={plant.toxicity === "Pet Safe" ? "#52b788" : "#c1392b"}>
                  {plant.toxicity === "Pet Safe" ? "🐾 Pet Safe" : "⚠ " + plant.toxicity}
                </Chip>
                {statsRow?.avg_rating > 0 && (
                  <Chip color="#f5c518">
                    ★ {Number(statsRow.avg_rating).toFixed(1)} {statsRow.review_count > 0 && `(${statsRow.review_count})`}
                  </Chip>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
              <button className="btn" onClick={() => onWish(plant)}
                style={{
                  width: 38, height: 38, borderRadius: "var(--radius-sm)",
                  background: wished ? "rgba(193,57,43,0.35)" : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Icon n="heart" s={16} />
              </button>
              <button className="btn" onClick={() => onCompare(plant)}
                style={{
                  width: 38, height: 38, borderRadius: "var(--radius-sm)",
                  background: compared ? "rgba(82,183,136,0.35)" : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Icon n="compare" s={16} />
              </button>
            </div>
          </div>
          <p style={{ marginTop: 16, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, maxWidth: 560, fontWeight: 300 }}>
            {plant.description}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { i: "sun", l: "Light", v: plant.sunlight },
          { i: "drop", l: "Water", v: plant.watering },
          { i: "leaf", l: "Type", v: plant.category },
        ].map(s => (
          <div key={s.l} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: 12, textAlign: "center", boxShadow: "var(--shadow)",
          }}>
            <div style={{ color: "var(--accent)", marginBottom: 5, display: "flex", justifyContent: "center" }}>
              <Icon n={s.i} s={18} />
            </div>
            <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{s.v || "—"}</div>
          </div>
        ))}
      </div>

      {plant.tags?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {plant.tags.map(t => (
            <span key={t} style={{
              display: "inline-block", margin: "2px",
              padding: "3px 9px", borderRadius: 99,
              background: "var(--surface)", border: "1px solid var(--border)",
              fontSize: 11, color: "var(--ink3)",
            }}>#{t}</span>
          ))}
        </div>
      )}

      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 14, display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
        {[
          ["varieties", "Varieties & Prices"],
          ["locations", "Where to Buy"],
          ["care", "Care Guide"],
          ["traits", "Plant Traits"],
          ["reviews", `Reviews${reviews.length ? ` · ${reviews.length}` : ""}`],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${activeTab === id ? "on" : ""}`} onClick={() => setActiveTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "varieties" && <VarietiesTab loading={loadingVars} varieties={varieties} plantName={plant.common_name} onToast={onToast} />}
      {activeTab === "locations" && <LocationsTab allLocations={allLocations} varieties={varieties} plantName={plant.common_name} />}
      {activeTab === "care" && <CareTab plant={plant} />}
      {activeTab === "traits" && <TraitsTab plant={plant} />}
      {activeTab === "reviews" && <ReviewsTab reviews={reviews} plant={plant} onReviewAdded={r => setReviews([r, ...reviews])} onToast={onToast} showForm={showReviewForm} setShowForm={setShowReviewForm} />}
    </div>
  );
}

// ---------- TABS ----------
function VarietiesTab({ loading, varieties, plantName, onToast }) {
  if (loading) return (
    <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)" }}>
      <div className="spinner" style={{ margin: "0 auto 8px" }} />
      Loading varieties…
    </div>
  );
  if (varieties.length === 0) return (
    <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>
      No varieties in database yet — more coming soon.
    </div>
  );
  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {varieties.map(v => <VarietyCard key={v.id} v={v} plantName={plantName} onToast={onToast} />)}
    </div>
  );
}

function VarietyCard({ v, plantName, onToast }) {
  const minPrice = v.prices.length ? Math.min(...v.prices.map(p => p.price_usd || Infinity)) : null;
  const maxPrice = v.prices.length ? Math.max(...v.prices.map(p => p.price_usd || 0)) : null;
  const inStock = v.prices.some(p => p.in_stock);
  const rarityCfg = RARITY[v.rarity] ?? RARITY.Common;
  const varietyImg = v.images?.find(i => i.is_primary)?.url ?? v.images?.[0]?.url;

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: 12, boxShadow: "var(--shadow)",
      display: "flex", gap: 12,
    }}>
      {varietyImg && (
        <div style={{ flexShrink: 0 }}>
          <LazyImage src={varietyImg} alt={v.name} height={76} style={{ width: 76, borderRadius: 8 }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 4 }}>{v.name}</div>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              padding: "2px 9px", borderRadius: 99, background: rarityCfg.bg,
              color: rarityCfg.c, fontSize: 10, fontWeight: 600,
              border: `1px solid ${rarityCfg.c}22`,
            }}>
              {["Rare", "Very Rare", "Extremely Rare"].includes(v.rarity) && <Icon n="sparkle" s={8} />}
              {v.rarity}
            </span>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {minPrice !== null && Number.isFinite(minPrice) ? (
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>
                ${minPrice}{maxPrice && maxPrice !== minPrice ? ` – $${maxPrice}` : ""}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--ink3)" }}>Price TBA</div>
            )}
            <div style={{ fontSize: 11, color: inStock ? "var(--accent2)" : "var(--ink3)", fontWeight: 500 }}>
              {v.prices.length ? (inStock ? "● In Stock" : "○ Out of Stock") : ""}
            </div>
          </div>
        </div>
        {v.description && (
          <p style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 300, lineHeight: 1.5, marginBottom: 8 }}>
            {v.description}
          </p>
        )}
        {v.prices.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <Icon n="map" s={11} />
            {v.prices.map((p, i) => p.retailers?.name && (
              <a key={i} href={retailerLink(p.retailers.name, plantName)} target="_blank" rel="noopener noreferrer"
                style={{
                  fontSize: 11, background: "var(--surface2)",
                  border: "1px solid var(--border)", borderRadius: 6,
                  padding: "2px 8px", color: "var(--accent)",
                  textDecoration: "none", fontWeight: 500,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--accent-bg)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--surface2)"}>
                {p.retailers.name} · ${p.price_usd}
              </a>
            ))}
            {!inStock && v.prices.length > 0 && (
              <StockAlertButton varietyId={v.id} onToast={onToast} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StockAlertButton({ varietyId, onToast }) {
  const [email, setEmail] = useState("");
  const [show, setShow] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/stock_alerts`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ variety_id: varietyId, email, kind: "back_in_stock" }),
      });
      onToast("We'll email you when it's back in stock 🌱");
      setShow(false);
      setEmail("");
    } catch {
      onToast("Couldn't save alert", "error");
    }
  };
  if (show) return (
    <form onSubmit={submit} style={{ display: "flex", gap: 4 }}>
      <input type="email" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
        style={{ fontSize: 11, padding: "3px 8px", border: "1px solid var(--border)", borderRadius: 6, width: 140 }}/>
      <button className="btn" type="submit" style={{ fontSize: 11, padding: "3px 8px", background: "var(--accent)", color: "#fff", borderRadius: 6, fontWeight: 600 }}>Notify</button>
    </form>
  );
  return (
    <button className="btn" onClick={() => setShow(true)}
      style={{ fontSize: 11, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 3, marginLeft: "auto" }}>
      <Icon n="bell" s={10} /> Notify when back
    </button>
  );
}

function LocationsTab({ allLocations, varieties, plantName }) {
  if (allLocations.length === 0) return (
    <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>
      No retailer data yet for this plant.
    </div>
  );
  return (
    <div className="fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
      {allLocations.map(loc => {
        const avail = varieties.filter(v => v.prices.some(p => p.retailers?.name === loc));
        const inStock = avail.filter(v => v.prices.some(p => p.retailers?.name === loc && p.in_stock));
        return (
          <div key={loc} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)", padding: 12, boxShadow: "var(--shadow)",
          }}>
            <a href={retailerLink(loc, plantName)} target="_blank" rel="noopener noreferrer"
              style={{ fontWeight: 600, fontSize: 13, color: "var(--accent)", marginBottom: 3, textDecoration: "none", display: "block" }}>
              {loc} ↗
            </a>
            <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>
              {avail.length} variet{avail.length === 1 ? "y" : "ies"} · {inStock.length} in stock
            </div>
            {avail.map(v => {
              const pr = v.prices.find(p => p.retailers?.name === loc);
              return (
                <div key={v.id} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 12, padding: "4px 0", borderTop: "1px solid var(--border)",
                }}>
                  <span style={{ color: "var(--ink2)", fontWeight: 300 }}>{v.name}</span>
                  <span style={{ fontWeight: 600, color: pr?.in_stock ? "var(--accent)" : "var(--ink3)" }}>
                    {pr?.price_usd ? `$${pr.price_usd}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function CareTab({ plant }) {
  const sections = [
    { key: "care_notes", emoji: "💧", title: "Watering & General Care" },
    { key: "soil", emoji: "🪴", title: "Soil & Potting" },
    { key: "fertilizer", emoji: "🌿", title: "Fertilizing" },
    { key: "propagation", emoji: "✂️", title: "Propagation" },
    { key: "temperature", emoji: "🌡️", title: "Temperature & Humidity" },
    { key: "common_problems", emoji: "🔍", title: "Common Problems" },
  ].filter(s => plant[s.key]);

  const hasProfile = plant.native_region || plant.bloom_season || plant.mature_height || plant.companion_plants || plant.fun_fact;

  if (sections.length === 0 && !hasProfile) return (
    <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>
      Detailed care guide coming soon for this plant.
    </div>
  );

  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sections.map(s => (
        <div key={s.key} style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)", padding: 16, boxShadow: "var(--shadow)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>{s.emoji}</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{s.title}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.7, fontWeight: 300 }}>{plant[s.key]}</p>
        </div>
      ))}
      {hasProfile && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)", padding: 16, boxShadow: "var(--shadow)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🌍</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Plant Profile</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[["Native to", plant.native_region], ["Blooms", plant.bloom_season], ["Height", plant.mature_height], ["Pairs With", plant.companion_plants]]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: 10, fontSize: 13 }}>
                  <span style={{ color: "var(--ink3)", fontWeight: 500, minWidth: 100 }}>{k}</span>
                  <span style={{ color: "var(--ink2)", fontWeight: 300 }}>{v}</span>
                </div>
              ))}
          </div>
          {plant.fun_fact && (
            <div style={{
              marginTop: 12, padding: "10px 12px",
              background: "var(--accent-bg)", borderRadius: "var(--radius-sm)",
              border: "1px solid var(--accent2)",
            }}>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                🌱 Did You Know
              </div>
              <p style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.6, fontWeight: 300 }}>{plant.fun_fact}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraitsTab({ plant }) {
  const traits = [
    { label: "Air Purifying", val: plant.air_purifying, icon: "🌬️" },
    { label: "Pet Safe", val: plant.toxicity === "Pet Safe", icon: "🐾" },
    { label: "Low Light OK", val: plant.low_light, icon: "🌑" },
    { label: "Drought Tolerant", val: plant.drought_tolerant, icon: "☀️" },
    { label: "Outdoor OK", val: plant.outdoor_ok, icon: "🌳" },
    { label: "Fast Growing", val: plant.fast_growing, icon: "⚡" },
    { label: "Flowering", val: plant.flowering, icon: "🌸" },
    { label: "Edible", val: plant.edible, icon: "🍽️" },
    { label: "Fragrant", val: plant.fragrant, icon: "🌺" },
    { label: "Rare Species", val: plant.rare, icon: "✦" },
  ];
  return (
    <div className="fade" style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: 16, boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {traits.map(t => (
          <div key={t.label} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: "var(--radius-sm)",
            background: t.val ? "var(--accent-bg)" : "var(--surface2)",
            border: `1px solid ${t.val ? "var(--accent2)" : "var(--border)"}`,
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.val ? "var(--accent)" : "var(--ink3)" }}>{t.label}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: t.val ? "var(--accent2)" : "var(--ink3)" }}>
              {t.val ? "Yes" : "No"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsTab({ reviews, plant, onReviewAdded, onToast, showForm, setShowForm }) {
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <div className="fade">
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", padding: 16, marginBottom: 12, boxShadow: "var(--shadow)",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 8 }}>
            {avg > 0 ? avg.toFixed(1) : "—"}
            <div style={{ display: "flex", gap: 2, color: "#f5c518" }}>
              {[1,2,3,4,5].map(n => <Icon key={n} n="star" s={16} />)}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--ink3)" }}>
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button className="btn" onClick={() => setShowForm(!showForm)}
          style={{
            padding: "8px 16px", background: "var(--accent)",
            color: "#fff", borderRadius: 99, fontSize: 13, fontWeight: 500,
          }}>
          {showForm ? "Cancel" : "Write a review"}
        </button>
      </div>
      {showForm && <ReviewForm plant={plant} onAdded={(r) => { onReviewAdded(r); setShowForm(false); onToast("Thanks for your review! 🌿"); }} onToast={onToast} />}
      {reviews.length === 0 ? (
        <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>
          Be the first to review this plant.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map(r => <ReviewCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: 14, boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #52b788, #2d6a4f)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 12,
        }}>{r.user_name?.[0]?.toUpperCase() ?? "?"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
            {r.user_name} {r.verified && <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>✓ Verified</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span style={{ color: "#f5c518", display: "flex" }}>
              {[1,2,3,4,5].map(n => (
                <Icon key={n} n="star" s={11} />
              ))}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink3)" }}>
              · {new Date(r.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      {r.title && <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 4 }}>{r.title}</div>}
      {r.body && <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.6, fontWeight: 300 }}>{r.body}</p>}
    </div>
  );
}

function ReviewForm({ plant, onAdded, onToast }) {
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          plant_id: plant.id,
          user_name: name.trim(),
          rating, title: title.trim() || null, body: body.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const [saved] = await res.json();
      onAdded(saved);
    } catch (e) {
      console.error(e);
      onToast("Couldn't save review", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={{
      background: "var(--surface)", border: "1.5px solid var(--accent)",
      borderRadius: "var(--radius)", padding: 16, marginBottom: 12, boxShadow: "var(--shadow)",
    }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setRating(n)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: n <= rating ? "#f5c518" : "var(--border2)",
              fontSize: 24, padding: 0,
            }}>★</button>
        ))}
      </div>
      <input required placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}/>
      <input placeholder="Review title (optional)" value={title} onChange={e => setTitle(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, marginBottom: 8 }}/>
      <textarea placeholder="Share your experience…" value={body} onChange={e => setBody(e.target.value)} rows={3}
        style={{ width: "100%", padding: "8px 10px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, marginBottom: 8, resize: "vertical", fontFamily: "inherit" }}/>
      <button type="submit" className="btn" disabled={submitting}
        style={{
          padding: "8px 18px", background: "var(--accent)",
          color: "#fff", borderRadius: 99, fontSize: 13, fontWeight: 500,
          opacity: submitting ? 0.6 : 1,
        }}>
        {submitting ? "Saving…" : "Submit review"}
      </button>
    </form>
  );
}

// ---------- COMPARE ----------
function CompareView({ plants, onRemove, onOpen, allPlants, onAdd, imagesByPlant }) {
  const [q, setQ] = useState("");
  const sugg = useMemo(() =>
    allPlants
      .filter(p => !plants.find(c => c.id === p.id) && p.common_name?.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5),
    [q, plants, allPlants]
  );

  if (plants.length === 0) return (
    <div className="fade" style={{ textAlign: "center", padding: "72px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
      <div className="wm" style={{ fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>No plants selected</div>
      <p style={{ fontSize: 14, color: "var(--ink3)", fontWeight: 300 }}>Tap the compare icon on up to 3 plants in the catalog.</p>
    </div>
  );

  const rows = [
    { label: "Species", fn: p => <em style={{ fontSize: 12 }}>{p.scientific_name}</em> },
    { label: "Category", fn: p => p.category },
    { label: "Difficulty", fn: p => { const dc = DIFF[p.difficulty] ?? DIFF.Easy; return <span style={{ color: dc.c, fontWeight: 600 }}>{p.difficulty}</span>; } },
    { label: "Light", fn: p => p.sunlight },
    { label: "Water", fn: p => p.watering },
    { label: "Toxicity", fn: p => <span style={{ color: p.toxicity === "Pet Safe" ? "var(--accent)" : "var(--red)", fontWeight: 500 }}>{p.toxicity}</span> },
    { label: "Air Purifying", fn: p => p.air_purifying ? "✓ Yes" : "—" },
    { label: "Low Light", fn: p => p.low_light ? "✓ Yes" : "—" },
    { label: "Pet Safe", fn: p => p.toxicity === "Pet Safe" ? "✓ Yes" : "✗ No" },
    { label: "Edible", fn: p => p.edible ? "✓ Yes" : "—" },
    { label: "Rare", fn: p => p.rare ? "✦ Yes" : "—" },
  ];

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <h2 className="wm" style={{ fontSize: 26, fontWeight: 400, letterSpacing: "-0.02em" }}>Compare Plants</h2>
        {plants.length < 3 && (
          <div style={{ position: "relative" }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Add plant…"
              style={{ padding: "7px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", fontSize: 13, color: "var(--ink)", width: 180 }} />
            {q && sugg.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)", zIndex: 50, minWidth: 200 }}>
                {sugg.map(p => (
                  <button key={p.id} className="btn" onClick={() => { onAdd(p); setQ(""); }}
                    style={{ padding: "9px 12px", fontSize: 13, borderBottom: "1px solid var(--border)", width: "100%", textAlign: "left", display: "block" }}>
                    {p.emoji} {p.common_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ overflowX: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface2)" }}>
              <th style={{ padding: "10px 14px", width: 100, textAlign: "left" }}></th>
              {plants.map(p => (
                <th key={p.id} style={{ padding: "12px 14px", textAlign: "left", borderLeft: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div onClick={() => onOpen(p)} style={{ cursor: "pointer" }}>
                      <LazyImage src={imagesByPlant[p.id]?.[0]?.url ?? p.image_url} alt={p.common_name}
                        fallbackEmoji={p.emoji} height={56} style={{ width: 56, borderRadius: 6, marginBottom: 6 }} />
                      <div className="wm" style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{p.common_name}</div>
                    </div>
                    <button className="btn" onClick={() => onRemove(p.id)} style={{ color: "var(--red)" }}>
                      <Icon n="x" s={13} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.label} style={{ background: ri % 2 === 0 ? "var(--surface)" : "var(--surface2)" }}>
                <td style={{ padding: "9px 14px", fontSize: 11, color: "var(--ink3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em", borderRight: "1px solid var(--border)" }}>{row.label}</td>
                {plants.map(p => <td key={p.id} style={{ padding: "9px 14px", fontSize: 13, color: "var(--ink)", borderLeft: "1px solid var(--border)" }}>{row.fn(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- WISHLIST ----------
function WishlistView({ plants, imagesByPlant, onOpen, onRemove }) {
  if (plants.length === 0) return (
    <div className="fade" style={{ textAlign: "center", padding: "72px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌱</div>
      <div className="wm" style={{ fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>Your collection is empty</div>
      <p style={{ fontSize: 14, color: "var(--ink3)", fontWeight: 300 }}>Tap the heart on any plant to save it here.</p>
    </div>
  );
  return (
    <div className="fade">
      <h2 className="wm" style={{ fontSize: 26, fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 16 }}>Saved Plants</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {plants.map(p => (
          <div key={p.id} className="lift" style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", overflow: "hidden",
            boxShadow: "var(--shadow)", position: "relative", cursor: "pointer",
          }} onClick={() => onOpen(p)}>
            <LazyImage src={imagesByPlant[p.id]?.[0]?.url ?? p.image_url} alt={p.common_name} fallbackEmoji={p.emoji} height={130} style={{ borderRadius: 0 }} />
            <button className="btn" onClick={e => { e.stopPropagation(); onRemove(p.id); }}
              style={{
                position: "absolute", top: 10, right: 10,
                width: 28, height: 28, borderRadius: 8,
                background: "rgba(255,255,255,0.92)", border: "none",
                color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)", backdropFilter: "blur(4px)",
              }}>
              <Icon n="x" s={13} />
            </button>
            <div style={{ padding: 14 }}>
              <div className="wm" style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 2 }}>{p.common_name}</div>
              <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)", marginBottom: 10 }}>{p.scientific_name}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {p.tags?.slice(0, 3).map(t => (
                  <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--ink3)" }}>#{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- QUIZ ----------
function QuizView({ plants, onOpen, imagesByPlant }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);

  const questions = [
    { id: "light", emoji: "☀️", question: "What's the light like in your space?",
      options: [
        { label: "Bright & sunny", value: "bright" },
        { label: "Medium indirect light", value: "medium" },
        { label: "Pretty dim", value: "low" },
        { label: "Almost no natural light", value: "verylow" },
      ]},
    { id: "water", emoji: "💧", question: "How often do you actually remember to water?",
      options: [
        { label: "Every few days, I'm on it", value: "frequent" },
        { label: "Once a week maybe", value: "weekly" },
        { label: "When I remember... oops", value: "infrequent" },
        { label: "Honestly almost never", value: "rare" },
      ]},
    { id: "pets", emoji: "🐾", question: "Pets or small kids?",
      options: [
        { label: "Yes, dogs or cats", value: "pets" },
        { label: "Yes, small children", value: "kids" },
        { label: "Both!", value: "both" },
        { label: "Nope, all good", value: "none" },
      ]},
    { id: "experience", emoji: "🌿", question: "How's your plant track record?",
      options: [
        { label: "Black thumb, everything dies", value: "beginner" },
        { label: "Kept a few alive", value: "some" },
        { label: "Pretty confident", value: "experienced" },
        { label: "I talk to my plants daily", value: "expert" },
      ]},
    { id: "vibe", emoji: "🏡", question: "What's your plant vibe?",
      options: [
        { label: "Big dramatic statement plant", value: "statement" },
        { label: "Cute little shelf plant", value: "small" },
        { label: "Rare and impressive", value: "rare" },
        { label: "Something that flowers", value: "flowering" },
      ]},
  ];

  const scorePlant = useCallback((plant, a) => {
    let s = 0;
    const lightMap = { bright: ["Full Sun", "Bright Indirect"], medium: ["Bright Indirect", "Medium Light"], low: ["Low Light", "Medium Light"], verylow: ["Low Light"] };
    if (lightMap[a.light]?.some(l => plant.sunlight?.includes(l))) s += 3;
    const waterMap = { frequent: ["Frequent", "Moderate"], weekly: ["Moderate", "Weekly"], infrequent: ["Low", "Weekly"], rare: ["Low", "Very Low", "Drought Tolerant"] };
    if (waterMap[a.water]?.some(w => plant.watering?.includes(w))) s += 3;
    if (a.water === "rare" && plant.drought_tolerant) s += 2;
    if (["pets", "kids", "both"].includes(a.pets) && plant.toxicity === "Pet Safe") s += 4;
    if (a.pets === "none") s += 1;
    const diffMap = { beginner: ["Very Easy", "Easy"], some: ["Easy", "Moderate"], experienced: ["Moderate", "Hard"], expert: ["Hard", "Expert"] };
    if (diffMap[a.experience]?.includes(plant.difficulty)) s += 3;
    if (a.vibe === "rare" && plant.rare) s += 4;
    if (a.vibe === "flowering" && plant.flowering) s += 4;
    if (a.vibe === "statement" && plant.mature_height?.includes("ft")) s += 2;
    if (a.vibe === "small" && plant.category === "Succulent") s += 2;
    if (a.vibe === "small" && plant.category === "Houseplant") s += 1;
    if ((a.light === "low" || a.light === "verylow") && plant.low_light) s += 3;
    return s;
  }, []);

  const handleAnswer = (qid, value) => {
    const next = { ...answers, [qid]: value };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setResults(plants.map(p => ({ ...p, score: scorePlant(p, next) })).sort((a, b) => b.score - a.score).slice(0, 3));
    }
  };

  const reset = () => { setStep(0); setAnswers({}); setResults(null); };

  if (results) return (
    <div className="fade">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🌿</div>
        <h2 className="wm" style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.03em", marginBottom: 6 }}>Your Perfect Plants</h2>
        <p style={{ fontSize: 14, color: "var(--ink3)", fontWeight: 300 }}>Based on your answers, these are your ideal matches</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {results.map((p, i) => (
          <div key={p.id} className="lift" onClick={() => onOpen(p)}
            style={{
              background: "var(--surface)",
              border: `1.5px solid ${i === 0 ? "var(--accent)" : "var(--border)"}`,
              borderRadius: "var(--radius)", overflow: "hidden",
              boxShadow: i === 0 ? "0 0 0 3px var(--accent-bg)" : "var(--shadow)",
              cursor: "pointer", display: "flex", gap: 0,
            }}>
            {i === 0 && <div style={{ width: 4, background: "var(--accent)", flexShrink: 0 }} />}
            <LazyImage src={imagesByPlant[p.id]?.[0]?.url ?? p.image_url} alt={p.common_name} fallbackEmoji={p.emoji} height={92} style={{ width: 92, borderRadius: 0, flexShrink: 0 }}/>
            <div style={{ padding: "12px 14px", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-bg)", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.08em" }}>Best Match</span>}
                {i === 1 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink3)", background: "var(--surface2)", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.08em" }}>Runner Up</span>}
                {i === 2 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink3)", background: "var(--surface2)", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.08em" }}>Also Great</span>}
              </div>
              <div className="wm" style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 2 }}>{p.common_name}</div>
              <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)", marginBottom: 6 }}>{p.scientific_name}</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--ink3)" }}>{p.difficulty}</span>
                {p.toxicity === "Pet Safe" && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--accent-bg)", border: "1px solid var(--accent2)", color: "var(--accent)" }}>🐾 Pet Safe</span>}
                {p.rare && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#faeaea", border: "1px solid #f0cccc", color: "#8a2a2a" }}>✦ Rare</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button className="btn" onClick={reset}
          style={{ padding: "10px 24px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 99, fontSize: 13, fontWeight: 500, color: "var(--ink2)" }}>
          Retake Quiz
        </button>
      </div>
    </div>
  );

  const q = questions[step];
  return (
    <div className="fade" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 28, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              height: 4, width: i === step ? 28 : 16, borderRadius: 99,
              background: i <= step ? "var(--accent)" : "var(--border)",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>
        <div style={{ fontSize: 44, marginBottom: 12 }}>{q.emoji}</div>
        <h2 className="wm" style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.03em", color: "var(--ink)", marginBottom: 6 }}>{q.question}</h2>
        <p style={{ fontSize: 12, color: "var(--ink3)" }}>Question {step + 1} of {questions.length}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {q.options.map(opt => (
          <button key={opt.value} className="btn lift" onClick={() => handleAnswer(q.id, opt.value)}
            style={{
              padding: "16px 20px", background: "var(--surface)",
              border: "1.5px solid var(--border)", borderRadius: "var(--radius)",
              fontSize: 15, fontWeight: 400, color: "var(--ink)",
              textAlign: "left", boxShadow: "var(--shadow)",
            }}>
            {opt.label}
          </button>
        ))}
      </div>
      {step > 0 && (
        <button className="btn" onClick={() => setStep(step - 1)}
          style={{ marginTop: 16, fontSize: 13, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon n="back" s={13} /> Back
        </button>
      )}
    </div>
  );
}

// ---------- HELPERS ----------
function Chip({ children, color }) {
  return (
    <span style={{
      background: color ? `${color}33` : "rgba(255,255,255,0.1)",
      border: `1px solid ${color ? `${color}55` : "rgba(255,255,255,0.18)"}`,
      borderRadius: 99, padding: "3px 10px",
      fontSize: 12, color: "rgba(255,255,255,0.88)", fontWeight: 500,
    }}>
      {children}
    </span>
  );
}

function LoadingState() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", overflow: "hidden", boxShadow: "var(--shadow)",
          }}>
            <div style={{
              height: 170, background: "linear-gradient(90deg, #ece8df 0%, #f5f1ea 50%, #ece8df 100%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.4s ease infinite",
            }}/>
            <div style={{ padding: 14 }}>
              <div style={{ height: 18, width: "70%", background: "#ece8df", borderRadius: 4, marginBottom: 6 }}/>
              <div style={{ height: 12, width: "50%", background: "#ece8df", borderRadius: 4, marginBottom: 12 }}/>
              <div style={{ height: 10, width: "100%", background: "#ece8df", borderRadius: 4, marginBottom: 4 }}/>
              <div style={{ height: 10, width: "80%", background: "#ece8df", borderRadius: 4 }}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--ink3)" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🌾</div>
      <div className="wm" style={{ fontSize: 20, color: "var(--ink2)", marginBottom: 6 }}>Nothing found</div>
      <div style={{ fontSize: 13 }}>Try adjusting your filters</div>
      <button className="btn" onClick={onReset}
        style={{ marginTop: 12, fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
        Clear all filters
      </button>
    </div>
  );
}

function Footer({ plantCount }) {
  return (
    <footer style={{
      borderTop: "1px solid var(--border)", marginTop: 24,
      padding: "24px 16px", textAlign: "center",
      color: "var(--ink3)", fontSize: 11,
    }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="wm" style={{ fontSize: 14, color: "var(--ink2)", marginBottom: 4, fontWeight: 400 }}>Cultivar</div>
        <div>
          {plantCount.toLocaleString()} species · Plant images from Wikipedia, iNaturalist, GBIF under CC licenses · Prices updated weekly
        </div>
        <div style={{ marginTop: 6, opacity: 0.6 }}>
          Press <kbd style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontFamily: "inherit" }}>/</kbd> to search · <kbd style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontFamily: "inherit" }}>G</kbd> to toggle layout · <kbd style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontFamily: "inherit" }}>Esc</kbd> to go back
        </div>
      </div>
    </footer>
  );
}

// ---------- GLOBAL STYLES ----------
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&display=swap');
      :root {
        --bg: #f7f5f0; --surface: #ffffff; --surface2: #f2efe9;
        --border: #e2ddd6; --border2: #cec9c0;
        --ink: #1a1814; --ink2: #6b6560; --ink3: #9b958e;
        --accent: #2d6a4f; --accent2: #52b788; --accent-bg: #e8f5ee;
        --red: #c1392b; --red-bg: #fdecea;
        --radius: 14px; --radius-sm: 8px;
        --shadow: 0 2px 16px rgba(26,24,20,0.06);
        --shadow-lg: 0 8px 40px rgba(26,24,20,0.12);
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: var(--surface2); }
      ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 99px; }
      .lift { transition: transform 0.18s ease, box-shadow 0.18s ease; cursor: pointer; }
      .lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg) !important; }
      .btn { cursor: pointer; border: none; background: transparent; transition: all 0.15s ease; font-family: 'DM Sans', sans-serif; }
      .btn:active { transform: scale(0.96); }
      .pill { padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 500; transition: all 0.18s ease; cursor: pointer; border: 1.5px solid transparent; }
      .pill:hover { background: rgba(255,255,255,0.12); }
      .pill.on { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.3); }
      .fade { animation: fadeUp 0.3s ease forwards; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
      @keyframes spin { to { transform: rotate(360deg); } }
      .spinner { width: 24px; height: 24px; border: 2px solid var(--border2); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
      .tab { padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--ink3); cursor: pointer; border: none; background: transparent; border-bottom: 2px solid transparent; transition: all 0.15s; font-family: 'DM Sans', sans-serif; white-space: nowrap; }
      .tab.on { color: var(--accent); border-bottom-color: var(--accent); }
      .wm { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
      input, select, textarea { font-family: 'DM Sans', sans-serif; }
      input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
      .hero-bg { background: linear-gradient(135deg, #0f2318 0%, #1a3a28 40%, #152e1f 100%); }
      .plant-card-link { text-decoration: none; color: inherit; display: block; }
      kbd { font-family: inherit; }
    `}</style>
  );
}
