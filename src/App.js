import { useState, useMemo, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://ewyfhousutslimzwoflk.supabase.co";
const SUPABASE_KEY = "sb_publishable_S-NF4DxjmSFEGyyxQaML4A_BAfOR3yp";

const RETAILER_LINKS = {
  "Amazon": "https://www.amazon.com/s?k=houseplants&tag=thecultivar-20",
  "Home Depot": "https://www.homedepot.com/s/houseplants",
  "Etsy": "https://www.etsy.com/search?q=rare+houseplants",
  "Lowe's": "https://www.lowes.com/search?searchTerm=houseplants",
  "Walmart": "https://www.walmart.com/search?q=houseplants",
  "IKEA": "https://www.ikea.com/us/en/search/?q=plants",
  "Trader Joe's": "https://www.traderjoes.com",
  "Costa Farms": "https://costafarms.com",
  "Rare Rootz": "https://rarerootz.com",
  "Logee's": "https://logees.com",
  "Steve's Leaves": "https://stevesleaves.com",
  "California Carnivores": "https://californiacarnivores.com",
  "Predatory Plants": "https://predatoryplants.com",
  "Pistils Nursery": "https://pistilsnursery.com",
  "Leaf & Clay": "https://leafandclay.com",
  "Mountain Crest Gardens": "https://mountaincrestgardens.com",
};

const query = async (table, options = {}) => {
  let url = `${SUPABASE_URL}/rest/v1/${table}?`;
  if (options.select) url += `select=${encodeURIComponent(options.select)}&`;
  if (options.filter) url += `${options.filter}&`;
  if (options.order) url += `order=${options.order}&`;
  if (options.limit) url += `limit=${options.limit}&`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const RARITY_CONFIG = {
  "Common":         { color: "#5a8a3c", bg: "#edf5e8" },
  "Uncommon":       { color: "#2a7a6a", bg: "#e4f5f2" },
  "Rare":           { color: "#5a3a8a", bg: "#f0ecfa" },
  "Very Rare":      { color: "#8a2a2a", bg: "#faeaea" },
  "Extremely Rare": { color: "#1a1a1a", bg: "#f0f0f0" },
};

const DIFF_CONFIG = {
  "Very Easy": { color: "#3d7a2a", dot: "#5aaa3c" },
  "Easy":      { color: "#5a8a3c", dot: "#7ac44a" },
  "Moderate":  { color: "#8a6a1a", dot: "#c49a2a" },
  "Hard":      { color: "#8a2a2a", dot: "#c44a3c" },
  "Expert":    { color: "#1a1a2a", dot: "#3a3a5a" },
};

const Icon = ({ n, s = 16 }) => {
  const d = {
    search:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
    leaf:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
    sun:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>,
    drop:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
    heart:   <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    compare: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    grid:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    list:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    back:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="15 18 9 12 15 6"/></svg>,
    x:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    map:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    sparkle: <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  };
  return d[n] || null;
};

export default function Cultivar() {
  const [view, setView] = useState("catalog");
  const [selected, setSelected] = useState(null);
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterDiff, setFilterDiff] = useState("All");
  const [filterTox, setFilterTox] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [layout, setLayout] = useState("grid");
  const [compareList, setCompareList] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [activeTab, setActiveTab] = useState("varieties");

  const loadPlants = useCallback(async () => {
    try {
      setLoading(true);
      const data = await query("plants", {
        select: "id,common_name,scientific_name,emoji,category,description,sunlight,watering,difficulty,toxicity,slug,tags,rare,air_purifying,low_light,drought_tolerant,flowering,fragrant,outdoor_ok,fast_growing,edible",
        filter: "published=eq.true",
        order: "common_name.asc",
      });
      if (data && data.length > 0) setPlants(data);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlants(); }, [loadPlants]);

  const types = useMemo(() => ["All", ...Array.from(new Set(plants.map(p => p.category).filter(Boolean))).sort()], [plants]);
  const diffs = ["All", "Very Easy", "Easy", "Moderate", "Hard", "Expert"];

  const filtered = useMemo(() => {
    let list = plants.filter(p => {
      const q = search.toLowerCase();
      const ms = !q || p.common_name?.toLowerCase().includes(q) || p.scientific_name?.toLowerCase().includes(q) || p.tags?.some(t => t.includes(q));
      const mt = filterType === "All" || p.category === filterType;
      const md = filterDiff === "All" || p.difficulty === filterDiff;
      const mx = filterTox === "All" || p.toxicity === filterTox;
      return ms && mt && md && mx;
    });
    // eslint-disable-next-line
    return [...list].sort((a, b) => {
      if (sortBy === "name") return (a.common_name || "").localeCompare(b.common_name || "");
      if (sortBy === "difficulty") return diffs.indexOf(a.difficulty) - diffs.indexOf(b.difficulty);
      return 0;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps }, [plants, search, filterType, filterDiff, filterTox, sortBy]);

  const toggleCompare = p => {
    if (compareList.find(c => c.id === p.id)) setCompareList(compareList.filter(c => c.id !== p.id));
    else if (compareList.length < 3) setCompareList([...compareList, p]);
  };
  const toggleWish = p => {
    if (wishlist.find(w => w.id === p.id)) setWishlist(wishlist.filter(w => w.id !== p.id));
    else setWishlist([...wishlist, p]);
  };
  const isWished = id => wishlist.some(w => w.id === id);
  const isCompared = id => compareList.some(c => c.id === id);
  const openPlant = p => { setSelected(p); setView("detail"); setActiveTab("varieties"); };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "var(--bg)", minHeight: "100vh", color: "var(--ink)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&display=swap');
        :root{--bg:#f7f5f0;--surface:#ffffff;--surface2:#f2efe9;--border:#e2ddd6;--border2:#cec9c0;--ink:#1a1814;--ink2:#6b6560;--ink3:#9b958e;--accent:#2d6a4f;--accent2:#52b788;--accent-bg:#e8f5ee;--red:#c1392b;--red-bg:#fdecea;--radius:14px;--radius-sm:8px;--shadow:0 2px 16px rgba(26,24,20,0.08);--shadow-lg:0 8px 40px rgba(26,24,20,0.14);}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:var(--surface2);}
        ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:99px;}
        .lift{transition:transform 0.2s ease,box-shadow 0.2s ease;cursor:pointer;}
        .lift:hover{transform:translateY(-3px);box-shadow:var(--shadow-lg)!important;}
        .btn{cursor:pointer;border:none;background:transparent;transition:all 0.15s ease;font-family:'DM Sans',sans-serif;}
        .btn:active{transform:scale(0.96);}
        .pill{padding:6px 14px;border-radius:99px;font-size:13px;font-weight:500;transition:all 0.18s ease;cursor:pointer;border:1.5px solid transparent;}
        .pill:hover{background:rgba(255,255,255,0.12);}
        .pill.on{background:rgba(255,255,255,0.18);border-color:rgba(255,255,255,0.3);}
        .fade{animation:fadeUp 0.3s ease forwards;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
        .tab{padding:8px 16px;font-size:13px;font-weight:500;color:var(--ink3);cursor:pointer;border:none;background:transparent;border-bottom:2px solid transparent;transition:all 0.15s;font-family:'DM Sans',sans-serif;}
        .tab.on{color:var(--accent);border-bottom-color:var(--accent);}
        .wm{font-family:'Fraunces',serif;font-optical-sizing:auto;}
        input,select{font-family:'DM Sans',sans-serif;}
        input:focus,select:focus{outline:2px solid var(--accent);outline-offset:1px;}
        .hero{background:linear-gradient(135deg,#0f2318 0%,#1a3a28 40%,#152e1f 100%);}
        @keyframes spin{to{transform:rotate(360deg);}}
      `}</style>

      <header className="hero" style={{ position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(255,255,255,0.06),0 4px 24px rgba(0,0,0,0.25)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 16px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("catalog")}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#52b788,#2d6a4f)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(82,183,136,0.4)" }}>
              <Icon n="leaf" s={16} />
            </div>
            <div>
              <span className="wm" style={{ fontSize: 20, fontWeight: 600, color: "#fff", letterSpacing: "-0.02em" }}>Cultivar</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 400, marginTop: -2 }}>Plant Intelligence</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: plants.length > 0 ? "rgba(82,183,136,0.9)" : "rgba(255,255,255,0.35)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: plants.length > 0 ? "#52b788" : "#666", display: "inline-block", boxShadow: plants.length > 0 ? "0 0 6px #52b788" : "none" }} />
              {plants.length > 0 ? `${plants.length} plants` : "connecting…"}
            </div>
            <nav style={{ display: "flex", gap: 2 }}>
              {[
                { id: "catalog", label: "Catalog" },
                { id: "compare", label: compareList.length ? `Compare · ${compareList.length}` : "Compare" },
                { id: "wishlist", label: wishlist.length ? `Saved · ${wishlist.length}` : "Saved" },
              ].map(t => (
                <button key={t.id} className={`btn pill ${view === t.id ? "on" : ""}`} onClick={() => setView(t.id)}
                  style={{ color: view === t.id ? "#ffffff" : "rgba(255,255,255,0.55)" }}>
                  {t.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "20px 16px 40px" }}>
        {view === "catalog" && (
          <div className="fade">
            <div style={{ marginBottom: 20 }}>
              <h1 className="wm" style={{ fontSize: 30, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                The Plant <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Intelligence</em> Database
              </h1>
              <p style={{ fontSize: 13, color: "var(--ink3)", marginTop: 5, fontWeight: 300 }}>
                {loading ? "Loading database…" : `${plants.length} species catalogued · prices updated weekly`}
              </p>
            </div>

            {loading && (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--ink3)" }}>
                <div style={{ width: 32, height: 32, border: "2px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                <div style={{ fontSize: 14 }}>Loading your plant database…</div>
              </div>
            )}

            {!loading && plants.length > 0 && (
              <>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 16, boxShadow: "var(--shadow)" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink3)", pointerEvents: "none" }}><Icon n="search" s={15} /></span>
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plants, tags, species…"
                        style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface2)", fontSize: 13, color: "var(--ink)" }} />
                    </div>
                    <button className="btn" onClick={() => setLayout(l => l === "grid" ? "list" : "grid")}
                      style={{ padding: "9px 13px", background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--ink2)" }}>
                      <Icon n={layout === "grid" ? "list" : "grid"} s={15} />
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: "Category", val: filterType, set: setFilterType, opts: types },
                      { label: "Difficulty", val: filterDiff, set: setFilterDiff, opts: diffs },
                      { label: "Safety", val: filterTox, set: setFilterTox, opts: ["All", "Pet Safe", "Toxic to Pets", "Toxic to Both"] },
                      { label: "Sort", val: sortBy, set: setSortBy, opts: [["name", "Name A–Z"], ["difficulty", "Easiest first"]], isTuple: true },
                    ].map(f => (
                      <div key={f.label} style={{ display: "flex", alignItems: "center", gap: 6, flex: "1 1 130px" }}>
                        <span style={{ fontSize: 11, color: "var(--ink3)", fontWeight: 500, whiteSpace: "nowrap" }}>{f.label}</span>
                        <select value={f.val} onChange={e => f.set(e.target.value)}
                          style={{ flex: 1, padding: "5px 8px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", fontSize: 12, color: "var(--ink)", cursor: "pointer" }}>
                          {f.isTuple ? f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>) : f.opts.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink3)" }}>
                    {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                    {compareList.length > 0 && <span style={{ color: "var(--accent)", fontWeight: 500, marginLeft: 10 }}>· {compareList.length}/3 in compare</span>}
                  </div>
                </div>

                {layout === "grid" ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(268px,1fr))", gap: 12 }}>
                    {filtered.map(p => <PlantCard key={p.id} plant={p} onOpen={openPlant} onWish={toggleWish} onCompare={toggleCompare} wished={isWished(p.id)} compared={isCompared(p.id)} />)}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filtered.map(p => <PlantRow key={p.id} plant={p} onOpen={openPlant} onWish={toggleWish} onCompare={toggleCompare} wished={isWished(p.id)} compared={isCompared(p.id)} />)}
                  </div>
                )}

                {filtered.length === 0 && (
                  <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--ink3)" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🌾</div>
                    <div className="wm" style={{ fontSize: 20, color: "var(--ink2)", marginBottom: 6 }}>Nothing found</div>
                    <div style={{ fontSize: 13 }}>Try adjusting your filters</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {view === "detail" && selected && (
          <PlantDetail plant={selected} onBack={() => setView("catalog")} onWish={toggleWish} onCompare={toggleCompare} wished={isWished(selected.id)} compared={isCompared(selected.id)} activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {view === "compare" && (
          <CompareView plants={compareList} onRemove={id => setCompareList(compareList.filter(p => p.id !== id))} onOpen={openPlant} allPlants={plants} onAdd={p => { if (compareList.length < 3) setCompareList([...compareList, p]); }} />
        )}

        {view === "wishlist" && (
          <WishlistView plants={wishlist} onOpen={openPlant} onRemove={id => setWishlist(wishlist.filter(p => p.id !== id))} />
        )}
      </main>
    </div>
  );
}

function RarityBadge({ rarity }) {
  const c = RARITY_CONFIG[rarity] || RARITY_CONFIG["Common"];
  const isRare = ["Rare", "Very Rare", "Extremely Rare"].includes(rarity);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 9px", borderRadius: 99, background: c.bg, color: c.color, fontSize: 10, fontWeight: 600, border: `1px solid ${c.color}22` }}>
      {isRare && <Icon n="sparkle" s={8} />}{rarity}
    </span>
  );
}

function PlantCard({ plant, onOpen, onWish, onCompare, wished, compared }) {
  const dc = DIFF_CONFIG[plant.difficulty] || DIFF_CONFIG["Easy"];
  return (
    <div className="lift" onClick={() => onOpen(plant)}
      style={{ background: "var(--surface)", border: `1.5px solid ${compared ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", overflow: "hidden", boxShadow: compared ? "0 0 0 3px var(--accent-bg)" : "var(--shadow)", position: "relative" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${dc.dot},${dc.dot}44)` }} />
      <div style={{ padding: "14px 14px 12px" }}>
        <div style={{ position: "absolute", top: 14, right: 12, display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
          <button className="btn" onClick={() => onWish(plant)}
            style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: wished ? "var(--red-bg)" : "var(--surface2)", border: `1px solid ${wished ? "var(--red)" : "var(--border)"}`, color: wished ? "var(--red)" : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="heart" s={12} />
          </button>
          <button className="btn" onClick={() => onCompare(plant)}
            style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: compared ? "var(--accent-bg)" : "var(--surface2)", border: `1px solid ${compared ? "var(--accent)" : "var(--border)"}`, color: compared ? "var(--accent)" : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="compare" s={12} />
          </button>
        </div>
        <div style={{ fontSize: 34, marginBottom: 8, lineHeight: 1 }}>{plant.emoji}</div>
        <div className="wm" style={{ fontSize: 18, fontWeight: 400, color: "var(--ink)", marginBottom: 1, letterSpacing: "-0.02em" }}>{plant.common_name}</div>
        <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)", marginBottom: 10 }}>{plant.scientific_name}</div>
        <p style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.55, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontWeight: 300 }}>{plant.description}</p>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          {[{ i: "sun", v: plant.sunlight }, { i: "drop", v: plant.watering }].map(s => (
            <span key={s.i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 11, color: "var(--ink2)" }}>
              <Icon n={s.i} s={10} />{s.v}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: dc.color, fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dc.dot, display: "inline-block" }} />
            {plant.difficulty}
          </span>
          {plant.toxicity === "Pet Safe" && <span style={{ fontSize: 11, color: "var(--accent2)", background: "var(--accent-bg)", padding: "1px 7px", borderRadius: 99, fontWeight: 500 }}>🐾 Pet safe</span>}
          {plant.rare && <span style={{ fontSize: 11, color: "#8a2a2a", background: "#faeaea", padding: "1px 7px", borderRadius: 99, fontWeight: 500 }}>✦ Rare</span>}
        </div>
      </div>
    </div>
  );
}

function PlantRow({ plant, onOpen, onWish, onCompare, wished, compared }) {
  const dc = DIFF_CONFIG[plant.difficulty] || DIFF_CONFIG["Easy"];
  return (
    <div className="lift" onClick={() => onOpen(plant)}
      style={{ background: "var(--surface)", border: `1.5px solid ${compared ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow)" }}>
      <div style={{ fontSize: 28, minWidth: 36 }}>{plant.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="wm" style={{ fontWeight: 400, fontSize: 15, letterSpacing: "-0.01em" }}>{plant.common_name}</span>
        <span style={{ fontStyle: "italic", fontSize: 12, color: "var(--ink3)", marginLeft: 8 }}>{plant.scientific_name}</span>
        <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>{plant.category}</span>
          <span style={{ fontSize: 11, color: dc.color, fontWeight: 500 }}>● {plant.difficulty}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5 }} onClick={e => e.stopPropagation()}>
        <button className="btn" onClick={() => onWish(plant)}
          style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: wished ? "var(--red-bg)" : "var(--surface2)", border: `1px solid ${wished ? "var(--red)" : "var(--border)"}`, color: wished ? "var(--red)" : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="heart" s={13} />
        </button>
        <button className="btn" onClick={() => onCompare(plant)}
          style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: compared ? "var(--accent-bg)" : "var(--surface2)", border: `1px solid ${compared ? "var(--accent)" : "var(--border)"}`, color: compared ? "var(--accent)" : "var(--ink3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="compare" s={13} />
        </button>
      </div>
    </div>
  );
}

function PlantDetail({ plant, onBack, onWish, onCompare, wished, compared, activeTab, setActiveTab }) {
  const [varieties, setVarieties] = useState([]);
  const [loadingVars, setLoadingVars] = useState(true);
  const dc = DIFF_CONFIG[plant.difficulty] || DIFF_CONFIG["Easy"];

  useEffect(() => {
    async function loadVarieties() {
      try {
        const vars = await query("varieties", {
          filter: `plant_id=eq.${plant.id}`,
          select: "id,name,rarity,description,special_traits"
        });
        const withPrices = await Promise.all((vars || []).map(async v => {
          try {
            const prices = await query("prices", {
              select: "price_usd,in_stock,retailer_id,retailers(name)",
              filter: `variety_id=eq.${v.id}`,
            });
            return { ...v, prices: prices || [] };
          } catch { return { ...v, prices: [] }; }
        }));
        setVarieties(withPrices);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingVars(false);
      }
    }
    loadVarieties();
  }, [plant.id]);

  const allLocations = [...new Set(varieties.flatMap(v => v.prices.map(p => p.retailers?.name).filter(Boolean)))].sort();

  return (
    <div className="fade">
      <button className="btn" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
        <Icon n="back" s={15} /> Back to catalog
      </button>

      <div className="hero" style={{ borderRadius: "var(--radius)", padding: "24px 20px", marginBottom: 12, position: "relative", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        <div style={{ position: "absolute", right: -10, top: -20, fontSize: 130, opacity: 0.07, pointerEvents: "none" }}>{plant.emoji}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 46, marginBottom: 8, lineHeight: 1 }}>{plant.emoji}</div>
            <h1 className="wm" style={{ fontSize: 28, fontWeight: 400, color: "#fff", letterSpacing: "-0.03em", marginBottom: 3 }}>{plant.common_name}</h1>
            <div style={{ fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>{plant.scientific_name}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 99, padding: "3px 10px", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{plant.category}</span>
              <span style={{ background: `${dc.dot}33`, border: `1px solid ${dc.dot}55`, borderRadius: 99, padding: "3px 10px", fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{plant.difficulty}</span>
              <span style={{ background: plant.toxicity === "Pet Safe" ? "rgba(82,183,136,0.2)" : "rgba(193,57,43,0.2)", border: `1px solid ${plant.toxicity === "Pet Safe" ? "rgba(82,183,136,0.4)" : "rgba(193,57,43,0.4)"}`, borderRadius: 99, padding: "3px 10px", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                {plant.toxicity === "Pet Safe" ? "🐾 Pet Safe" : "⚠️ " + plant.toxicity}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <button className="btn" onClick={() => onWish(plant)} style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: wished ? "rgba(193,57,43,0.3)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="heart" s={16} />
            </button>
            <button className="btn" onClick={() => onCompare(plant)} style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: compared ? "rgba(82,183,136,0.3)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="compare" s={16} />
            </button>
          </div>
        </div>
        <p style={{ marginTop: 16, fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, maxWidth: 540, fontWeight: 300 }}>{plant.description}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
        {[{ i: "sun", l: "Light", v: plant.sunlight }, { i: "drop", l: "Water", v: plant.watering }, { i: "leaf", l: "Type", v: plant.category }].map(s => (
          <div key={s.l} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 12, textAlign: "center", boxShadow: "var(--shadow)" }}>
            <div style={{ color: "var(--accent)", marginBottom: 5 }}><Icon n={s.i} s={18} /></div>
            <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{s.v || "—"}</div>
          </div>
        ))}
      </div>

      {plant.tags?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {plant.tags.map(t => <span key={t} style={{ display: "inline-block", margin: "2px", padding: "3px 9px", borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11, color: "var(--ink3)" }}>#{t}</span>)}
        </div>
      )}

      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 14, display: "flex" }}>
        {[["varieties", "Varieties"], ["locations", "Where to Buy"], ["traits", "Plant Traits"]].map(([id, label]) => (
          <button key={id} className={`tab ${activeTab === id ? "on" : ""}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === "varieties" && (
        <div className="fade">
          {loadingVars ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)" }}>
              <div style={{ width: 24, height: 24, border: "2px solid var(--border2)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
              Loading varieties…
            </div>
          ) : varieties.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>No varieties in database yet — more coming soon.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {varieties.map((v, i) => {
                const minPrice = v.prices.length ? Math.min(...v.prices.map(p => p.price_usd || 999)) : null;
                const inStock = v.prices.some(p => p.in_stock);
                return (
                  <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px", boxShadow: "var(--shadow)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 4 }}>{v.name}</div>
                        <RarityBadge rarity={v.rarity} />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {minPrice ? <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>${minPrice}</div> : <div style={{ fontSize: 12, color: "var(--ink3)" }}>Price TBA</div>}
                        <div style={{ fontSize: 11, color: inStock ? "var(--accent2)" : "var(--ink3)", fontWeight: 500 }}>
                          {v.prices.length ? (inStock ? "● In Stock" : "○ Out of Stock") : "No price data"}
                        </div>
                      </div>
                    </div>
                    {v.description && <p style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 300, lineHeight: 1.5, marginBottom: 8 }}>{v.description}</p>}
                    {v.prices.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        <Icon n="map" s={11} />
                        {v.prices.map((p, pi) => p.retailers?.name && (
                          <span key={pi} onClick={() => window.open(RETAILER_LINKS[p.retailers.name] || `https://www.google.com/search?q=${encodeURIComponent(p.retailers.name + ' ' + plant.common_name)}`, '_blank')}
                            style={{ fontSize: 11, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}>
                            {p.retailers.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "locations" && (
        <div className="fade">
          {allLocations.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--ink3)", fontSize: 13 }}>No retailer data yet for this plant.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
              {allLocations.map(loc => {
                const avail = varieties.filter(v => v.prices.some(p => p.retailers?.name === loc));
                const inStock = avail.filter(v => v.prices.some(p => p.retailers?.name === loc && p.in_stock));
                return (
                  <div key={loc} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 12, boxShadow: "var(--shadow)" }}>
                    <div onClick={() => window.open(RETAILER_LINKS[loc] || `https://www.google.com/search?q=${encodeURIComponent(loc)}`, '_blank')}
                      style={{ fontWeight: 600, fontSize: 13, color: "var(--accent)", marginBottom: 3, cursor: "pointer", textDecoration: "underline" }}>{loc}</div>
                    <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>{avail.length} variet{avail.length === 1 ? "y" : "ies"} · {inStock.length} in stock</div>
                    {avail.map(v => {
                      const pr = v.prices.find(p => p.retailers?.name === loc);
                      return (
                        <div key={v.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderTop: "1px solid var(--border)" }}>
                          <span style={{ color: "var(--ink2)", fontWeight: 300 }}>{v.name}</span>
                          <span style={{ fontWeight: 600, color: pr?.in_stock ? "var(--accent)" : "var(--ink3)" }}>{pr?.price_usd ? `$${pr.price_usd}` : "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "traits" && (
        <div className="fade" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 16, boxShadow: "var(--shadow)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
            {[
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
            ].map(t => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--radius-sm)", background: t.val ? "var(--accent-bg)" : "var(--surface2)", border: `1px solid ${t.val ? "var(--accent2)" : "var(--border)"}` }}>
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: t.val ? "var(--accent)" : "var(--ink3)" }}>{t.label}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: t.val ? "var(--accent2)" : "var(--ink3)" }}>{t.val ? "Yes" : "No"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CompareView({ plants, onRemove, onOpen, allPlants, onAdd }) {
  const [q, setQ] = useState("");
  const sugg = allPlants.filter(p => !plants.find(c => c.id === p.id) && p.common_name?.toLowerCase().includes(q.toLowerCase())).slice(0, 5);

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
    { label: "Difficulty", fn: p => { const dc = DIFF_CONFIG[p.difficulty] || DIFF_CONFIG["Easy"]; return <span style={{ color: dc.color, fontWeight: 600 }}>{p.difficulty}</span>; } },
    { label: "Light", fn: p => p.sunlight },
    { label: "Water", fn: p => p.watering },
    { label: "Toxicity", fn: p => <span style={{ color: p.toxicity === "Pet Safe" ? "var(--accent)" : "var(--red)", fontWeight: 500 }}>{p.toxicity}</span> },
    { label: "Air Purifying", fn: p => p.air_purifying ? "✓ Yes" : "—" },
    { label: "Low Light", fn: p => p.low_light ? "✓ Yes" : "—" },
    { label: "Pet Safe", fn: p => p.toxicity === "Pet Safe" ? "✓ Yes" : "✗ No" },
    { label: "Rare", fn: p => p.rare ? "✦ Yes" : "—" },
  ];

  return (
    <div className="fade">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="wm" style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.02em" }}>Compare</h2>
        {plants.length < 3 && (
          <div style={{ position: "relative" }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Add plant…"
              style={{ padding: "7px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", fontSize: 13, color: "var(--ink)", width: 160 }} />
            {q && sugg.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)", zIndex: 50, minWidth: 200 }}>
                {sugg.map(p => (
                  <div key={p.id} onClick={() => { onAdd(p); setQ(""); }}
                    style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {p.emoji} {p.common_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ overflowX: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--surface2)" }}>
              <th style={{ padding: "10px 14px", width: 100, textAlign: "left", fontSize: 11, color: "var(--ink3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}></th>
              {plants.map(p => (
                <th key={p.id} style={{ padding: "12px 14px", textAlign: "left", borderLeft: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div onClick={() => onOpen(p)} style={{ cursor: "pointer" }}>
                      <div style={{ fontSize: 24 }}>{p.emoji}</div>
                      <div className="wm" style={{ fontSize: 13, fontWeight: 400, color: "var(--ink)" }}>{p.common_name}</div>
                    </div>
                    <button className="btn" onClick={() => onRemove(p.id)} style={{ color: "var(--red)" }}><Icon n="x" s={13} /></button>
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

function WishlistView({ plants, onOpen, onRemove }) {
  if (plants.length === 0) return (
    <div className="fade" style={{ textAlign: "center", padding: "72px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌱</div>
      <div className="wm" style={{ fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>Your collection is empty</div>
      <p style={{ fontSize: 14, color: "var(--ink3)", fontWeight: 300 }}>Tap the heart on any plant to save it here.</p>
    </div>
  );
  return (
    <div className="fade">
      <h2 className="wm" style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.02em", marginBottom: 16 }}>Saved Plants</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {plants.map(p => (
          <div key={p.id} className="lift" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, boxShadow: "var(--shadow)", position: "relative", cursor: "pointer" }} onClick={() => onOpen(p)}>
            <button className="btn" onClick={e => { e.stopPropagation(); onRemove(p.id); }}
              style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 6, background: "var(--red-bg)", border: "1px solid #f0cccc", color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="x" s={12} />
            </button>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{p.emoji}</div>
            <div className="wm" style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 2 }}>{p.common_name}</div>
            <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)", marginBottom: 10 }}>{p.scientific_name}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {p.tags?.slice(0, 3).map(t => <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--ink3)" }}>#{t}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
