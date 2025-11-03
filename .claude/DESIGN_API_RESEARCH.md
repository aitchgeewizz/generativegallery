# Design & Graphic Design Museum APIs Research

Research completed: November 4, 2025

## Executive Summary

This document evaluates the best museum APIs for integrating graphic design, typography, and poster collections into the Generative Gallery app. The goal is to find APIs that complement our existing collections (Art Institute, Cooper Hewitt, Harvard) with strong design-focused content.

---

## Top Recommendations (Prioritized)

### 🌟 Tier 1: Immediate Integration Candidates

#### 1. Victoria & Albert Museum (V&A) API
**Why it's perfect for us:**
- **National collections of posters and wallpapers** - One of the world's finest
- **1.1M+ collection objects**, 470,000+ IIIF manifests, 375K+ images
- **Archive of Art & Design** with graphic design materials, packaging, printed ephemera
- **Strong design focus** with extensive print collections

**Technical Details:**
- API: https://developers.vam.ac.uk/
- Format: REST API with JSON responses
- IIIF support: Yes (470,000 manifests)
- License: Creative Commons (check specific terms)
- Free tier: Yes, requires API key
- Rate limits: To be determined upon registration

**Collections Scope:**
- Graphic design materials
- Posters (national collection)
- Wallpapers
- Printed designs for decorative arts
- Commercial graphics and packaging
- Japanese woodblock prints

**Implementation Priority:** **HIGH** ⭐️
- Excellent fit for our design-focused curation
- Strong API with IIIF support
- Complements Harvard's breadth with design depth

---

#### 2. Library of Congress - Prints & Photographs (PPOC API)
**Why it's perfect for us:**
- **Dedicated API for prints, posters, and design** (PPOC - Prints & Photographs Online Catalog)
- **3,100+ artist posters** in Artist Poster series alone
- **American design heritage** - unique perspective vs European museums
- **WPA posters** and historical design movements

**Technical Details:**
- API: https://www.loc.gov/pictures/api
- Format: JSON/JSONP for every URL
- Every page has JSON serialization: add `.json` to any URL
- License: Many items are "Free to Use and Reuse"
- Free tier: Yes, no key required for basic access
- Simple REST architecture

**Collections Scope:**
- Artist posters (design-focused)
- WPA posters (historical design)
- Documentary posters
- Travel and transportation posters
- Political propaganda (design perspective)
- Architectural and engineering drawings
- Fine and popular prints

**Implementation Priority:** **HIGH** ⭐️
- Simple API (just append .json to URLs)
- Unique American design perspective
- Complements European collections

---

#### 3. Smithsonian Open Access API
**Why it's perfect for us:**
- **5.1 million 2D and 3D digital items**
- **21 museums, 9 research centers** - incredible breadth
- **Includes Cooper Hewitt data** (we're already using their API separately)
- **Cross-institutional search** across entire Smithsonian

**Technical Details:**
- API: https://api.data.gov (Smithsonian endpoint)
- Bulk data: https://github.com/Smithsonian/OpenAccess
- Format: REST API, JSON
- License: CC0 (most permissive)
- Free tier: Requires API key from api.data.gov
- Rate limits: Standard gov API limits

**Collections Scope:**
- All Smithsonian institutions
- Design, decorative arts, craft
- American art and design
- International collections
- Historical archives

**Implementation Priority:** **MEDIUM** ⚡
- Massive scale (5.1M items)
- May overlap with Cooper Hewitt
- Best as supplementary "search all Smithsonian" feature

---

### 🎯 Tier 2: Strong Candidates (Consider After Tier 1)

#### 4. Europeana API
**Overview:**
- **Millions of cultural heritage items** from 4,000+ European institutions
- Strong European design perspective
- Typography collections
- Cross-museum aggregation

**Technical Details:**
- API: https://pro.europeana.eu/page/apis
- Format: REST + IIIF support
- License: Varies by item
- Free tier: Yes, requires API key
- Nine different API entrypoints

**Collections Scope:**
- European museums and galleries
- Books, paintings, 3D objects, audiovisual
- Typography collections
- Graphic design from across Europe

**Implementation Priority:** **MEDIUM** ⚡
- European perspective complements American collections
- More complex API (9 entrypoints)
- May require more filtering for design-specific items

---

#### 5. MoMA Collection Data
**Overview:**
- **159,911+ collection records**
- Strong modern design collection
- Includes architecture, design, media art
- **Limited API access** (official API restricted to staff/partners)

**Technical Details:**
- Data: https://github.com/MuseumofModernArt/collection
- Format: CSV/JSON datasets on GitHub
- License: CC0 for data
- API: Official API is restricted
- Alternative: Use GitHub dataset

**Collections Scope:**
- Modern and contemporary design
- Graphic design
- Architecture and design objects
- 150,000+ paintings, sculptures, design objects

**Implementation Priority:** **LOW** ⚠️
- No public API (only dataset dumps)
- Would require custom implementation
- Great content but technical limitations

---

## Comparison Matrix

| API | Design Focus | API Quality | IIIF | Images | License | Priority |
|-----|--------------|-------------|------|---------|---------|----------|
| **V&A** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | 375K+ | CC | **HIGH** |
| **Library of Congress** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | Large | Free Use | **HIGH** |
| **Smithsonian OA** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ | 5.1M | CC0 | **MEDIUM** |
| **Europeana** | ⭐⭐⭐ | ⭐⭐⭐ | ✅ | Millions | Varies | **MEDIUM** |
| **MoMA** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ❌ | Limited | CC0 | **LOW** |

---

## Recommended Implementation Plan

### Phase 1: V&A Integration (Week 1-2)
1. Register for V&A API key at https://developers.vam.ac.uk/
2. Study API documentation and explore collections
3. Build V&A service layer (similar to harvardMuseumsApi.ts)
4. Create vaMuseumItems.ts data generator
5. Add "V&A Design" to collection switcher
6. Test with poster and graphic design queries

**Expected Value:**
- Premier design and poster collection
- Complements fine art focus of Art Institute
- European design perspective
- Excellent IIIF image support

---

### Phase 2: Library of Congress Integration (Week 3)
1. Study PPOC API documentation
2. Build LoC PPOC service layer
3. Create locPostersItems.ts data generator
4. Add "American Posters" or "LoC Design" to collection switcher
5. Focus on artist posters and WPA collections

**Expected Value:**
- American design heritage
- Strong poster collection
- Simple API (append .json to URLs)
- Unique historical perspective

---

### Phase 3: Smithsonian Open Access (Optional, Week 4)
1. Register for api.data.gov API key
2. Explore Smithsonian API capabilities
3. Decide: Use as supplementary search OR separate collection
4. Implementation depends on overlap analysis with Cooper Hewitt

**Expected Value:**
- Cross-institutional search
- Massive scale (5.1M items)
- American art and design depth
- May overlap with existing Cooper Hewitt integration

---

## Current Collections Status

✅ **Active Collections:**
1. Art Institute of Chicago - Fine Art
2. Cooper Hewitt Design Museum - Modern Design & Graphics
3. Harvard Art Museums - Diverse Collection (250K+)

🎯 **Proposed Additions:**
1. **V&A Museum** - Design & Posters (HIGH PRIORITY)
2. **Library of Congress PPOC** - American Posters (HIGH PRIORITY)
3. Smithsonian Open Access - Cross-institutional (OPTIONAL)
4. Europeana - European Collections (OPTIONAL)

---

## Technical Considerations

### API Integration Pattern
All new APIs should follow the established pattern:
```
src/services/vamMuseumApi.ts      → API service layer
src/data/vamItems.ts              → Data generator & search
src/types/index.ts                → Update CollectionType
src/components/CollectionSwitcher → Add new collection
src/App.tsx                       → Handle collection loading
```

### Image Handling
- Prioritize APIs with IIIF support (V&A, LoC, Smithsonian, Europeana)
- IIIF allows flexible image sizing and quality
- Follow Harvard example for IIIF URL construction

### Rate Limiting
- V&A: TBD (check on registration)
- LoC: Generally generous, no key required
- Smithsonian: Standard api.data.gov limits
- Europeana: TBD (check on registration)

### Licensing
- V&A: Check Section 9 of terms
- LoC: Many "Free to Use and Reuse"
- Smithsonian: CC0 (most permissive)
- Europeana: Varies by institution

---

## Next Steps

1. ✅ Complete this research document
2. Register for V&A API key (https://developers.vam.ac.uk/)
3. Register for api.data.gov key (for Smithsonian)
4. Explore V&A API documentation
5. Build V&A service layer (src/services/vamMuseumApi.ts)
6. Implement V&A as 4th collection
7. Test and refine
8. Commit and deploy
9. Proceed with Library of Congress integration

---

## Resources

- **V&A API Guide:** https://developers.vam.ac.uk/guide/v2/
- **V&A API Docs:** https://developers.vam.ac.uk/
- **LoC PPOC API:** https://www.loc.gov/pictures/api
- **Smithsonian Open Access:** https://www.si.edu/openaccess/devtools
- **Europeana APIs:** https://pro.europeana.eu/page/apis
- **MoMA Collection Data:** https://github.com/MuseumofModernArt/collection

---

## Conclusion

**The V&A Museum API is the single best addition** for your design-focused curation goals:
- Premier design and poster collections
- Excellent API with IIIF support
- Natural complement to existing fine art collections
- European design perspective balances American institutions

**Library of Congress PPOC is the perfect second addition:**
- Unique American poster heritage
- Simple API implementation
- Free to use and reuse
- Historical design movements (WPA, etc.)

Together, these two additions would give you:
- 🎨 Fine Art (Art Institute)
- ✨ Modern Design (Cooper Hewitt)
- 🎓 Diverse Collection (Harvard)
- 🏛️ **European Design & Posters (V&A)** ← NEW
- 🗽 **American Posters & Prints (LoC)** ← NEW

This creates a comprehensive, globally-representative design and art discovery platform.
