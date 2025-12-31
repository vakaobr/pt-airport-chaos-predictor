# 🇵🇹 Portuguese Airport Queue Predictor

**NOTE**: This is a 100% vibe-coding application, errors are expected, so bear with me!

> Real-time crowd forecasting for Portuguese airports based on non-EU flight schedules, created in response to recent border control chaos.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![Vercel](https://img.shields.io/badge/deployed-vercel-black.svg)

**Live Demo**: [Your Vercel URL Here]

---

## 📰 Why This Tool Exists

Following recent chaos at Portuguese airports due to border control suspensions and severe staff shortages, travelers are facing unprecedented wait times. This tool helps you predict crowd levels and plan accordingly.

**Recent News:**
- [AMAN Alliance: Border Control Chaos Updates](https://www.aman-alliance.org/Home/ContentDetail/98848)
- [Portuguese VIP writes to PM over continuing border chaos](https://www.portugalresident.com/portuguese-vip-writes-to-pm-over-continuing-border-chaos-at-lisbon-airport/)
- [Government accused of incompetence after border suspension](https://www.theportugalnews.com/news/2025-12-30/government-accused-of-incompetence-after-border-suspension-at-lisbon-airport/938226)

---

## 🌟 Features

- ✅ **Real-time Predictions** - Analyzes non-EU flight schedules to predict queue lengths
- ✈️ **5 Major Airports** - Supports Lisbon, Porto, Faro, Funchal, and Ponta Delgada
- 📊 **Visual Analytics** - Beautiful crowd level indicators and interactive flight schedules
- 💡 **Smart Recommendations** - Survival tips based on predicted crowd levels (bring a stool, powerbank, snacks!)
- 🔒 **Secure API** - FlightAware API key stored securely in Vercel environment
- 🚀 **Auto-deployment** - GitHub Actions automatically deploys to Vercel
- 📸 **Real Aircraft Photos** - Integration with Planespotters.net for actual plane photos
- ⚡ **Two-Tier Caching** - Fast performance with server & client-side caching

---

## 🚀 Quick Start (10 Minutes)

<details>
<summary><b>📋 Prerequisites Checklist</b></summary>

- [ ] GitHub account
- [ ] Vercel account ([Sign up free](https://vercel.com))
- [ ] FlightAware API key ([Get one here](https://www.flightaware.com/aeroapi/))

</details>

<details>
<summary><b>1️⃣ Get Your FlightAware API Key (2 min)</b></summary>

1. Go to https://www.flightaware.com/aeroapi/
2. Sign up for a free account
3. Navigate to "API Keys" in your dashboard
4. Create a new key
5. **Copy your API key** - you'll need it soon!

</details>

<details>
<summary><b>2️⃣ Fork/Clone Repository (1 min)</b></summary>

```bash
# Clone the repository
git clone <your-repo-url>
cd pt-airport-queue-predictor

# Or fork it on GitHub and clone your fork
```

</details>

<details>
<summary><b>3️⃣ Deploy to Vercel (3 min)</b></summary>

**Option A: Via Vercel Website (Easier)**

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Connect your GitHub repository
4. Click "Deploy"
5. Wait for deployment to complete

**Option B: Via CLI (Faster)**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel
```

</details>

<details>
<summary><b>4️⃣ Add API Key to Vercel (2 min)</b></summary>

**Via Vercel Dashboard:**

1. Go to your project on [vercel.com](https://vercel.com)
2. Click "Settings" → "Environment Variables"
3. Add new variable:
   - **Name**: `FLIGHTAWARE_API_KEY`
   - **Value**: Your FlightAware API key
   - **Environments**: Production, Preview, Development (all)
4. Click "Save"
5. Go to "Deployments" → Click "Redeploy"

**Via CLI:**

```bash
vercel env add FLIGHTAWARE_API_KEY
# Paste your API key when prompted

# Redeploy
vercel --prod
```

</details>

<details>
<summary><b>5️⃣ Setup Auto-Deployment (2 min)</b></summary>

1. **Get Vercel Token**:
   - Go to https://vercel.com/account/tokens
   - Create new token
   - Copy the token

2. **Add to GitHub Secrets**:
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `VERCEL_TOKEN`
   - Value: Paste your Vercel token
   - Click "Add secret"

3. **Test it**:
   ```bash
   git add .
   git commit -m "Setup auto-deployment"
   git push origin main
   ```

✅ Done! Check the "Actions" tab in GitHub to see deployment running.

</details>

---

## 🏗️ Architecture & Technical Details

<details>
<summary><b>📊 System Architecture</b></summary>

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Frontend (HTML/CSS/JS)                                   │  │
│  │  - Airport selection dropdown                             │  │
│  │  - Date picker                                            │  │
│  │  - Crowd visualization                                    │  │
│  │  - Flight schedules with tooltips                         │  │
│  │  - Client-side cache (LocalStorage)                       │  │
│  └──────────────────┬───────────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────────┘
                      │
                      │ HTTPS Request
                      │ GET /api/predict?airport=LIS&date=2024-12-25
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL PLATFORM                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Serverless Function (api/predict.js)                    │  │
│  │  - Validates parameters                                   │  │
│  │  - Server-side cache (in-memory)                          │  │
│  │  - Processes flight data                                  │  │
│  │  - Calculates predictions                                 │  │
│  └──────────────────┬───────────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────────┘
                      │
                      │ HTTPS Request + API Key
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FLIGHTAWARE AEROAPI                            │
│  - Scheduled arrivals & departures                              │
│  - Origin/destination data                                      │
│  - Aircraft types & registrations                               │
│  - Flight timing information                                    │
└─────────────────────────────────────────────────────────────────┘
                      │
                      │ (Optional enrichment)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PLANESPOTTERS API                              │
│  - Real aircraft photos by tail number                          │
│  - Photographer credits                                         │
└─────────────────────────────────────────────────────────────────┘
```

</details>

<details>
<summary><b>📁 Project Structure</b></summary>

```
pt-airport-queue-predictor/
│
├── 🌐 Frontend Files
│   ├── index.html          # Main page structure
│   ├── styles.css          # Portuguese-inspired design
│   └── script.js           # Client-side logic & caching
│
├── 🔧 Backend API
│   ├── api/
│   │   ├── predict.js      # Main prediction endpoint
│   │   └── aviationstack.js # Optional enrichment API
│   └── lib/
│       └── cache.js        # Shared caching module
│
├── ⚙️ Configuration
│   ├── vercel.json         # Vercel deployment config
│   ├── package.json        # Node.js dependencies
│   └── .gitignore          # Git ignore rules
│
├── 🚀 CI/CD
│   └── .github/
│       └── workflows/
│           └── deploy.yml  # Auto-deploy on push
│
└── 📚 Documentation
    └── README.md           # This file
```

</details>

<details>
<summary><b>🔄 Data Flow</b></summary>

1. **User Input** → User selects airport (LIS, OPO, FAO, FNC, PDL) and date
2. **Frontend Cache Check** → Check LocalStorage + memory cache
3. **API Request** → If cache miss, send request to `/api/predict`
4. **Server Cache Check** → Backend checks in-memory cache
5. **FlightAware API** → If cache miss, fetch from FlightAware
6. **Data Processing**:
   - Filter non-EU flights (requiring passport control)
   - Group flights by hour
   - Identify peak periods
   - Calculate crowd level
   - Extract aircraft registrations
7. **Response** → Return JSON with predictions
8. **Planespotters Enrichment** → Frontend fetches real aircraft photos
9. **Visualization** → Display results with interactive tooltips

</details>

<details>
<summary><b>🎨 Design Philosophy</b></summary>

**Portuguese-Inspired Color Palette:**
- 🌊 Ocean Blue (`#0a4d68`) - Primary brand color
- 🏖️ Sand (`#e8d5b7`) - Background tone
- 🧱 Terracotta (`#c85c5c`) - Warning/accent color
- 🌰 Cork (`#8b7355`) - Secondary text

**Typography:**
- Display: Crimson Pro (elegant serif)
- Body: Manrope (modern sans-serif)

**Key Design Features:**
- Smooth entrance animations (slide up/fade in)
- Interactive hover states with tooltips
- Responsive grid layouts
- Progressive disclosure (collapsible sections)
- Loading states with spinners
- Accessible ARIA labels

</details>

<details>
<summary><b>🔒 Security Implementation</b></summary>

### API Key Protection

```
❌ WRONG: Store API key in frontend JavaScript
✅ RIGHT: Store in Vercel environment variables

Frontend (script.js)
  ↓
/api/predict (serverless function)
  ↓ [API key is server-side only]
FlightAware API
```

### Environment Variables
- Stored in Vercel dashboard (not in Git)
- Never exposed to browser
- Only accessible to serverless functions
- Can be different per environment (dev/preview/production)

### Best Practices
- ✅ Use environment variables for all secrets
- ✅ Never commit `.env` files
- ✅ Validate all user inputs
- ✅ Sanitize API responses
- ✅ Use HTTPS for all requests

</details>

---

## ⚡ Caching System

<details>
<summary><b>🚀 Two-Tier Caching Architecture</b></summary>

We implement **dual caching** to minimize API calls and improve performance:

### 1. Server-Side Cache (In-Memory)
**Location**: `/lib/cache.js`

**Features**:
- In-memory storage using JavaScript Map
- TTL (Time To Live) support
- Automatic cleanup of expired entries
- Cache statistics and monitoring

**Cache Durations**:
| Data Type | TTL | Reason |
|-----------|-----|--------|
| Flight predictions | 30 minutes | Schedules can change |
| Airline data | 7 days | Rarely changes |
| Aircraft data | 7 days | Static information |
| Historical data | 30 days | Never changes |

### 2. Client-Side Cache (LocalStorage + Memory)
**Location**: `/script.js` - FrontendCache class

**Features**:
- Dual storage: Memory (fast) + LocalStorage (persistent)
- Survives page refresh
- Automatic expiration
- Graceful fallback if LocalStorage disabled

**Cache Strategy**:
```
1. Check memory cache (fastest)
   ↓ miss
2. Check LocalStorage (persistent)
   ↓ miss
3. Fetch from API
   ↓
4. Store in both memory + LocalStorage
```

### Performance Impact

**Without Caching**:
- User searches LIS → 2 API calls
- User refreshes → 2 API calls
- User searches LIS again → 2 API calls
- **Total**: 6 calls in 5 minutes

**With Caching**:
- User searches LIS → 2 API calls → cached
- User refreshes → 0 calls (LocalStorage)
- User searches LIS again → 0 calls (cache)
- **Total**: 2 calls, **67% reduction**

</details>

<details>
<summary><b>💰 Cost Savings</b></summary>

### FlightAware API
- **Caching reduces hits by 40-60%**
- Avoids rate limit errors
- Fewer required API tier upgrades

### AviationStack API (Optional)
- **Free tier**: 100 calls/month
- **With caching**: ~30-50 calls to build cache
- **Result**: Stay within free tier! ✅

### Example Monthly Savings
- Without cache: ~2,000 API calls/month
- With cache: ~800 API calls/month
- **Savings**: 60% reduction in API usage

</details>

<details>
<summary><b>🔧 Cache Management</b></summary>

### Automatic Cleanup
- **Time-based**: Entries expire after TTL
- **Periodic**: Every 10 min (frontend), every hour (backend)
- **On load**: Removes expired entries

### Manual Cache Clear

**Via Clear Cache Button** (Easiest):
- Scroll to the footer
- Click the "🗑️ Clear Cache" button
- Confirm the action

**Frontend** (Browser Console):
```javascript
// Clear all cache
frontendCache.clear();

// Clear specific entry
frontendCache.clear('airportQueue:prediction:airport=LIS&date=2025-12-31');

// View stats
console.log(frontendCache.getStats());
```

**Via Browser DevTools**:
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Local Storage" → Your domain
4. Delete entries starting with "airportQueue:"

**Hard Refresh** (Quick method):
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Backend**: Cache clears automatically on Vercel function cold start

</details>

---

## 🎯 Features & Usage

<details>
<summary><b>🌍 Supported Airports</b></summary>

| IATA | Airport Name | Location |
|------|-------------|----------|
| **LIS** | Humberto Delgado | Lisbon |
| **OPO** | Francisco Sá Carneiro | Porto |
| **FAO** | Faro Airport | Algarve |
| **FNC** | Cristiano Ronaldo | Funchal, Madeira |
| **PDL** | João Paulo II | Ponta Delgada, Azores |

</details>

<details>
<summary><b>📊 Crowd Level Calculation</b></summary>

Based on number of non-EU flights per day:

| Level | Flights | Wait Time | Badge Color |
|-------|---------|-----------|-------------|
| **Quiet** | < 10 | Minimal | 🟢 Green |
| **Moderate** | 10-19 | 30-60 min | 🟡 Yellow |
| **Busy** | 20-34 | 60-90 min | 🟠 Orange |
| **Very Busy** | 35+ | 90+ min | 🔴 Red |

### Why Non-EU Flights?

Only flights from **non-EU/Schengen countries** require passport control:
- ✅ USA, UK, Brazil, Canada → **Passport control required**
- ❌ Spain, France, Germany → **No passport control** (Schengen)

This makes non-EU flight count the best predictor of queue length!

</details>

<details>
<summary><b>💡 Smart Travel Tips by Crowd Level</b></summary>

### Quiet (< 10 flights)
- Arrive 90 minutes before departure
- Minimal queues expected
- Use automated passport gates

### Moderate (10-19 flights)
- Arrive 2 hours before departure
- Bring water bottle
- Download airport wifi info

### Busy (20-34 flights) - 30-60 min waits
- Arrive 2.5 hours before departure
- **Essentials**:
  - ⚡ Powerbank
  - 🪑 Portable stool
  - 🥤 Snacks & water
  - 📱 Airport wifi

### Very Busy (35+ flights) - 1-2+ hour waits
- Arrive 3+ hours before departure
- **SURVIVAL KIT**:
  - 🪑 Portable stool/cushion (ESSENTIAL)
  - ⚡ Powerbank (CRITICAL)
  - 🍫 Substantial snacks
  - 💧 Refillable water bottle
  - 📱 Offline entertainment (movies/books/podcasts)
  - 💊 Medications in carry-on
  - 🧘 Meditation apps
- Consider fast-track services
- ⏰ Budget even MORE time given recent chaos

</details>

<details>
<summary><b>✈️ Real Aircraft Photos</b></summary>

### Planespotters Integration

We fetch real aircraft photos using tail numbers from FlightAware:

1. **FlightAware provides**: Aircraft registration (e.g., CS-TUA, D2-TEJ)
2. **Planespotters API**: Returns random photo of that specific aircraft
3. **Photo preference**: `thumbnail_large` (419×280px) → `thumbnail` (200×133px)
4. **Photographer credit**: Displayed below aircraft name

### Fallback Chain
1. **Planespotters** - Real photo of specific aircraft
2. **Aviapages** - Generic aircraft type photo
3. **AirHex** - Aircraft silhouette
4. **SVG** - Custom ocean-themed plane illustration

### Example Tooltip
```
┌─────────────────────────────┐
│  [Real Photo of Aircraft]   │
│                             │
│ Boeing 777-300 · D2-TEJ     │
│ Photo by: Mohit Purswani    │
└─────────────────────────────┘
```

</details>

---

## 🔧 Configuration & Customization

<details>
<summary><b>⚙️ Environment Variables</b></summary>

| Variable | Description | Required |
|----------|-------------|----------|
| `FLIGHTAWARE_API_KEY` | Your FlightAware AeroAPI key | ✅ Yes |
| `AVIATIONSTACK_API_KEY` | AviationStack API (optional enrichment) | ❌ No |

**Setting in Vercel**:
```bash
vercel env add FLIGHTAWARE_API_KEY
vercel env add AVIATIONSTACK_API_KEY  # optional
```

</details>

<details>
<summary><b>🛠️ Adding More Airports</b></summary>

Edit `index.html` and add to the select element:

```html
<select id="airport" class="input-select">
    <option value="">Choose an airport...</option>
    <option value="LIS">Lisbon (LIS) - Humberto Delgado</option>
    <option value="OPO">Porto (OPO) - Francisco Sá Carneiro</option>
    <option value="FAO">Faro (FAO) - Algarve</option>
    <option value="FNC">Funchal (FNC) - Madeira</option>
    <option value="PDL">Ponta Delgada (PDL) - Azores</option>
    <!-- Add your new airport here -->
    <option value="XXX">Your Airport (XXX) - Name</option>
</select>
```

</details>

<details>
<summary><b>📊 Adjusting Crowd Thresholds</b></summary>

Edit `script.js` in the `calculateCrowdLevel` function:

```javascript
function calculateCrowdLevel(totalFlights) {
    if (totalFlights < 10) return 'low';       // Adjust: < 10 flights
    if (totalFlights < 20) return 'medium';    // Adjust: 10-19 flights
    if (totalFlights < 35) return 'high';      // Adjust: 20-34 flights
    return 'very-high';                        // Adjust: 35+ flights
}
```

Customize based on your airport's typical traffic patterns!

</details>

<details>
<summary><b>🎨 Customizing Design</b></summary>

### Colors
Edit `styles.css` root variables:

```css
:root {
    --color-ocean: #0a4d68;        /* Primary blue */
    --color-ocean-light: #088395;  /* Light blue */
    --color-sand: #e8d5b7;         /* Background */
    --color-terracotta: #c85c5c;   /* Warning red */
    --color-cork: #8b7355;         /* Secondary */
}
```

### Typography
Change fonts in `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&family=Crimson+Pro:wght@400;600&display=swap" rel="stylesheet">
```

</details>

---

## 🐛 Troubleshooting

<details>
<summary><b>❌ Common Issues & Solutions</b></summary>

### API Key Not Working
**Symptoms**: "API key not configured" error

**Solutions**:
1. Verify key is set in Vercel environment variables
2. Check if key has necessary permissions in FlightAware dashboard
3. Ensure you're using AeroAPI v4 key
4. Redeploy after adding environment variable

### No Flight Data Returned
**Symptoms**: Empty results or "No flights found"

**Solutions**:
1. Verify airport code is correct (LIS, OPO, FAO, FNC, PDL)
2. Check if date is within FlightAware's range (today + 2 days)
3. Some airports may have limited data coverage
4. Try a different date or airport

### GitHub Actions Failing
**Symptoms**: Red X on GitHub Actions

**Solutions**:
1. Check if `VERCEL_TOKEN` secret is set correctly
2. Verify token hasn't expired
3. Review GitHub Actions logs for specific errors
4. Ensure repository has correct permissions

### CORS Errors
**Symptoms**: Cross-origin errors in browser console

**Solutions**:
1. Ensure API calls go through `/api/predict` endpoint
2. Check Vercel function configuration
3. Clear browser cache and hard refresh (Ctrl+Shift+R)
4. Verify you're using Vercel URL, not localhost

### Images Not Loading
**Symptoms**: Broken image icons in tooltips

**Solutions**:
1. Check browser console for 404 errors
2. Verify Planespotters API is accessible
3. Aircraft may not have registration data (shows SVG fallback)
4. Clear browser cache

### Cache Not Working
**Symptoms**: Slow repeated requests, or stale/old data showing

**Solutions**:
1. **Click the "🗑️ Clear Cache" button** in the footer (easiest)
2. Check if LocalStorage is enabled in browser
3. Verify cache TTL hasn't expired
4. Open browser DevTools → Application → LocalStorage
5. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
6. Manual clear in console: `frontendCache.clear()`

### Rate Limit Errors from Cache
**Symptoms**: "Rate limit exceeded" showing from cached data

**Cause**: The cached response contains a rate limit error from a previous request

**Solutions**:
1. **Click "🗑️ Clear Cache" button** in footer
2. Wait a few minutes for rate limits to reset
3. Try searching again with fresh data

</details>

<details>
<summary><b>🔍 Debugging Tips</b></summary>

### Enable Debug Logging

**Frontend** (Browser Console):
```javascript
// View cache stats
console.log(frontendCache.getStats());

// Check specific cache entry
const key = 'airportQueue:prediction:airport=LIS&date=2025-12-31';
console.log(frontendCache.get(key));

// Enable verbose logging
localStorage.setItem('debug', 'true');
```

**Backend** (Vercel Logs):
1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. View real-time function logs

### Common Log Messages
- ✅ `CACHE HIT for: flightaware:airport=LIS...` - Using cache
- ❌ `CACHE MISS for: flightaware:airport=LIS...` - Fetching new data
- 🌐 `Fetching arrivals page 1 from: https://...` - API request
- ✈️ `Found photo for CS-TUA by Mohit Purswani` - Planespotters success

</details>

---

## 📊 API Documentation

<details>
<summary><b>🔌 Main Prediction Endpoint</b></summary>

### GET `/api/predict`

Fetches flight data and predicts crowd levels.

**Query Parameters**:
- `airport` (required): IATA code (LIS, OPO, FAO, FNC, PDL)
- `date` (required): Date in YYYY-MM-DD format (today + 2 days max)

**Example Request**:
```
GET /api/predict?airport=LIS&date=2025-12-31
```

**Example Response**:
```json
{
  "arrivals": [
    {
      "flightNumber": "TAP1234",
      "airline": "TAP",
      "origin": "New York",
      "scheduledTime": "2025-12-31T10:30:00Z",
      "estimatedTime": "2025-12-31T10:35:00Z",
      "type": "arrival",
      "aircraftType": "A339",
      "aircraftRegistration": "CS-TUA",
      "estimatedPassengers": 298,
      "countryCode": "US",
      "countryName": "United States"
    }
  ],
  "departures": [...],
  "totalFlights": 42,
  "totalPassengers": 7560,
  "peakHour": "14:00 - 15:00",
  "peakFlights": [...],
  "flightsByHour": {...}
}
```

</details>

<details>
<summary><b>📸 Planespotters Integration</b></summary>

### Client-Side Fetch

The frontend automatically fetches aircraft photos after displaying the timetable.

**API Endpoint**:
```
GET https://api.planespotters.net/pub/photos/reg/{registration}
```

**Example Response**:
```json
{
  "photos": [
    {
      "thumbnail_large": {
        "src": "https://t.plnspttrs.net/.../cs-tua_280.jpg",
        "size": {"width": 419, "height": 280}
      },
      "photographer": "Mohit Purswani"
    }
  ]
}
```

**No API Key Required** - Public endpoint ✅

</details>

---

## 🚀 Deployment & CI/CD

<details>
<summary><b>🔄 GitHub Actions Workflow</b></summary>

Automatic deployment on every push to `main`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
```

</details>

<details>
<summary><b>💻 Local Development</b></summary>

```bash
# Clone repository
git clone <your-repo-url>
cd pt-airport-queue-predictor

# Install dependencies
npm install

# Create .env file
echo "FLIGHTAWARE_API_KEY=your_key_here" > .env

# Start development server
vercel dev
```

Visit `http://localhost:3000`

</details>

---

## 🎯 Future Enhancements

<details>
<summary><b>🔮 Planned Features</b></summary>

- [ ] 📱 Mobile app (React Native/PWA)
- [ ] 📧 Email/SMS alerts for crowd levels
- [ ] 🌤️ Weather impact integration
- [ ] 📈 Historical trend analysis
- [ ] 🗺️ Real-time airport status integration
- [ ] 🌍 Multi-language support (PT, EN, ES, FR, DE)
- [ ] 🔔 Push notifications
- [ ] 📊 Advanced analytics dashboard
- [ ] 🤖 ML-based predictions
- [ ] 🔗 Integration with booking platforms

</details>

---

## 📝 License & Contributing

<details>
<summary><b>📄 License</b></summary>

MIT License - Feel free to use and modify.

</details>

<details>
<summary><b>🤝 Contributing</b></summary>

Contributions are welcome!

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

</details>

---

## 📞 Support & Resources

<details>
<summary><b>🔗 Useful Links</b></summary>

- 📖 [FlightAware AeroAPI Documentation](https://www.flightaware.com/aeroapi/portal/documentation)
- 🚀 [Vercel Documentation](https://vercel.com/docs)
- 🔧 [GitHub Actions Guide](https://docs.github.com/en/actions)
- 📸 [Planespotters API](https://www.planespotters.net/photo/api)

</details>

<details>
<summary><b>❓ Getting Help</b></summary>

- 💬 Open a [GitHub Discussion](../../discussions)
- 🐛 Report bugs via [GitHub Issues](../../issues)
- 📧 Email: [your-email@example.com]

</details>

---

## 🎉 Acknowledgments

<details>
<summary><b>🙏 Credits & Thanks</b></summary>

- **FlightAware** - Flight data API
- **Planespotters.net** - Aircraft photos
- **Vercel** - Serverless hosting
- **GitHub** - Repository hosting and Actions
- **Portuguese Aviation Community** - Inspiration and feedback

### Data Sources
- ✈️ Flight data: [FlightAware AeroAPI](https://www.flightaware.com/aeroapi/)
- 📸 Aircraft photos: [Planespotters.net](https://www.planespotters.net/)
- 🏳️ Country flags: [FlagCDN](https://flagcdn.com/)
- ✈️ Airline logos: [GitHub Open Source Collections](https://github.com/)

</details>

---

<div align="center">

**Made with ❤️ to help travelers navigate Portuguese airports**

🇵🇹 **Portugal** | ✈️ **Aviation** | 🚀 **Technology**

[⭐ Star this repo](../../stargazers) · [🐛 Report Bug](../../issues) · [💡 Request Feature](../../issues)

---

*Last updated: December 31, 2025*

</div>
