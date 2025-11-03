# 🎨 Project Plan: Generative Art & Design Exhibition Platform

**Status**: Active Development
**Last Updated**: November 3, 2025
**Vision**: Create a world-class experience that captures the magic of browsing a beautiful magazine, wandering through an art gallery, or discovering unexpected treasures in a museum gift shop.

---

## 🎯 Core Philosophy

### The Tension We're Solving
Traditional curation (Pinterest, Behance) shows you what algorithms *think* you want.
Our platform shows you what you *didn't know you wanted*.

**Key Principles**:
- ✨ **Surprise & Delight**: Unexpected discoveries every time
- 🎨 **Curatorial Intent**: Themed, coherent experiences (not random chaos)
- 🔄 **Generative**: Fresh exhibitions that change over time
- 🎭 **Diverse**: Multiple modes for different browsing moods
- 🚀 **Performant**: Buttery smooth at all times

---

## 🏗️ Technical Architecture

### Current Stack
- **Frontend**: React 19 + TypeScript
- **Build**: Vite 7
- **Animations**: Framer Motion 12
- **3D**: Three.js + React Three Fiber (currently unused, can remove)
- **Styling**: Tailwind CSS 3

### Data Sources

#### Current (Implemented)
1. **Art Institute of Chicago** - Fine art, paintings
2. **Cooper Hewitt Design Museum** - Modern design, graphic design
3. **Cleveland Museum of Art** - Diverse art collection

#### Planned (Next Phase)
4. **Rijksmuseum** (Amsterdam) - Dutch masters, golden age paintings
   - API: https://data.rijksmuseum.nl/object-metadata/api/
   - Free API key required
   - ~700k objects, excellent image quality

5. **Harvard Art Museums** - Diverse, massive collection
   - API: https://harvardartmuseums.org/collections/api
   - Free API key required
   - 250k+ objects

6. **Typography & Graphic Design Sources** (Research Needed)
   - Poster collections
   - Book cover databases
   - Album artwork archives
   - Potential sources:
     - Smithsonian Design Museum
     - Type specimens archives
     - Graphic design award databases

---

## 🎭 Feature Architecture

### Three Core Modes

#### 1. **Generative Exhibitions** (Primary Mode)
**What**: Algorithmically curated themed exhibitions that regenerate on a schedule

**How It Works**:
```
Every 24 hours:
1. System picks 3 random themes from theme pool
2. For each theme, runs curation algorithm
3. Generates 32-item exhibition per theme
4. User sees 3 fresh exhibitions to explore
```

**Theme Categories**:
- **Color Stories**: "Vibrant Blues", "Earth Tones", "Monochrome Magic"
- **Time Periods**: "Renaissance Redux", "Mid-Century Modern", "Digital Age"
- **Subjects**: "Human Forms", "Abstract Expressions", "Natural World"
- **Styles**: "Minimalist Moments", "Baroque Opulence", "Graphic Punch"
- **Materials**: "Textile Traditions", "Ceramic Chronicles", "Paper & Print"
- **Geography**: "Japanese Aesthetics", "Scandinavian Simplicity", "American Pop"
- **Mood**: "Calm & Contemplative", "Bold & Energetic", "Mysterious & Dark"
- **Unexpected**: "Chaos Collection" (pure randomness with beautiful layout)

**Layout Variations**:
- Magazine layout (varied sizes, hero images)
- Gallery layout (breathing room, museum spacing)
- Timeline layout (chronological flow)
- Comparison layout (side-by-side pairings)
- Collage layout (overlapping, scrapbook style)

**Regeneration Schedule**:
- Production: Every 24 hours (configurable)
- Testing: Manual trigger via dev tools / URL param

**UI Flow**:
```
Landing Page
  ↓
Exhibition Picker (3 cards)
  - Exhibition 1: "Bold Graphics" (32 items)
  - Exhibition 2: "Quiet Minimalism" (32 items)
  - Exhibition 3: "Surprise Me!" (mystery theme)
  ↓
Infinite Canvas (selected exhibition)
  ↓
Detail View (individual artwork)
```

---

#### 2. **Collection Browser** (Preserve Current Functionality)
**What**: Browse individual museum collections

**Collections**:
- Fine Art (Art Institute of Chicago)
- Design (Cooper Hewitt)
- Dutch Masters (Rijksmuseum) — NEW
- Harvard Collection (Harvard Art Museums) — NEW
- Graphic Design (TBD source) — NEW

**Behavior**:
- Loads 32 random items from selected collection
- Refresh button generates new random 32
- Standard 8x4 grid layout (current)
- Tag-based filtering (current)

---

#### 3. **Spontaneous Mode** (Random Discovery)
**What**: Pure randomness across all collections

**Two Variants**:

**A. Total Chaos**
- 32 random items from ALL collections
- No theme, no curation
- New set on every refresh
- "You never know what you'll find"

**B. Collection Shuffle**
- Pick a collection
- Get 32 random items from it
- Like current behavior, kept for power users

---

### Navigation Structure

```
App Root
├── Landing Page
│   ├── Today's Exhibitions (3 cards)
│   ├── Browse Collections (dropdown)
│   └── Surprise Me! (button)
│
├── Exhibition View
│   ├── Title Card (exhibition theme)
│   ├── Infinite Canvas (32 items, themed layout)
│   ├── Back to Exhibitions
│   └── Share Exhibition
│
├── Collection View
│   ├── Collection Header
│   ├── Infinite Canvas (32 items, standard grid)
│   ├── Refresh Button
│   └── Tag Filter (current)
│
└── Spontaneous View
    ├── Infinite Canvas (32 random items)
    ├── Refresh Button
    └── "Mixed from all collections" label
```

---

## 🔧 Implementation Roadmap

### Phase 1: Foundation & Git (NOW)
**Goal**: Get project under version control

- [x] Create comprehensive plan document
- [ ] Initialize Git repository
- [ ] Create .gitignore
- [ ] Make initial commit
- [ ] Create GitHub repository
- [ ] Push to GitHub
- [ ] Set up branch strategy (main, dev)

### Phase 2: Name & Branding (Week 1)
**Goal**: Decide on project name and identity

**Name Candidates** (see naming section below)

Once chosen:
- Update package.json
- Update README
- Update page title
- Create simple logo/icon

### Phase 3: New Data Sources (Week 1-2)
**Goal**: Integrate Rijksmuseum, Harvard, and graphic design sources

**Tasks**:
- [ ] Research and obtain API keys
- [ ] Create service files for each API
- [ ] Implement fetch functions
- [ ] Handle image URLs and metadata
- [ ] Test CORS and rate limits
- [ ] Add to collection switcher

**New Services**:
- `src/services/rijksmuseumApi.ts`
- `src/services/harvardApi.ts`
- `src/services/graphicDesignApi.ts` (TBD source)

### Phase 4: Generative Curation Engine (Week 2-3)
**Goal**: Build the algorithmic exhibition system

**Core Components**:
```typescript
// src/services/curatorEngine.ts
interface Theme {
  id: string;
  name: string; // "Color Story: Vibrant Blues"
  category: ThemeCategory;
  curateFunction: (allItems: Item[]) => Item[];
  layoutStyle: LayoutType;
}

interface Exhibition {
  id: string;
  theme: Theme;
  items: PortfolioItem[];
  generatedAt: Date;
  expiresAt: Date;
}

// Main functions
function generateDailyExhibitions(): Exhibition[]
function getCachedExhibitions(): Exhibition[] | null
function shouldRegenerate(): boolean
function pickRandomThemes(count: number): Theme[]
```

**Implementation Steps**:
- [ ] Define theme categories and templates
- [ ] Write curation algorithms for each theme type
- [ ] Implement layout generators (magazine, gallery, timeline, etc.)
- [ ] Create exhibition storage (localStorage + cache)
- [ ] Build time-based regeneration logic
- [ ] Add manual regeneration for testing (dev mode)

### Phase 5: Layout Algorithms (Week 3-4)
**Goal**: Move beyond uniform grid to magazine-style layouts

**Layout Types to Implement**:

1. **Magazine Layout**
   - Hero images (600x800) every 8 items
   - Double-wide spreads occasionally
   - Small detail shots
   - Intentional white space

2. **Gallery Layout**
   - Museum-like spacing
   - Centered compositions
   - Single focal point per "room"

3. **Timeline Layout**
   - Chronological left-to-right flow
   - Date markers
   - Era transitions

4. **Comparison Layout**
   - Side-by-side pairings
   - Before/after, old/new juxtapositions

5. **Collage Layout**
   - Overlapping items
   - Varied rotations (slight angles)
   - Scrapbook aesthetic

**Technical Approach**:
```typescript
// src/utils/layoutGenerators.ts
type LayoutGenerator = (items: PortfolioItem[]) => PortfolioItem[]

const magazineLayout: LayoutGenerator = (items) => {
  // Returns items with updated x, y, width, height
}

const galleryLayout: LayoutGenerator = (items) => {
  // Museum spacing algorithm
}
```

### Phase 6: Exhibition UI (Week 4)
**Goal**: Build exhibition picker and title cards

**Components to Create**:
- `src/components/ExhibitionLanding.tsx` - Shows 3 daily exhibitions
- `src/components/ExhibitionCard.tsx` - Card UI for each exhibition
- `src/components/ExhibitionTitleCard.tsx` - Magazine-style cover
- `src/components/ModeSelector.tsx` - Switch between modes

**User Flow**:
1. Land on ExhibitionLanding
2. See 3 exhibition cards with previews
3. Click to enter exhibition
4. See title card (full screen, like magazine cover)
5. Fade to infinite canvas

### Phase 7: Visual Enhancements (Week 5)
**Goal**: Add polish and cinematic feel

**Features**:
- [ ] Staggered reveal animations (items fade in from blur)
- [ ] Parallax depth (background slower than foreground)
- [ ] Ambient metadata on hover (captions visible without clicking)
- [ ] Improved typography (editorial fonts)
- [ ] Color theming per exhibition
- [ ] Transitions between exhibitions

### Phase 8: Discovery Features (Week 6)
**Goal**: Help users navigate and share

**Features**:
- [ ] Minimap (shows position in canvas)
- [ ] Share exhibition (generate URL)
- [ ] Bookmark favorites (localStorage)
- [ ] Natural language search ("show me colorful abstracts")

### Phase 9: Testing & Polish (Week 7+)
**Goal**: Refinement and bug fixes

- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Cross-browser testing
- [ ] Accessibility improvements
- [ ] Analytics (optional)

---

## 🎨 Naming Ideas

**Criteria**: Memorable, sticky, related to browsing/exploring, fun and approachable

### Top Candidates

**Alliterative & Rhythmic**:
1. **Gallery Glide** — smooth browsing motion
2. **Canvas Carousel** — rotating collections
3. **Museum Mingle** — mixing collections
4. **Exhibit Echo** — exhibitions that resonate
5. **Frame Flutter** — fluttering through frames
6. **Curio Cabinet** — classic collection display
7. **Relic Ripple** — ripple through history
8. **Vista Vault** — vault of views
9. **Muse Maze** — wandering through inspiration

**Playful & Sticky**:
10. **Flipbook** — like flipping through pages
11. **Shuffle Box** — box of shuffled treasures
12. **Lookie Loop** — infinite browsing loop
13. **Peek Palace** — palace of discoveries
14. **Browse Booth** — intimate browsing space
15. **Roam Room** — room for roaming

**Sophisticated**:
16. **Salon** — historical art gathering space
17. **Vitrine** — display case (French)
18. **Studiolo** — Renaissance study/collection room
19. **Wunderkammer** — wonder chamber (German)
20. **Assemblage** — art term for collecting

**Personal Favorite**: **Gallery Glide** or **Canvas Carousel**
- Easy to remember
- Describes the interaction
- Sounds approachable and fun
- Good domain availability likely

---

## 🧪 Testing Strategy

### Manual Regeneration (Dev Mode)

**Option 1: URL Parameter**
```
http://localhost:5173/?regenerate=true
```
Clears cached exhibitions, generates fresh ones

**Option 2: Dev Tools Panel**
```typescript
// Add hidden dev panel (Cmd+K or specific key combo)
if (isDevelopment) {
  <DevPanel>
    <button onClick={regenerateExhibitions}>↻ Force Regenerate</button>
    <button onClick={clearCache}>🗑️ Clear Cache</button>
    <button onClick={skipToExpiry}>⏭️ Skip to Expiry</button>
  </DevPanel>
}
```

**Option 3: Console Commands**
```javascript
// Expose functions to window in dev
window.__curator = {
  regenerate: () => { ... },
  clearCache: () => { ... },
  viewThemes: () => { ... }
}
```

### Automated Testing (Future)
- Unit tests for curation algorithms
- Integration tests for API fetches
- Visual regression tests for layouts

---

## 📊 Analytics & Insights (Optional)

**Questions to Answer**:
- Which exhibitions are most popular?
- Which themes get the most clicks?
- Average time spent per exhibition?
- Which collections are favorites?

**Privacy-First Approach**:
- Use Plausible or similar (no cookies)
- Or simple local logging (no tracking)
- Only aggregate data, no personal info

---

## 🚀 Deployment

**Hosting Options**:
- Vercel (recommended for React)
- Netlify
- GitHub Pages (with custom domain)

**Domain Ideas**:
- galleryglide.art
- canvascarousel.com
- [chosenname].studio

**Environment Variables**:
```bash
# API Keys (not committed to Git)
VITE_RIJKSMUSEUM_KEY=xxx
VITE_HARVARD_KEY=xxx
VITE_COOPER_HEWITT_KEY=xxx
```

---

## 🎯 Success Metrics

**Technical**:
- [ ] 60fps during all interactions
- [ ] < 2s load time for exhibitions
- [ ] Works on Chrome, Firefox, Safari
- [ ] Responsive on desktop and tablet

**Experience**:
- [ ] "Wow" moment when first opening
- [ ] Users spend > 5 minutes exploring
- [ ] Users return for new exhibitions
- [ ] Users share exhibitions with friends

**Content**:
- [ ] 50+ unique themes in rotation
- [ ] 5+ data sources integrated
- [ ] 1000+ artworks available
- [ ] Balanced across art/design/graphics

---

## 🔮 Future Vision (Post-Launch)

### Advanced Curation
- AI-powered theme generation
- Sentiment analysis (match mood to exhibition)
- Color palette extraction and matching
- Collaborative filtering (if you liked X, try Y)

### Social Features
- User-created exhibitions
- Share individual items
- Curated paths through collection
- Comments or reactions (minimal)

### Personalization (Optional)
- Remember favorite collections
- Suggest themes based on browsing
- Customizable layouts
- Dark/light mode

### Content Expansion
- Video/motion graphics
- Sound design pieces
- Architecture collections
- Fashion archives

---

## 📝 Notes & Decisions

### Decision Log

**2025-11-03**: Project vision crystallized
- Core tension: surprise vs curation → Solved with generative exhibitions
- Keep spontaneous mode alongside curated
- 24-hour regeneration cadence (configurable)
- Focus on graphic design sources next

**2025-11-03**: Data source priorities
- Add: Rijksmuseum, Harvard
- Deprioritize: MET (CORS issues)
- Research: Typography/graphic design APIs

### Open Questions

1. **Mystery Exhibition**: Should we have one "mystery" exhibition where theme is revealed after browsing?
   - Lean: Yes, make the 3rd exhibition always a mystery

2. **User Regeneration**: Should users be able to manually regenerate exhibitions?
   - Lean: No, keep time-based. Use spontaneous mode for random need.
   - Exception: Dev mode for testing

3. **Exhibition History**: Show past exhibitions?
   - Future feature: "Exhibition Archive"
   - Not MVP, but interesting for later

4. **Item Sizing**: Should items in magazine layout be truly different sizes, or just positioned differently?
   - Lean: Different sizes for magazine, same size for gallery
   - Start simple, can enhance later

---

## 🎬 Getting Started (For Future Sessions)

If you're returning to this project after a break:

1. **Read this document** to get context
2. **Check todos** (TodoWrite tracking)
3. **Review recent commits** (git log)
4. **Check what's running** (`npm run dev`)
5. **Refer to API docs** for any data source work

**Key Files**:
- `src/App.tsx` - Main app logic and mode switching
- `src/services/` - All API integrations
- `src/components/InfiniteCanvas.tsx` - Canvas rendering
- `src/hooks/useSmoothDrag.ts` - Drag interaction
- `src/data/placeholderItems.ts` - Item generation

---

## 📚 Resources

**Design Inspiration**:
- Art Basel catalogs
- Apartamento magazine
- Kinfolk layouts
- MoMA exhibition books
- Phaidon art books

**Technical References**:
- Framer Motion docs: https://www.framer.com/motion/
- Museum APIs:
  - Art Institute: https://api.artic.edu/docs/
  - Rijksmuseum: https://data.rijksmuseum.nl/
  - Harvard: https://harvardartmuseums.org/collections/api

**Inspiration Sites**:
- https://www.rijksmuseum.nl/en/rijksstudio
- https://artsandculture.google.com/
- https://collection.cooperhewitt.org/

---

**Document Status**: Living document, update as project evolves
**Next Review**: After Phase 1 completion (Git setup)
