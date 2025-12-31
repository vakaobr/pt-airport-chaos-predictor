# 🇵🇹 Portuguese Airport Queue Predictor

A real-time web application that predicts crowd levels at Portuguese airports based on non-EU flight schedules using FlightAware API data.

![Screenshot](https://via.placeholder.com/800x400/0a4d68/ffffff?text=Airport+Queue+Predictor)

## 🌟 Features

- **Real-time Predictions**: Analyzes non-EU flight schedules to predict queue lengths
- **5 Major Airports**: Supports Lisbon, Porto, Faro, Funchal, and Ponta Delgada
- **Visual Analytics**: Beautiful crowd level indicators and flight schedules
- **Smart Recommendations**: Personalized travel tips based on predicted crowd levels
- **Secure API**: FlightAware API key stored securely in Vercel environment
- **Auto-deployment**: GitHub Actions automatically deploys to Vercel on merge to main

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Browser   │────────▶│    Vercel    │────────▶│  FlightAware    │
│  (Frontend) │         │ (Serverless) │         │      API        │
└─────────────┘         └──────────────┘         └─────────────────┘
     │                         │
     │                         │
     └─────────────────────────┘
           GitHub Actions
        (Auto-deployment)
```

## 📋 Prerequisites

1. **FlightAware API Key**
   - Sign up at [FlightAware AeroAPI](https://www.flightaware.com/aeroapi/)
   - Get your API key from the dashboard
   - Note: Free tier has limited requests

2. **Vercel Account**
   - Sign up at [Vercel](https://vercel.com)
   - Install Vercel CLI: `npm install -g vercel`

3. **GitHub Account**
   - Repository to host your code

## 🚀 Setup Instructions

### Step 1: Clone and Deploy to Vercel

1. **Fork or clone this repository**
   ```bash
   git clone <your-repo-url>
   cd pt-airport-queue-predictor
   ```

2. **Install Vercel CLI** (if not already installed)
   ```bash
   npm install -g vercel
   ```

3. **Login to Vercel**
   ```bash
   vercel login
   ```

4. **Deploy to Vercel**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Select "Yes" to link to existing project or create new one
   - Choose your project name
   - Select root directory

5. **Add FlightAware API Key to Vercel**
   
   Go to your Vercel dashboard:
   - Navigate to: Project Settings → Environment Variables
   - Add new variable:
     - **Name**: `FLIGHTAWARE_API_KEY`
     - **Value**: Your FlightAware API key
     - **Environment**: Production, Preview, Development (select all)
   - Click "Save"

   Or via CLI:
   ```bash
   vercel env add FLIGHTAWARE_API_KEY
   # Paste your API key when prompted
   ```

### Step 2: Setup GitHub Actions for Auto-Deployment

1. **Get Vercel Token**
   - Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
   - Create a new token
   - Copy the token value

2. **Add GitHub Secrets**
   
   In your GitHub repository:
   - Go to: Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Add the following secrets:
     
     **VERCEL_TOKEN**
     - Name: `VERCEL_TOKEN`
     - Value: Your Vercel token
     
     **VERCEL_ORG_ID** (optional but recommended)
     - Run: `vercel whoami` to get your team ID
     - Name: `VERCEL_ORG_ID`
     - Value: Your Vercel organization ID
     
     **VERCEL_PROJECT_ID** (optional but recommended)
     - Found in: Project Settings → General
     - Name: `VERCEL_PROJECT_ID`
     - Value: Your project ID

3. **Test the Workflow**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```
   
   The GitHub Action will automatically trigger and deploy to Vercel!

### Step 3: Verify Deployment

1. Check GitHub Actions tab to see deployment status
2. Visit your Vercel deployment URL
3. Test the application by selecting an airport and date

## 🔧 Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env` file**
   ```bash
   echo "FLIGHTAWARE_API_KEY=your_api_key_here" > .env
   ```

3. **Run development server**
   ```bash
   vercel dev
   ```
   
   Visit `http://localhost:3000`

## 📁 Project Structure

```
pt-airport-queue-predictor/
├── index.html              # Main HTML file
├── styles.css             # Styling with Portuguese-inspired design
├── script.js              # Frontend JavaScript
├── api/
│   └── predict.js         # Vercel serverless function
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions workflow
├── vercel.json            # Vercel configuration
├── package.json           # Node dependencies
└── README.md              # This file
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `FLIGHTAWARE_API_KEY` | Your FlightAware AeroAPI key | Yes |

## 🌐 API Endpoints

### GET `/api/predict`

Fetches flight data and predicts crowd levels.

**Query Parameters:**
- `airport` (required): IATA code (LIS, OPO, FAO, FNC, PDL)
- `date` (required): Date in YYYY-MM-DD format

**Example:**
```
GET /api/predict?airport=LIS&date=2024-12-25
```

**Response:**
```json
{
  "arrivals": [...],
  "departures": [...],
  "totalFlights": 45,
  "peakHour": "14:00 - 15:00",
  "peakFlights": [...],
  "flightsByHour": {...}
}
```

## 🎨 Design Features

- **Portuguese-inspired color palette**: Ocean blues, terracotta, cork, and sand tones
- **Responsive design**: Works on desktop, tablet, and mobile
- **Smooth animations**: CSS-based transitions and loading states
- **Accessibility**: Semantic HTML and ARIA labels

## 🛠️ Customization

### Adding More Airports

Edit `index.html` and add more options to the select element:

```html
<option value="XXX">Your Airport (XXX) - Name</option>
```

### Adjusting Crowd Level Thresholds

Edit `script.js` in the `calculateCrowdLevel` function:

```javascript
function calculateCrowdLevel(totalFlights) {
    if (totalFlights < 10) return 'low';
    if (totalFlights < 20) return 'medium';
    if (totalFlights < 35) return 'high';
    return 'very-high';
}
```

### Modifying EU Country List

Edit `api/predict.js` and update the `EU_COUNTRIES` array or `isEuAirport` function.

## 📊 FlightAware API Notes

- **Rate Limits**: Free tier has limited requests per month
- **Data Availability**: Historical data may have limitations
- **Coverage**: International flight coverage varies
- **Documentation**: [FlightAware AeroAPI Docs](https://www.flightaware.com/aeroapi/portal/documentation)

## 🐛 Troubleshooting

### API Key Not Working
- Verify the key is correctly set in Vercel environment variables
- Check if key has necessary permissions in FlightAware dashboard
- Ensure key is for AeroAPI v4

### GitHub Actions Failing
- Check if `VERCEL_TOKEN` secret is set correctly
- Verify the token has not expired
- Review GitHub Actions logs for specific errors

### No Flight Data Returned
- Verify the airport code is correct
- Check if the date is within FlightAware's available range
- Some airports may have limited data coverage

### CORS Errors
- Ensure API calls go through `/api/predict` endpoint
- Check Vercel function configuration
- Verify CORS headers in `api/predict.js`

## 📝 License

MIT License - Feel free to use and modify for your needs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions:
- Open an issue on GitHub
- Check FlightAware API documentation
- Review Vercel deployment logs

## 🎯 Future Enhancements

- [ ] Historical data analysis
- [ ] Email/SMS notifications for crowd levels
- [ ] Integration with real-time airport status
- [ ] Multi-language support
- [ ] Weather impact predictions
- [ ] Mobile app version

---

**Built with ❤️ for Portuguese travelers**
