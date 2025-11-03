# 🔑 API Keys Setup Guide

This document explains how to obtain API keys for all the museum APIs used in this project.

---

## 📋 Quick Reference

| API | Required? | Rate Limit | How to Get |
|-----|-----------|------------|------------|
| **Art Institute of Chicago** | No | None | No key needed |
| **Cooper Hewitt** | Yes | Unknown | Request from Smithsonian |
| **Cleveland Museum** | No | None | No key needed |
| **Rijksmuseum** | Yes | Unknown | Instant registration |
| **Harvard Art Museums** | Yes | 2500/day | Request form |

---

## 1. Art Institute of Chicago ✅

**Status**: Already implemented, no key needed

**API Docs**: https://api.artic.edu/docs/

No API key required. Public API with full access.

---

## 2. Cooper Hewitt (Smithsonian Design Museum) ✅

**Status**: Already implemented, requires key

**API Docs**: https://collection.cooperhewitt.org/api/

### How to Get Key:

1. Go to: https://collection.cooperhewitt.org/api/
2. Click "Request an API key"
3. Fill out the form with your details
4. You'll receive the key via email (usually within a few days)
5. Add to `.env` file:
   ```
   VITE_COOPER_HEWITT_KEY=your_key_here
   ```

---

## 3. Cleveland Museum of Art ✅

**Status**: Already implemented, no key needed

**API Docs**: https://openaccess-api.clevelandart.org/

No API key required. Open access API.

---

## 4. Rijksmuseum (Amsterdam) 🆕

**Status**: NEW - To be implemented

**API Docs**: https://data.rijksmuseum.nl/

**Collection**: 800,000+ objects, Dutch Golden Age paintings, Vermeer, Rembrandt

### How to Get Key:

1. **Register** at: https://www.rijksmuseum.nl/en/register
2. **Activate** your Rijksstudio account
3. **Find API key** in advanced settings of your account
4. **Instant access** - key provided immediately upon request
5. **Add to `.env`**:
   ```
   VITE_RIJKSMUSEUM_KEY=your_key_here
   ```

### API Endpoint:
```
https://www.rijksmuseum.nl/api/[culture]/collection?key=[api-key]&format=json
```

### Key Features:
- High-resolution images
- Public domain artwork
- Rich metadata (artist, date, materials, dimensions)
- Multiple languages support

---

## 5. Harvard Art Museums 🆕

**Status**: NEW - To be implemented

**API Docs**:
- Main: https://harvardartmuseums.org/collections/api
- GitHub: https://github.com/harvardartmuseums/api-docs

**Collection**: 250,000+ objects across three museums (Fogg, Busch-Reisinger, Arthur M. Sackler)

### How to Get Key:

1. **Request key** at: https://harvardartmuseums.org/collections/api
2. **Fill out form** with:
   - Your name
   - Email
   - Project description (e.g., "Generative Gallery - Art discovery platform")
   - Usage intent: Non-commercial
3. **Receive key via email** (format: `00000000-0000-0000-0000-000000000000`)
4. **Add to `.env`**:
   ```
   VITE_HARVARD_KEY=your_key_here
   ```

### Usage Limits:
- **2500 requests per day** (be respectful!)
- Non-commercial use only
- Keep key private (treat like password)

### API Endpoint:
```
https://api.harvardartmuseums.org/object?apikey=[your-key]
```

### Key Features:
- Objects, People, Exhibitions, Publications, Galleries
- High-quality images
- Comprehensive metadata
- Active maintenance and support

---

## 6. Graphic Design / Poster Collections 🔍

**Status**: RESEARCH NEEDED

Currently researching best sources for:
- Typography specimens
- Vintage posters
- Book covers
- Album artwork

### Potential Options:

**A. Library of Congress**
- Prints & Photographs division
- API: https://www.loc.gov/apis/
- Free access, public domain

**B. Smithsonian Design Museum**
- Part of Cooper Hewitt system
- May already have access through Cooper Hewitt key

**C. Internet Archive**
- Book covers, album art, vintage graphics
- API: https://archive.org/services/docs/api/
- Free access, public domain

**D. Europeana**
- European cultural heritage
- Design and poster collections
- API: https://pro.europeana.eu/page/apis
- Free API key

### Recommendation:
Start with Library of Congress and Internet Archive (both free, no approval needed)

---

## 🔒 Security: Environment Variables

**NEVER commit API keys to Git!**

### .env File Structure:
```bash
# Cooper Hewitt (Smithsonian Design Museum)
VITE_COOPER_HEWITT_KEY=your_cooper_hewitt_key_here

# Rijksmuseum (Amsterdam)
VITE_RIJKSMUSEUM_KEY=your_rijksmuseum_key_here

# Harvard Art Museums
VITE_HARVARD_KEY=your_harvard_key_here

# Future: Graphic Design Sources
# VITE_LOC_KEY=your_library_of_congress_key_here
```

### Accessing in Code:
```typescript
const apiKey = import.meta.env.VITE_COOPER_HEWITT_KEY;
```

---

## 📝 Next Steps

### Immediate Actions:

1. **Get Rijksmuseum Key** (5 minutes):
   - Register → Instant key
   - Add to `.env`

2. **Request Harvard Key** (1-3 days wait):
   - Fill out form
   - Wait for email
   - Add to `.env`

3. **Research Graphic Design APIs** (ongoing):
   - Test Library of Congress
   - Test Internet Archive
   - Evaluate quality and coverage

### Implementation Order:

1. ✅ Phase 1: Rijksmuseum (easy, instant access)
2. ✅ Phase 2: Harvard (waiting on approval)
3. 🔍 Phase 3: Graphic Design (research best sources)

---

## 🚨 Troubleshooting

### API Key Not Working?

1. **Check .env file exists** and is in project root
2. **Restart dev server** (Vite doesn't hot-reload .env changes)
3. **Verify key format** (no spaces, correct prefix)
4. **Check rate limits** (Harvard: 2500/day)

### CORS Errors?

Some museums may have CORS restrictions. Solutions:
- Use their official image CDNs
- Server-side proxy (if needed)
- Check API docs for CORS policy

---

## 📚 Useful Links

- Art Institute API: https://api.artic.edu/docs/
- Cooper Hewitt API: https://collection.cooperhewitt.org/api/
- Cleveland Museum: https://openaccess-api.clevelandart.org/
- Rijksmuseum API: https://data.rijksmuseum.nl/
- Harvard Art Museums: https://github.com/harvardartmuseums/api-docs
- Library of Congress: https://www.loc.gov/apis/
- Internet Archive: https://archive.org/services/docs/api/

---

**Last Updated**: November 3, 2025
