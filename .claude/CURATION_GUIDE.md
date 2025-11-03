# Artwork Curation Guide

How the app selects vibrant, exciting artwork from museum APIs

---

## Current Collections & Curation Strategy

### 🎨 Art Institute of Chicago (Fine Art Collection)

**Location:** src/services/artInstituteApi.ts → `fetchRandomArtworks()`

**Curation Filters:**
1. ✅ **INCLUDES:**
   - Paintings
   - Sculptures
   - Photographs

2. ❌ **EXCLUDES:**
   - Sketches
   - Drawings
   - Prints
   - Low saturation works (color.s < 20%)
   - Works without valid images
   - Works without artist attribution

3. **Image Validation:**
   - Tests each image URL before including
   - Only returns artworks with verified working images
   - Uses IIIF format for flexible sizing

**Result:** Vibrant paintings, colorful photographs, and interesting sculptures from masters and modern artists

---

### 🎓 Harvard Art Museums (Diverse Collection)

**Location:** src/services/harvardMuseumsApi.ts → `fetchHarvardArtworks()`

**Curation Filters:**
1. ✅ **INCLUDES:**
   - Paintings
   - Sculptures
   - Photographs
   - Modern drawings (post-1400)

2. ❌ **EXCLUDES:**
   - Manuscripts & illuminated pages
   - Books & folios
   - Fragments
   - Parchment/vellum works
   - Prints, etchings, engravings, lithographs
   - Works older than 1400 CE (to avoid medieval manuscripts)
   - Works without color data or with muted colors

3. **Color-Based Curation:**
   - Prioritizes works with vibrant color palettes
   - Looks for red, orange, yellow, green, blue, violet spectrums
   - Deprioritizes works with < 3 colors or low color percentage
   - Only accepts 30% of non-vibrant works

**Result:** Modern, colorful paintings and photographs; excludes the medieval manuscripts and black & white prints you saw in screenshots

---

### ✨ Cooper Hewitt (Design Collection)

**Location:** src/data/designItems.ts

**Curation:** Currently uses Met Museum Design department for modern design and graphic design pieces.

---

## How to Further Refine Curation

### Option 1: Adjust Color Filters

**Art Institute** (src/services/artInstituteApi.ts, line 138):
```typescript
// Current: Excludes works with saturation < 20%
if (item.color && item.color.s < 20) return false;

// More strict (only very vibrant):
if (item.color && item.color.s < 40) return false;

// More permissive (include some muted works):
if (item.color && item.color.s < 10) return false;
```

**Harvard** (src/services/harvardMuseumsApi.ts, line 195-196):
```typescript
// Current: Accepts 30% of non-vibrant works
return Math.random() > 0.7;

// More strict (10% acceptance):
return Math.random() > 0.9;

// More permissive (50% acceptance):
return Math.random() > 0.5;
```

---

### Option 2: Focus on Specific Art Movements

Add classification/style filters to prioritize specific movements:

**For Impressionism:**
```typescript
const styleTitles = item.style_titles?.map(s => s.toLowerCase()) || [];
const isImpressionist = styleTitles.some(s =>
  s.includes('impressionist') ||
  s.includes('post-impressionist')
);

// Boost impressionist works
if (isImpressionist) return true;
```

**For Pop Art:**
```typescript
const isPopArt = styleTitles.some(s =>
  s.includes('pop art') ||
  s.includes('contemporary') ||
  s.includes('modern')
);
```

**For Masters/Classical:**
```typescript
const isMaster =
  item.datebegin >= 1400 && item.datebegin <= 1900 &&
  classification.includes('painting');
```

---

### Option 3: Date Range Filtering

Control which time periods to show:

**Modern/Contemporary Only (1900+):**
```typescript
// Add to filter in fetchRandomArtworks or fetchHarvardArtworks
if (item.datebegin && item.datebegin < 1900) return false;
```

**Classical Masters (1400-1900):**
```typescript
if (item.datebegin && (item.datebegin < 1400 || item.datebegin > 1900)) {
  return false;
}
```

**Mix of Periods:**
```typescript
// Already implemented - current setup includes all post-1400 works
if (item.datebegin && item.datebegin < 1400) return false;
```

---

### Option 4: Create Curated Collections

You can create themed collections by modifying the API queries:

**Location:** Create new functions in the API service files

**Example - Impressionism Collection:**
```typescript
export const fetchImpressionistArt = async (count: number = 32) => {
  const response = await fetch(
    `${BASE_URL}/artworks/search?q=impressionism&limit=${count * 2}`
  );
  // ... then filter with existing curation logic
};
```

**Example - Pop Art Collection:**
```typescript
export const fetchPopArt = async (count: number = 32) => {
  const response = await fetch(
    `${BASE_URL}/artworks/search?q=pop art&limit=${count * 2}`
  );
  // ... then filter
};
```

Then add these as new collections in App.tsx!

---

## Quick Reference: What Changed

### Before (Issues):
- **Fine Art:** Used Cleveland Museum → showing random artworks
- **Harvard:** Accepted ALL types → showing medieval manuscripts and prints

### After (Fixed):
- **Fine Art:** Uses Art Institute with smart curation → vibrant paintings, sculptures, photos
- **Harvard:** Strict filtering → excludes manuscripts/prints, prioritizes colorful modern works

---

## Testing Your Changes

1. **Reload the app** (refresh browser at localhost:5173)
2. **Select "Fine Art"** - should see vibrant paintings now (not black & white prints)
3. **Select "Harvard"** - should see modern paintings/photos (not medieval pages)
4. **Check the browser console** - you'll see curation stats:
   ```
   📦 Attempt 1: Found 23 artworks (total: 23)
   ✅ Successfully loaded 32 artworks with VERIFIED working images
   ```

---

## Advanced: API-Specific Search Queries

Both APIs support keyword searches for specific themes:

### Art Institute Search Terms:
- "impressionism"
- "pop art"
- "abstract"
- "landscape"
- "portrait"
- "still life"
- "modern"
- "contemporary"

### Harvard Search Terms:
- "painting"
- "color"
- "abstract"
- "contemporary"
- "modern art"
- "sculpture"

You can use these in `searchArtworksByTag()` and `searchHarvardByTag()` functions.

---

## Recommended Next Steps

1. **Test the current curation** - Load both collections and see if they match your vision
2. **If you want MORE vibrant works:** Increase the color saturation thresholds
3. **If you want SPECIFIC movements:** Add style/classification filters
4. **If you want themed collections:** Create new search-based collection functions

All changes are in:
- `src/services/artInstituteApi.ts` (Fine Art curation)
- `src/services/harvardMuseumsApi.ts` (Harvard curation)
- `src/data/placeholderItems.ts` (Collection loading)

Happy curating! 🎨
