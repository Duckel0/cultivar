import { useState, useMemo, useEffect } from "react";

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const PLANTS = [
  {
    id: 1, name: "Monstera", species: "Monstera deliciosa", family: "Araceae",
    emoji: "🌿", type: "Tropical", sunlight: "Bright Indirect", water: "Weekly",
    difficulty: "Easy", toxicity: "Toxic to pets",
    description: "The iconic split-leaf plant beloved for its dramatic, fenestrated foliage. A statement piece in any interior jungle.",
    tags: ["indoor","tropical","statement","fenestrated"],
    varieties: [
      { name: "Thai Constellation", rarity: "Rare", avgPrice: 120, locations: ["Etsy","Steve's Leaves","Logee's"], inStock: true },
      { name: "Albo Variegata", rarity: "Very Rare", avgPrice: 350, locations: ["Etsy","Rare Rootz"], inStock: false },
      { name: "Deliciosa (standard)", rarity: "Common", avgPrice: 18, locations: ["Home Depot","IKEA","Lowe's","Walmart"], inStock: true },
      { name: "Adansonii", rarity: "Uncommon", avgPrice: 22, locations: ["Trader Joe's","Etsy","Local Nurseries"], inStock: true },
      { name: "Aurea", rarity: "Very Rare", avgPrice: 420, locations: ["Etsy"], inStock: false },
      { name: "Obliqua", rarity: "Extremely Rare", avgPrice: 900, locations: ["Specialty Collectors"], inStock: false },
    ],
  },
  {
    id: 2, name: "Philodendron", species: "Philodendron hederaceum", family: "Araceae",
    emoji: "🍃", type: "Tropical", sunlight: "Low to Bright Indirect", water: "Every 1–2 weeks",
    difficulty: "Very Easy", toxicity: "Toxic to pets",
    description: "The heartleaf philodendron — one of the most forgiving and prolific houseplants, trailing or climbing with glossy heart-shaped leaves.",
    tags: ["indoor","trailing","beginner-friendly","low-light"],
    varieties: [
      { name: "Heartleaf (standard)", rarity: "Common", avgPrice: 8, locations: ["IKEA","Walmart","Home Depot"], inStock: true },
      { name: "Brasil", rarity: "Uncommon", avgPrice: 18, locations: ["Etsy","Costa Farms"], inStock: true },
      { name: "Micans", rarity: "Uncommon", avgPrice: 22, locations: ["Etsy","Local Nurseries"], inStock: true },
      { name: "Lemon Lime", rarity: "Uncommon", avgPrice: 20, locations: ["Home Depot","Etsy"], inStock: true },
      { name: "Pink Princess", rarity: "Rare", avgPrice: 85, locations: ["Etsy","Rare Rootz"], inStock: true },
    ],
  },
  {
    id: 3, name: "Pothos", species: "Epipremnum aureum", family: "Araceae",
    emoji: "🍀", type: "Trailing Vine", sunlight: "Low to Bright", water: "Every 1–2 weeks",
    difficulty: "Very Easy", toxicity: "Toxic to pets",
    description: "The indestructible, cascading vine that thrives on neglect. Perfect for beginners and dark corners alike.",
    tags: ["indoor","trailing","beginner-friendly","low-light"],
    varieties: [
      { name: "Golden Pothos", rarity: "Common", avgPrice: 8, locations: ["Walmart","Home Depot","IKEA"], inStock: true },
      { name: "Marble Queen", rarity: "Common", avgPrice: 10, locations: ["Home Depot","Etsy"], inStock: true },
      { name: "Neon", rarity: "Uncommon", avgPrice: 14, locations: ["Home Depot","Etsy"], inStock: true },
      { name: "Cebu Blue", rarity: "Uncommon", avgPrice: 18, locations: ["Etsy"], inStock: true },
      { name: "Manjula", rarity: "Rare", avgPrice: 35, locations: ["Etsy","Rare Rootz"], inStock: false },
      { name: "Baltic Blue", rarity: "Uncommon", avgPrice: 22, locations: ["Etsy","Costa Farms"], inStock: true },
    ],
  },
  {
    id: 4, name: "Alocasia", species: "Alocasia amazonica", family: "Araceae",
    emoji: "🖤", type: "Tropical", sunlight: "Bright Indirect", water: "Weekly",
    difficulty: "Hard", toxicity: "Toxic to pets",
    description: "Jewel-toned leaves with metallic sheens and dramatic silver veining. The genus of drama queens — rewarding but demanding.",
    tags: ["indoor","tropical","statement","rare"],
    varieties: [
      { name: "Polly", rarity: "Common", avgPrice: 18, locations: ["IKEA","Trader Joe's"], inStock: true },
      { name: "Black Velvet", rarity: "Uncommon", avgPrice: 40, locations: ["Etsy","Logee's"], inStock: true },
      { name: "Dragon Scale", rarity: "Rare", avgPrice: 75, locations: ["Etsy","Rare Rootz"], inStock: true },
      { name: "Silver Dragon", rarity: "Rare", avgPrice: 85, locations: ["Etsy"], inStock: false },
      { name: "Cuprea", rarity: "Rare", avgPrice: 90, locations: ["Etsy","Steve's Leaves"], inStock: true },
      { name: "Macrorrhiza Variegata", rarity: "Very Rare", avgPrice: 280, locations: ["Etsy"], inStock: false },
    ],
  },
  {
    id: 5, name: "Hoya", species: "Hoya carnosa", family: "Apocynaceae",
    emoji: "🌺", type: "Trailing", sunlight: "Bright Indirect", water: "Every 2 weeks",
    difficulty: "Easy", toxicity: "Pet safe",
    description: "Waxy, succulent-like leaves and intoxicatingly fragrant porcelain-star flower clusters. 500+ species make this a collector's rabbit hole.",
    tags: ["indoor","trailing","fragrant","flowering","pet-safe"],
    varieties: [
      { name: "Carnosa", rarity: "Common", avgPrice: 12, locations: ["Home Depot","IKEA"], inStock: true },
      { name: "Krimson Queen", rarity: "Common", avgPrice: 18, locations: ["Etsy","Costa Farms"], inStock: true },
      { name: "Linearis", rarity: "Uncommon", avgPrice: 28, locations: ["Etsy","Logee's"], inStock: true },
      { name: "Kerrii", rarity: "Common", avgPrice: 10, locations: ["Trader Joe's","IKEA"], inStock: true },
      { name: "Mathildae", rarity: "Rare", avgPrice: 65, locations: ["Etsy"], inStock: false },
    ],
  },
  {
    id: 6, name: "Snake Plant", species: "Dracaena trifasciata", family: "Asparagaceae",
    emoji: "⚔️", type: "Succulent-like", sunlight: "Low to Bright", water: "Monthly",
    difficulty: "Very Easy", toxicity: "Toxic to pets",
    description: "Architectural perfection. Converts CO₂ to oxygen at night and thrives on total neglect.",
    tags: ["indoor","architectural","beginner-friendly","drought-tolerant"],
    varieties: [
      { name: "Laurentii", rarity: "Common", avgPrice: 15, locations: ["IKEA","Walmart","Home Depot"], inStock: true },
      { name: "Moonshine", rarity: "Uncommon", avgPrice: 22, locations: ["Home Depot","Etsy"], inStock: true },
      { name: "Black Gold", rarity: "Rare", avgPrice: 65, locations: ["Etsy","Logee's"], inStock: false },
      { name: "Bantel's Sensation", rarity: "Rare", avgPrice: 55, locations: ["Etsy"], inStock: true },
    ],
  },
  {
    id: 7, name: "Echeveria", species: "Echeveria elegans", family: "Crassulaceae",
    emoji: "🌹", type: "Succulent", sunlight: "Full Sun", water: "Every 2–3 weeks",
    difficulty: "Easy", toxicity: "Pet safe",
    description: "Rose-like rosettes in hundreds of colors from powder blue to deep burgundy. The queen of succulents.",
    tags: ["succulent","outdoor","colorful","drought-tolerant","pet-safe"],
    varieties: [
      { name: "Elegans", rarity: "Common", avgPrice: 6, locations: ["Home Depot","Walmart","Lowe's"], inStock: true },
      { name: "Black Prince", rarity: "Uncommon", avgPrice: 12, locations: ["Etsy","Leaf & Clay"], inStock: true },
      { name: "Perle von Nürnberg", rarity: "Common", avgPrice: 9, locations: ["Home Depot","Etsy"], inStock: true },
      { name: "Afterglow", rarity: "Uncommon", avgPrice: 15, locations: ["Etsy","Mountain Crest Gardens"], inStock: true },
    ],
  },
  {
    id: 8, name: "Venus Flytrap", species: "Dionaea muscipula", family: "Droseraceae",
    emoji: "🪤", type: "Carnivorous", sunlight: "Full Sun", water: "Distilled only",
    difficulty: "Moderate", toxicity: "Pet safe",
    description: "Nature's most theatrical predator. Each snapping trap is a marvel of evolutionary engineering.",
    tags: ["carnivorous","indoor","outdoor","novelty"],
    varieties: [
      { name: "Classic", rarity: "Common", avgPrice: 7, locations: ["Home Depot","Lowe's"], inStock: true },
      { name: "B52 Giant", rarity: "Uncommon", avgPrice: 22, locations: ["Etsy","California Carnivores"], inStock: true },
      { name: "Red Dragon", rarity: "Uncommon", avgPrice: 18, locations: ["Etsy","Predatory Plants"], inStock: true },
      { name: "Alien", rarity: "Rare", avgPrice: 45, locations: ["California Carnivores"], inStock: false },
    ],
  },
  {
    id: 9, name: "Anthurium", species: "Anthurium andraeanum", family: "Araceae",
    emoji: "❤️", type: "Tropical", sunlight: "Bright Indirect", water: "Weekly",
    difficulty: "Moderate", toxicity: "Toxic to pets",
    description: "Lacquered heart-shaped spathes in red, pink, white, and black. From common grocery store finds to the rarest collector obsessions.",
    tags: ["indoor","tropical","flowering","statement"],
    varieties: [
      { name: "Red Standard", rarity: "Common", avgPrice: 14, locations: ["Trader Joe's","IKEA","Home Depot"], inStock: true },
      { name: "Crystallinum", rarity: "Rare", avgPrice: 75, locations: ["Etsy","Logee's"], inStock: true },
      { name: "Clarinervium", rarity: "Rare", avgPrice: 85, locations: ["Etsy"], inStock: true },
      { name: "Veitchii (King)", rarity: "Very Rare", avgPrice: 250, locations: ["Etsy","Rare Rootz"], inStock: false },
      { name: "Warocqueanum (Queen)", rarity: "Very Rare", avgPrice: 300, locations: ["Etsy"], inStock: false },
    ],
  },
  {
    id: 10, name: "Calathea", species: "Calathea orbifolia", family: "Marantaceae",
    emoji: "🌀", type: "Houseplant", sunlight: "Low to Indirect", water: "Weekly (distilled)",
    difficulty: "Hard", toxicity: "Pet safe",
    description: "Living art. Calatheas fold their leaves up at night and open in the morning — earning the nickname 'prayer plants.'",
    tags: ["indoor","pet-safe","patterned","low-light"],
    varieties: [
      { name: "Orbifolia", rarity: "Uncommon", avgPrice: 22, locations: ["Etsy","Costa Farms"], inStock: true },
      { name: "White Fusion", rarity: "Rare", avgPrice: 55, locations: ["Etsy"], inStock: true },
      { name: "Medallion", rarity: "Common", avgPrice: 16, locations: ["Home Depot","IKEA"], inStock: true },
      { name: "Musaica (Network)", rarity: "Rare", avgPrice: 48, locations: ["Etsy","Pistils Nursery"], inStock: false },
    ],
  },
];

const RETAILER_LINKS = {
  "Amazon": "https://www.amazon.com/s?k=houseplants&tag=thecultivar-20",
  "Home Depot": "https://www.homedepot.com/s/houseplants",
  "Etsy": "https://www.etsy.com/search?q=houseplants",
  "Lowe's": "https://www.lowes.com/search?searchTerm=houseplants",
  "Walmart": "https://www.walmart.com/search?q=houseplants",
  "IKEA": "https://www.ikea.com/us/en/search/?q=plants",
  "Trader Joe's": "https://www.traderjoes.com",
  "Costa Farms": "https://costafarms.com",
  "Etsy Rare": "https://www.etsy.com/search?q=rare+houseplants&tag=thecultivar-20",
  "Rare Rootz": "https://rarerootz.com",
  "Logee's": "https://logees.com",
  "California Carnivores": "https://californiacarnivores.com",
};const RARITY_CONFIG = {
  "Common":         { color: "#5a8a3c", bg: "#edf5e8", label: "Common" },
  "Uncommon":       { color: "#2a7a6a", bg: "#e4f5f2", label: "Uncommon" },
  "Rare":           { color: "#5a3a8a", bg: "#f0ecfa", label: "Rare" },
  "Very Rare":      { color: "#8a2a2a", bg: "#faeaea", label: "Very Rare" },
  "Extremely Rare": { color: "#1a1a1a", bg: "#f0f0f0", label: "Legendary" },
};

const DIFF_CONFIG = {
  "Very Easy": { color: "#3d7a2a", dot: "#5aaa3c" },
  "Easy":      { color: "#5a8a3c", dot: "#7ac44a" },
  "Moderate":  { color: "#8a6a1a", dot: "#c49a2a" },
  "Hard":      { color: "#8a2a2a", dot: "#c44a3c" },
  "Expert":    { color: "#1a1a2a", dot: "#3a3a5a" },
};

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ n, s = 16 }) => {
  const d = {
    search: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
    leaf:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
    sun:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>,
    drop:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>,
    heart:  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
    compare:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
    grid:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    list:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    back:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="15 18 9 12 15 6"/></svg>,
    x:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    map:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    sort:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="9" y1="18" x2="15" y2="18"/></svg>,
    sparkle:<svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  };
  return d[n] || null;
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function Cultivar() {
  const [view, setView] = useState("catalog");   const [dbPlants, setDbPlants] = useState([]);   const displayPlants = dbPlants.length > 0 ? dbPlants : PLANTS;
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterDiff, setFilterDiff] = useState("All");
  const [filterTox, setFilterTox] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [layout, setLayout] = useState("grid");
  const [compareList, setCompareList] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [activeTab, setActiveTab] = useState("varieties");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const types = ["All", ...Array.from(new Set(PLANTS.map(p => p.type)))];
  const diffs = ["All", "Very Easy", "Easy", "Moderate", "Hard"];

  const filtered = useMemo(() => {
    let list = displayPlants.filter(p => {
      const q = search.toLowerCase();
      const ms = !q || p.name.toLowerCase().includes(q) || p.species.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
      const mt = filterType === "All" || p.type === filterType;
      const md = filterDiff === "All" || p.difficulty === filterDiff;
      const mx = filterTox === "All" || p.toxicity === filterTox;
      return ms && mt && md && mx;
    });
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "difficulty") return diffs.indexOf(a.difficulty) - diffs.indexOf(b.difficulty);
      if (sortBy === "varieties") return b.varieties.length - a.varieties.length;
      if (sortBy === "price") return Math.min(...a.varieties.map(v => v.avgPrice)) - Math.min(...b.varieties.map(v => v.avgPrice));
      return 0;
    });
  // eslint-disable-next-line
}, [search, filterType, filterDiff, filterTox, sortBy]);

  const toggleCompare = (p) => {
    if (compareList.find(c => c.id === p.id)) setCompareList(compareList.filter(c => c.id !== p.id));
    else if (compareList.length < 3) setCompareList([...compareList, p]);
  };
  const toggleWish = (p) => {
    if (wishlist.find(w => w.id === p.id)) setWishlist(wishlist.filter(w => w.id !== p.id));
    else setWishlist([...wishlist, p]);
  };
  const isWished = id => wishlist.some(w => w.id === id);
  const isCompared = id => compareList.some(c => c.id === id);
  const openPlant = p => { setSelected(p); setView("detail"); setActiveTab("varieties"); };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "var(--bg)", minHeight: "100vh", color: "var(--ink)", opacity: loaded ? 1 : 0, transition: "opacity 0.4s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,300;1,9..144,400&display=swap');

        :root {
          --bg: #f7f5f0;
          --surface: #ffffff;
          --surface2: #f2efe9;
          --border: #e2ddd6;
          --border2: #cec9c0;
          --ink: #1a1814;
          --ink2: #6b6560;
          --ink3: #9b958e;
          --accent: #2d6a4f;
          --accent2: #52b788;
          --accent-bg: #e8f5ee;
          --gold: #c9a84c;
          --gold-bg: #fdf6e3;
          --red: #c1392b;
          --red-bg: #fdecea;
          --radius: 14px;
          --radius-sm: 8px;
          --shadow: 0 2px 16px rgba(26,24,20,0.08);
          --shadow-lg: 0 8px 40px rgba(26,24,20,0.14);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: var(--surface2); }
        ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 99px; }

        .hover-lift { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
        .hover-lift:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg) !important; }

        .btn { cursor: pointer; border: none; background: transparent; transition: all 0.15s ease; font-family: 'DM Sans', sans-serif; }
        .btn:active { transform: scale(0.96); }

        .nav-pill { padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 500; transition: all 0.18s ease; cursor: pointer; border: 1.5px solid transparent; }
        .nav-pill:hover { background: rgba(255,255,255,0.12); }
        .nav-pill.active { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.3); }

        .fade-up { animation: fadeUp 0.35s ease forwards; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .stagger-1 { animation-delay: 0.05s; opacity: 0; }
        .stagger-2 { animation-delay: 0.1s; opacity: 0; }
        .stagger-3 { animation-delay: 0.15s; opacity: 0; }

        .tab-btn { padding: 8px 16px; font-size: 13px; font-weight: 500; color: var(--ink3); cursor: pointer; border: none; background: transparent; border-bottom: 2px solid transparent; transition: all 0.15s; font-family: 'DM Sans', sans-serif; }
        .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
        .tab-btn:hover:not(.active) { color: var(--ink2); }

        input, select { font-family: 'DM Sans', sans-serif; }
        input:focus, select:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

        .chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 500; letter-spacing: 0.02em; }

        .wordmark { font-family: 'Fraunces', serif; font-optical-sizing: auto; }

        /* Subtle leaf pattern background */
        .hero-bg { background: linear-gradient(135deg, #0f2318 0%, #1a3a28 40%, #152e1f 100%); }
      `}</style>

      {/* ══════ HEADER ══════ */}
      <header className="hero-bg" style={{ position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.25)" }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 16px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setView("catalog")}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #52b788, #2d6a4f)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(82,183,136,0.4)" }}>
              <Icon n="leaf" s={16} />
            </div>
            <div>
              <span className="wordmark" style={{ fontSize: 20, fontWeight: 600, color: "#ffffff", letterSpacing: "-0.02em" }}>Cultivar</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 400, marginTop: -2 }}>Plant Intelligence</span>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", gap: 2 }}>
            {[
              { id: "catalog", label: "Catalog" },
              { id: "compare", label: compareList.length ? `Compare · ${compareList.length}` : "Compare" },
              { id: "wishlist", label: wishlist.length ? `Saved · ${wishlist.length}` : "Saved" },
            ].map(t => (
              <button key={t.id} className={`btn nav-pill ${view === t.id ? "active" : ""}`}
                onClick={() => setView(t.id)}
                style={{ color: view === t.id ? "#ffffff" : "rgba(255,255,255,0.55)" }}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "20px 16px 40px" }}>

        {/* ══════ CATALOG ══════ */}
        {view === "catalog" && (
          <div>
            {/* Hero line */}
            <div className="fade-up stagger-1" style={{ marginBottom: 20 }}>
              <h1 className="wordmark" style={{ fontSize: 32, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                The Plant <em style={{ fontStyle: "italic", color: "var(--accent)" }}>Intelligence</em> Database
              </h1>
              <p style={{ fontSize: 14, color: "var(--ink3)", marginTop: 5, fontWeight: 300 }}>
                {PLANTS.length} species · {PLANTS.reduce((s, p) => s + p.varieties.length, 0)} varieties · prices updated weekly
              </p>
            </div>

            {/* Search & Filters */}
            <div className="fade-up stagger-2" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 16, boxShadow: "var(--shadow)" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink3)", pointerEvents: "none" }}>
                    <Icon n="search" s={15} />
                  </span>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search species, tags, varieties…"
                    style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface2)", fontSize: 13, color: "var(--ink)" }} />
                </div>
                <button className="btn" onClick={() => setLayout(l => l === "grid" ? "list" : "grid")}
                  style={{ padding: "9px 13px", background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--ink2)" }}>
                  <Icon n={layout === "grid" ? "list" : "grid"} s={15} />
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Type", val: filterType, set: setFilterType, opts: types },
                  { label: "Difficulty", val: filterDiff, set: setFilterDiff, opts: diffs },
                  { label: "Safety", val: filterTox, set: setFilterTox, opts: ["All", "Pet safe", "Toxic to pets"] },
                  { label: "Sort by", val: sortBy, set: setSortBy, opts: [["name","Name"],["difficulty","Easiest first"],["varieties","Most varieties"],["price","Lowest price"]], isTuple: true },
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

              <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink3)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                {compareList.length > 0 && (
                  <span style={{ color: "var(--accent)", fontWeight: 500 }}>· {compareList.length}/3 queued for compare</span>
                )}
              </div>
            </div>

            {/* Grid */}
            {layout === "grid" ? (
              <div className="fade-up stagger-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(268px, 1fr))", gap: 12 }}>
                {filtered.map(p => <PlantCard key={p.id} plant={p} onOpen={openPlant} onWish={toggleWish} onCompare={toggleCompare} wished={isWished(p.id)} compared={isCompared(p.id)} />)}
              </div>
            ) : (
              <div className="fade-up stagger-3" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filtered.map(p => <PlantRow key={p.id} plant={p} onOpen={openPlant} onWish={toggleWish} onCompare={toggleCompare} wished={isWished(p.id)} compared={isCompared(p.id)} />)}
              </div>
            )}

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "64px 20px", color: "var(--ink3)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🌾</div>
                <div className="wordmark" style={{ fontSize: 20, color: "var(--ink2)", marginBottom: 6 }}>Nothing found</div>
                <div style={{ fontSize: 13 }}>Try adjusting your filters</div>
              </div>
            )}
          </div>
        )}

        {/* ══════ DETAIL ══════ */}
        {view === "detail" && selected && (
          <PlantDetail plant={selected} onBack={() => setView("catalog")} onWish={toggleWish} onCompare={toggleCompare} wished={isWished(selected.id)} compared={isCompared(selected.id)} activeTab={activeTab} setActiveTab={setActiveTab} />
        )}

        {/* ══════ COMPARE ══════ */}
        {view === "compare" && (
          <CompareView plants={compareList} onRemove={id => setCompareList(compareList.filter(p => p.id !== id))} onOpen={openPlant} allPlants={PLANTS} onAdd={p => { if (compareList.length < 3) setCompareList([...compareList, p]); }} />
        )}

        {/* ══════ WISHLIST ══════ */}
        {view === "wishlist" && (
          <WishlistView plants={wishlist} onOpen={openPlant} onRemove={id => setWishlist(wishlist.filter(p => p.id !== id))} />
        )}
      </main>
    </div>
  );
}

// ─── RARITY BADGE ─────────────────────────────────────────────────────────────
function RarityBadge({ rarity, size = "sm" }) {
  const c = RARITY_CONFIG[rarity] || RARITY_CONFIG["Common"];
  return (
    <span className="chip" style={{ background: c.bg, color: c.color, fontSize: size === "sm" ? 10 : 12, fontWeight: 600, border: `1px solid ${c.color}22` }}>
      {rarity === "Rare" || rarity === "Very Rare" || rarity === "Extremely Rare" ? <Icon n="sparkle" s={9} /> : null}
      {c.label}
    </span>
  );
}

// ─── PLANT CARD ───────────────────────────────────────────────────────────────
function PlantCard({ plant, onOpen, onWish, onCompare, wished, compared }) {
  const minP = Math.min(...plant.varieties.map(v => v.avgPrice));
  const maxP = Math.max(...plant.varieties.map(v => v.avgPrice));
  const inStock = plant.varieties.filter(v => v.inStock).length;
  const dc = DIFF_CONFIG[plant.difficulty] || DIFF_CONFIG["Easy"];

  return (
    <div className="hover-lift" onClick={() => onOpen(plant)}
      style={{ background: "var(--surface)", border: `1.5px solid ${compared ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", overflow: "hidden", boxShadow: compared ? "0 0 0 3px var(--accent-bg)" : "var(--shadow)", position: "relative" }}>

      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${dc.dot}, ${dc.dot}44)` }} />

      <div style={{ padding: "14px 14px 12px" }}>
        {/* Action buttons */}
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
        <div className="wordmark" style={{ fontSize: 18, fontWeight: 400, color: "var(--ink)", marginBottom: 1, letterSpacing: "-0.02em" }}>{plant.name}</div>
        <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)", marginBottom: 10 }}>{plant.species}</div>

        <p style={{ fontSize: 12, color: "var(--ink2)", lineHeight: 1.55, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontWeight: 300 }}>{plant.description}</p>

        {/* Care pills */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 11, color: "var(--ink2)" }}>
            <Icon n="sun" s={10} /> {plant.sunlight}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 99, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 11, color: "var(--ink2)" }}>
            <Icon n="drop" s={10} /> {plant.water}
          </span>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--ink3)", fontWeight: 500, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Price range</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--accent)" }}>${minP} – ${maxP}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--ink3)" }}>{plant.varieties.length} varieties</div>
            <div style={{ fontSize: 11, color: inStock > 0 ? "var(--accent)" : "var(--ink3)", fontWeight: inStock > 0 ? 500 : 400 }}>{inStock} in stock</div>
          </div>
        </div>

        <div style={{ marginTop: 8, display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: dc.color, fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: dc.dot, display: "inline-block" }} />
            {plant.difficulty}
          </span>
          {plant.toxicity === "Pet safe" && (
            <span style={{ fontSize: 11, color: "var(--accent2)", background: "var(--accent-bg)", padding: "1px 7px", borderRadius: 99, fontWeight: 500 }}>🐾 Pet safe</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PLANT ROW ────────────────────────────────────────────────────────────────
function PlantRow({ plant, onOpen, onWish, onCompare, wished, compared }) {
  const minP = Math.min(...plant.varieties.map(v => v.avgPrice));
  const dc = DIFF_CONFIG[plant.difficulty] || DIFF_CONFIG["Easy"];
  return (
    <div className="hover-lift" onClick={() => onOpen(plant)}
      style={{ background: "var(--surface)", border: `1.5px solid ${compared ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius-sm)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow)" }}>
      <div style={{ fontSize: 28, minWidth: 36 }}>{plant.emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="wordmark" style={{ fontWeight: 400, fontSize: 15, letterSpacing: "-0.01em" }}>{plant.name}</span>
        <span style={{ fontStyle: "italic", fontSize: 12, color: "var(--ink3)", marginLeft: 8 }}>{plant.species}</span>
        <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>{plant.type}</span>
          <span style={{ fontSize: 11, color: dc.color, fontWeight: 500 }}>● {plant.difficulty}</span>
          <span style={{ fontSize: 11, color: "var(--ink3)" }}>{plant.varieties.length} varieties</span>
        </div>
      </div>
      <div style={{ textAlign: "right", minWidth: 80 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)" }}>from ${minP}</div>
        <div style={{ fontSize: 11, color: "var(--ink3)" }}>{plant.toxicity === "Pet safe" ? "🐾 safe" : "⚠️ toxic"}</div>
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

// ─── PLANT DETAIL ─────────────────────────────────────────────────────────────
function PlantDetail({ plant, onBack, onWish, onCompare, wished, compared, activeTab, setActiveTab }) {
  const sorted = [...plant.varieties].sort((a, b) => a.avgPrice - b.avgPrice);
  const allLocs = [...new Set(plant.varieties.flatMap(v => v.locations))].sort();
  const dc = DIFF_CONFIG[plant.difficulty] || DIFF_CONFIG["Easy"];

  return (
    <div className="fade-up">
      <button className="btn" onClick={onBack}
        style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--accent)", fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
        <Icon n="back" s={15} /> Back to catalog
      </button>

      {/* Hero card */}
      <div className="hero-bg" style={{ borderRadius: "var(--radius)", padding: "24px 20px", marginBottom: 12, position: "relative", overflow: "hidden", boxShadow: "var(--shadow-lg)" }}>
        {/* BG emoji watermark */}
        <div style={{ position: "absolute", right: -10, top: -20, fontSize: 140, opacity: 0.07, pointerEvents: "none", lineHeight: 1 }}>{plant.emoji}</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 48, marginBottom: 8, lineHeight: 1 }}>{plant.emoji}</div>
            <h1 className="wordmark" style={{ fontSize: 30, fontWeight: 400, color: "#fff", letterSpacing: "-0.03em", marginBottom: 3 }}>{plant.name}</h1>
            <div style={{ fontSize: 13, fontStyle: "italic", color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>{plant.species} · {plant.family}</div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 99, padding: "3px 10px", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{plant.type}</span>
              <span style={{ background: `${dc.dot}33`, border: `1px solid ${dc.dot}55`, borderRadius: 99, padding: "3px 10px", fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>{plant.difficulty}</span>
              <span style={{ background: plant.toxicity === "Pet safe" ? "rgba(82,183,136,0.2)" : "rgba(193,57,43,0.2)", border: `1px solid ${plant.toxicity === "Pet safe" ? "rgba(82,183,136,0.4)" : "rgba(193,57,43,0.4)"}`, borderRadius: 99, padding: "3px 10px", fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                {plant.toxicity === "Pet safe" ? "🐾 Pet Safe" : "⚠️ Toxic to Pets"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
            <button className="btn" onClick={() => onWish(plant)}
              style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: wished ? "rgba(193,57,43,0.3)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="heart" s={16} />
            </button>
            <button className="btn" onClick={() => onCompare(plant)}
              style={{ width: 38, height: 38, borderRadius: "var(--radius-sm)", background: compared ? "rgba(82,183,136,0.3)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon n="compare" s={16} />
            </button>
          </div>
        </div>

        <p style={{ marginTop: 16, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, maxWidth: 540, fontWeight: 300 }}>{plant.description}</p>
      </div>

      {/* Care stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {[
          { icon: "sun", label: "Light", val: plant.sunlight },
          { icon: "drop", label: "Water", val: plant.water },
          { icon: "leaf", label: "Type", val: plant.type },
        ].map(s => (
          <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px", textAlign: "center", boxShadow: "var(--shadow)" }}>
            <div style={{ color: "var(--accent)", marginBottom: 5 }}><Icon n={s.icon} s={18} /></div>
            <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div style={{ marginBottom: 14 }}>
        {plant.tags.map(t => (
          <span key={t} style={{ display: "inline-block", margin: "2px", padding: "3px 9px", borderRadius: 99, background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11, color: "var(--ink3)" }}>#{t}</span>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--border)", marginBottom: 14, display: "flex" }}>
        {["varieties", "locations", "chart"].map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
            {t === "varieties" ? "Varieties & Prices" : t === "locations" ? "Where to Buy" : "Price Chart"}
          </button>
        ))}
      </div>

      {/* Varieties */}
      {activeTab === "varieties" && (
        <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((v, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px", boxShadow: "var(--shadow)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)", marginBottom: 4 }}>{v.name}</div>
                  <RarityBadge rarity={v.rarity} />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>${v.avgPrice}</div>
                  <div style={{ fontSize: 11, color: v.inStock ? "var(--accent2)" : "var(--red)", fontWeight: 500 }}>
                    {v.inStock ? "● In Stock" : "○ Out of Stock"}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <Icon n="map" s={11} />
                {v.locations.map(l => (
                  <span key={l} onClick={() => window.open(RETAILER_LINKS[l] || `https://www.google.com/search?q=${encodeURIComponent(l)}`, '_blank')} style={{ fontSize: 11, cursor:"pointer", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 8px", color: "var(--ink2)" }}>{l}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Locations */}
      {activeTab === "locations" && (
        <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 8 }}>
          {allLocs.map(loc => {
            const avail = plant.varieties.filter(v => v.locations.includes(loc));
            const inStock = avail.filter(v => v.inStock);
            return (
              <div key={loc} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px", boxShadow: "var(--shadow)" }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", marginBottom: 3 }}>{loc}</div>
                <div style={{ fontSize: 11, color: "var(--ink3)", marginBottom: 8 }}>{avail.length} variet{avail.length === 1 ? "y" : "ies"} · {inStock.length} in stock</div>
                {avail.map(v => (
                  <div key={v.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderTop: "1px solid var(--border)" }}>
                    <span style={{ color: "var(--ink2)", fontWeight: 300 }}>{v.name}</span>
                    <span style={{ fontWeight: 600, color: v.inStock ? "var(--accent)" : "var(--ink3)" }}>${v.avgPrice}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {activeTab === "chart" && (
        <div className="fade-up" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 16, boxShadow: "var(--shadow)" }}>
          <div style={{ fontSize: 12, color: "var(--ink3)", marginBottom: 16, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Avg. retail price by variety</div>
          {sorted.map((v, i) => {
            const maxP = Math.max(...plant.varieties.map(x => x.avgPrice));
            const pct = (v.avgPrice / maxP) * 100;
            // eslint-disable-next-line
	    const rc = RARITY_CONFIG[v.rarity] || RARITY_CONFIG["Common"];
            return (
              <div key={v.name} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 400 }}>{v.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>${v.avgPrice}</span>
                </div>
                <div style={{ background: "var(--surface2)", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, var(--accent2), var(--accent))`, borderRadius: 99, transition: "width 0.6s ease" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <RarityBadge rarity={v.rarity} />
                  <span style={{ fontSize: 10, color: v.inStock ? "var(--accent2)" : "var(--ink3)" }}>{v.inStock ? "In stock" : "Out of stock"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── COMPARE VIEW ─────────────────────────────────────────────────────────────
function CompareView({ plants, onRemove, onOpen, allPlants, onAdd }) {
  const [addQ, setAddQ] = useState("");
  const suggestions = allPlants.filter(p => !plants.find(c => c.id === p.id) && p.name.toLowerCase().includes(addQ.toLowerCase())).slice(0, 5);

  if (plants.length === 0) return (
    <div className="fade-up" style={{ textAlign: "center", padding: "72px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>
      <div className="wordmark" style={{ fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>No plants selected</div>
      <p style={{ fontSize: 14, color: "var(--ink3)", fontWeight: 300 }}>Tap the compare icon on up to 3 plants in the catalog.</p>
    </div>
  );

  const rows = [
    { label: "Species", fn: p => <em style={{ fontSize: 12 }}>{p.species}</em> },
    { label: "Family", fn: p => p.family },
    { label: "Type", fn: p => p.type },
    { label: "Difficulty", fn: p => { const dc = DIFF_CONFIG[p.difficulty]; return <span style={{ color: dc.color, fontWeight: 600 }}>{p.difficulty}</span>; }},
    { label: "Light", fn: p => p.sunlight },
    { label: "Water", fn: p => p.water },
    { label: "Toxicity", fn: p => <span style={{ color: p.toxicity === "Pet safe" ? "var(--accent)" : "var(--red)", fontWeight: 500 }}>{p.toxicity}</span> },
    { label: "Varieties", fn: p => `${p.varieties.length}` },
    { label: "From", fn: p => <span style={{ fontWeight: 700, color: "var(--accent)" }}>${Math.min(...p.varieties.map(v => v.avgPrice))}</span> },
    { label: "Up to", fn: p => `$${Math.max(...p.varieties.map(v => v.avgPrice))}` },
    { label: "In Stock", fn: p => `${p.varieties.filter(v => v.inStock).length}/${p.varieties.length}` },
  ];

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="wordmark" style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.02em" }}>Compare</h2>
        {plants.length < 3 && (
          <div style={{ position: "relative" }}>
            <input value={addQ} onChange={e => setAddQ(e.target.value)} placeholder="Add plant…"
              style={{ padding: "7px 12px", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface)", fontSize: 13, color: "var(--ink)", width: 160 }} />
            {addQ && suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-lg)", zIndex: 50, minWidth: 200 }}>
                {suggestions.map(p => (
                  <div key={p.id} onClick={() => { onAdd(p); setAddQ(""); }}
                    style={{ padding: "9px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--border)", transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {p.emoji} {p.name}
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
              <th style={{ padding: "10px 14px", width: 110, textAlign: "left", fontSize: 11, color: "var(--ink3)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}></th>
              {plants.map(p => (
                <th key={p.id} style={{ padding: "12px 14px", textAlign: "left", borderLeft: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div onClick={() => onOpen(p)} style={{ cursor: "pointer" }}>
                      <div style={{ fontSize: 26 }}>{p.emoji}</div>
                      <div className="wordmark" style={{ fontSize: 14, fontWeight: 400, color: "var(--ink)" }}>{p.name}</div>
                    </div>
                    <button className="btn" onClick={() => onRemove(p.id)} style={{ color: "var(--red)", padding: 4 }}>
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
                {plants.map(p => (
                  <td key={p.id} style={{ padding: "9px 14px", fontSize: 13, color: "var(--ink)", borderLeft: "1px solid var(--border)" }}>{row.fn(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── WISHLIST VIEW ────────────────────────────────────────────────────────────
function WishlistView({ plants, onOpen, onRemove }) {
  if (plants.length === 0) return (
    <div className="fade-up" style={{ textAlign: "center", padding: "72px 20px" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌱</div>
      <div className="wordmark" style={{ fontSize: 22, color: "var(--ink)", marginBottom: 8 }}>Your collection is empty</div>
      <p style={{ fontSize: 14, color: "var(--ink3)", fontWeight: 300 }}>Tap the heart on any plant to save it here.</p>
    </div>
  );

  const totalMin = plants.reduce((s, p) => s + Math.min(...p.varieties.map(v => v.avgPrice)), 0);

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="wordmark" style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.02em" }}>Saved Plants</h2>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 14px", boxShadow: "var(--shadow)", textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "var(--ink3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>Collection budget</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)", letterSpacing: "-0.02em" }}>~${totalMin}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {plants.map(p => {
          const minP = Math.min(...p.varieties.map(v => v.avgPrice));
          const inS = p.varieties.filter(v => v.inStock).length;
          return (
            <div key={p.id} className="hover-lift" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, boxShadow: "var(--shadow)", position: "relative", cursor: "pointer" }} onClick={() => onOpen(p)}>
              <button className="btn" onClick={e => { e.stopPropagation(); onRemove(p.id); }}
                style={{ position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: 6, background: "var(--red-bg)", border: "1px solid #f0cccc", color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon n="x" s={12} />
              </button>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{p.emoji}</div>
              <div className="wordmark" style={{ fontSize: 16, fontWeight: 400, letterSpacing: "-0.01em", marginBottom: 2 }}>{p.name}</div>
              <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--ink3)", marginBottom: 10 }}>{p.species}</div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>from ${minP}</span>
                <span style={{ fontSize: 12, color: inS > 0 ? "var(--accent2)" : "var(--ink3)" }}>{inS} in stock</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
