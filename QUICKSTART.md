# 🚀 Quick Start Guide

Get your Portuguese Airport Queue Predictor running in 10 minutes!

## Prerequisites Checklist

- [ ] GitHub account
- [ ] Vercel account (free)
- [ ] FlightAware API key ([Get one here](https://www.flightaware.com/aeroapi/))

## 5-Step Deployment

### 1️⃣ Get Your FlightAware API Key (2 min)

1. Go to https://www.flightaware.com/aeroapi/
2. Sign up for a free account
3. Navigate to "API Keys" in your dashboard
4. Create a new key
5. **Copy your API key** - you'll need it soon!

### 2️⃣ Fork/Clone This Repository (1 min)

```bash
# Clone the repository
git clone <your-repo-url>
cd pt-airport-queue-predictor

# Or fork it on GitHub and clone your fork
```

### 3️⃣ Deploy to Vercel (3 min)

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

# Follow the prompts - it's super easy!
```

### 4️⃣ Add Your API Key to Vercel (2 min)

**Via Vercel Dashboard:**

1. Go to your project on [vercel.com](https://vercel.com)
2. Click on "Settings" tab
3. Click on "Environment Variables" in the sidebar
4. Add new variable:
   - **Name**: `FLIGHTAWARE_API_KEY`
   - **Value**: Paste your FlightAware API key
   - **Environments**: Select all three (Production, Preview, Development)
5. Click "Save"
6. Go back to "Deployments" and click "Redeploy" to apply the new environment variable

**Via CLI:**

```bash
vercel env add FLIGHTAWARE_API_KEY
# Paste your API key when prompted
# Select: Production, Preview, Development

# Redeploy
vercel --prod
```

### 5️⃣ Setup Auto-Deployment with GitHub Actions (2 min)

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
   
   Check the "Actions" tab in GitHub - you should see your workflow running! 🎉

## ✅ Verify Everything Works

1. Visit your Vercel deployment URL (shown in Vercel dashboard)
2. Select an airport (e.g., Lisbon)
3. Select today's date or tomorrow
4. Click "Predict Crowds"
5. You should see flight data and predictions!

## 🎉 You're Done!

Your app is now:
- ✅ Live on Vercel
- ✅ Using FlightAware API securely
- ✅ Auto-deploying on every push to main

## 🆘 Quick Troubleshooting

### "API key not configured" error
→ Make sure you added `FLIGHTAWARE_API_KEY` to Vercel environment variables and redeployed

### No flight data showing
→ Try a different date or airport. Some airports might have limited data.

### GitHub Actions failing
→ Check if `VERCEL_TOKEN` is correctly added to GitHub Secrets

### CORS errors
→ Clear your browser cache and try again. Make sure you're accessing via the Vercel URL, not localhost

## 📚 Next Steps

- Read the full [README.md](README.md) for customization options
- Adjust crowd level thresholds in `script.js`
- Add more airports to `index.html`
- Customize the design in `styles.css`

## 💡 Pro Tips

1. **Save Your API Key Safely**: Store it in a password manager
2. **Monitor Usage**: Check your FlightAware dashboard for API usage
3. **Test Different Airports**: Each airport has different traffic patterns
4. **Share Your URL**: The app is mobile-friendly - share it with friends!

---

Need help? Open an issue on GitHub! 🚀
