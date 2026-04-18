/* Cultivar — mobile-first, fast, zero setup required.
   Works with your existing tables: plants, varieties, prices, retailers.
   Optional tables (plant_images, reviews) are detected and used if they exist. */

import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";

const SUPABASE_URL = "https://ewyfhousutslimzwoflk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eWZob3VzdXRzbGltendvZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzQ1OTksImV4cCI6MjA5MTM1MDU5OX0.SMq04MDpT-FLSHbWA6i_2meJ56cJfITTy4ig37K7R-s";

const PAGE_SIZE = 30;

// ---------- storage (safe everywhere) ----------
const store = {
  get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---------- API ----------
async function sb(path, { signal } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    signal,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ---------- Wikipedia image cache (client-side, localStorage) ----------
const IMG_CACHE_KEY = "cultivar:img-cache:v2";
const imgCache = store.get(IMG_CACHE_KEY, {});
let imgCacheDirty = false;
setInterval(() => { if (imgCacheDirty) { store.set(IMG_CACHE_KEY, imgCache); imgCacheDirty = false; } }, 3000);

const inFlightImg = new Map();
async function fetchWikiImage(term) {
  if (!term) return null;
  if (imgCache[term] !== undefined) return imgCache[term];
  if (inFlightImg.has(term)) return inFlightImg.get(term);
  const p = (async () => {
    try {
      const r = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&titles=${encodeURIComponent(term)}&origin=*&redirects=1`,
        { signal: AbortSignal.timeout?.(5000) }
      );
      const d = await r.json();
      const url = Object.values(d?.query?.pages ?? {})[0]?.original?.source ?? null;
      imgCache[term] = url;
      imgCacheDirty = true;
      return url;
    } catch {
      imgCache[term] = null;
      return null;
    } finally {
      inFlightImg.delete(term);
    }
  })();
  inFlightImg.set(term, p);
  return p;
}

// ---------- retailer links ----------
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

// ---------- design tokens ----------
const DIFF = {
  "Very Easy": "#5aaa3c", "Easy": "#7ac44a", "Moderate": "#c49a2a",
  "Hard": "#c44a3c", "Expert": "#3a3a5a",
};

// ---------- icons ----------
const Icon = memo(({ n, s = 16 }) => {
  const I = {
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></>,
    drop: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    cmp: <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    back: <polyline points="15 18 9 12 15 6"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    filter: <><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>,
    spark: <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>,
    menu: <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
  };
  const c = I[n]; if (!c) return null;
  const f = ["heart", "spark"].includes(n);
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={f ? "currentColor" : "none"} stroke={f ? "none" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{c}</svg>;
});

// ---------- hooks ----------
function useDebounced(v, d = 200) {
  const [s, set] = useState(v);
  useEffect(() => { const t = setTimeout(() => set(v), d); return () => clearTimeout(t); }, [v, d]);
  return s;
}

function usePersisted(k, init) {
  const [v, set] = useState(() => store.get(k, init));
  useEffect(() => { store.set(k, v); }, [k, v]);
  return [v, set];
}

function useInView() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); o.disconnect(); }
    }, { rootMargin: "300px" });
    o.observe(ref.current);
    return () => o.disconnect();
  }, [seen]);
  return [ref, seen];
}

// ---------- LazyImage: fetches wiki image only when scrolled near ----------
const LazyImage = memo(({ plant, height = 170, rounded = 0 }) => {
  const [ref, inView] = useInView();
  const [src, setSrc] = useState(plant.image_url || null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!inView || src || errored) return;
    let live = true;
    fetchWikiImage(plant.scientific_name).then(url => {
      if (!live) return;
      if (url) setSrc(url);
      else fetchWikiImage(plant.common_name).then(u2 => live && u2 && setSrc(u2));
    });
    return () => { live = false; };
  }, [inView, plant.scientific_name, plant.common_name, src, errored]);

  return (
    <div ref={ref} style={{
      position: "relative", width: "100%", height,
      background: "linear-gradient(135deg, #e8ede4, #d5e0d0)",
      overflow: "hidden", borderRadius: rounded,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {(!src || errored) && (
        <div style={{ fontSize: Math.max(28, height * 0.4), opacity: 0.55 }}>
          {plant.emoji || "🌿"}
        </div>
      )}
      {src && !errored && (
        <img
          src={src}
          alt={plant.common_name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%", objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        />
      )}
    </div>
  );
});

// ---------- toast ----------
function useToast() {
  const [m, set] = useState(null);
  const show = useCallback((text) => {
    set({ text, id: Date.now() });
    setTimeout(() => set(c => c?.id === Date.now() ? null : c), 2500);
    setTimeout(() => set(null), 2600);
  }, []);
  const el = m && (
    <div role="status" style={{
      position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom))", left: "50%",
      transform: "translateX(-50%)", zIndex: 9999,
      background: "#1a3a28", color: "#fff",
      padding: "11px 20px", borderRadius: 999, fontSize: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      animation: "slideUp 0.3s ease", maxWidth: "90vw", textAlign: "center",
    }}>{m.text}</div>
  );
  return { show, el };
}

// ---------- routing (simple) ----------
function getRoute() {
  const p = window.location.pathname;
  if (p.startsWith("/plant/")) return { view: "detail", slug: p.slice(7) };
  return { view: "catalog" };
}

// =====================================================================
// MAIN
// =====================================================================
export default function Cultivar() {
  const [view, setView] = useState("catalog");
  const [selected, setSelected] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [wishlist, setWishlist] = usePersisted("cultivar:wish", []);
  const [compare, setCompare] = usePersisted("cultivar:compare", []);

  const [searchRaw, setSearchRaw] = useState("");
  const [type, setType] = useState("All");
  const [diff, setDiff] = useState("All");
  const [tox, setTox] = useState("All");
  const [sort, setSort] = useState("name");
  const [showFilters, setShowFilters] = useState(false);

  const search = useDebounced(searchRaw, 200);
  const toast = useToast();

  // ---- load first page quickly ----
  const loadPage = useCallback(async (p = 0) => {
    try {
      if (p === 0) setLoading(true);
      setError(null);
      // Smaller projection — only what the card needs
      const cardFields = "id,common_name,scientific_name,emoji,category,description,sunlight,watering,difficulty,toxicity,slug,tags,rare,low_light,air_purifying,edible,image_url";
      const from = p * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/plants?select=${cardFields}&published=eq.true&order=common_name.asc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Range: `${from}-${to}`,
            Prefer: "count=estimated",
          },
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setPlants(prev => p === 0 ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(p);

      // Deep link on first load
      if (p === 0) {
        const r = getRoute();
        if (r.view === "detail" && r.slug) {
          const f = data.find(x => x.slug === r.slug);
          if (f) { setSelected(f); setView("detail"); }
          // if not on first page, a full fetch will handle it — see effect below
        }
      }
    } catch (e) {
      console.error(e);
      setError("Could not load plants. Check connection and retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPage(0); }, [loadPage]);

  // Infinite scroll sentinel
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!hasMore || loading || view !== "catalog") return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) loadPage(page + 1);
    }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, page, view, loadPage]);

  // Browser back/forward
  useEffect(() => {
    const onPop = () => {
      const r = getRoute();
      if (r.view === "detail" && r.slug) {
        const f = plants.find(x => x.slug === r.slug);
        if (f) { setSelected(f); setView("detail"); }
      } else {
        setView("catalog"); setSelected(null);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [plants]);

  // Derived
  const types = useMemo(
    () => ["All", ...Array.from(new Set(plants.map(p => p.category).filter(Boolean))).sort()],
    [plants]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = plants.filter(p => {
      const ms = !q || p.common_name?.toLowerCase().includes(q)
        || p.scientific_name?.toLowerCase().includes(q)
        || p.tags?.some(t => t.toLowerCase().includes(q));
      const mt = type === "All" || p.category === type;
      const md = diff === "All" || p.difficulty === diff;
      const mx = tox === "All" || p.toxicity === tox;
      return ms && mt && md && mx;
    });
    if (sort === "name") list.sort((a, b) => (a.common_name ?? "").localeCompare(b.common_name ?? ""));
    else if (sort === "rare") list.sort((a, b) => (b.rare ? 1 : 0) - (a.rare ? 1 : 0));
    else if (sort === "pet_safe") list.sort((a, b) => (b.toxicity === "Pet Safe" ? 1 : 0) - (a.toxicity === "Pet Safe" ? 1 : 0));
    return list;
  }, [plants, search, type, diff, tox, sort]);

  const hasActiveFilters = search || type !== "All" || diff !== "All" || tox !== "All";
  const reset = () => { setSearchRaw(""); setType("All"); setDiff("All"); setTox("All"); };

  // Actions
  const toggleWish = useCallback((p) => {
    setWishlist(w => {
      if (w.find(x => x.id === p.id)) { toast.show(`Removed from saved`); return w.filter(x => x.id !== p.id); }
      toast.show(`Saved ${p.common_name} ♥`);
      return [...w, p];
    });
  }, [toast, setWishlist]);

  const toggleCmp = useCallback((p) => {
    setCompare(c => {
      if (c.find(x => x.id === p.id)) { toast.show("Removed from compare"); return c.filter(x => x.id !== p.id); }
      if (c.length >= 3) { toast.show("Max 3 in compare"); return c; }
      toast.show(`Added (${c.length + 1}/3)`);
      return [...c, p];
    });
  }, [toast, setCompare]);

  const openPlant = useCallback((p) => {
    setSelected(p); setView("detail");
    window.history.pushState({}, "", `/plant/${p.slug}`);
    window.scrollTo({ top: 0 });
    document.title = `${p.common_name} — Cultivar`;
  }, []);

  const goHome = useCallback(() => {
    setView("catalog"); setSelected(null);
    window.history.pushState({}, "", "/");
    document.title = "Cultivar — Plant Database";
  }, []);

  const isWished = id => wishlist.some(w => w.id === id);
  const isCmp = id => compare.some(c => c.id === id);

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--ink)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <Styles />
      {toast.el}

      <Header
        view={view}
        count={plants.length}
        wishCount={wishlist.length}
        cmpCount={compare.length}
        onNav={v => { if (v === "catalog") goHome(); else setView(v); }}
        onHome={goHome}
      />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 14px 80px" }}>
        {error && (
          <div style={{
            padding: "12px 14px", background: "#fde8e5", border: "1.5px solid #f5c1ba",
            borderRadius: 10, color: "#8a2a1a", fontSize: 13,
            marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
          }}>
            <span>⚠ {error}</span>
            <button className="btn" onClick={() => loadPage(0)} style={{ color: "#8a2a1a", fontWeight: 600, fontSize: 13 }}>Retry</button>
          </div>
        )}

        {view === "catalog" && (
          <Catalog
            loading={loading && plants.length === 0}
            plants={plants}
            filtered={filtered}
            searchRaw={searchRaw}
            setSearchRaw={setSearchRaw}
            type={type} setType={setType}
            diff={diff} setDiff={setDiff}
            tox={tox} setTox={setTox}
            sort={sort} setSort={setSort}
            types={types}
            hasActiveFilters={hasActiveFilters}
            reset={reset}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            onOpen={openPlant}
            onWish={toggleWish}
            onCmp={toggleCmp}
            isWished={isWished}
            isCmp={isCmp}
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            loadingMore={loading && plants.length > 0}
          />
        )}

        {view === "detail" && selected && (
          <Detail
            plant={selected}
            onBack={goHome}
            onWish={toggleWish}
            onCmp={toggleCmp}
            wished={isWished(selected.id)}
            comped={isCmp(selected.id)}
            toast={toast.show}
          />
        )}

        {view === "compare" && (
          <Compare
            plants={compare}
            onRemove={id => setCompare(compare.filter(x => x.id !== id))}
            onOpen={openPlant}
          />
        )}

        {view === "wishlist" && (
          <Wishlist
            plants={wishlist}
            onOpen={openPlant}
            onRemove={id => setWishlist(wishlist.filter(x => x.id !== id))}
          />
        )}

        {view === "quiz" && <Quiz plants={plants} onOpen={openPlant} />}
      </main>

      <Footer count={plants.length} />
    </div>
  );
}

// ---------- HEADER (mobile-first bottom-friendly top bar) ----------
const Header = memo(({ view, count, wishCount, cmpCount, onNav, onHome }) => {
  const [menu, setMenu] = useState(false);
  const items = [
    { id: "catalog", label: "Browse" },
    { id: "quiz", label: "Find My Plant" },
    { id: "compare", label: cmpCount ? `Compare · ${cmpCount}` : "Compare" },
    { id: "wishlist", label: wishCount ? `Saved · ${wishCount}` : "Saved" },
  ];

  return (
    <header className="hero-bg" style={{
      position: "sticky", top: 0, zIndex: 100,
      paddingTop: "env(safe-area-inset-top)",
      boxShadow: "0 2px 14px rgba(0,0,0,0.15)",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: "0 14px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
      }}>
        <button onClick={onHome} className="btn" style={{
          display: "flex", alignItems: "center", gap: 10, minWidth: 0,
          color: "#fff",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #52b788, #2d6a4f)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(82,183,136,0.4)",
          }}>
            <Icon n="leaf" s={16} />
          </div>
          <div style={{ textAlign: "left", minWidth: 0 }}>
            <div className="wm" style={{ fontSize: 19, fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }}>Cultivar</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2 }}>
              Plant Database
            </div>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="nav-desktop" style={{ display: "flex", gap: 2 }}>
          {items.map(t => (
            <button key={t.id} className={`pill ${view === t.id ? "on" : ""}`} onClick={() => onNav(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {/* Mobile nav trigger */}
        <button className="btn nav-mobile" onClick={() => setMenu(m => !m)}
          style={{
            width: 40, height: 40, borderRadius: 10,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            background: menu ? "rgba(255,255,255,0.15)" : "transparent",
          }} aria-label="Menu">
          <Icon n={menu ? "x" : "menu"} s={20} />
        </button>
      </div>

      {/* Mobile sheet */}
      {menu && (
        <div className="nav-mobile" style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#0f2318", borderTop: "1px solid rgba(255,255,255,0.08)",
          padding: "8px 14px 14px", animation: "slideDown 0.22s ease",
        }}>
          {items.map(t => (
            <button key={t.id} className="btn" onClick={() => { onNav(t.id); setMenu(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "12px 14px", color: view === t.id ? "#fff" : "rgba(255,255,255,0.75)",
                background: view === t.id ? "rgba(82,183,136,0.2)" : "transparent",
                borderRadius: 8, fontSize: 15, fontWeight: 500, marginBottom: 2,
              }}>
              {t.label}
            </button>
          ))}
          <div style={{
            marginTop: 8, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em",
          }}>
            {count > 0 ? `${count.toLocaleString()} plants loaded` : "connecting…"}
          </div>
        </div>
      )}
    </header>
  );
});

// ---------- CATALOG ----------
function Catalog({
  loading, plants, filtered, searchRaw, setSearchRaw,
  type, setType, diff, setDiff, tox, setTox, sort, setSort, types,
  hasActiveFilters, reset, showFilters, setShowFilters,
  onOpen, onWish, onCmp, isWished, isCmp,
  sentinelRef, hasMore, loadingMore,
}) {
  const filterCount = (type !== "All" ? 1 : 0) + (diff !== "All" ? 1 : 0) + (tox !== "All" ? 1 : 0);

  return (
    <div className="fade">
      <div style={{ marginBottom: 16 }}>
        <h1 className="wm" style={{
          fontSize: "clamp(24px, 7vw, 34px)",
          fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.05,
        }}>
          The Plant <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Intelligence</em> Database
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink3)", marginTop: 6 }}>
          {loading ? "Loading…" : `${plants.length}+ species · scroll for more`}
        </p>
      </div>

      {/* SEARCH BAR — sticky on mobile */}
      <div style={{
        position: "sticky", top: "calc(56px + env(safe-area-inset-top))",
        zIndex: 20, background: "var(--bg)",
        paddingTop: 4, paddingBottom: 10,
        margin: "0 -14px", padding: "8px 14px",
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink3)", display: "flex" }}>
              <Icon n="search" s={16} />
            </span>
            <input
              value={searchRaw}
              onChange={e => setSearchRaw(e.target.value)}
              placeholder="Search plants…"
              type="search"
              autoComplete="off"
              style={{
                width: "100%", padding: "12px 12px 12px 38px",
                border: "1.5px solid var(--border)", borderRadius: 12,
                background: "var(--surface)", fontSize: 15,
                WebkitAppearance: "none",
              }}
            />
            {searchRaw && (
              <button className="btn" onClick={() => setSearchRaw("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--ink3)", padding: 6 }}>
                <Icon n="x" s={15} />
              </button>
            )}
          </div>
          <button className="btn" onClick={() => setShowFilters(s => !s)}
            style={{
              width: 46, height: 46, borderRadius: 12,
              background: showFilters || filterCount ? "var(--accent)" : "var(--surface)",
              color: showFilters || filterCount ? "#fff" : "var(--ink2)",
              border: "1.5px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }} aria-label="Filters">
            <Icon n="filter" s={16} />
            {filterCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "#c1392b", color: "#fff",
                fontSize: 10, fontWeight: 700,
                width: 18, height: 18, borderRadius: 9,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--bg)",
              }}>{filterCount}</span>
            )}
          </button>
        </div>

        {showFilters && (
          <div style={{
            marginTop: 10, padding: 12,
            background: "var(--surface)", borderRadius: 12,
            border: "1.5px solid var(--border)",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8,
            animation: "slideDown 0.2s ease",
          }}>
            <Select label="Category" value={type} onChange={setType} options={types} />
            <Select label="Difficulty" value={diff} onChange={setDiff} options={["All", "Very Easy", "Easy", "Moderate", "Hard", "Expert"]} />
            <Select label="Safety" value={tox} onChange={setTox} options={["All", "Pet Safe", "Toxic to Pets", "Toxic to Both"]} />
            <Select label="Sort" value={sort} onChange={setSort} options={[["name","Name"],["rare","Rare first"],["pet_safe","Pet safe first"]]} />
            {hasActiveFilters && (
              <button className="btn" onClick={reset}
                style={{
                  gridColumn: "1 / -1",
                  padding: "8px 12px", fontSize: 13, fontWeight: 500,
                  color: "var(--accent)", background: "var(--accent-bg)",
                  borderRadius: 8,
                }}>
                Clear {filterCount + (searchRaw ? 1 : 0)} filter{(filterCount + (searchRaw ? 1 : 0)) !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}
      </div>

      {/* RESULTS */}
      {loading ? (
        <LoadingGrid />
      ) : filtered.length === 0 ? (
        <Empty onReset={reset} />
      ) : (
        <>
          <div className="grid">
            {filtered.map(p => (
              <PlantCard key={p.id} plant={p}
                onOpen={onOpen} onWish={onWish} onCmp={onCmp}
                wished={isWished(p.id)} comped={isCmp(p.id)} />
            ))}
          </div>
          {hasMore && !hasActiveFilters && (
            <div ref={sentinelRef} style={{ padding: "30px 0", textAlign: "center", color: "var(--ink3)", fontSize: 13 }}>
              {loadingMore ? <><span className="spinner" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }} /> Loading more…</> : "Scroll for more"}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const Select = memo(({ label, value, onChange, options }) => (
  <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <span style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
      {label}
    </span>
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        padding: "9px 10px", border: "1.5px solid var(--border)", borderRadius: 8,
        background: "var(--surface2)", fontSize: 14, color: "var(--ink)",
        WebkitAppearance: "none", appearance: "none",
        backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239b958e' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'/%3e%3c/svg%3e\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        paddingRight: 28,
      }}>
      {options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>)}
    </select>
  </label>
));

// ---------- PLANT CARD ----------
const PlantCard = memo(({ plant, onOpen, onWish, onCmp, wished, comped }) => {
  const dc = DIFF[plant.difficulty] ?? "#7ac44a";
  return (
    <article className="card lift" onClick={() => onOpen(plant)}
      style={{
        background: "var(--surface)",
        border: `1.5px solid ${comped ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: comped ? "0 0 0 3px var(--accent-bg)" : "var(--shadow)",
        cursor: "pointer", position: "relative",
      }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${dc}, ${dc}44)` }} />
      <div style={{ position: "relative" }}>
        <LazyImage plant={plant} height={170} />
        <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
          <button className="btn tap" onClick={() => onWish(plant)}
            aria-label={wished ? "Remove from saved" : "Save plant"}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: wished ? "#c1392b" : "rgba(255,255,255,0.94)",
              color: wished ? "#fff" : "var(--ink3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(6px)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}>
            <Icon n="heart" s={14} />
          </button>
          <button className="btn tap" onClick={() => onCmp(plant)}
            aria-label={comped ? "Remove from compare" : "Add to compare"}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: comped ? "var(--accent)" : "rgba(255,255,255,0.94)",
              color: comped ? "#fff" : "var(--ink3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(6px)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}>
            <Icon n="cmp" s={14} />
          </button>
        </div>
        {plant.rare && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(138,42,42,0.92)", color: "#fff",
            fontSize: 10, fontWeight: 600, padding: "4px 9px", borderRadius: 99,
            backdropFilter: "blur(6px)", display: "flex", alignItems: "center", gap: 3,
          }}>
            <Icon n="spark" s={9} /> Rare
          </div>
        )}
      </div>
      <div style={{ padding: "12px 13px 14px" }}>
        <div className="wm" style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)", marginBottom: 2, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
          {plant.common_name}
        </div>
        <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)", marginBottom: 8 }}>
          {plant.scientific_name}
        </div>
        <p style={{
          fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5, marginBottom: 10,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {plant.description}
        </p>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Pill icon="sun" text={plant.sunlight} />
          <Pill icon="drop" text={plant.watering} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--ink2)", fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: dc }} /> {plant.difficulty}
          </span>
          {plant.toxicity === "Pet Safe" && (
            <span style={{ fontSize: 11, color: "var(--accent)", background: "var(--accent-bg)", padding: "2px 8px", borderRadius: 99, fontWeight: 500 }}>
              🐾 Pet safe
            </span>
          )}
        </div>
      </div>
    </article>
  );
});

const Pill = memo(({ icon, text }) => text ? (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 8px", borderRadius: 99,
    background: "var(--surface2)", border: "1px solid var(--border)",
    fontSize: 11, color: "var(--ink2)",
  }}>
    <Icon n={icon} s={10} /> {text}
  </span>
) : null);

// ---------- DETAIL ----------
function Detail({ plant, onBack, onWish, onCmp, wished, comped, toast }) {
  const [tab, setTab] = useState("varieties");
  const [varieties, setVarieties] = useState([]);
  const [loadingVars, setLoadingVars] = useState(true);
  const [full, setFull] = useState(plant);

  // Load full plant details + varieties + prices in parallel, efficiently
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingVars(true);
      try {
        const [fullPlant, vars] = await Promise.all([
          sb(`plants?id=eq.${plant.id}&select=*`).catch(() => [plant]),
          sb(`varieties?plant_id=eq.${plant.id}&select=id,name,rarity,description,special_traits`).catch(() => []),
        ]);
        if (cancelled) return;
        if (fullPlant?.[0]) setFull({ ...plant, ...fullPlant[0] });
        if (vars?.length) {
          const ids = vars.map(v => v.id).join(",");
          const prices = await sb(`prices?variety_id=in.(${ids})&select=variety_id,price_usd,in_stock,retailers(name)`).catch(() => []);
          const byVar = {};
          for (const p of prices) (byVar[p.variety_id] ??= []).push(p);
          if (!cancelled) setVarieties(vars.map(v => ({ ...v, prices: byVar[v.id] ?? [] })));
        } else {
          setVarieties([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingVars(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [plant.id]);

  const share = async () => {
    const url = `${window.location.origin}/plant/${plant.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: plant.common_name, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast("Couldn't copy"); }
    }
  };

  const dc = DIFF[full.difficulty] ?? "#7ac44a";
  const allRetailers = useMemo(
    () => [...new Set(varieties.flatMap(v => v.prices.map(p => p.retailers?.name).filter(Boolean)))].sort(),
    [varieties]
  );

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button className="btn" onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", fontSize: 14, fontWeight: 500, padding: "8px 0" }}>
          <Icon n="back" s={16} /> Back
        </button>
        <button className="btn" onClick={share}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 99, fontSize: 13, color: "var(--ink2)",
          }}>
          <Icon n="share" s={13} /> Share
        </button>
      </div>

      <div className="hero-bg" style={{ borderRadius: 14, overflow: "hidden", marginBottom: 14, boxShadow: "var(--shadow-lg)" }}>
        <div style={{ position: "relative", height: "clamp(200px, 45vw, 320px)" }}>
          <LazyImage plant={full} height={"100%"} rounded={0} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, rgba(15,35,24,0.95))" }} />
        </div>
        <div style={{ padding: "18px 18px 22px", color: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="wm" style={{ fontSize: "clamp(22px, 6vw, 30px)", fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 3 }}>
                {full.common_name}
              </h1>
              <div style={{ fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.55)", marginBottom: 12 }}>
                {full.scientific_name}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                <Chip>{full.category}</Chip>
                <Chip color={dc}>{full.difficulty}</Chip>
                <Chip color={full.toxicity === "Pet Safe" ? "#52b788" : "#c1392b"}>
                  {full.toxicity === "Pet Safe" ? "🐾 Pet Safe" : `⚠ ${full.toxicity}`}
                </Chip>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button className="btn tap" onClick={() => onWish(full)}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: wished ? "rgba(193,57,43,0.35)" : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Icon n="heart" s={16} />
              </button>
              <button className="btn tap" onClick={() => onCmp(full)}
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: comped ? "rgba(82,183,136,0.35)" : "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Icon n="cmp" s={16} />
              </button>
            </div>
          </div>
          <p style={{ marginTop: 14, fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, fontWeight: 300 }}>
            {full.description}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { i: "sun", l: "Light", v: full.sunlight },
          { i: "drop", l: "Water", v: full.watering },
          { i: "leaf", l: "Type", v: full.category },
        ].map(s => (
          <div key={s.l} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 12, textAlign: "center",
            boxShadow: "var(--shadow)",
          }}>
            <div style={{ color: "var(--accent)", marginBottom: 5, display: "flex", justifyContent: "center" }}>
              <Icon n={s.i} s={18} />
            </div>
            <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{s.v || "—"}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="tabs" style={{ borderBottom: "1px solid var(--border)", marginBottom: 14 }}>
        {[
          ["varieties", "Varieties"],
          ["locations", "Where to Buy"],
          ["care", "Care"],
          ["traits", "Traits"],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "varieties" && <VarietiesTab loading={loadingVars} varieties={varieties} plantName={full.common_name} />}
      {tab === "locations" && <LocationsTab retailers={allRetailers} varieties={varieties} plantName={full.common_name} />}
      {tab === "care" && <CareTab plant={full} />}
      {tab === "traits" && <TraitsTab plant={full} />}
    </div>
  );
}

function VarietiesTab({ loading, varieties, plantName }) {
  if (loading) return <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)" }}><span className="spinner" style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }} /> Loading varieties…</div>;
  if (!varieties.length) return <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>No varieties in database yet.</div>;
  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {varieties.map(v => {
        const ps = v.prices ?? [];
        const minP = ps.length ? Math.min(...ps.map(p => p.price_usd || Infinity)) : null;
        const inStock = ps.some(p => p.in_stock);
        return (
          <div key={v.id} style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 13, boxShadow: "var(--shadow)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 3 }}>{v.name}</div>
                {v.rarity && <div style={{ fontSize: 11, color: "var(--ink3)" }}>{v.rarity}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {minP !== null && Number.isFinite(minP) ? (
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>${minP}+</div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--ink3)" }}>Price TBA</div>
                )}
                {ps.length > 0 && (
                  <div style={{ fontSize: 11, color: inStock ? "var(--accent)" : "var(--ink3)", fontWeight: 500 }}>
                    {inStock ? "● In Stock" : "○ Out of Stock"}
                  </div>
                )}
              </div>
            </div>
            {v.description && <p style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.5, marginBottom: 8 }}>{v.description}</p>}
            {ps.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {ps.map((p, i) => p.retailers?.name && (
                  <a key={i} href={retailerLink(p.retailers.name, plantName)} target="_blank" rel="noopener noreferrer"
                    style={{
                      fontSize: 12, padding: "4px 10px", borderRadius: 6,
                      background: "var(--surface2)", border: "1px solid var(--border)",
                      color: "var(--accent)", textDecoration: "none", fontWeight: 500,
                    }}>
                    {p.retailers.name} · ${p.price_usd}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LocationsTab({ retailers, varieties, plantName }) {
  if (!retailers.length) return <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>No retailer data yet.</div>;
  return (
    <div className="fade grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
      {retailers.map(r => {
        const avail = varieties.filter(v => v.prices.some(p => p.retailers?.name === r));
        return (
          <div key={r} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, boxShadow: "var(--shadow)" }}>
            <a href={retailerLink(r, plantName)} target="_blank" rel="noopener noreferrer"
              style={{ fontWeight: 600, fontSize: 13, color: "var(--accent)", textDecoration: "none", display: "block", marginBottom: 8 }}>
              {r} ↗
            </a>
            {avail.map(v => {
              const pr = v.prices.find(p => p.retailers?.name === r);
              return (
                <div key={v.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", borderTop: "1px solid var(--border)" }}>
                  <span style={{ color: "var(--ink2)" }}>{v.name}</span>
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
    { k: "care_notes", e: "💧", t: "Watering & Care" },
    { k: "soil", e: "🪴", t: "Soil & Potting" },
    { k: "fertilizer", e: "🌿", t: "Fertilizing" },
    { k: "propagation", e: "✂️", t: "Propagation" },
    { k: "temperature", e: "🌡️", t: "Temp & Humidity" },
    { k: "common_problems", e: "🔍", t: "Common Problems" },
  ].filter(s => plant[s.k]);
  const hasProfile = plant.native_region || plant.bloom_season || plant.mature_height || plant.fun_fact;
  if (!sections.length && !hasProfile) return <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>Care guide coming soon.</div>;
  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sections.map(s => (
        <div key={s.k} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>{s.e}</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{s.t}</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--ink2)", lineHeight: 1.65 }}>{plant[s.k]}</p>
        </div>
      ))}
      {hasProfile && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🌍</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Plant Profile</span>
          </div>
          {[["Native to", plant.native_region], ["Blooms", plant.bloom_season], ["Height", plant.mature_height]].filter(([,v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 10, fontSize: 13, padding: "4px 0" }}>
              <span style={{ color: "var(--ink3)", minWidth: 90, fontWeight: 500 }}>{k}</span>
              <span style={{ color: "var(--ink2)" }}>{v}</span>
            </div>
          ))}
          {plant.fun_fact && (
            <div style={{
              marginTop: 10, padding: "10px 12px",
              background: "var(--accent-bg)", borderRadius: 8,
              border: "1px solid var(--accent)",
            }}>
              <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                🌱 Did You Know
              </div>
              <p style={{ fontSize: 12.5, color: "var(--ink2)", lineHeight: 1.55 }}>{plant.fun_fact}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TraitsTab({ plant }) {
  const traits = [
    { l: "Air Purifying", v: plant.air_purifying, i: "🌬️" },
    { l: "Pet Safe", v: plant.toxicity === "Pet Safe", i: "🐾" },
    { l: "Low Light OK", v: plant.low_light, i: "🌑" },
    { l: "Drought Tolerant", v: plant.drought_tolerant, i: "☀️" },
    { l: "Outdoor OK", v: plant.outdoor_ok, i: "🌳" },
    { l: "Fast Growing", v: plant.fast_growing, i: "⚡" },
    { l: "Flowering", v: plant.flowering, i: "🌸" },
    { l: "Edible", v: plant.edible, i: "🍽️" },
    { l: "Fragrant", v: plant.fragrant, i: "🌺" },
    { l: "Rare Species", v: plant.rare, i: "✦" },
  ];
  return (
    <div className="fade" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, boxShadow: "var(--shadow)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
        {traits.map(t => (
          <div key={t.l} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 11px", borderRadius: 8,
            background: t.v ? "var(--accent-bg)" : "var(--surface2)",
            border: `1px solid ${t.v ? "var(--accent)" : "var(--border)"}`,
          }}>
            <span style={{ fontSize: 16 }}>{t.i}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.v ? "var(--accent)" : "var(--ink3)" }}>{t.l}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: t.v ? "var(--accent)" : "var(--ink3)" }}>
              {t.v ? "✓" : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- COMPARE ----------
function Compare({ plants, onRemove, onOpen }) {
  if (!plants.length) return (
    <div className="fade" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>🌿</div>
      <div className="wm" style={{ fontSize: 22, marginBottom: 8 }}>No plants to compare</div>
      <p style={{ fontSize: 14, color: "var(--ink3)" }}>Tap the compare icon on up to 3 plants.</p>
    </div>
  );
  const rows = [
    ["Species", p => <em style={{ fontSize: 12 }}>{p.scientific_name}</em>],
    ["Category", p => p.category],
    ["Difficulty", p => <span style={{ color: DIFF[p.difficulty], fontWeight: 600 }}>{p.difficulty}</span>],
    ["Light", p => p.sunlight],
    ["Water", p => p.watering],
    ["Toxicity", p => <span style={{ color: p.toxicity === "Pet Safe" ? "var(--accent)" : "#c1392b", fontWeight: 500 }}>{p.toxicity}</span>],
    ["Air Purifying", p => p.air_purifying ? "✓" : "—"],
    ["Low Light", p => p.low_light ? "✓" : "—"],
    ["Edible", p => p.edible ? "✓" : "—"],
    ["Rare", p => p.rare ? "✦" : "—"],
  ];
  return (
    <div className="fade">
      <h2 className="wm" style={{ fontSize: 24, marginBottom: 14 }}>Compare</h2>
      <div style={{ overflowX: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 360 }}>
          <thead>
            <tr style={{ background: "var(--surface2)" }}>
              <th style={{ padding: 12, width: 100 }}></th>
              {plants.map(p => (
                <th key={p.id} style={{ padding: 12, textAlign: "left", borderLeft: "1px solid var(--border)", minWidth: 140 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                    <button className="btn" onClick={() => onOpen(p)} style={{ textAlign: "left", minWidth: 0 }}>
                      <LazyImage plant={p} height={56} rounded={6} />
                      <div className="wm" style={{ fontSize: 13, fontWeight: 500, marginTop: 5, color: "var(--ink)" }}>{p.common_name}</div>
                    </button>
                    <button className="btn" onClick={() => onRemove(p.id)} style={{ color: "#c1392b", padding: 4 }}>
                      <Icon n="x" s={13} />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn], i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? "var(--surface)" : "var(--surface2)" }}>
                <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--ink3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderRight: "1px solid var(--border)" }}>{label}</td>
                {plants.map(p => <td key={p.id} style={{ padding: "10px 14px", fontSize: 13, borderLeft: "1px solid var(--border)" }}>{fn(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- WISHLIST ----------
function Wishlist({ plants, onOpen, onRemove }) {
  if (!plants.length) return (
    <div className="fade" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>🌱</div>
      <div className="wm" style={{ fontSize: 22, marginBottom: 8 }}>No saved plants yet</div>
      <p style={{ fontSize: 14, color: "var(--ink3)" }}>Tap the heart on any plant to save.</p>
    </div>
  );
  return (
    <div className="fade">
      <h2 className="wm" style={{ fontSize: 24, marginBottom: 14 }}>Saved</h2>
      <div className="grid">
        {plants.map(p => (
          <article key={p.id} className="card lift" onClick={() => onOpen(p)}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow)", cursor: "pointer", position: "relative" }}>
            <LazyImage plant={p} height={140} />
            <button className="btn tap" onClick={e => { e.stopPropagation(); onRemove(p.id); }}
              style={{ position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.94)", color: "#c1392b", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
              <Icon n="x" s={14} />
            </button>
            <div style={{ padding: 12 }}>
              <div className="wm" style={{ fontSize: 16, fontWeight: 500, marginBottom: 2 }}>{p.common_name}</div>
              <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)" }}>{p.scientific_name}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ---------- QUIZ ----------
function Quiz({ plants, onOpen }) {
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState({});
  const [results, setResults] = useState(null);

  const questions = [
    { id: "light", emoji: "☀️", question: "Light in your space?", options: [
      { label: "Bright & sunny", v: "bright" }, { label: "Medium indirect", v: "medium" },
      { label: "Pretty dim", v: "low" }, { label: "Almost no light", v: "verylow" },
    ]},
    { id: "water", emoji: "💧", question: "How often do you water?", options: [
      { label: "Every few days", v: "frequent" }, { label: "Once a week", v: "weekly" },
      { label: "When I remember", v: "infrequent" }, { label: "Almost never", v: "rare" },
    ]},
    { id: "pets", emoji: "🐾", question: "Pets or small kids?", options: [
      { label: "Dogs or cats", v: "pets" }, { label: "Small kids", v: "kids" },
      { label: "Both", v: "both" }, { label: "None", v: "none" },
    ]},
    { id: "exp", emoji: "🌿", question: "Experience?", options: [
      { label: "Everything dies", v: "beginner" }, { label: "Some alive", v: "some" },
      { label: "Pretty confident", v: "experienced" }, { label: "Expert", v: "expert" },
    ]},
    { id: "vibe", emoji: "🏡", question: "What's your vibe?", options: [
      { label: "Big statement plant", v: "statement" }, { label: "Cute shelf plant", v: "small" },
      { label: "Rare & impressive", v: "rare" }, { label: "Something flowering", v: "flowering" },
    ]},
  ];

  const score = (p, a) => {
    let s = 0;
    const lm = { bright: ["Full Sun", "Bright Indirect"], medium: ["Bright Indirect", "Medium Light"], low: ["Low Light", "Medium Light"], verylow: ["Low Light"] };
    if (lm[a.light]?.some(x => p.sunlight?.includes(x))) s += 3;
    const wm = { frequent: ["Frequent", "Moderate"], weekly: ["Moderate", "Weekly"], infrequent: ["Low", "Weekly"], rare: ["Low", "Very Low"] };
    if (wm[a.water]?.some(x => p.watering?.includes(x))) s += 3;
    if (a.water === "rare" && p.drought_tolerant) s += 2;
    if (["pets","kids","both"].includes(a.pets) && p.toxicity === "Pet Safe") s += 4;
    const dm = { beginner: ["Very Easy","Easy"], some: ["Easy","Moderate"], experienced: ["Moderate","Hard"], expert: ["Hard","Expert"] };
    if (dm[a.exp]?.includes(p.difficulty)) s += 3;
    if (a.vibe === "rare" && p.rare) s += 4;
    if (a.vibe === "flowering" && p.flowering) s += 4;
    if ((a.light === "low" || a.light === "verylow") && p.low_light) s += 3;
    return s;
  };

  const answer = (v) => {
    const q = questions[step];
    const next = { ...ans, [q.id]: v };
    setAns(next);
    if (step < questions.length - 1) setStep(step + 1);
    else setResults(plants.map(p => ({ ...p, _s: score(p, next) })).sort((a, b) => b._s - a._s).slice(0, 3));
  };

  if (results) return (
    <div className="fade">
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <h2 className="wm" style={{ fontSize: 26, fontWeight: 400 }}>Your Matches</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {results.map((p, i) => (
          <article key={p.id} className="lift" onClick={() => onOpen(p)}
            style={{ background: "var(--surface)", border: `1.5px solid ${i === 0 ? "var(--accent)" : "var(--border)"}`, borderRadius: 12, overflow: "hidden", boxShadow: i === 0 ? "0 0 0 3px var(--accent-bg)" : "var(--shadow)", cursor: "pointer", display: "flex" }}>
            <div style={{ width: 100, flexShrink: 0 }}>
              <LazyImage plant={p} height={100} rounded={0} />
            </div>
            <div style={{ padding: 12, flex: 1 }}>
              {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent)", background: "var(--accent-bg)", padding: "2px 8px", borderRadius: 99, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, display: "inline-block" }}>Best Match</span>}
              <div className="wm" style={{ fontSize: 16, fontWeight: 500 }}>{p.common_name}</div>
              <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)" }}>{p.scientific_name}</div>
            </div>
          </article>
        ))}
      </div>
      <button className="btn" onClick={() => { setStep(0); setAns({}); setResults(null); }}
        style={{ padding: "11px 24px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 99, fontSize: 14, fontWeight: 500, color: "var(--ink2)", margin: "0 auto", display: "block" }}>
        Retake
      </button>
    </div>
  );

  const q = questions[step];
  return (
    <div className="fade" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginBottom: 16 }}>
          {questions.map((_, i) => (
            <div key={i} style={{ height: 4, width: i === step ? 26 : 14, borderRadius: 99, background: i <= step ? "var(--accent)" : "var(--border)", transition: "all 0.3s" }} />
          ))}
        </div>
        <div style={{ fontSize: 44, marginBottom: 10 }}>{q.emoji}</div>
        <h2 className="wm" style={{ fontSize: 22, fontWeight: 400, marginBottom: 4 }}>{q.question}</h2>
        <p style={{ fontSize: 12, color: "var(--ink3)" }}>{step + 1} of {questions.length}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map(o => (
          <button key={o.v} className="btn lift" onClick={() => answer(o.v)}
            style={{ padding: "15px 18px", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 12, fontSize: 15, color: "var(--ink)", textAlign: "left", boxShadow: "var(--shadow)" }}>
            {o.label}
          </button>
        ))}
      </div>
      {step > 0 && (
        <button className="btn" onClick={() => setStep(step - 1)}
          style={{ marginTop: 14, fontSize: 13, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon n="back" s={13} /> Back
        </button>
      )}
    </div>
  );
}

// ---------- HELPERS ----------
function Chip({ children, color }) {
  return <span style={{
    background: color ? `${color}33` : "rgba(255,255,255,0.1)",
    border: `1px solid ${color ? `${color}55` : "rgba(255,255,255,0.18)"}`,
    borderRadius: 99, padding: "3px 10px", fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 500,
  }}>{children}</span>;
}

function LoadingGrid() {
  return (
    <div className="grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow)" }}>
          <div className="shim" style={{ height: 170 }} />
          <div style={{ padding: 13 }}>
            <div className="shim" style={{ height: 16, width: "70%", borderRadius: 4, marginBottom: 6 }} />
            <div className="shim" style={{ height: 11, width: "50%", borderRadius: 4, marginBottom: 10 }} />
            <div className="shim" style={{ height: 10, width: "100%", borderRadius: 4, marginBottom: 4 }} />
            <div className="shim" style={{ height: 10, width: "80%", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ onReset }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--ink3)" }}>
      <div style={{ fontSize: 42, marginBottom: 10 }}>🌾</div>
      <div className="wm" style={{ fontSize: 20, color: "var(--ink2)", marginBottom: 4 }}>Nothing matches</div>
      <div style={{ fontSize: 13, marginBottom: 14 }}>Try adjusting your filters</div>
      <button className="btn" onClick={onReset} style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500, padding: "8px 16px", background: "var(--accent-bg)", borderRadius: 99 }}>
        Clear filters
      </button>
    </div>
  );
}

function Footer({ count }) {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 14px calc(20px + env(safe-area-inset-bottom))", textAlign: "center", color: "var(--ink3)", fontSize: 11 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div className="wm" style={{ fontSize: 14, color: "var(--ink2)", marginBottom: 4 }}>Cultivar</div>
        <div>{count.toLocaleString()} species · images from Wikipedia · prices updated weekly</div>
      </div>
    </footer>
  );
}

// ---------- STYLES ----------
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Fraunces:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
      :root {
        --bg: #f7f5f0; --surface: #fff; --surface2: #f2efe9;
        --border: #e2ddd6;
        --ink: #1a1814; --ink2: #6b6560; --ink3: #9b958e;
        --accent: #2d6a4f; --accent-bg: #e8f5ee;
        --shadow: 0 2px 12px rgba(26,24,20,0.05);
        --shadow-lg: 0 8px 32px rgba(26,24,20,0.12);
      }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
      html, body { font-family: 'DM Sans', system-ui, sans-serif; overscroll-behavior-y: none; }
      body { background: var(--bg); }
      ::-webkit-scrollbar { width: 4px; height: 4px; }
      ::-webkit-scrollbar-thumb { background: #cec9c0; border-radius: 99px; }
      .btn { cursor: pointer; border: none; background: transparent; transition: opacity 0.15s, transform 0.15s; font-family: inherit; font-size: inherit; color: inherit; }
      .btn:active { opacity: 0.8; transform: scale(0.97); }
      .tap { min-width: 44px; min-height: 44px; } /* touch targets */
      @media (hover: hover) {
        .lift { transition: transform 0.18s, box-shadow 0.18s; }
        .lift:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg) !important; }
        .btn:hover { opacity: 0.85; }
      }
      .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
      @media (max-width: 500px) {
        .grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
        .card .wm { font-size: 15px !important; }
      }
      .pill { padding: 6px 13px; border-radius: 99px; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); cursor: pointer; border: none; background: transparent; transition: background 0.15s; }
      .pill:hover { background: rgba(255,255,255,0.1); color: #fff; }
      .pill.on { background: rgba(255,255,255,0.18); color: #fff; }
      .nav-desktop { display: flex; }
      .nav-mobile { display: none; }
      @media (max-width: 700px) {
        .nav-desktop { display: none !important; }
        .nav-mobile { display: flex !important; }
      }
      .hero-bg { background: linear-gradient(135deg, #0f2318 0%, #1a3a28 40%, #152e1f 100%); }
      .tabs { display: flex; overflow-x: auto; -ms-overflow-style: none; scrollbar-width: none; }
      .tabs::-webkit-scrollbar { display: none; }
      .tab { padding: 10px 16px; font-size: 14px; font-weight: 500; color: var(--ink3); cursor: pointer; background: transparent; border: none; border-bottom: 2px solid transparent; white-space: nowrap; font-family: inherit; transition: color 0.15s, border-color 0.15s; }
      .tab.on { color: var(--accent); border-bottom-color: var(--accent); }
      .wm { font-family: 'Fraunces', serif; }
      input, select, textarea { font-family: inherit; font-size: 16px; color: var(--ink); }
      input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
      select { cursor: pointer; }
      .shim { background: linear-gradient(90deg, #ece8df 0%, #f5f1ea 50%, #ece8df 100%); background-size: 200% 100%; animation: shim 1.3s ease infinite; }
      .fade { animation: fadeUp 0.25s ease; }
      .spinner { width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
      @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes shim { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
      @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
  );
}
