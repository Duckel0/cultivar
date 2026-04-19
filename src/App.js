/* Cultivar — The Plant Journal. Editorial botanical field guide for tree huggers. */

import { useState, useMemo, useEffect, useCallback, useRef, memo } from "react";

const SUPABASE_URL = "https://ewyfhousutslimzwoflk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3eWZob3VzdXRzbGltendvZmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzQ1OTksImV4cCI6MjA5MTM1MDU5OX0.SMq04MDpT-FLSHbWA6i_2meJ56cJfITTy4ig37K7R-s";

// ---------- storage ----------
const store = {
  get(k, f) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ---------- api ----------
async function sb(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ---------- wikipedia images (cached to localStorage) ----------
const IMG_KEY = "cultivar:imgs:v3";
const imgCache = store.get(IMG_KEY, {});
let imgDirty = false;
setInterval(() => { if (imgDirty) { store.set(IMG_KEY, imgCache); imgDirty = false; } }, 2500);

const imgInflight = new Map();
async function wikiImage(term) {
  if (!term) return null;
  if (imgCache[term] !== undefined) return imgCache[term];
  if (imgInflight.has(term)) return imgInflight.get(term);
  const p = (async () => {
    try {
      const r = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=original&titles=${encodeURIComponent(term)}&origin=*&redirects=1`
      );
      const d = await r.json();
      const url = Object.values(d?.query?.pages ?? {})[0]?.original?.source ?? null;
      imgCache[term] = url; imgDirty = true;
      return url;
    } catch { imgCache[term] = null; return null; }
    finally { imgInflight.delete(term); }
  })();
  imgInflight.set(term, p);
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

// ---------- smart natural-language search ----------
const SMART = [
  { re: /\b(pet safe|dog safe|cat safe|non-?toxic)\b/i, f: p => p.toxicity === "Pet Safe" },
  { re: /\b(toxic|poisonous|dangerous)\b/i, f: p => p.toxicity && p.toxicity !== "Pet Safe" },
  { re: /\b(low light|dim|shade|shady|dark|no sun)\b/i, f: p => p.low_light },
  { re: /\b(bright|sunny|full sun)\b/i, f: p => /bright|full sun/i.test(p.sunlight ?? "") },
  { re: /\b(easy|beginner|newbie|starter|forgiving)\b/i, f: p => ["Very Easy","Easy"].includes(p.difficulty) },
  { re: /\b(hard|expert|challenging|difficult|advanced)\b/i, f: p => ["Hard","Expert"].includes(p.difficulty) },
  { re: /\b(rare|collector|unusual|unique)\b/i, f: p => p.rare },
  { re: /\b(edible|food|fruit|vegetable|herb)\b/i, f: p => p.edible },
  { re: /\b(flowering|flowers|blooms|blooming)\b/i, f: p => p.flowering },
  { re: /\b(fragrant|smell|scented|perfume|aromatic)\b/i, f: p => p.fragrant },
  { re: /\b(drought|dry|desert|no water)\b/i, f: p => p.drought_tolerant || p.category === "Succulent" },
  { re: /\b(outdoor|garden|yard|patio)\b/i, f: p => p.outdoor_ok },
  { re: /\b(fast|quick|grows fast)\b/i, f: p => p.fast_growing },
  { re: /\b(air purif|clean air|oxygen)\b/i, f: p => p.air_purifying },
];
function smartFilter(plants, query) {
  if (!query.trim()) return plants;
  let rem = query.toLowerCase().trim();
  const filters = [];
  for (const k of SMART) {
    if (k.re.test(rem)) { filters.push(k.f); rem = rem.replace(k.re, " ").replace(/\s+/g, " ").trim(); }
  }
  return plants.filter(p => {
    for (const f of filters) if (!f(p)) return false;
    if (!rem) return true;
    return p.common_name?.toLowerCase().includes(rem)
      || p.scientific_name?.toLowerCase().includes(rem)
      || p.description?.toLowerCase().includes(rem)
      || p.category?.toLowerCase().includes(rem)
      || p.tags?.some(t => t.toLowerCase().includes(rem));
  });
}

// ---------- icons ----------
const Icon = memo(({ n, s = 18 }) => {
  const I = {
    search: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></>,
    leaf: <><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></>,
    drop: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
    cmp: <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></>,
    back: <polyline points="15 18 9 12 15 6"/>,
    arrow: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    spark: <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    dice: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="16" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="8" r="1"/></>,
    compass: <><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></>,
  };
  const c = I[n]; if (!c) return null;
  const fill = ["heart","spark"].includes(n);
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{c}</svg>;
});

// ---------- hooks ----------
function useDebounced(v, d = 180) {
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

// ---------- plant image ----------
const PlantImage = memo(({ plant, height = 200, rounded = 0, eager = false }) => {
  const [ref, inView] = useInView();
  const active = eager || inView;
  const [src, setSrc] = useState(plant?.image_url || null);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!active || src || err) return;
    let live = true;
    wikiImage(plant?.scientific_name).then(url => {
      if (!live) return;
      if (url) setSrc(url);
      else wikiImage(plant?.common_name).then(u => live && u && setSrc(u));
    });
    return () => { live = false; };
  }, [active, plant?.scientific_name, plant?.common_name, src, err]);
  return (
    <div ref={ref} style={{
      position: "relative", width: "100%", height,
      background: "linear-gradient(135deg, #dce7d4, #c5d4bc)",
      overflow: "hidden", borderRadius: rounded,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {(!src || err) && (
        <div style={{
          fontSize: typeof height === 'number' ? Math.max(28, height * 0.35) : 48,
          opacity: 0.45,
        }}>{plant?.emoji || "🌿"}</div>
      )}
      {src && !err && (
        <img src={src} alt={plant?.common_name} loading="lazy"
          onLoad={() => setLoaded(true)} onError={() => setErr(true)}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transform: loaded ? "scale(1)" : "scale(1.03)",
            transition: "opacity 0.4s ease, transform 0.6s ease",
          }} />
      )}
    </div>
  );
});

// ---------- toast ----------
function useToast() {
  const [m, set] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text, tone = "ok") => {
    clearTimeout(timer.current);
    set({ text, tone, id: Date.now() });
    timer.current = setTimeout(() => set(null), 2400);
  }, []);
  const el = m && (
    <div role="status" style={{
      position: "fixed", bottom: "calc(20px + env(safe-area-inset-bottom))", left: "50%",
      transform: "translateX(-50%)", zIndex: 9999,
      background: m.tone === "err" ? "#7a2818" : "#1e3a27",
      color: "#f4ede0",
      padding: "12px 22px", borderRadius: 2, fontSize: 14, fontWeight: 500,
      boxShadow: "0 10px 32px rgba(0,0,0,0.3)",
      animation: "slideUp 0.25s ease", maxWidth: "90vw",
      border: "1px solid rgba(244,237,224,0.1)",
    }}>{m.text}</div>
  );
  return { show, el };
}

// ---------- routing ----------
function getRoute() {
  const p = window.location.pathname;
  if (p.startsWith("/plant/")) return { view: "detail", slug: p.slice(7) };
  return { view: "catalog" };
}

// =====================================================================
// APP
// =====================================================================
export default function Cultivar() {
  const [view, setView] = useState("catalog");
  const [selected, setSelected] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [wishlist, setWishlist] = usePersisted("cultivar:wish", []);
  const [compare, setCompare] = usePersisted("cultivar:compare", []);
  const [myCollection, setMyCollection] = usePersisted("cultivar:collection", []);
  const [journal, setJournal] = usePersisted("cultivar:journal", {});
  const [plantOfDay, setPlantOfDay] = usePersisted("cultivar:pod", null);

  const [searchRaw, setSearchRaw] = useState("");
  const search = useDebounced(searchRaw, 180);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fields = "id,common_name,scientific_name,emoji,category,description,sunlight,watering,difficulty,toxicity,slug,tags,rare,low_light,air_purifying,drought_tolerant,flowering,fragrant,outdoor_ok,fast_growing,edible,image_url";
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/plants?select=${fields}&published=eq.true&order=common_name.asc`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setPlants(data);
      if (data.length) {
        const day = Math.floor(Date.now() / 86400000);
        if (!plantOfDay || plantOfDay.day !== day) {
          setPlantOfDay({ day, plant: data[day % data.length] });
        }
      }
      const r = getRoute();
      if (r.view === "detail" && r.slug) {
        const f = data.find(x => x.slug === r.slug);
        if (f) { setSelected(f); setView("detail"); }
      }
    } catch (e) {
      console.error(e);
      setError("Couldn't reach the greenhouse. Try again?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onPop = () => {
      const r = getRoute();
      if (r.view === "detail" && r.slug) {
        const f = plants.find(x => x.slug === r.slug);
        if (f) { setSelected(f); setView("detail"); }
      } else { setView("catalog"); setSelected(null); }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [plants]);

  const filtered = useMemo(() => smartFilter(plants, search), [plants, search]);

  const toggleWish = useCallback((p) => {
    setWishlist(w => {
      if (w.find(x => x.id === p.id)) { toast.show("Removed from wishlist"); return w.filter(x => x.id !== p.id); }
      toast.show(`${p.common_name} saved to wishlist`);
      return [...w, p];
    });
  }, [toast, setWishlist]);

  const toggleCmp = useCallback((p) => {
    setCompare(c => {
      if (c.find(x => x.id === p.id)) { toast.show("Removed from compare"); return c.filter(x => x.id !== p.id); }
      if (c.length >= 3) { toast.show("Compare holds up to 3 plants", "err"); return c; }
      toast.show(`Added · ${c.length + 1}/3 in compare`);
      return [...c, p];
    });
  }, [toast, setCompare]);

  const addCollection = useCallback((p) => {
    setMyCollection(c => {
      if (c.find(x => x.id === p.id)) return c;
      toast.show(`${p.common_name} added to your collection 🌱`);
      return [...c, { id: p.id, slug: p.slug, common_name: p.common_name, scientific_name: p.scientific_name, emoji: p.emoji, image_url: p.image_url, added: Date.now() }];
    });
  }, [toast, setMyCollection]);

  const removeCollection = useCallback((id) => {
    setMyCollection(c => c.filter(x => x.id !== id));
  }, [setMyCollection]);

  const addJournal = useCallback((plantId, text) => {
    setJournal(j => {
      const next = { ...j };
      next[plantId] = [...(next[plantId] ?? []), { id: Date.now(), text, date: Date.now() }];
      return next;
    });
    toast.show("Entry logged 📓");
  }, [toast, setJournal]);

  const openPlant = useCallback((p) => {
    setSelected(p); setView("detail");
    window.history.pushState({}, "", `/plant/${p.slug}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `${p.common_name} — Cultivar`;
  }, []);

  const goHome = useCallback(() => {
    setView("catalog"); setSelected(null);
    window.history.pushState({}, "", "/");
    document.title = "Cultivar — The Plant Journal";
  }, []);

  const isWished = id => wishlist.some(w => w.id === id);
  const isCmp = id => compare.some(c => c.id === id);
  const inCollection = id => myCollection.some(c => c.id === id);

  return (
    <div className="app">
      <Styles />
      {toast.el}

      <Header
        view={view}
        wishCount={wishlist.length}
        cmpCount={compare.length}
        collectionCount={myCollection.length}
        onNav={v => { if (v === "catalog") goHome(); else setView(v); }}
        onHome={goHome}
      />

      <main className="main">
        {error && (
          <div className="error-card">
            <span>🥀 {error}</span>
            <button className="btn" onClick={load}>Try again</button>
          </div>
        )}

        {view === "catalog" && (
          <Catalog
            loading={loading} plants={plants} filtered={filtered}
            searchRaw={searchRaw} setSearchRaw={setSearchRaw}
            plantOfDay={plantOfDay?.plant}
            onOpen={openPlant} onWish={toggleWish} onCmp={toggleCmp}
            isWished={isWished} isCmp={isCmp}
          />
        )}

        {view === "detail" && selected && (
          <Detail
            plant={selected} plants={plants}
            onBack={goHome} onOpen={openPlant}
            onWish={toggleWish} onCmp={toggleCmp}
            onAddCollection={addCollection} onRemoveCollection={removeCollection}
            onJournal={addJournal} journal={journal[selected.id] ?? []}
            wished={isWished(selected.id)} comped={isCmp(selected.id)} owned={inCollection(selected.id)}
            toast={toast.show}
          />
        )}

        {view === "compare" && (
          <Compare plants={compare} onRemove={id => setCompare(compare.filter(x => x.id !== id))} onOpen={openPlant} />
        )}

        {view === "wishlist" && (
          <Wishlist plants={wishlist} onOpen={openPlant} onRemove={id => setWishlist(wishlist.filter(x => x.id !== id))} />
        )}

        {view === "collection" && (
          <Collection
            items={myCollection} allPlants={plants} journal={journal}
            onOpen={(slug) => { const p = plants.find(x => x.slug === slug); if (p) openPlant(p); }}
            onRemove={removeCollection}
          />
        )}

        {view === "quiz" && <Quiz plants={plants} onOpen={openPlant} />}
      </main>

      <Footer count={plants.length} />
    </div>
  );
}

// ---------- HEADER ----------
const Header = memo(({ view, wishCount, cmpCount, collectionCount, onNav, onHome }) => {
  const [menu, setMenu] = useState(false);
  const items = [
    { id: "catalog", label: "Browse", icon: "compass" },
    { id: "quiz", label: "Match me", icon: "dice" },
    { id: "collection", label: collectionCount ? `Mine · ${collectionCount}` : "My plants", icon: "leaf" },
    { id: "wishlist", label: wishCount ? `Wishlist · ${wishCount}` : "Wishlist", icon: "heart" },
    { id: "compare", label: cmpCount ? `Compare · ${cmpCount}` : "Compare", icon: "cmp" },
  ];
  return (
    <header className="header">
      <div className="header-inner">
        <button onClick={onHome} className="brand btn">
          <div className="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-name">Cultivar</div>
            <div className="brand-tagline">The Plant Journal · Est. 2026</div>
          </div>
        </button>
        <nav className="nav-desktop">
          {items.map(t => (
            <button key={t.id} className={`nav-item btn ${view === t.id ? "on" : ""}`} onClick={() => onNav(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <button className="btn nav-toggle" onClick={() => setMenu(m => !m)} aria-label="Menu">
          <Icon n={menu ? "x" : "menu"} s={22} />
        </button>
      </div>
      {menu && (
        <div className="nav-mobile-sheet">
          {items.map(t => (
            <button key={t.id} className={`nav-mobile-item btn ${view === t.id ? "on" : ""}`}
              onClick={() => { onNav(t.id); setMenu(false); }}>
              <Icon n={t.icon} s={18} />
              <span>{t.label}</span>
              <Icon n="arrow" s={14} />
            </button>
          ))}
        </div>
      )}
    </header>
  );
});

// ---------- CATALOG ----------
function Catalog({ loading, plants, filtered, searchRaw, setSearchRaw, plantOfDay, onOpen, onWish, onCmp, isWished, isCmp }) {
  const isSearching = !!searchRaw.trim();
  const shelves = useMemo(() => {
    if (!plants.length) return [];
    return [
      { title: "Impossible to Kill", blurb: "For the serial plant-slayers.", f: p => ["Very Easy","Easy"].includes(p.difficulty) && (p.drought_tolerant || p.low_light) },
      { title: "Dark & Moody", blurb: "Thrive in gloom. Loft apartment energy.", f: p => p.low_light && !p.rare },
      { title: "The Weirdest Plants Alive", blurb: "Nature showing off.", f: p => p.category === "Carnivorous" || p.rare },
      { title: "Safe for Furry Companions", blurb: "Dogs and cats approved.", f: p => p.toxicity === "Pet Safe" },
      { title: "Something in Bloom", blurb: "For color lovers.", f: p => p.flowering },
      { title: "Desert Dwellers", blurb: "Drought-tolerant rebels.", f: p => p.category === "Succulent" || p.drought_tolerant },
      { title: "For the Collector", blurb: "Rare finds that turn heads.", f: p => p.rare },
      { title: "Fragrant Specimens", blurb: "Plants that smell as good as they look.", f: p => p.fragrant },
      { title: "Edible Garden", blurb: "Grow what you eat.", f: p => p.edible },
    ].map(s => ({ ...s, items: plants.filter(s.f).slice(0, 10) })).filter(s => s.items.length >= 3);
  }, [plants]);

  return (
    <div className="fade">
      <section className="hero">
        <div className="hero-eyebrow">Vol. I · The Field Guide</div>
        <h1 className="hero-title">A <em>curated almanac</em><br/>of living things.</h1>
        <p className="hero-sub">
          {loading ? "Opening the greenhouse gates…"
            : `${plants.length.toLocaleString()} species catalogued. Search by name, mood, or condition — "low light", "pet safe", "something that blooms".`}
        </p>
        <div className="search-wrap">
          <Icon n="search" s={18} />
          <input type="search" autoComplete="off" value={searchRaw}
            onChange={e => setSearchRaw(e.target.value)}
            placeholder="Try: low light pet safe…"
            className="search-input" />
          {searchRaw && (
            <button className="btn search-clear" onClick={() => setSearchRaw("")}>
              <Icon n="x" s={16} />
            </button>
          )}
        </div>
      </section>

      {loading ? <LoadingState />
       : isSearching ? <SearchResults query={searchRaw} results={filtered} onOpen={onOpen} onWish={onWish} onCmp={onCmp} isWished={isWished} isCmp={isCmp} onClear={() => setSearchRaw("")} />
       : (
        <>
          {plantOfDay && (
            <section className="featured">
              <SectionLabel kicker="Today's Specimen" title="Plant of the Day" />
              <article className="featured-card" onClick={() => onOpen(plantOfDay)}>
                <div className="featured-image"><PlantImage plant={plantOfDay} height="100%" eager /></div>
                <div className="featured-body">
                  <div className="featured-kicker">№ {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}</div>
                  <h2 className="featured-title">{plantOfDay.common_name}</h2>
                  <div className="featured-sci">{plantOfDay.scientific_name}</div>
                  <p className="featured-desc">{plantOfDay.description}</p>
                  <div className="featured-meta">
                    {plantOfDay.difficulty && <span>{plantOfDay.difficulty}</span>}
                    {plantOfDay.sunlight && <span>{plantOfDay.sunlight}</span>}
                    {plantOfDay.toxicity === "Pet Safe" && <span className="pet-safe">🐾 Pet safe</span>}
                    {plantOfDay.rare && <span className="rare-tag">✦ Rare</span>}
                  </div>
                  <div className="featured-cta">Read the entry <Icon n="arrow" s={14} /></div>
                </div>
              </article>
            </section>
          )}

          <section className="mood-chips">
            {[
              { label: "Low light", q: "low light" },
              { label: "Pet safe", q: "pet safe" },
              { label: "Easy for beginners", q: "easy" },
              { label: "Rare finds", q: "rare" },
              { label: "Flowering", q: "flowering" },
              { label: "Edible", q: "edible" },
              { label: "Drought tolerant", q: "drought" },
              { label: "Fragrant", q: "fragrant" },
            ].map(c => (
              <button key={c.label} className="chip btn" onClick={() => setSearchRaw(c.q)}>{c.label}</button>
            ))}
          </section>

          {shelves.map((shelf, i) => (
            <section key={shelf.title} className="shelf" style={{ animationDelay: `${i * 60}ms` }}>
              <SectionLabel kicker={`Shelf № ${String(i + 1).padStart(2, "0")}`} title={shelf.title} blurb={shelf.blurb} />
              <div className="shelf-scroll">
                {shelf.items.map(p => <MiniCard key={p.id} plant={p} onOpen={onOpen} onWish={onWish} wished={isWished(p.id)} />)}
              </div>
            </section>
          ))}

          <section className="full-catalog">
            <SectionLabel kicker="The Archive" title="Every Species" blurb={`All ${plants.length.toLocaleString()} plants, alphabetically.`} />
            <div className="grid">
              {plants.map((p, i) => (
                <PlantCard key={p.id} plant={p}
                  onOpen={onOpen} onWish={onWish} onCmp={onCmp}
                  wished={isWished(p.id)} comped={isCmp(p.id)}
                  delay={Math.min(i, 18) * 25} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SectionLabel({ kicker, title, blurb }) {
  return (
    <div className="section-label">
      <div className="section-kicker"><span className="section-rule" /><span>{kicker}</span></div>
      <h2 className="section-title">{title}</h2>
      {blurb && <p className="section-blurb">{blurb}</p>}
    </div>
  );
}

function SearchResults({ query, results, onOpen, onWish, onCmp, isWished, isCmp, onClear }) {
  return (
    <section className="search-results">
      <div className="search-head">
        <div className="section-kicker"><span className="section-rule" /><span>Results</span></div>
        <h2 className="section-title">
          {results.length === 0 ? "Nothing found" : `${results.length} ${results.length === 1 ? "match" : "matches"}`}
          <span className="search-query"> for "{query}"</span>
        </h2>
        <button className="btn link-btn" onClick={onClear}>← Back to browse</button>
      </div>
      {results.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🌾</div>
          <p>No plants match that. Try something simpler — "fern", "pet safe", "succulent".</p>
        </div>
      ) : (
        <div className="grid">
          {results.map((p, i) => (
            <PlantCard key={p.id} plant={p}
              onOpen={onOpen} onWish={onWish} onCmp={onCmp}
              wished={isWished(p.id)} comped={isCmp(p.id)}
              delay={Math.min(i, 12) * 30} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- CARDS ----------
const MiniCard = memo(({ plant, onOpen, onWish, wished }) => (
  <article className="mini-card btn" onClick={() => onOpen(plant)}>
    <div className="mini-image">
      <PlantImage plant={plant} height={150} />
      <button className="mini-heart btn" onClick={e => { e.stopPropagation(); onWish(plant); }}
        aria-label="Save" style={{ color: wished ? "#b84640" : "#4a453c" }}>
        <Icon n="heart" s={13} />
      </button>
    </div>
    <div className="mini-body">
      <div className="mini-name">{plant.common_name}</div>
      <div className="mini-sci">{plant.scientific_name}</div>
    </div>
  </article>
));

const PlantCard = memo(({ plant, onOpen, onWish, onCmp, wished, comped, delay = 0 }) => (
  <article className="card card-fade" onClick={() => onOpen(plant)} style={{ animationDelay: `${delay}ms` }}>
    <div className="card-image-wrap">
      <PlantImage plant={plant} height={200} />
      <div className="card-actions" onClick={e => e.stopPropagation()}>
        <button className="card-btn btn" onClick={() => onWish(plant)}
          style={{ background: wished ? "#b84640" : "rgba(244,237,224,0.92)", color: wished ? "#fff" : "#2a2620" }}
          aria-label="Save"><Icon n="heart" s={13} /></button>
        <button className="card-btn btn" onClick={() => onCmp(plant)}
          style={{ background: comped ? "#1e3a27" : "rgba(244,237,224,0.92)", color: comped ? "#fff" : "#2a2620" }}
          aria-label="Compare"><Icon n="cmp" s={13} /></button>
      </div>
      {plant.rare && <div className="card-rare"><Icon n="spark" s={9} /> Rare</div>}
    </div>
    <div className="card-body">
      <div className="card-name">{plant.common_name}</div>
      <div className="card-sci">{plant.scientific_name}</div>
      <p className="card-desc">{plant.description}</p>
      <div className="card-meta">
        {plant.sunlight && <span className="card-meta-item"><Icon n="sun" s={11} />{plant.sunlight}</span>}
        {plant.watering && <span className="card-meta-item"><Icon n="drop" s={11} />{plant.watering}</span>}
      </div>
      <div className="card-footer">
        {plant.difficulty && (
          <span className="difficulty-label">
            <span className="difficulty-dot" data-level={plant.difficulty} />{plant.difficulty}
          </span>
        )}
        {plant.toxicity === "Pet Safe" && <span className="pet-safe-pill">🐾 Pet safe</span>}
      </div>
    </div>
  </article>
));

// ---------- DETAIL ----------
function Detail({ plant, plants, onBack, onOpen, onWish, onCmp, onAddCollection, onRemoveCollection, onJournal, journal, wished, comped, owned, toast }) {
  const [tab, setTab] = useState("story");
  const [full, setFull] = useState(plant);
  const [varieties, setVarieties] = useState([]);
  const [loadingVars, setLoadingVars] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadExtra() {
      setLoadingVars(true);
      try {
        const [fp, vars] = await Promise.all([
          sb(`plants?id=eq.${plant.id}&select=*`).catch(() => [plant]),
          sb(`varieties?plant_id=eq.${plant.id}&select=id,name,rarity,description,special_traits`).catch(() => []),
        ]);
        if (cancelled) return;
        if (fp?.[0]) setFull({ ...plant, ...fp[0] });
        if (vars?.length) {
          const ids = vars.map(v => v.id).join(",");
          const prices = await sb(`prices?variety_id=in.(${ids})&select=variety_id,price_usd,in_stock,retailers(name)`).catch(() => []);
          const byVar = {};
          for (const pr of prices) (byVar[pr.variety_id] ??= []).push(pr);
          if (!cancelled) setVarieties(vars.map(v => ({ ...v, prices: byVar[v.id] ?? [] })));
        } else setVarieties([]);
      } catch (e) { console.error(e); }
      finally { if (!cancelled) setLoadingVars(false); }
    }
    loadExtra();
    return () => { cancelled = true; };
  }, [plant.id]);

  const share = async () => {
    const url = `${window.location.origin}/plant/${plant.slug}`;
    if (navigator.share) { try { await navigator.share({ title: plant.common_name, url }); } catch {} }
    else { try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast("Couldn't copy", "err"); } }
  };

  const related = useMemo(
    () => plants.filter(p => p.id !== plant.id && p.category === full.category).slice(0, 6),
    [plants, plant.id, full.category]
  );
  const allRetailers = useMemo(
    () => [...new Set(varieties.flatMap(v => v.prices.map(pr => pr.retailers?.name).filter(Boolean)))].sort(),
    [varieties]
  );

  return (
    <div className="detail fade">
      <div className="detail-toolbar">
        <button className="btn toolbar-btn" onClick={onBack}><Icon n="back" s={16} /> Back</button>
        <button className="btn toolbar-btn" onClick={share}><Icon n="share" s={14} /> Share</button>
      </div>

      <section className="detail-hero">
        <div className="detail-hero-image">
          <PlantImage plant={full} height="100%" eager />
          <div className="detail-hero-fade" />
        </div>
        <div className="detail-hero-content">
          <div className="detail-kicker">{full.category ?? "Specimen"}</div>
          <h1 className="detail-title">{full.common_name}</h1>
          <div className="detail-sci">{full.scientific_name}</div>
          <div className="detail-tags">
            {full.difficulty && <span className="chip-dark">{full.difficulty}</span>}
            {full.toxicity === "Pet Safe" && <span className="chip-dark pet">🐾 Pet Safe</span>}
            {full.toxicity && full.toxicity !== "Pet Safe" && <span className="chip-dark tox">⚠ {full.toxicity}</span>}
            {full.rare && <span className="chip-dark rare">✦ Rare</span>}
          </div>
        </div>
      </section>

      <section className="detail-actions">
        <button className={`action-btn btn ${owned ? "active" : ""}`}
          onClick={() => owned ? onRemoveCollection(full.id) : onAddCollection(full)}>
          <Icon n={owned ? "check" : "plus"} s={16} />
          <span>{owned ? "In my collection" : "I have this"}</span>
        </button>
        <button className={`action-btn btn ${wished ? "active wished" : ""}`} onClick={() => onWish(full)}>
          <Icon n="heart" s={16} />
          <span>{wished ? "Saved" : "Wishlist"}</span>
        </button>
        <button className={`action-btn btn ${comped ? "active" : ""}`} onClick={() => onCmp(full)}>
          <Icon n="cmp" s={16} />
          <span>{comped ? "Comparing" : "Compare"}</span>
        </button>
      </section>

      <section className="stat-strip">
        {[
          { i: "sun", l: "Light", v: full.sunlight },
          { i: "drop", l: "Water", v: full.watering },
          { i: "leaf", l: "Category", v: full.category },
        ].map(s => (
          <div key={s.l} className="stat">
            <div className="stat-icon"><Icon n={s.i} s={18} /></div>
            <div>
              <div className="stat-label">{s.l}</div>
              <div className="stat-value">{s.v || "—"}</div>
            </div>
          </div>
        ))}
      </section>

      {full.description && (
        <section className="detail-story">
          <div className="drop-cap">{full.description.charAt(0)}</div>
          <p>{full.description.slice(1)}</p>
          {full.fun_fact && (
            <aside className="fun-fact">
              <div className="fun-fact-label">Did You Know</div>
              <p>{full.fun_fact}</p>
            </aside>
          )}
        </section>
      )}

      <nav className="tabs">
        <button className={`tab btn ${tab === "story" ? "on" : ""}`} onClick={() => setTab("story")}>Care</button>
        {varieties.length > 0 && (
          <button className={`tab btn ${tab === "varieties" ? "on" : ""}`} onClick={() => setTab("varieties")}>
            Varieties · {varieties.length}
          </button>
        )}
        {allRetailers.length > 0 && (
          <button className={`tab btn ${tab === "buy" ? "on" : ""}`} onClick={() => setTab("buy")}>Where to Buy</button>
        )}
        <button className={`tab btn ${tab === "traits" ? "on" : ""}`} onClick={() => setTab("traits")}>Traits</button>
        {owned && (
          <button className={`tab btn ${tab === "journal" ? "on" : ""}`} onClick={() => setTab("journal")}>
            Journal{journal.length > 0 && ` · ${journal.length}`}
          </button>
        )}
      </nav>

      {tab === "story" && <CareTab plant={full} />}
      {tab === "varieties" && <VarietiesTab loading={loadingVars} varieties={varieties} plantName={full.common_name} />}
      {tab === "buy" && <LocationsTab retailers={allRetailers} varieties={varieties} plantName={full.common_name} />}
      {tab === "traits" && <TraitsTab plant={full} />}
      {tab === "journal" && owned && <JournalTab plant={full} entries={journal} onAdd={(text) => onJournal(full.id, text)} />}

      {related.length > 0 && (
        <section className="related">
          <SectionLabel kicker="Further Reading" title="Related Specimens" />
          <div className="shelf-scroll">
            {related.map(p => <MiniCard key={p.id} plant={p} onOpen={onOpen} onWish={onWish} wished={false} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function CareTab({ plant }) {
  const sections = [
    { k: "care_notes", e: "💧", t: "Watering & General Care" },
    { k: "soil", e: "🪴", t: "Soil & Potting" },
    { k: "fertilizer", e: "🌿", t: "Feeding" },
    { k: "propagation", e: "✂️", t: "Propagation" },
    { k: "temperature", e: "🌡️", t: "Temperature & Humidity" },
    { k: "common_problems", e: "🔍", t: "Common Problems" },
  ].filter(s => plant[s.k]);
  const profile = [
    ["Native to", plant.native_region],
    ["Blooms", plant.bloom_season],
    ["Mature height", plant.mature_height],
    ["Pairs with", plant.companion_plants],
  ].filter(([, v]) => v);
  if (!sections.length && !profile.length) {
    return <div className="empty"><p>Care guide coming soon for this specimen.</p></div>;
  }
  return (
    <div className="fade care-wrap">
      {sections.map(s => (
        <article key={s.k} className="care-section">
          <h3 className="care-title"><span className="care-emoji">{s.e}</span>{s.t}</h3>
          <p className="care-body">{plant[s.k]}</p>
        </article>
      ))}
      {profile.length > 0 && (
        <article className="care-section">
          <h3 className="care-title"><span className="care-emoji">🌍</span>Field Notes</h3>
          <dl className="profile-list">
            {profile.map(([k, v]) => (
              <div key={k} className="profile-row"><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </article>
      )}
    </div>
  );
}

function VarietiesTab({ loading, varieties, plantName }) {
  if (loading) return <div className="empty"><span className="spinner" /> Loading varieties…</div>;
  if (!varieties.length) return <div className="empty"><p>No variety records yet.</p></div>;
  return (
    <div className="fade variety-list">
      {varieties.map(v => {
        const ps = v.prices ?? [];
        const minP = ps.length ? Math.min(...ps.map(p => p.price_usd || Infinity)) : null;
        const inStock = ps.some(p => p.in_stock);
        return (
          <article key={v.id} className="variety-card">
            <div className="variety-head">
              <div>
                <div className="variety-name">{v.name}</div>
                {v.rarity && <div className="variety-rarity">{v.rarity}</div>}
              </div>
              <div className="variety-price-box">
                {minP !== null && Number.isFinite(minP) ? (
                  <>
                    <div className="variety-price">${minP}<span>+</span></div>
                    <div className={`variety-stock ${inStock ? "in" : "out"}`}>{inStock ? "● In stock" : "○ Out of stock"}</div>
                  </>
                ) : <div className="variety-stock">Price TBA</div>}
              </div>
            </div>
            {v.description && <p className="variety-desc">{v.description}</p>}
            {ps.length > 0 && (
              <div className="variety-links">
                {ps.map((p, i) => p.retailers?.name && (
                  <a key={i} href={retailerLink(p.retailers.name, plantName)} target="_blank" rel="noopener noreferrer" className="variety-link">
                    {p.retailers.name} · ${p.price_usd}
                  </a>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function LocationsTab({ retailers, varieties, plantName }) {
  if (!retailers.length) return <div className="empty"><p>No retailers listed yet.</p></div>;
  return (
    <div className="fade retailer-grid">
      {retailers.map(r => {
        const avail = varieties.filter(v => v.prices.some(p => p.retailers?.name === r));
        return (
          <article key={r} className="retailer-card">
            <a href={retailerLink(r, plantName)} target="_blank" rel="noopener noreferrer" className="retailer-name">
              {r} <Icon n="arrow" s={12} />
            </a>
            {avail.map(v => {
              const pr = v.prices.find(p => p.retailers?.name === r);
              return (
                <div key={v.id} className="retailer-row">
                  <span>{v.name}</span>
                  <span className={pr?.in_stock ? "price-in" : "price-out"}>{pr?.price_usd ? `$${pr.price_usd}` : "—"}</span>
                </div>
              );
            })}
          </article>
        );
      })}
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
    <div className="fade traits-grid">
      {traits.map(t => (
        <div key={t.l} className={`trait ${t.v ? "on" : ""}`}>
          <span className="trait-i">{t.i}</span>
          <span className="trait-l">{t.l}</span>
          <span className="trait-v">{t.v ? "✓" : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function JournalTab({ plant, entries, onAdd }) {
  const [text, setText] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim());
    setText("");
  };
  return (
    <div className="fade journal">
      <form onSubmit={submit} className="journal-form">
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder={`Log an entry for your ${plant.common_name}… repotted today, new leaf, watered, blooming`} rows={3} />
        <div className="journal-form-actions">
          <button type="submit" className="btn journal-submit" disabled={!text.trim()}>
            <Icon n="book" s={14} /> Log entry
          </button>
        </div>
      </form>
      {entries.length === 0 ? (
        <div className="empty"><p>No entries yet. Start documenting your plant's journey.</p></div>
      ) : (
        <div className="journal-entries">
          {[...entries].reverse().map(e => (
            <article key={e.id} className="journal-entry">
              <div className="journal-date">
                {new Date(e.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </div>
              <p>{e.text}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Compare({ plants, onRemove, onOpen }) {
  if (!plants.length) return (
    <EmptyState emoji="🌿" title="Nothing to compare yet" body="Tap the compare icon on up to 3 plants to see them side by side." />
  );
  const rows = [
    ["Species", p => <em>{p.scientific_name}</em>],
    ["Category", p => p.category ?? "—"],
    ["Difficulty", p => p.difficulty ?? "—"],
    ["Light", p => p.sunlight ?? "—"],
    ["Water", p => p.watering ?? "—"],
    ["Pet Safe", p => p.toxicity === "Pet Safe" ? "✓" : "✗"],
    ["Air Purifying", p => p.air_purifying ? "✓" : "—"],
    ["Low Light", p => p.low_light ? "✓" : "—"],
    ["Drought Tolerant", p => p.drought_tolerant ? "✓" : "—"],
    ["Edible", p => p.edible ? "✓" : "—"],
    ["Flowering", p => p.flowering ? "✓" : "—"],
    ["Rare", p => p.rare ? "✦" : "—"],
  ];
  return (
    <div className="fade page-wrap">
      <SectionLabel kicker="Side by Side" title="Compare" blurb="Weighing your options." />
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th></th>
              {plants.map(p => (
                <th key={p.id}>
                  <button className="btn" onClick={() => onOpen(p)} style={{ textAlign: "left", width: "100%" }}>
                    <PlantImage plant={p} height={90} rounded={2} />
                    <div className="compare-head-name">{p.common_name}</div>
                  </button>
                  <button className="btn compare-remove" onClick={() => onRemove(p.id)}>
                    <Icon n="x" s={12} /> Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label}>
                <td className="compare-label">{label}</td>
                {plants.map(p => <td key={p.id}>{fn(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Wishlist({ plants, onOpen, onRemove }) {
  if (!plants.length) return (
    <EmptyState emoji="🌱" title="Your wishlist is empty" body="Tap the heart on any plant to save it here for later." />
  );
  return (
    <div className="fade page-wrap">
      <SectionLabel kicker="Saved for Later" title="Wishlist" blurb={`${plants.length} plant${plants.length !== 1 ? "s" : ""} you'd like to bring home.`} />
      <div className="grid">
        {plants.map((p, i) => (
          <article key={p.id} className="card card-fade" onClick={() => onOpen(p)} style={{ animationDelay: `${i * 30}ms` }}>
            <div className="card-image-wrap">
              <PlantImage plant={p} height={200} />
              <button className="card-btn btn card-btn-single" onClick={e => { e.stopPropagation(); onRemove(p.id); }}
                style={{ background: "rgba(244,237,224,0.92)", color: "#b84640" }} aria-label="Remove">
                <Icon n="x" s={13} />
              </button>
            </div>
            <div className="card-body">
              <div className="card-name">{p.common_name}</div>
              <div className="card-sci">{p.scientific_name}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Collection({ items, allPlants, journal, onOpen, onRemove }) {
  const stats = useMemo(() => {
    const full = items.map(i => allPlants.find(p => p.id === i.id) ?? i);
    return {
      total: items.length,
      rare: full.filter(p => p.rare).length,
      petSafe: full.filter(p => p.toxicity === "Pet Safe").length,
      flowering: full.filter(p => p.flowering).length,
      entries: Object.values(journal).reduce((s, a) => s + a.length, 0),
      categories: [...new Set(full.map(p => p.category).filter(Boolean))],
    };
  }, [items, allPlants, journal]);

  if (!items.length) return (
    <EmptyState emoji="🪴" title="Your collection awaits" body="When you get a plant, tap 'I have this' on its page. Track its journey with journal entries — watering, repotting, new leaves, blooms." />
  );

  return (
    <div className="fade page-wrap">
      <SectionLabel kicker="Your Greenhouse" title="My Collection" blurb="Every specimen in your care." />
      <div className="stats-grid">
        <div className="stat-big"><div className="stat-num">{stats.total}</div><div className="stat-lbl">Plants</div></div>
        <div className="stat-big"><div className="stat-num">{stats.rare}</div><div className="stat-lbl">Rare</div></div>
        <div className="stat-big"><div className="stat-num">{stats.petSafe}</div><div className="stat-lbl">Pet Safe</div></div>
        <div className="stat-big"><div className="stat-num">{stats.flowering}</div><div className="stat-lbl">Flowering</div></div>
        <div className="stat-big"><div className="stat-num">{stats.entries}</div><div className="stat-lbl">Journal Entries</div></div>
      </div>
      {stats.categories.length > 0 && (
        <div className="collection-categories">
          {stats.categories.map(c => <span key={c} className="category-tag">{c}</span>)}
        </div>
      )}
      <div className="grid">
        {items.map((item, i) => {
          const full = allPlants.find(p => p.id === item.id) ?? item;
          const entries = journal[item.id] ?? [];
          return (
            <article key={item.id} className="card card-fade" onClick={() => onOpen(item.slug)} style={{ animationDelay: `${i * 30}ms` }}>
              <div className="card-image-wrap">
                <PlantImage plant={full} height={200} />
                <button className="card-btn btn card-btn-single" onClick={e => { e.stopPropagation(); onRemove(item.id); }}
                  style={{ background: "rgba(244,237,224,0.92)", color: "#6b6155" }} aria-label="Remove">
                  <Icon n="x" s={13} />
                </button>
                {entries.length > 0 && (
                  <div className="journal-badge"><Icon n="book" s={10} /> {entries.length}</div>
                )}
              </div>
              <div className="card-body">
                <div className="card-name">{item.common_name}</div>
                <div className="card-sci">{item.scientific_name}</div>
                <div className="card-owned-since">
                  In collection since {new Date(item.added).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Quiz({ plants, onOpen }) {
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState({});
  const [results, setResults] = useState(null);

  const questions = [
    { id: "light", emoji: "☀️", q: "What's the light like where you want a plant?", options: [
      { l: "Bright & sunny spot", v: "bright" },
      { l: "Medium indirect", v: "medium" },
      { l: "Pretty dim", v: "low" },
      { l: "Almost no natural light", v: "verylow" },
    ]},
    { id: "water", emoji: "💧", q: "Honestly — how often will you remember to water?", options: [
      { l: "Every few days, I'm dedicated", v: "frequent" },
      { l: "Once a week, probably", v: "weekly" },
      { l: "When I remember… oops", v: "infrequent" },
      { l: "Almost never", v: "rare" },
    ]},
    { id: "pets", emoji: "🐾", q: "Anyone chewing on things?", options: [
      { l: "Dogs or cats in the house", v: "pets" },
      { l: "Small kids around", v: "kids" },
      { l: "Both!", v: "both" },
      { l: "All clear", v: "none" },
    ]},
    { id: "exp", emoji: "🌿", q: "Plant track record?", options: [
      { l: "Everything I touch dies", v: "beginner" },
      { l: "A few have survived", v: "some" },
      { l: "Pretty confident", v: "experienced" },
      { l: "I am the plant whisperer", v: "expert" },
    ]},
    { id: "vibe", emoji: "🏡", q: "What's the vibe you want?", options: [
      { l: "Big dramatic statement", v: "statement" },
      { l: "Cute little shelf plant", v: "small" },
      { l: "Rare & impressive", v: "rare" },
      { l: "Something that flowers", v: "flowering" },
    ]},
  ];

  const score = (p, a) => {
    let s = 0;
    const lm = { bright: ["Full Sun","Bright Indirect"], medium: ["Bright Indirect","Medium"], low: ["Low","Medium"], verylow: ["Low"] };
    if (lm[a.light]?.some(x => p.sunlight?.includes(x))) s += 3;
    const wm = { frequent: ["Frequent","Moderate"], weekly: ["Moderate","Weekly"], infrequent: ["Low","Weekly"], rare: ["Low","Very Low"] };
    if (wm[a.water]?.some(x => p.watering?.includes(x))) s += 3;
    if (a.water === "rare" && p.drought_tolerant) s += 2;
    if (["pets","kids","both"].includes(a.pets) && p.toxicity === "Pet Safe") s += 4;
    const dm = { beginner: ["Very Easy","Easy"], some: ["Easy","Moderate"], experienced: ["Moderate","Hard"], expert: ["Hard","Expert"] };
    if (dm[a.exp]?.includes(p.difficulty)) s += 3;
    if (a.vibe === "rare" && p.rare) s += 4;
    if (a.vibe === "flowering" && p.flowering) s += 4;
    if ((a.light === "low" || a.light === "verylow") && p.low_light) s += 3;
    if (a.vibe === "small" && p.category === "Succulent") s += 2;
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
    <div className="fade quiz-results">
      <SectionLabel kicker="The Verdict" title="Your Perfect Match" blurb="Based on your conditions and vibe." />
      <div className="results-list">
        {results.map((p, i) => (
          <article key={p.id} className={`result-card ${i === 0 ? "best" : ""}`} onClick={() => onOpen(p)}>
            <div className="result-image">
              <PlantImage plant={p} height={140} eager />
              {i === 0 && <div className="result-badge">Best Match</div>}
              {i === 1 && <div className="result-badge gray">2nd</div>}
              {i === 2 && <div className="result-badge gray">3rd</div>}
            </div>
            <div className="result-body">
              <h3 className="result-name">{p.common_name}</h3>
              <div className="result-sci">{p.scientific_name}</div>
              <p className="result-desc">{p.description}</p>
              <div className="result-cta">Read the entry <Icon n="arrow" s={14} /></div>
            </div>
          </article>
        ))}
      </div>
      <button className="btn retake" onClick={() => { setStep(0); setAns({}); setResults(null); }}>
        Retake the quiz
      </button>
    </div>
  );

  const q = questions[step];
  return (
    <div className="fade quiz">
      <div className="quiz-progress">
        {questions.map((_, i) => (
          <span key={i} className={`progress-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`} />
        ))}
      </div>
      <div className="quiz-header">
        <div className="quiz-emoji">{q.emoji}</div>
        <h2 className="quiz-q">{q.q}</h2>
        <div className="quiz-step">Question {step + 1} of {questions.length}</div>
      </div>
      <div className="quiz-options">
        {q.options.map((o, i) => (
          <button key={o.v} className="quiz-option btn" onClick={() => answer(o.v)} style={{ animationDelay: `${i * 60}ms` }}>
            <span>{o.l}</span>
            <Icon n="arrow" s={14} />
          </button>
        ))}
      </div>
      {step > 0 && (
        <button className="btn quiz-back" onClick={() => setStep(step - 1)}>
          <Icon n="back" s={13} /> Back
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading">
      <div className="spinner-big" />
      <p>Unfolding the field guide…</p>
    </div>
  );
}

function EmptyState({ emoji, title, body }) {
  return (
    <div className="empty-page fade">
      <div className="empty-emoji-big">{emoji}</div>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function Footer({ count }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-mark">Cultivar</div>
        <div className="footer-tag">The Plant Journal · Vol. I · {count.toLocaleString()} species</div>
        <div className="footer-meta">Imagery from Wikimedia Commons · Prices updated weekly · Est. 2026</div>
      </div>
    </footer>
  );
}

// ---------- STYLES ----------
function Styles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=Inter+Tight:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');
      :root {
        --cream: #f4ede0;
        --cream-deep: #ebe2d1;
        --paper: #f9f4ea;
        --ink: #2a2620;
        --ink-soft: #4a453c;
        --ink-faint: #8a8173;
        --moss: #1e3a27;
        --moss-light: #3d6b4d;
        --moss-bg: #e8ede0;
        --rust: #b84640;
        --rust-bg: #f5e5e0;
        --gold: #a67c2e;
        --border: #d8cfbe;
        --border-soft: #e6dcc8;
        --shadow-soft: 0 1px 3px rgba(42,38,32,0.04), 0 4px 16px rgba(42,38,32,0.06);
        --shadow-lift: 0 4px 14px rgba(42,38,32,0.08), 0 14px 40px rgba(42,38,32,0.1);
      }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
      html, body { font-family: 'Inter Tight', system-ui, sans-serif; color: var(--ink); overscroll-behavior-y: none; }
      body {
        background: var(--cream);
        background-image:
          radial-gradient(ellipse at 20% 10%, rgba(61,107,77,0.04), transparent 60%),
          radial-gradient(ellipse at 85% 80%, rgba(166,124,46,0.04), transparent 55%);
      }
      .app {
        min-height: 100vh;
        background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.16 0 0 0 0 0.15 0 0 0 0 0.12 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
      }
      ::selection { background: var(--moss); color: var(--cream); }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--ink-faint); }

      .btn {
        cursor: pointer; border: none; background: transparent;
        color: inherit; font: inherit;
        transition: opacity 0.15s, transform 0.15s;
      }
      .btn:active { opacity: 0.7; transform: scale(0.98); }
      @media (hover: hover) { .btn:hover { opacity: 0.88; } }

      .header {
        position: sticky; top: 0; z-index: 100;
        background: var(--cream);
        border-bottom: 1px solid var(--border);
        padding-top: env(safe-area-inset-top);
      }
      .header-inner {
        max-width: 1240px; margin: 0 auto;
        padding: 0 20px; height: 64px;
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
      }
      .brand { display: flex; align-items: center; gap: 11px; min-width: 0; }
      .brand-mark {
        width: 34px; height: 34px;
        background: var(--moss); color: var(--cream);
        display: flex; align-items: center; justify-content: center;
        border-radius: 2px;
        box-shadow: 0 1px 3px rgba(30,58,39,0.3);
      }
      .brand-text { text-align: left; }
      .brand-name {
        font-family: 'Fraunces', serif; font-weight: 500;
        font-size: 22px; letter-spacing: -0.025em; line-height: 1;
      }
      .brand-tagline {
        font-size: 10px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.15em;
        margin-top: 3px; font-weight: 500;
      }
      .nav-desktop { display: flex; gap: 4px; }
      .nav-item {
        padding: 8px 14px;
        font-size: 13px; font-weight: 500;
        color: var(--ink-soft); letter-spacing: 0.01em;
        border-radius: 2px;
        position: relative;
      }
      .nav-item::after {
        content: ''; position: absolute;
        left: 14px; right: 14px; bottom: 4px;
        height: 1px; background: var(--moss);
        transform: scaleX(0); transform-origin: left;
        transition: transform 0.24s ease;
      }
      .nav-item.on { color: var(--moss); }
      .nav-item.on::after, .nav-item:hover::after { transform: scaleX(1); }
      .nav-toggle { display: none; width: 40px; height: 40px; border-radius: 4px; color: var(--ink); }
      @media (max-width: 780px) {
        .nav-desktop { display: none; }
        .nav-toggle { display: flex; align-items: center; justify-content: center; }
        .brand-tagline { display: none; }
        .header-inner { height: 58px; padding: 0 16px; }
      }
      .nav-mobile-sheet {
        position: absolute; top: 100%; left: 0; right: 0;
        background: var(--cream);
        border-bottom: 1px solid var(--border);
        padding: 8px 12px 14px;
        animation: slideDown 0.22s ease;
        box-shadow: 0 10px 24px rgba(42,38,32,0.06);
      }
      .nav-mobile-item {
        display: flex; align-items: center; gap: 12px;
        width: 100%; padding: 14px;
        font-size: 15px; font-weight: 500; color: var(--ink-soft);
        border-radius: 2px; text-align: left;
      }
      .nav-mobile-item.on { color: var(--moss); background: var(--moss-bg); }
      .nav-mobile-item span { flex: 1; }
      .nav-mobile-item svg:last-child { opacity: 0.4; }

      .main {
        max-width: 1240px; margin: 0 auto;
        padding: 24px 20px 80px;
      }
      @media (max-width: 600px) { .main { padding: 16px 16px 80px; } }

      .error-card {
        padding: 14px 18px; background: var(--rust-bg);
        border-left: 3px solid var(--rust);
        color: var(--ink); font-size: 14px;
        margin-bottom: 20px;
        display: flex; justify-content: space-between; align-items: center; gap: 12px;
        border-radius: 2px;
      }
      .error-card .btn { color: var(--rust); font-weight: 600; text-decoration: underline; }

      .hero { padding: 28px 0 36px; border-bottom: 1px solid var(--border-soft); margin-bottom: 48px; }
      .hero-eyebrow {
        font-size: 11px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.28em;
        font-weight: 600; margin-bottom: 22px;
        display: flex; align-items: center; gap: 12px;
      }
      .hero-eyebrow::before, .hero-eyebrow::after {
        content: ''; flex: 1; max-width: 60px; height: 1px; background: var(--border);
      }
      .hero-title {
        font-family: 'Fraunces', serif;
        font-size: clamp(38px, 8vw, 72px);
        font-weight: 300;
        line-height: 0.95; letter-spacing: -0.035em;
        margin-bottom: 20px;
      }
      .hero-title em {
        font-family: 'Instrument Serif', serif;
        font-style: italic; font-weight: 400;
        color: var(--moss); font-size: 1.05em;
      }
      .hero-sub {
        font-size: clamp(15px, 2.2vw, 17px);
        color: var(--ink-soft); line-height: 1.55;
        max-width: 560px; margin-bottom: 28px;
      }
      .search-wrap {
        position: relative; max-width: 560px;
        background: var(--paper);
        border: 1.5px solid var(--border);
        border-radius: 2px;
        display: flex; align-items: center;
        padding: 0 16px; gap: 10px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .search-wrap:focus-within {
        border-color: var(--moss);
        box-shadow: 0 0 0 3px rgba(30,58,39,0.1);
      }
      .search-wrap > svg { color: var(--ink-faint); flex-shrink: 0; }
      .search-input {
        flex: 1; padding: 16px 0;
        background: transparent; border: none; outline: none;
        font-family: inherit; font-size: 16px; color: var(--ink);
      }
      .search-input::placeholder { color: var(--ink-faint); }
      .search-clear {
        width: 28px; height: 28px; border-radius: 99px;
        display: flex; align-items: center; justify-content: center;
        color: var(--ink-faint);
      }

      .section-label { margin-bottom: 20px; }
      .section-kicker {
        display: flex; align-items: center; gap: 10px;
        font-size: 11px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.22em;
        font-weight: 600; margin-bottom: 8px;
      }
      .section-rule { width: 24px; height: 1px; background: var(--moss); }
      .section-title {
        font-family: 'Fraunces', serif;
        font-size: clamp(24px, 4vw, 32px);
        font-weight: 400; letter-spacing: -0.02em;
        line-height: 1.15;
      }
      .section-blurb {
        font-size: 14px; color: var(--ink-soft);
        margin-top: 4px; font-style: italic;
        font-family: 'Instrument Serif', serif;
      }

      .featured { margin-bottom: 56px; }
      .featured-card {
        display: grid; grid-template-columns: 1.1fr 1fr;
        background: var(--paper); border: 1px solid var(--border);
        overflow: hidden; cursor: pointer;
        box-shadow: var(--shadow-soft);
        transition: transform 0.25s, box-shadow 0.25s;
      }
      @media (hover: hover) { .featured-card:hover { box-shadow: var(--shadow-lift); transform: translateY(-2px); } }
      @media (max-width: 720px) { .featured-card { grid-template-columns: 1fr; } }
      .featured-image { height: 400px; position: relative; }
      @media (max-width: 720px) { .featured-image { height: 260px; } }
      .featured-body { padding: 36px; display: flex; flex-direction: column; justify-content: center; }
      @media (max-width: 600px) { .featured-body { padding: 24px; } }
      .featured-kicker {
        font-size: 11px; color: var(--gold);
        text-transform: uppercase; letter-spacing: 0.24em;
        font-weight: 600; margin-bottom: 14px;
      }
      .featured-title {
        font-family: 'Fraunces', serif;
        font-size: clamp(28px, 5vw, 44px);
        font-weight: 400; letter-spacing: -0.025em;
        line-height: 1.05; margin-bottom: 6px;
      }
      .featured-sci {
        font-family: 'Instrument Serif', serif;
        font-size: 15px; font-style: italic;
        color: var(--ink-faint); margin-bottom: 18px;
      }
      .featured-desc {
        font-size: 15px; color: var(--ink-soft);
        line-height: 1.65; margin-bottom: 20px;
        display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
      }
      .featured-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
      .featured-meta span {
        font-size: 11px; color: var(--ink-soft);
        padding: 4px 10px; background: var(--cream);
        border: 1px solid var(--border); border-radius: 2px;
        font-weight: 500;
      }
      .featured-meta .pet-safe { color: var(--moss); border-color: var(--moss-light); }
      .featured-meta .rare-tag { color: var(--rust); border-color: var(--rust); }
      .featured-cta {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 13px; font-weight: 600; color: var(--moss);
        text-transform: uppercase; letter-spacing: 0.12em;
        border-bottom: 1px solid var(--moss);
        padding-bottom: 4px; align-self: flex-start;
      }

      .mood-chips {
        display: flex; gap: 8px; flex-wrap: wrap;
        margin-bottom: 48px; padding-bottom: 28px;
        border-bottom: 1px solid var(--border-soft);
      }
      .chip {
        padding: 8px 16px;
        border: 1px solid var(--border);
        background: var(--paper);
        color: var(--ink-soft);
        font-size: 13px; font-weight: 500;
        border-radius: 99px;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      @media (hover: hover) {
        .chip:hover { background: var(--moss); color: var(--cream); border-color: var(--moss); }
      }

      .shelf { margin-bottom: 48px; animation: fadeUp 0.5s ease backwards; }
      .shelf-scroll {
        display: flex; gap: 16px;
        overflow-x: auto; scroll-snap-type: x mandatory;
        padding: 4px 20px 16px;
        margin: 0 -20px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .shelf-scroll::-webkit-scrollbar { display: none; }

      .mini-card {
        flex: 0 0 auto; width: 200px;
        scroll-snap-align: start;
        background: var(--paper);
        border: 1px solid var(--border);
        overflow: hidden; cursor: pointer; text-align: left;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      @media (hover: hover) {
        .mini-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); }
      }
      .mini-image { position: relative; }
      .mini-heart {
        position: absolute; top: 8px; right: 8px;
        width: 28px; height: 28px; border-radius: 99px;
        background: rgba(244,237,224,0.94);
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(4px);
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      .mini-body { padding: 12px 14px 14px; }
      .mini-name {
        font-family: 'Fraunces', serif;
        font-size: 16px; font-weight: 500; line-height: 1.2;
        margin-bottom: 2px; letter-spacing: -0.01em;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .mini-sci {
        font-family: 'Instrument Serif', serif;
        font-size: 12px; font-style: italic;
        color: var(--ink-faint);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }

      .full-catalog { margin-bottom: 40px; }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      }
      @media (max-width: 520px) {
        .grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
      }

      .card {
        background: var(--paper); border: 1px solid var(--border);
        overflow: hidden; cursor: pointer; position: relative;
        transition: transform 0.22s, box-shadow 0.22s;
        display: flex; flex-direction: column;
      }
      .card-fade { animation: fadeUp 0.4s ease backwards; }
      @media (hover: hover) { .card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); } }
      .card-image-wrap { position: relative; }
      .card-actions {
        position: absolute; top: 10px; right: 10px;
        display: flex; gap: 6px;
      }
      .card-btn, .card-btn-single {
        width: 34px; height: 34px; border-radius: 99px;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(6px); box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      }
      .card-btn-single { position: absolute; top: 10px; right: 10px; }
      .card-rare {
        position: absolute; top: 10px; left: 10px;
        background: var(--rust); color: var(--cream);
        font-size: 10px; font-weight: 600;
        letter-spacing: 0.08em; text-transform: uppercase;
        padding: 4px 10px; border-radius: 2px;
        display: flex; align-items: center; gap: 4px;
        box-shadow: 0 2px 6px rgba(184,70,64,0.3);
      }
      .card-body { padding: 14px 16px 16px; flex: 1; display: flex; flex-direction: column; }
      .card-name {
        font-family: 'Fraunces', serif;
        font-size: 20px; font-weight: 500; line-height: 1.15;
        margin-bottom: 3px; letter-spacing: -0.015em;
      }
      @media (max-width: 520px) { .card-name { font-size: 17px; } }
      .card-sci {
        font-family: 'Instrument Serif', serif;
        font-size: 13px; font-style: italic;
        color: var(--ink-faint); margin-bottom: 10px;
      }
      .card-desc {
        font-size: 13px; color: var(--ink-soft);
        line-height: 1.55; margin-bottom: 12px; flex: 1;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      @media (max-width: 520px) { .card-desc { display: none; } }
      .card-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
      .card-meta-item {
        display: inline-flex; align-items: center; gap: 4px;
        font-size: 11px; color: var(--ink-soft);
        padding: 3px 9px; border-radius: 99px;
        background: var(--cream); border: 1px solid var(--border-soft);
      }
      .card-footer {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        padding-top: 10px; border-top: 1px solid var(--border-soft);
      }
      .difficulty-label {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 11px; font-weight: 600; color: var(--ink-soft);
        text-transform: uppercase; letter-spacing: 0.06em;
      }
      .difficulty-dot { width: 6px; height: 6px; border-radius: 99px; display: inline-block; }
      .difficulty-dot[data-level="Very Easy"] { background: #7ec850; }
      .difficulty-dot[data-level="Easy"] { background: #9fd26a; }
      .difficulty-dot[data-level="Moderate"] { background: #d4a82e; }
      .difficulty-dot[data-level="Hard"] { background: #c1392b; }
      .difficulty-dot[data-level="Expert"] { background: #3a3a5a; }
      .pet-safe-pill {
        font-size: 10px; color: var(--moss);
        background: var(--moss-bg);
        padding: 3px 8px; border-radius: 99px;
        font-weight: 600; letter-spacing: 0.04em;
      }

      .detail-toolbar {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 20px;
      }
      .toolbar-btn {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 13px; font-weight: 500;
        color: var(--ink-soft);
        padding: 8px 14px;
        border: 1px solid var(--border); border-radius: 2px;
      }
      .toolbar-btn:hover { background: var(--paper); }

      .detail-hero {
        position: relative; min-height: 460px;
        margin-bottom: 28px; overflow: hidden;
        background: var(--moss); color: var(--cream);
      }
      @media (max-width: 600px) { .detail-hero { min-height: 360px; } }
      .detail-hero-image { position: absolute; inset: 0; }
      .detail-hero-fade {
        position: absolute; inset: 0;
        background: linear-gradient(to bottom, rgba(30,58,39,0.4) 0%, rgba(30,58,39,0.92) 100%);
      }
      .detail-hero-content {
        position: relative; z-index: 1;
        padding: 40px; display: flex; flex-direction: column;
        justify-content: flex-end; min-height: 460px;
      }
      @media (max-width: 600px) {
        .detail-hero-content { padding: 28px 24px 24px; min-height: 360px; }
      }
      .detail-kicker {
        font-size: 11px; color: rgba(244,237,224,0.7);
        text-transform: uppercase; letter-spacing: 0.24em;
        font-weight: 600; margin-bottom: 14px;
      }
      .detail-title {
        font-family: 'Fraunces', serif;
        font-size: clamp(36px, 7vw, 64px);
        font-weight: 400; letter-spacing: -0.03em;
        line-height: 1; margin-bottom: 10px;
        color: var(--cream);
      }
      .detail-sci {
        font-family: 'Instrument Serif', serif;
        font-style: italic; font-size: clamp(16px, 2.4vw, 20px);
        color: rgba(244,237,224,0.6); margin-bottom: 20px;
      }
      .detail-tags { display: flex; gap: 7px; flex-wrap: wrap; }
      .chip-dark {
        background: rgba(244,237,224,0.15);
        border: 1px solid rgba(244,237,224,0.25);
        color: var(--cream);
        padding: 5px 12px; border-radius: 99px;
        font-size: 12px; font-weight: 500;
        backdrop-filter: blur(8px);
      }
      .chip-dark.pet { background: rgba(82,183,136,0.25); border-color: rgba(82,183,136,0.5); }
      .chip-dark.tox { background: rgba(193,57,43,0.25); border-color: rgba(193,57,43,0.5); }
      .chip-dark.rare { background: rgba(244,237,224,0.2); border-color: var(--gold); color: var(--gold); }

      .detail-actions {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 8px; margin-bottom: 28px;
      }
      .action-btn {
        padding: 14px; font-size: 13px; font-weight: 600;
        color: var(--ink-soft);
        background: var(--paper); border: 1px solid var(--border);
        border-radius: 2px;
        display: flex; align-items: center; justify-content: center; gap: 7px;
        transition: all 0.15s;
      }
      .action-btn.active { color: var(--moss); background: var(--moss-bg); border-color: var(--moss); }
      .action-btn.active.wished { color: var(--rust); background: var(--rust-bg); border-color: var(--rust); }
      @media (max-width: 500px) {
        .action-btn span { font-size: 12px; }
      }

      .stat-strip {
        display: grid; grid-template-columns: repeat(3, 1fr);
        background: var(--paper); border: 1px solid var(--border);
        margin-bottom: 36px;
      }
      .stat {
        padding: 18px 16px;
        display: flex; align-items: center; gap: 12px;
        border-right: 1px solid var(--border-soft);
      }
      .stat:last-child { border-right: none; }
      .stat-icon { color: var(--moss); flex-shrink: 0; }
      .stat-label {
        font-size: 10px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.18em;
        font-weight: 600; margin-bottom: 3px;
      }
      .stat-value {
        font-family: 'Fraunces', serif;
        font-size: 16px; font-weight: 500; line-height: 1.1;
      }
      @media (max-width: 600px) {
        .stat { padding: 12px 10px; gap: 8px; flex-direction: column; text-align: center; }
        .stat-label { letter-spacing: 0.1em; font-size: 9px; }
        .stat-value { font-size: 13px; }
      }

      .detail-story {
        max-width: 680px; margin: 0 auto 40px;
        position: relative;
      }
      .drop-cap {
        font-family: 'Fraunces', serif; font-weight: 400;
        font-size: 72px; line-height: 0.85;
        float: left; margin: 4px 14px 0 0;
        color: var(--moss);
      }
      .detail-story p {
        font-family: 'Instrument Serif', serif;
        font-size: 18px; line-height: 1.65;
        color: var(--ink);
      }
      .fun-fact {
        margin-top: 28px; padding: 18px 22px;
        background: var(--moss-bg);
        border-left: 3px solid var(--moss);
        clear: both;
      }
      .fun-fact-label {
        font-size: 11px; color: var(--moss);
        text-transform: uppercase; letter-spacing: 0.18em;
        font-weight: 600; margin-bottom: 6px;
      }
      .fun-fact p {
        font-size: 15px !important; font-family: inherit !important;
        color: var(--ink-soft) !important; line-height: 1.6;
      }

      .tabs {
        display: flex; overflow-x: auto;
        border-bottom: 1px solid var(--border);
        margin-bottom: 24px; scrollbar-width: none;
      }
      .tabs::-webkit-scrollbar { display: none; }
      .tab {
        padding: 12px 18px;
        font-size: 13px; font-weight: 600;
        color: var(--ink-faint);
        border-bottom: 2px solid transparent;
        white-space: nowrap;
        text-transform: uppercase; letter-spacing: 0.1em;
        transition: color 0.15s, border-color 0.15s;
      }
      .tab.on { color: var(--moss); border-bottom-color: var(--moss); }

      .care-wrap { display: flex; flex-direction: column; gap: 14px; max-width: 760px; }
      .care-section {
        background: var(--paper); border: 1px solid var(--border);
        padding: 22px 24px;
      }
      .care-title {
        font-family: 'Fraunces', serif;
        font-size: 19px; font-weight: 500;
        margin-bottom: 10px;
        display: flex; align-items: center; gap: 10px;
      }
      .care-emoji { font-size: 22px; }
      .care-body { font-size: 15px; color: var(--ink-soft); line-height: 1.7; }
      .profile-list { display: flex; flex-direction: column; gap: 10px; }
      .profile-row {
        display: flex; gap: 18px;
        padding-bottom: 10px;
        border-bottom: 1px dotted var(--border);
      }
      .profile-row:last-child { border: none; padding: 0; }
      .profile-row dt {
        font-size: 12px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.1em;
        font-weight: 600; min-width: 110px;
      }
      .profile-row dd { font-size: 14px; color: var(--ink); line-height: 1.5; flex: 1; }

      .variety-list { display: flex; flex-direction: column; gap: 12px; }
      .variety-card {
        background: var(--paper); border: 1px solid var(--border);
        padding: 16px 18px;
      }
      .variety-head {
        display: flex; justify-content: space-between; align-items: flex-start;
        gap: 12px; margin-bottom: 10px;
      }
      .variety-name {
        font-family: 'Fraunces', serif;
        font-size: 17px; font-weight: 500; margin-bottom: 3px;
      }
      .variety-rarity {
        font-size: 11px; color: var(--gold);
        text-transform: uppercase; letter-spacing: 0.14em;
        font-weight: 600;
      }
      .variety-price-box { text-align: right; flex-shrink: 0; }
      .variety-price {
        font-family: 'Fraunces', serif;
        font-size: 24px; font-weight: 500; color: var(--moss);
        line-height: 1; letter-spacing: -0.02em;
      }
      .variety-price span { font-size: 14px; }
      .variety-stock {
        font-size: 11px; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.1em;
        margin-top: 4px;
      }
      .variety-stock.in { color: var(--moss); }
      .variety-stock.out { color: var(--ink-faint); }
      .variety-desc {
        font-size: 14px; color: var(--ink-soft); line-height: 1.6;
        margin-bottom: 10px;
      }
      .variety-links { display: flex; gap: 6px; flex-wrap: wrap; }
      .variety-link {
        padding: 5px 12px; border-radius: 2px;
        background: var(--cream); border: 1px solid var(--border);
        color: var(--moss); text-decoration: none;
        font-size: 12px; font-weight: 500;
        transition: background 0.15s;
      }
      .variety-link:hover { background: var(--moss-bg); }

      .retailer-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 12px;
      }
      .retailer-card {
        background: var(--paper); border: 1px solid var(--border);
        padding: 14px 16px;
      }
      .retailer-name {
        display: inline-flex; align-items: center; gap: 5px;
        font-family: 'Fraunces', serif;
        font-size: 16px; font-weight: 500; color: var(--moss);
        text-decoration: none; margin-bottom: 8px;
      }
      .retailer-row {
        display: flex; justify-content: space-between;
        padding: 6px 0; font-size: 13px;
        border-top: 1px solid var(--border-soft);
      }
      .retailer-row span:first-child { color: var(--ink-soft); }
      .retailer-row .price-in { color: var(--moss); font-weight: 600; }
      .retailer-row .price-out { color: var(--ink-faint); }

      .traits-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 8px;
      }
      .trait {
        display: flex; align-items: center; gap: 10px;
        padding: 12px 14px;
        background: var(--paper); border: 1px solid var(--border);
      }
      .trait.on { background: var(--moss-bg); border-color: var(--moss-light); }
      .trait-i { font-size: 18px; }
      .trait-l { flex: 1; font-size: 13px; font-weight: 500; color: var(--ink-soft); }
      .trait.on .trait-l { color: var(--moss); font-weight: 600; }
      .trait-v { font-size: 13px; font-weight: 700; color: var(--ink-faint); }
      .trait.on .trait-v { color: var(--moss); }

      .journal { max-width: 680px; }
      .journal-form {
        background: var(--paper); border: 1px solid var(--border);
        padding: 16px; margin-bottom: 20px;
      }
      .journal-form textarea {
        width: 100%; padding: 10px 12px;
        background: var(--cream); border: 1px solid var(--border-soft);
        font-family: inherit; font-size: 14px; color: var(--ink);
        resize: vertical; outline: none;
        transition: border-color 0.15s;
      }
      .journal-form textarea:focus { border-color: var(--moss); }
      .journal-form-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
      .journal-submit {
        padding: 8px 16px;
        background: var(--moss); color: var(--cream);
        font-size: 13px; font-weight: 600;
        display: inline-flex; align-items: center; gap: 6px;
        border-radius: 2px;
      }
      .journal-submit:disabled { opacity: 0.4; cursor: not-allowed; }
      .journal-entries { display: flex; flex-direction: column; gap: 10px; }
      .journal-entry {
        background: var(--paper);
        border-left: 3px solid var(--moss);
        padding: 14px 18px;
      }
      .journal-date {
        font-size: 11px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.14em;
        font-weight: 600; margin-bottom: 6px;
      }
      .journal-entry p {
        font-family: 'Instrument Serif', serif;
        font-size: 16px; color: var(--ink); line-height: 1.55;
      }
      .journal-badge {
        position: absolute; bottom: 10px; left: 10px;
        background: rgba(30,58,39,0.9); color: var(--cream);
        padding: 4px 8px; border-radius: 99px;
        font-size: 11px; font-weight: 600;
        display: flex; align-items: center; gap: 4px;
        backdrop-filter: blur(4px);
      }

      .related {
        margin-top: 48px; padding-top: 32px;
        border-top: 1px solid var(--border-soft);
      }

      .compare-table-wrap {
        overflow-x: auto;
        background: var(--paper); border: 1px solid var(--border);
      }
      .compare-table { width: 100%; border-collapse: collapse; min-width: 500px; }
      .compare-table th {
        padding: 14px; text-align: left; vertical-align: top;
        background: var(--cream);
        border-bottom: 1px solid var(--border);
        border-left: 1px solid var(--border-soft);
        min-width: 160px;
      }
      .compare-table th:first-child { min-width: 120px; border-left: none; }
      .compare-head-name {
        font-family: 'Fraunces', serif;
        font-size: 14px; font-weight: 500;
        margin-top: 8px; line-height: 1.2;
      }
      .compare-remove {
        font-size: 11px; color: var(--rust); font-weight: 500;
        display: inline-flex; align-items: center; gap: 4px;
        margin-top: 4px;
      }
      .compare-label {
        font-size: 11px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.1em;
        font-weight: 600;
        padding: 12px 14px !important;
        background: var(--paper);
      }
      .compare-table td {
        padding: 12px 14px; font-size: 14px; color: var(--ink);
        border-top: 1px solid var(--border-soft);
        border-left: 1px solid var(--border-soft);
      }

      .page-wrap { max-width: 1200px; margin: 0 auto; padding-top: 20px; }
      .stats-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 10px; margin-bottom: 20px;
      }
      .stat-big {
        background: var(--paper); border: 1px solid var(--border);
        padding: 18px 16px; text-align: center;
      }
      .stat-num {
        font-family: 'Fraunces', serif;
        font-size: 36px; font-weight: 400; color: var(--moss);
        line-height: 1; letter-spacing: -0.03em;
      }
      .stat-lbl {
        font-size: 10px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.16em;
        font-weight: 600; margin-top: 6px;
      }
      .collection-categories {
        display: flex; gap: 6px; flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .category-tag {
        font-size: 11px; color: var(--ink-soft);
        padding: 4px 10px; border-radius: 99px;
        background: var(--paper); border: 1px solid var(--border);
        font-weight: 500;
      }
      .card-owned-since {
        font-size: 11px; color: var(--ink-faint);
        margin-top: 6px;
      }

      .quiz { max-width: 560px; margin: 40px auto 0; }
      .quiz-progress {
        display: flex; gap: 6px; justify-content: center;
        margin-bottom: 36px;
      }
      .progress-dot {
        width: 22px; height: 3px; border-radius: 99px;
        background: var(--border);
        transition: all 0.3s;
      }
      .progress-dot.active { background: var(--moss); width: 36px; }
      .progress-dot.done { background: var(--moss-light); }
      .quiz-header { text-align: center; margin-bottom: 32px; }
      .quiz-emoji { font-size: 56px; margin-bottom: 14px; }
      .quiz-q {
        font-family: 'Fraunces', serif;
        font-size: clamp(22px, 4vw, 30px);
        font-weight: 400; letter-spacing: -0.02em; line-height: 1.2;
        margin-bottom: 8px;
      }
      .quiz-step {
        font-size: 11px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.2em; font-weight: 600;
      }
      .quiz-options { display: flex; flex-direction: column; gap: 10px; }
      .quiz-option {
        padding: 18px 22px;
        background: var(--paper); border: 1px solid var(--border);
        font-size: 15px; font-weight: 500; color: var(--ink);
        display: flex; justify-content: space-between; align-items: center;
        animation: fadeUp 0.4s ease backwards;
        transition: background 0.15s, border-color 0.15s;
      }
      .quiz-option:hover { background: var(--moss); color: var(--cream); border-color: var(--moss); }
      .quiz-option svg { color: var(--ink-faint); transition: color 0.15s, transform 0.15s; }
      .quiz-option:hover svg { color: var(--cream); transform: translateX(3px); }
      .quiz-back {
        margin-top: 18px; font-size: 13px; color: var(--ink-faint);
        display: inline-flex; align-items: center; gap: 4px;
      }

      .quiz-results { max-width: 800px; margin: 0 auto; }
      .results-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
      .result-card {
        display: grid; grid-template-columns: 180px 1fr;
        background: var(--paper); border: 1px solid var(--border);
        cursor: pointer; overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .result-card.best { border: 2px solid var(--moss); }
      @media (max-width: 600px) { .result-card { grid-template-columns: 120px 1fr; } }
      @media (hover: hover) {
        .result-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lift); }
      }
      .result-image { position: relative; }
      .result-badge {
        position: absolute; top: 10px; left: 10px;
        background: var(--moss); color: var(--cream);
        padding: 4px 10px;
        font-size: 10px; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.14em;
      }
      .result-badge.gray { background: var(--ink-faint); }
      .result-body { padding: 20px 24px; }
      @media (max-width: 600px) { .result-body { padding: 14px 16px; } }
      .result-name {
        font-family: 'Fraunces', serif;
        font-size: clamp(18px, 3vw, 24px); font-weight: 500;
        letter-spacing: -0.02em; line-height: 1.15;
      }
      .result-sci {
        font-family: 'Instrument Serif', serif;
        font-size: 13px; font-style: italic;
        color: var(--ink-faint); margin: 3px 0 10px;
      }
      .result-desc {
        font-size: 13px; color: var(--ink-soft); line-height: 1.55;
        margin-bottom: 10px;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
      }
      .result-cta {
        display: inline-flex; align-items: center; gap: 5px;
        font-size: 12px; font-weight: 600; color: var(--moss);
        text-transform: uppercase; letter-spacing: 0.12em;
      }
      .retake {
        display: block; margin: 0 auto;
        padding: 10px 20px;
        border: 1px solid var(--border); background: var(--paper);
        font-size: 13px; font-weight: 500; color: var(--ink-soft);
        border-radius: 2px;
      }

      .search-results { margin-top: 8px; }
      .search-head { margin-bottom: 20px; }
      .search-query { font-style: italic; color: var(--ink-faint); font-weight: 300; }
      .link-btn {
        font-size: 13px; color: var(--moss); font-weight: 600;
        margin-top: 6px; display: inline-block;
      }

      .empty {
        text-align: center; padding: 40px 20px;
        color: var(--ink-faint); font-size: 14px;
      }
      .empty-emoji { font-size: 42px; margin-bottom: 10px; }
      .empty-page {
        text-align: center; padding: 80px 20px;
        max-width: 440px; margin: 0 auto;
      }
      .empty-emoji-big { font-size: 64px; margin-bottom: 20px; }
      .empty-page h2 {
        font-family: 'Fraunces', serif;
        font-size: 28px; font-weight: 400; letter-spacing: -0.02em;
        margin-bottom: 10px;
      }
      .empty-page p {
        font-size: 15px; color: var(--ink-soft); line-height: 1.6;
      }

      .loading { text-align: center; padding: 120px 20px; color: var(--ink-faint); }
      .spinner-big {
        width: 32px; height: 32px; margin: 0 auto 20px;
        border: 2px solid var(--border);
        border-top-color: var(--moss);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .spinner {
        display: inline-block; vertical-align: middle; margin-right: 8px;
        width: 14px; height: 14px;
        border: 2px solid var(--border);
        border-top-color: var(--moss);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      .loading p {
        font-family: 'Instrument Serif', serif;
        font-style: italic; font-size: 16px;
      }

      .footer {
        border-top: 1px solid var(--border);
        margin-top: 60px;
        padding: 40px 20px calc(28px + env(safe-area-inset-bottom));
        text-align: center; background: var(--paper);
      }
      .footer-mark {
        font-family: 'Fraunces', serif;
        font-size: 28px; font-weight: 500;
        letter-spacing: -0.02em; margin-bottom: 6px;
      }
      .footer-tag {
        font-size: 11px; color: var(--ink-faint);
        text-transform: uppercase; letter-spacing: 0.24em;
        font-weight: 600; margin-bottom: 14px;
      }
      .footer-meta {
        font-size: 12px; color: var(--ink-faint);
        font-family: 'Instrument Serif', serif;
        font-style: italic;
      }

      .fade { animation: fadeUp 0.35s ease; }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 16px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      input, select, textarea { font-family: inherit; font-size: 16px; }
      input:focus, select:focus, textarea:focus { outline: none; }
    `}</style>
  );
}
