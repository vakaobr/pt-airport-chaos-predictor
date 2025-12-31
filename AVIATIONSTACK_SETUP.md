# AviationStack Integration Setup

This guide explains how to integrate AviationStack API for enriched airline and aircraft data.

## Airline Logos - FREE GitHub Sources

We use **FREE GitHub repositories** as our primary sources for airline logos (no API keys needed):

### Primary Sources (in order):
1. **sexym0nk3y/airline-logos** - Clean, watermark-free logos
2. **Jxck-S/airline-logos** - Comprehensive collection
3. **airframesio/airline-images** - Jack Sweeney's collection
4. **SVG Fallback** - Beautiful gradient badge with airline code

### Why GitHub over paid APIs?
✅ **No watermarks** (unlike airhex.com free tier)
✅ **No API keys required**
✅ **No rate limits**
✅ **Always free**
✅ **High quality PNG images**
✅ **No authentication errors**

## What AviationStack Provides

✅ **Airline Data:**
- Full airline names
- Official logos
- Fleet size and average age
- Country of origin
- Founding date
- IATA/ICAO codes

✅ **Aircraft Data:**
- Full aircraft names (e.g., "Airbus A330-900neo")
- Model codes
- Engine types and count
- Production line information

✅ **Historical Data:**
- Past flight information (last 3 months)
- Can be used to analyze historical airport traffic patterns

## Setup Instructions

### 1. Get Your API Key

1. Go to https://aviationstack.com/
2. Sign up for a **free account**
3. Copy your API key from the dashboard

### 2. Add to Vercel Environment

```bash
# Add to Vercel via CLI
vercel env add AVIATIONSTACK_API_KEY

# Or via Vercel Dashboard:
# 1. Go to your project settings
# 2. Navigate to "Environment Variables"
# 3. Add: AVIATIONSTACK_API_KEY = your_key_here
```

### 3. Deploy

```bash
git add .
git commit -m "Add AviationStack integration"
git push origin main
```

## Usage Limits (Free Tier)

- **100 API calls per month**
- **Rate limit**: 1 request per 60 seconds for timetables
- **HTTPS**: Not available on free tier (using HTTP)

### How We Stay Within Limits

The integration is designed to be conservative:

1. **Client-side caching**: Once we fetch airline/aircraft data, it's cached
2. **On-demand loading**: Only fetches when user hovers on tooltip
3. **Fallback**: If AviationStack fails, uses local airline/aircraft mappings

### Cost-Effective Usage

100 calls/month is enough because:
- We only fetch **unique airlines** and **aircraft types**
- Portuguese airports typically have ~20-30 unique airlines
- ~15-20 unique aircraft types
- **Total**: ~50 API calls to build complete cache
- Leaves 50 calls for historical data queries

## API Endpoints

### Airline Data
```
GET /api/aviationstack?type=airline&code=TAP
```

Response:
```json
{
  "name": "TAP Air Portugal",
  "iata": "TP",
  "icao": "TAP",
  "fleetSize": "100",
  "country": "Portugal",
  "logoUrl": "https://..."
}
```

### Aircraft Data
```
GET /api/aviationstack?type=aircraft&code=A339
```

Response:
```json
{
  "name": "Airbus A330-900neo",
  "iataCode": "A339",
  "details": {
    "engines": "JET",
    "engineCount": "2"
  }
}
```

### Historical Data
```
GET /api/aviationstack?type=historical&airport=LIS&date=2025-12-01
```

Response:
```json
{
  "date": "2025-12-01",
  "airport": "LIS",
  "totalFlights": 42,
  "flights": [...]
}
```

## Features Enabled

With AviationStack integration, your app now has:

✨ **Better Tooltips**
- Real airline logos (when available)
- Accurate aircraft names
- Fleet information

✨ **Historical Analysis** (Future Feature)
- Compare today's traffic vs last week
- Identify trends and patterns
- Show "historically busy" warnings

## Troubleshooting

### No logos appearing?
- Check that `AVIATIONSTACK_API_KEY` is set in Vercel
- Check browser console for errors
- Fallback to local names still works

### Rate limit errors?
- Free tier: 1 request/minute for some endpoints
- Cache reduces API calls significantly
- Consider upgrading if needed

### Historical data not working?
- Free tier only has last 3 months
- Dates older than 3 months return empty results

## Future Enhancements

Possible features with AviationStack:

1. **Historical Traffic Analysis**
   - "This airport was 20% busier last week"
   - "Typical Tuesday traffic: 45 flights"

2. **Airline Insights**
   - "TAP operates 15% of flights at this airport"
   - Fleet composition charts

3. **Aircraft Statistics**
   - "Most common aircraft: A320 family"
   - Age distribution of fleet

## Cost Comparison

| Plan | Price | Calls/Month | Best For |
|------|-------|-------------|----------|
| Free | $0 | 100 | Development, cache building |
| Basic | $49.99 | 10,000 | Production with historical data |
| Professional | $149.99 | 50,000 | High-traffic production |

For your use case, **Free tier is perfect** for enrichment data!
