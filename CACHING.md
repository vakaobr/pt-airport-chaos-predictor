# Caching System Documentation

## Overview

The Airport Queue Predictor implements a **two-tier caching system** to minimize API calls, reduce costs, and improve performance:

1. **Server-Side Cache** (In-Memory) - Vercel serverless functions
2. **Client-Side Cache** (LocalStorage + Memory) - Browser

## Architecture

```
User Request
    ↓
Frontend Cache (LocalStorage + Memory)
    ↓ (if miss)
Backend API (Vercel)
    ↓
Server Cache (In-Memory)
    ↓ (if miss)
External APIs (FlightAware, AviationStack)
```

## Server-Side Caching

### Location
`/lib/cache.js` - Shared cache module used by all API endpoints

### Features
- **In-memory storage** using JavaScript Map
- **TTL (Time To Live)** support
- **Automatic cleanup** of expired entries
- **Cache statistics** and monitoring

### Cache Durations

| Data Type | TTL | Reason |
|-----------|-----|--------|
| Flight predictions | 30 minutes | Schedules can change |
| Airline data | 7 days | Rarely changes |
| Aircraft data | 7 days | Static information |
| Historical data | 30 days | Never changes |

### Usage Example

```javascript
const apiCache = require('../lib/cache');

// Generate cache key
const cacheKey = apiCache.generateKey('flightaware', { airport: 'LIS', date: '2025-12-31' });

// Check cache
const cached = apiCache.get(cacheKey);
if (cached) {
    return res.json(cached);
}

// Fetch data...
const data = await fetchData();

// Store in cache (30 minutes)
apiCache.set(cacheKey, data, 30 * 60 * 1000);
```

### Benefits
- ✅ Reduces API calls to FlightAware (rate limits)
- ✅ Reduces API calls to AviationStack (100/month limit)
- ✅ Faster response times
- ✅ Lower costs

## Client-Side Caching

### Location
`/script.js` - FrontendCache class at the end of the file

### Features
- **Dual storage**: Memory (fast) + LocalStorage (persistent)
- **Survives page refresh**: Data persists across sessions
- **Automatic expiration**: Removes stale data
- **Fallback handling**: Works even if LocalStorage is disabled

### Cache Strategy

```
1. Check memory cache (fastest)
   ↓ miss
2. Check LocalStorage (persistent)
   ↓ miss
3. Fetch from API
   ↓
4. Store in both memory + LocalStorage
```

### Cache Durations

| Data Type | TTL | Storage |
|-----------|-----|---------|
| Flight predictions | 30 minutes | Memory + LocalStorage |
| Airline enrichment | 7 days | Memory + LocalStorage |
| Aircraft enrichment | 7 days | Memory + LocalStorage |

### Usage Example

```javascript
// Check cache
const cacheKey = frontendCache.key('prediction', { airport: 'LIS', date: '2025-12-31' });
const cached = frontendCache.get(cacheKey);

if (cached) {
    // Use cached data
    displayResults(cached);
    return;
}

// Fetch from API
const data = await fetch('/api/predict?...');

// Cache for 30 minutes
frontendCache.set(cacheKey, data, 30 * 60 * 1000);
```

### Benefits
- ✅ Instant loading on repeat visits
- ✅ Works offline (for cached data)
- ✅ Reduces server load
- ✅ Better user experience

## Cache Key Strategy

### Format
```
namespace:prefix:param1=value1&param2=value2
```

### Examples
```
airportQueue:prediction:airport=LIS&date=2025-12-31
airportQueue:airline:code=TAP
airportQueue:aircraft:code=A339
flightaware:airport=OPO&date=2025-12-31
aviationstack:code=MMZ&type=airline
```

### Benefits
- ✅ Unique keys prevent collisions
- ✅ Easy to debug (readable format)
- ✅ Namespace prevents conflicts
- ✅ Sorted params ensure consistency

## Cache Invalidation

### Automatic
- **Time-based**: Entries expire after TTL
- **Periodic cleanup**: Every 10 minutes (frontend), every hour (backend)
- **On page load**: Removes expired entries

### Manual
```javascript
// Clear specific entry
frontendCache.clear('airportQueue:prediction:airport=LIS&date=2025-12-31');

// Clear all cache
frontendCache.clear();

// Backend
apiCache.clear(); // Clear all
apiCache.clear(cacheKey); // Clear specific
```

## Monitoring

### Frontend Statistics
```javascript
console.log(frontendCache.getStats());
// {
//   memorySize: 15,
//   localStorageSize: 42,
//   totalSize: 57
// }
```

### Backend Logs
```
✅ CACHE HIT for: flightaware:airport=LIS&date=2025-12-31
❌ CACHE MISS for: flightaware:airport=OPO&date=2025-12-31
✅ Cached response for: flightaware:airport=OPO&date=2025-12-31 TTL: 1800 seconds
```

## API Call Reduction

### Without Caching
- User searches LIS for today: **2 API calls** (arrivals + departures)
- User refreshes page: **2 more API calls**
- User changes airport to OPO: **2 more API calls**
- **Total**: 6 API calls in 5 minutes

### With Caching
- User searches LIS for today: **2 API calls** → cached
- User refreshes page: **0 API calls** (from LocalStorage)
- User searches LIS again: **0 API calls** (from cache)
- User changes airport to OPO: **2 API calls** → cached
- **Total**: 4 API calls, 33% reduction

## Cost Savings

### FlightAware API
- **Rate limit**: Varies by plan
- **Caching**: Reduces API hits by ~40-60%
- **Savings**: Avoid rate limit errors, fewer required API calls

### AviationStack API
- **Free tier**: 100 calls/month
- **Caching**: 7-day TTL means ~20-30 unique airlines/aircraft
- **Savings**: ~30-50 API calls used to build complete cache
- **Result**: Stay within free tier!

## Best Practices

### 1. Cache Static Data Longer
```javascript
// Airline/aircraft data rarely changes
cacheTTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Flight schedules change frequently  
cacheTTL = 30 * 60 * 1000; // 30 minutes
```

### 2. Use Appropriate Keys
```javascript
// Good: Specific and unique
key('prediction', { airport: 'LIS', date: '2025-12-31' })

// Bad: Too generic
key('data', { type: 'flights' })
```

### 3. Handle Cache Errors Gracefully
```javascript
try {
    frontendCache.set(key, data);
} catch (e) {
    // LocalStorage might be full
    console.warn('Cache failed:', e);
    // Continue without caching
}
```

### 4. Show Cache Status to Users (Optional)
```javascript
if (data.cached) {
    console.log('✅ Using cached data from', data.cacheTime);
}
```

## Troubleshooting

### Issue: Cache Not Working
**Check:**
1. Is LocalStorage enabled in browser?
2. Are cache keys consistent?
3. Has TTL expired?
4. Check browser console for errors

### Issue: LocalStorage Full
**Solution:**
```javascript
frontendCache.cleanup(); // Remove expired entries
frontendCache.clear(); // Clear all (last resort)
```

### Issue: Stale Data
**Solution:**
- Reduce TTL for frequently changing data
- Manual cache clear
- User can hard refresh (Ctrl+Shift+R)

## Future Enhancements

1. **Cache warming**: Pre-cache common airports
2. **Service Worker**: Offline-first PWA
3. **IndexedDB**: For larger datasets
4. **Smart invalidation**: Clear cache on detected changes
5. **Cache size limits**: Prevent unlimited growth

## Summary

The two-tier caching system provides:
- ⚡ **Fast**: Instant responses from cache
- 💰 **Cost-effective**: Reduces API calls
- 🌐 **Resilient**: Works offline for cached data
- 📊 **Efficient**: Automatic cleanup and monitoring

**Result**: Better UX + Lower costs + Faster performance! 🎉
