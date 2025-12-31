# 🎯 Project Overview: Portuguese Airport Queue Predictor

## 📊 What This Project Does

This web application helps travelers predict crowd levels at Portuguese airports by analyzing non-EU flight schedules. It addresses the real problem of long passport control queues by forecasting busy periods based on flight data.

## 🏛️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  index.html + styles.css + script.js                     │  │
│  │  - Airport selection dropdown                             │  │
│  │  - Date picker                                            │  │
│  │  - Crowd visualization                                    │  │
│  │  - Flight schedules display                               │  │
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
│  │  - Receives airport & date                               │  │
│  │  - Validates parameters                                   │  │
│  │  - Securely stores API key                                │  │
│  │  - Processes flight data                                  │  │
│  │  - Calculates crowd predictions                           │  │
│  └──────────────────┬───────────────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────────────┘
                      │
                      │ HTTPS Request with API Key
                      │ Authorization: x-apikey: ***
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FLIGHTAWARE AEROAPI                            │
│  - Returns scheduled arrivals                                   │
│  - Returns scheduled departures                                 │
│  - Includes origin/destination data                             │
│  - Flight timing information                                    │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

1. **User Input** → User selects airport (LIS, OPO, FAO, FNC, PDL) and date
2. **Frontend Request** → JavaScript sends request to `/api/predict`
3. **API Processing** → Vercel serverless function:
   - Fetches flights from FlightAware API
   - Filters non-EU flights (those requiring passport control)
   - Groups flights by hour
   - Identifies peak periods
   - Calculates crowd level
4. **Response** → Returns JSON with predictions and flight details
5. **Visualization** → Frontend displays:
   - Crowd level meter (Quiet → Very Busy)
   - Peak hour flights list
   - Statistics (arrivals, departures, passengers)
   - Personalized travel tips

## 📂 File Structure

```
pt-airport-queue-predictor/
│
├── 🌐 Frontend Files
│   ├── index.html          # Main page structure
│   ├── styles.css          # Portuguese-inspired design
│   └── script.js           # Client-side logic & API calls
│
├── 🔧 Backend API
│   └── api/
│       └── predict.js      # Vercel serverless function
│                           # - Fetches FlightAware data
│                           # - Filters non-EU flights
│                           # - Analyzes crowd patterns
│
├── ⚙️ Configuration
│   ├── vercel.json         # Vercel deployment config
│   ├── package.json        # Node.js dependencies
│   └── .gitignore          # Git ignore rules
│
├── 🚀 CI/CD
│   └── .github/
│       └── workflows/
│           └── deploy.yml  # Auto-deploy on push to main
│
└── 📚 Documentation
    ├── README.md           # Full documentation
    ├── QUICKSTART.md       # 10-minute setup guide
    └── PROJECT_OVERVIEW.md # This file
```

## 🔑 Key Features Explained

### 1. Non-EU Flight Filtering
```javascript
// Only counts flights that require passport control
const EU_COUNTRIES = ['PT', 'ES', 'FR', 'DE', ...];

// Filters flights based on ICAO codes
function isEuAirport(icaoCode) {
    // Checks if origin/destination is EU
    // Non-EU flights = passport control needed
}
```

### 2. Crowd Level Calculation
```javascript
// Based on number of non-EU flights per day
Quiet      : < 10 flights
Moderate   : 10-19 flights
Busy       : 20-34 flights
Very Busy  : 35+ flights
```

### 3. Peak Hour Detection
```javascript
// Groups flights by hour
// Identifies busiest hour
// Shows up to 10 flights in peak period
```

### 4. Passenger Estimation
```javascript
// Average 180 passengers per flight
// (Mix of short-haul and long-haul)
totalPassengers = totalFlights × 180
```

## 🎨 Design Philosophy

**Portuguese-Inspired Color Palette:**
- 🌊 Ocean Blue (`#0a4d68`) - Primary brand color
- 🏖️ Sand (`#e8d5b7`) - Background tone
- 🧱 Terracotta (`#c85c5c`) - Accent color
- 🌰 Cork (`#8b7355`) - Secondary text

**Typography:**
- Display: Crimson Pro (elegant serif)
- Body: Manrope (modern sans-serif)

**Animation Strategy:**
- Smooth entrance animations (slide up/down)
- Interactive hover states
- Loading spinners
- Progress bar animations

## 🔒 Security Implementation

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
```bash
# Stored in Vercel dashboard
FLIGHTAWARE_API_KEY=your_secret_key

# Never committed to Git
# Never exposed to browser
# Only accessible to serverless functions
```

## 🚀 Deployment Pipeline

```
Developer                    GitHub                   Vercel
    │                          │                        │
    │  1. git push origin main │                        │
    ├───────────────────────────>                       │
    │                          │                        │
    │                          │  2. Trigger Action     │
    │                          │  (.github/workflows)   │
    │                          │                        │
    │                          │  3. Deploy via API     │
    │                          ├───────────────────────>│
    │                          │                        │
    │                          │                        │  4. Build & Deploy
    │                          │                        │  - Install dependencies
    │                          │                        │  - Build static files
    │                          │                        │  - Deploy serverless functions
    │                          │                        │
    │                          │  5. Deployment Complete│
    │                          │<───────────────────────┤
    │                          │                        │
    │  6. Notification         │                        │
    │<─────────────────────────┤                        │
    │                          │                        │
```

## 📊 API Response Example

```json
{
  "arrivals": [
    {
      "flightNumber": "TP1234",
      "airline": "TAP Air Portugal",
      "origin": "New York",
      "scheduledTime": "2024-12-25T10:30:00Z",
      "type": "arrival"
    }
  ],
  "departures": [
    {
      "flightNumber": "TP5678",
      "airline": "TAP Air Portugal",
      "destination": "São Paulo",
      "scheduledTime": "2024-12-25T14:15:00Z",
      "type": "departure"
    }
  ],
  "totalFlights": 42,
  "peakHour": "14:00 - 15:00",
  "peakFlights": [...],
  "flightsByHour": {
    "10": [...],
    "11": [...],
    "14": [...]
  }
}
```

## 🎯 Supported Airports

| IATA | Airport Name | Location |
|------|-------------|----------|
| LIS | Humberto Delgado | Lisbon |
| OPO | Francisco Sá Carneiro | Porto |
| FAO | Faro Airport | Algarve |
| FNC | Cristiano Ronaldo | Funchal, Madeira |
| PDL | João Paulo II | Ponta Delgada, Azores |

## 💡 Use Cases

1. **Travelers Planning Arrival Time**
   - Check queue predictions before booking flights
   - Decide whether to take earlier/later flights

2. **Airport Operations**
   - Identify peak periods needing extra staff
   - Optimize resource allocation

3. **Travel Agencies**
   - Advise clients on best travel times
   - Provide value-added service

4. **Travel Bloggers/Content Creators**
   - Share crowd predictions with audience
   - Embed widget on travel websites

## 🔮 Future Enhancement Ideas

- 📱 Mobile app (React Native)
- 📧 Email alerts for busy days
- 🌤️ Weather impact integration
- 📈 Historical trend analysis
- 🗺️ Real-time airport status integration
- 🌍 Multi-language support (PT, EN, ES, FR)
- 🔔 Push notifications
- 📊 Advanced analytics dashboard
- 🤖 ML-based predictions
- 🔗 Integration with booking platforms

## 📈 Success Metrics

- ⏱️ **Load Time**: < 2 seconds
- 📊 **API Response Time**: < 3 seconds
- 🎯 **Prediction Accuracy**: Based on real flight data
- 📱 **Mobile Responsiveness**: 100% mobile-friendly
- ♿ **Accessibility**: WCAG 2.1 AA compliant
- 🔒 **Security**: API key never exposed

## 🛠️ Technologies Used

| Category | Technology | Purpose |
|----------|-----------|---------|
| Frontend | HTML5, CSS3, JavaScript | User interface |
| Hosting | Vercel | Static files + serverless |
| API | FlightAware AeroAPI | Flight data |
| CI/CD | GitHub Actions | Auto-deployment |
| Version Control | Git / GitHub | Code management |
| Design | Google Fonts | Typography |

## 📞 Support & Resources

- 📖 [README.md](README.md) - Full documentation
- 🚀 [QUICKSTART.md](QUICKSTART.md) - 10-minute setup
- 🔗 [FlightAware API Docs](https://www.flightaware.com/aeroapi/portal/documentation)
- 🔗 [Vercel Documentation](https://vercel.com/docs)
- 🔗 [GitHub Actions Guide](https://docs.github.com/en/actions)

---

**Made with ❤️ to help travelers navigate Portuguese airports more efficiently**
