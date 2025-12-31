// EU Countries (for filtering non-EU flights)
const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH'
];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    const airportSelect = document.getElementById('airport');
    const dateInput = document.getElementById('date');
    const predictBtn = document.getElementById('predictBtn');

    // Set min date to today and max to 7 days from now
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 7);
    
    dateInput.min = today.toISOString().split('T')[0];
    dateInput.max = maxDate.toISOString().split('T')[0];
    dateInput.value = today.toISOString().split('T')[0];

    // Enable button when both inputs are selected
    const checkInputs = () => {
        predictBtn.disabled = !airportSelect.value || !dateInput.value;
    };

    airportSelect.addEventListener('change', checkInputs);
    dateInput.addEventListener('change', checkInputs);

    // Handle predict button click
    predictBtn.addEventListener('click', async () => {
        const airport = airportSelect.value;
        const date = dateInput.value;
        
        if (airport && date) {
            await fetchAndDisplayPrediction(airport, date);
        }
    });
});

// Fetch prediction data from API
async function fetchAndDisplayPrediction(airport, date) {
    const resultsSection = document.getElementById('resultsSection');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');

    // Show loading state
    resultsSection.classList.remove('hidden');
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    error.classList.add('hidden');

    try {
        // Call the Vercel serverless API
        const response = await fetch(`/api/predict?airport=${airport}&date=${date}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Hide loading and show results
        loading.classList.add('hidden');
        results.classList.remove('hidden');
        
        displayResults(data);
    } catch (err) {
        console.error('Error fetching prediction:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        error.textContent = `Failed to fetch data: ${err.message}. Please check your API configuration and try again.`;
    }
}

// Display the prediction results
function displayResults(data) {
    // Update crowd level badge and meter
    const crowdLevel = calculateCrowdLevel(data.totalFlights);
    updateCrowdDisplay(crowdLevel, data.totalFlights);

    // Update statistics
    document.getElementById('arrivals').textContent = data.arrivals.length;
    document.getElementById('departures').textContent = data.departures.length;
    document.getElementById('totalPassengers').textContent = estimatePassengers(data.totalFlights).toLocaleString();
    document.getElementById('peakTime').textContent = data.peakHour || 'N/A';

    // Display peak hour flights
    displayFlights(data.peakFlights);

    // Display travel tips
    displayTravelTips(crowdLevel);
}

// Calculate crowd level based on number of flights
function calculateCrowdLevel(totalFlights) {
    if (totalFlights < 10) return 'low';
    if (totalFlights < 20) return 'medium';
    if (totalFlights < 35) return 'high';
    return 'very-high';
}

// Update crowd display elements
function updateCrowdDisplay(level, totalFlights) {
    const badge = document.getElementById('crowdBadge');
    const bar = document.getElementById('crowdBar');

    const levels = {
        'low': { text: 'Quiet', color: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)', width: '25%' },
        'medium': { text: 'Moderate', color: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)', width: '50%' },
        'high': { text: 'Busy', color: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)', width: '75%' },
        'very-high': { text: 'Very Busy', color: 'linear-gradient(90deg, #991b1b 0%, #7f1d1d 100%)', width: '100%' }
    };

    const config = levels[level];
    badge.textContent = config.text;
    badge.className = `crowd-badge ${level}`;
    bar.style.background = config.color;
    bar.style.width = config.width;
}

// Display flight list
function displayFlights(flights) {
    const flightsList = document.getElementById('flightsList');
    
    if (!flights || flights.length === 0) {
        flightsList.innerHTML = '<p style="color: var(--color-gray); text-align: center; padding: 2rem;">No flights found for peak hour.</p>';
        return;
    }

    flightsList.innerHTML = flights.map(flight => `
        <div class="flight-item">
            <div class="flight-time">${flight.time}</div>
            <div>
                <div class="flight-number">${flight.flightNumber}</div>
                <div class="flight-route">${flight.origin || flight.destination}</div>
            </div>
            <div class="flight-route">${flight.airline || 'Unknown Airline'}</div>
            <div class="flight-type ${flight.type}">${flight.type}</div>
        </div>
    `).join('');
}

// Display travel tips based on crowd level
function displayTravelTips(level) {
    const tipsList = document.getElementById('travelTips');
    
    const tips = {
        'low': [
            'Great time to travel! Expect minimal queues',
            'Arrive 90 minutes before departure for international flights',
            'Use automated passport gates if eligible',
            'Consider arriving slightly earlier on weekends'
        ],
        'medium': [
            'Moderate crowds expected',
            'Arrive 2 hours before departure',
            'Have documents ready before reaching passport control',
            'Check online check-in options to save time'
        ],
        'high': [
            'Busy period - expect longer queues',
            'Arrive at least 2.5 hours before departure',
            'Consider fast-track services if available',
            'Prepare all documents in advance',
            'Stay hydrated and patient during peak times'
        ],
        'very-high': [
            'Very busy period - significant delays possible',
            'Arrive 3+ hours before international flights',
            'Strongly consider fast-track or premium services',
            'Have passport and boarding pass ready at all times',
            'Check flight status regularly for updates',
            'Pack snacks and water for potential long waits'
        ]
    };

    tipsList.innerHTML = tips[level].map(tip => `<li>${tip}</li>`).join('');
}

// Estimate total passengers (rough calculation)
function estimatePassengers(totalFlights) {
    // Assume average of 180 passengers per flight (mix of short and long haul)
    return Math.round(totalFlights * 180);
}
