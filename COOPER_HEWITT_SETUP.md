# Cooper Hewitt API Setup Guide

Your Design collection is now configured to use the **Cooper Hewitt Smithsonian Design Museum API** - one of the world's premier design collections featuring:

- Graphic design & posters
- Bauhaus & Swiss design
- Modern & contemporary design
- Typography & branding
- Product & industrial design

## Quick Setup (5 minutes)

### Step 1: Get Your Free API Key

1. Visit: https://collection.cooperhewitt.org/api/
2. Click "create an access token for yourself"
3. Sign in or create a free Smithsonian account
4. Generate your personal access token

### Step 2: Add API Key to Your Project

1. Open the `.env` file in your project root
2. Add your API key:
   ```
   VITE_COOPER_HEWITT_API_KEY=your_api_key_here
   ```
3. Save the file

### Step 3: Restart Your Dev Server

The dev server should automatically restart when you save the `.env` file. If not, restart it manually.

### Step 4: Test Your Design Collection

1. Open your app at http://localhost:5173/
2. Switch to the "Design" tab
3. You should now see beautiful, curated graphic design from Cooper Hewitt!

## What You'll Get

With the Cooper Hewitt API active, your Design collection will feature:

- **32 curated design objects** per session
- High-resolution images
- Rich metadata (designer names, dates, materials)
- Diverse design styles (posters, typography, Bauhaus, Swiss design, etc.)
- Authentic museum-quality content

## Search Terms Used

The system automatically searches for diverse design content using terms like:
- poster
- graphic design
- typography
- bauhaus
- swiss design
- modernist
- constructivist
- art deco
- mid century
- exhibition poster

## Fallback Behavior

If the API key is not configured, the system will:
1. Display a helpful console message with setup instructions
2. Fall back to a small curated local collection
3. Still provide a functional experience

## API Rate Limits

Cooper Hewitt is generous with their API, but to be respectful:
- We add 100ms delays between search requests
- We search multiple terms to get diverse results
- We filter for high-quality items (with creators and dates)

## Need Help?

- Cooper Hewitt API Docs: https://collection.cooperhewitt.org/api/
- Check your browser console for helpful messages
- Make sure your API key is correctly formatted in `.env`

---

**Note:** Your `.env` file is gitignored for security. Never commit API keys to version control!
