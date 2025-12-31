// EU Countries (for filtering non-EU flights)
const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH'
];

// Initialize page
class FrontendCache {
    constructor(namespace = 'airportQueue') {
        this.namespace = namespace;
        this.memoryCache = new Map();
        this.loadFromLocalStorage();
    }

    /**
     * Generate cache key
     */
    key(prefix, params) {
        const sortedParams = Object.keys(params || {})
            .sort()
            .map(k => `${k}=${params[k]}`)
            .join('&');
        return `${this.namespace}:${prefix}:${sortedParams}`;
    }

    /**
     * Get item from cache (memory first, then localStorage)
     */
    get(key) {
        // Check memory cache first
        if (this.memoryCache.has(key)) {
            const item = this.memoryCache.get(key);
            if (this.isValid(item)) {
                return item.data;
            }
            this.memoryCache.delete(key);
        }

        // Check localStorage
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const item = JSON.parse(stored);
                if (this.isValid(item)) {
                    // Restore to memory cache
                    this.memoryCache.set(key, item);
                    return item.data;
                }
                // Remove expired item
                localStorage.removeItem(key);
            }
        } catch (e) {
            console.warn('LocalStorage error:', e);
        }

        return null;
    }

    /**
     * Set item in cache (both memory and localStorage)
     */
    set(key, data, ttl = 30 * 60 * 1000) {
        const item = {
            data,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
        };

        // Store in memory
        this.memoryCache.set(key, item);

        // Store in localStorage
        try {
            localStorage.setItem(key, JSON.stringify(item));
        } catch (e) {
            console.warn('LocalStorage full, clearing old entries:', e);
            this.cleanup();
            try {
                localStorage.setItem(key, JSON.stringify(item));
            } catch (e2) {
                console.error('Failed to store in localStorage:', e2);
            }
        }
    }

    /**
     * Check if cached item is still valid
     */
    isValid(item) {
        return item && Date.now() < item.expiry;
    }

    /**
     * Clear specific key or all cache
     */
    clear(key = null) {
        if (key) {
            this.memoryCache.delete(key);
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('LocalStorage error:', e);
            }
        } else {
            this.memoryCache.clear();
            this.clearLocalStorage();
        }
    }

    /**
     * Load cache from localStorage to memory
     */
    loadFromLocalStorage() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.namespace)) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const item = JSON.parse(stored);
                        if (this.isValid(item)) {
                            this.memoryCache.set(key, item);
                        } else {
                            // Remove expired
                            localStorage.removeItem(key);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Error loading from localStorage:', e);
        }
    }

    /**
     * Clear all items from localStorage with our namespace
     */
    clearLocalStorage() {
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.namespace)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (e) {
            console.warn('Error clearing localStorage:', e);
        }
    }

    /**
     * Remove expired items from localStorage
     */
    cleanup() {
        try {
            const now = Date.now();
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.namespace)) {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const item = JSON.parse(stored);
                        if (now >= item.expiry) {
                            keysToRemove.push(key);
                            this.memoryCache.delete(key);
                        }
                    }
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log('Cleaned up', keysToRemove.length, 'expired cache entries');
        } catch (e) {
            console.warn('Cleanup error:', e);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        let localStorageCount = 0;
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.namespace)) {
                    localStorageCount++;
                }
            }
        } catch (e) {
            // Ignore
        }

        return {
            memorySize: this.memoryCache.size,
            localStorageSize: localStorageCount,
            totalSize: this.memoryCache.size + localStorageCount
        };
    }
}

// Export singleton instance
const frontendCache = new FrontendCache('airportQueue');

// Cleanup expired entries every 10 minutes
setInterval(() => {
    frontendCache.cleanup();
}, 10 * 60 * 1000);

// Main initialization on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize cache
    frontendCache.cleanup();
    console.log('Frontend cache loaded:', frontendCache.getStats());
    
    // Initialize UI elements
    const airportSelect = document.getElementById('airport');
    const dateInput = document.getElementById('date');
    const predictBtn = document.getElementById('predictBtn');
    
    console.log('✅ DOM elements initialized:', {
        airportSelect: !!airportSelect,
        dateInput: !!dateInput,
        predictBtn: !!predictBtn
    });

    // Set min date to today and max to 2 days from now (FlightAware API limit)
    // According to FlightAware docs: "must be no further than 10 days in the past and 2 days in the future"
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 2);
    
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
        console.log('🔘 Predict button clicked!');
        const airport = airportSelect.value;
        const date = dateInput.value;
        
        console.log('📍 Selected values:', { airport, date });
        
        if (airport && date) {
            console.log('✅ Calling fetchAndDisplayPrediction...');
            await fetchAndDisplayPrediction(airport, date);
        } else {
            console.warn('❌ Missing airport or date values');
        }
    });
    
    console.log('✅ Predict button event listener attached');
    
    // Setup warning banner close button
    const closeBtn = document.getElementById('closeWarning');
    if (closeBtn) {
        closeBtn.onclick = () => {
            hideWarningBanner();
        };
    }
});

// Fetch prediction data from API
async function fetchAndDisplayPrediction(airport, date) {
    const resultsSection = document.getElementById('resultsSection');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const timetableCard = document.getElementById('timetableCard');

    // Check cache first
    const cacheKey = frontendCache.key('prediction', { airport, date });
    const cachedData = frontendCache.get(cacheKey);
    
    if (cachedData) {
        console.log('✅ Using cached prediction data');
        // Show results section and hide loading/error
        resultsSection.classList.remove('hidden');
        loading.classList.add('hidden');
        error.classList.add('hidden');
        results.classList.remove('hidden');
        timetableCard.classList.add('hidden');
        displayResults(cachedData);
        return;
    }

    // Show loading state
    resultsSection.classList.remove('hidden');
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    error.classList.add('hidden');
    timetableCard.classList.add('hidden'); // Hide old timetable from previous search

    try {
        // Call the Vercel serverless API
        const response = await fetch(`/api/predict?airport=${airport}&date=${date}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Cache the response (30 minutes TTL)
        frontendCache.set(cacheKey, data, 30 * 60 * 1000);
        console.log('✅ Cached prediction data for', airport, date);
        
        // Hide loading and show results
        loading.classList.add('hidden');
        results.classList.remove('hidden');
        
        displayResults(data);
    } catch (err) {
        console.error('Error fetching prediction:', err);
        loading.classList.add('hidden');
        error.classList.remove('hidden');
        
        // Provide specific error messages
        if (err.message.includes('Invalid start bound') || err.message.includes('Invalid end bound') || err.message.includes('time is too far')) {
            error.textContent = `⚠️ Date is too far in the future. FlightAware API only provides flight data for today and the next 2 days. Please select today, tomorrow, or the day after tomorrow.`;
        } else if (err.message.includes('Rate limit')) {
            error.textContent = `⚠️ API rate limit exceeded. Please wait a moment and try again.`;
        } else {
            error.textContent = `Failed to fetch data: ${err.message}. Please check your API configuration and try again.`;
        }
    }
}

// Global variables
let flightsChart = null;
let currentFlightData = null;

// Display the prediction results
function displayResults(data) {
    // Store data globally for interactive features
    currentFlightData = data;
    
    // Check for warnings or errors in the response
    const hasWarning = !!(data.warning || data.apiError);
    if (hasWarning) {
        showWarningBanner(data.warning, data.apiError);
    } else {
        hideWarningBanner();
    }
    
    // Update crowd level badge and meter
    // If there's a warning and no flights, show "No Data" state
    if (hasWarning && data.totalFlights === 0) {
        updateCrowdDisplayNoData();
    } else {
        const crowdLevel = calculateCrowdLevel(data.totalFlights);
        updateCrowdDisplay(crowdLevel, data.totalFlights);
    }

    // Update statistics
    document.getElementById('arrivals').textContent = data.arrivals.length;
    document.getElementById('departures').textContent = data.departures.length;
    document.getElementById('totalPassengers').textContent = (data.totalPassengers || estimatePassengers(data.totalFlights)).toLocaleString();
    document.getElementById('peakTime').textContent = data.peakHour || 'N/A';

    // Setup interactive panels
    setupInteractivePanels();

    // Display hourly chart
    displayHourlyChart(data.flightsByHour);

    // Display peak hour flights
    displayFlights(data.peakFlights);

    // Display travel tips
    displayTravelTips(hasWarning && data.totalFlights === 0 ? 'no-data' : calculateCrowdLevel(data.totalFlights));
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

// Update crowd display for no-data state
function updateCrowdDisplayNoData() {
    const badge = document.getElementById('crowdBadge');
    const bar = document.getElementById('crowdBar');

    badge.textContent = 'No Data';
    badge.className = 'crowd-badge no-data';
    bar.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
    bar.style.width = '0%';
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
        'no-data': [
            'Unable to retrieve flight data at this time',
            'This may be due to API rate limits or date availability',
            'Try again in a few minutes or select a different date',
            'For current information, check the airport\'s official website'
        ],
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

// Display hourly chart
function displayHourlyChart(flightsByHour) {
    const canvas = document.getElementById('flightsChart');
    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (flightsChart) {
        flightsChart.destroy();
    }

    // Prepare data for all 24 hours
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // Separate arrivals and departures by hour
    const arrivalCounts = hours.map(hour => {
        const flights = flightsByHour[hour.toString()] || [];
        return flights.filter(f => f.type === 'arrival').length;
    });
    
    const departureCounts = hours.map(hour => {
        const flights = flightsByHour[hour.toString()] || [];
        return flights.filter(f => f.type === 'departure').length;
    });

    // Create labels (00:00, 01:00, etc.)
    const labels = hours.map(h => `${h.toString().padStart(2, '0')}:00`);

    // Create gradients for bars
    const arrivalGradient = ctx.createLinearGradient(0, 0, 0, 300);
    arrivalGradient.addColorStop(0, '#088395');
    arrivalGradient.addColorStop(1, '#0a4d68');

    const departureGradient = ctx.createLinearGradient(0, 0, 0, 300);
    departureGradient.addColorStop(0, '#c85c5c');
    departureGradient.addColorStop(1, '#8b7355');

    flightsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Arrivals',
                    data: arrivalCounts,
                    backgroundColor: arrivalGradient,
                    borderColor: '#0a4d68',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: '#088395',
                },
                {
                    label: 'Departures',
                    data: departureCounts,
                    backgroundColor: departureGradient,
                    borderColor: '#8b7355',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: '#c85c5c',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        font: {
                            family: 'Manrope',
                            size: 12,
                            weight: '600'
                        },
                        color: '#0a4d68',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 77, 104, 0.95)',
                    titleFont: {
                        size: 14,
                        weight: 'bold',
                        family: 'Manrope'
                    },
                    bodyFont: {
                        size: 13,
                        family: 'Manrope'
                    },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const count = context.parsed.y;
                            const label = context.dataset.label;
                            const plural = count === 1 ? 'flight' : 'flights';
                            return `${label}: ${count} ${plural}`;
                        },
                        afterBody: function(tooltipItems) {
                            const total = tooltipItems.reduce((sum, item) => sum + item.parsed.y, 0);
                            return total > 0 ? `\nTotal: ${total} flights` : '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            family: 'Manrope',
                            size: 11
                        },
                        color: '#6b6b6b'
                    },
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    title: {
                        display: true,
                        text: 'Hour of Day (UTC)',
                        font: {
                            family: 'Manrope',
                            size: 13,
                            weight: '600'
                        },
                        color: '#0a4d68'
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            family: 'Manrope',
                            size: 12
                        },
                        color: '#6b6b6b'
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    title: {
                        display: true,
                        text: 'Number of Flights',
                        font: {
                            family: 'Manrope',
                            size: 13,
                            weight: '600'
                        },
                        color: '#0a4d68'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            onClick: (event, activeElements) => {
                if (activeElements.length > 0) {
                    const index = activeElements[0].index;
                    showTimetableForHour(index);
                }
            }
        }
    });
}

// Setup interactive panels
function setupInteractivePanels() {
    // Arrivals panel click
    document.getElementById('arrivalsPanel').onclick = () => {
        showTimetable('arrivals');
    };
    
    // Departures panel click
    document.getElementById('departuresPanel').onclick = () => {
        showTimetable('departures');
    };
    
    // Close timetable button
    document.getElementById('closeTimetable').onclick = () => {
        document.getElementById('timetableCard').classList.add('hidden');
    };
    
    // Tab switching
    document.querySelectorAll('.timetable-tab').forEach(tab => {
        tab.onclick = (e) => {
            // Update active tab
            document.querySelectorAll('.timetable-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            // Get filter type
            const filterType = e.target.dataset.tab;
            
            // Re-render timetable with filter
            if (currentTimetableData) {
                renderTimetableContent(currentTimetableData, filterType);
            }
        };
    });
}

// Store current timetable data
let currentTimetableData = null;

// Show timetable for specific type
function showTimetable(type) {
    if (!currentFlightData) return;
    
    const flights = type === 'arrivals' 
        ? currentFlightData.arrivals 
        : currentFlightData.departures;
    
    currentTimetableData = { arrivals: currentFlightData.arrivals, departures: currentFlightData.departures };
    
    // Get selected date from the date input
    const selectedDate = document.getElementById('date').value;
    const dateObj = new Date(selectedDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
    
    document.getElementById('timetableTitle').textContent = `${formattedDate} Timetable`;
    document.getElementById('timetableCard').classList.remove('hidden');
    
    // Set the appropriate tab active
    document.querySelectorAll('.timetable-tab').forEach(t => t.classList.remove('active'));
    const activeTab = type === 'arrivals' ? 1 : type === 'departures' ? 2 : 0;
    document.querySelectorAll('.timetable-tab')[activeTab].classList.add('active');
    
    renderTimetableContent(currentTimetableData, type);
    
    // Scroll to timetable
    document.getElementById('timetableCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show timetable for specific hour
function showTimetableForHour(hour) {
    if (!currentFlightData) return;
    
    const hourFlights = currentFlightData.flightsByHour[hour.toString()] || [];
    
    if (hourFlights.length === 0) {
        return; // Don't show empty timetable
    }
    
    // Separate into arrivals and departures
    const arrivals = hourFlights.filter(f => f.type === 'arrival');
    const departures = hourFlights.filter(f => f.type === 'departure');
    
    currentTimetableData = { arrivals, departures };
    
    // Get selected date from the date input
    const selectedDate = document.getElementById('date').value;
    const dateObj = new Date(selectedDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    });
    
    const hourLabel = hour.toString().padStart(2, '0') + ':00';
    document.getElementById('timetableTitle').textContent = `${formattedDate} - ${hourLabel} UTC`;
    document.getElementById('timetableCard').classList.remove('hidden');
    
    // Set "All Flights" tab active
    document.querySelectorAll('.timetable-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.timetable-tab')[0].classList.add('active');
    
    renderTimetableContent(currentTimetableData, 'all');
    
    // Scroll to timetable
    document.getElementById('timetableCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Render timetable content
function renderTimetableContent(data, filter = 'all') {
    const content = document.getElementById('timetableContent');
    
    let flights = [];
    if (filter === 'all') {
        flights = [...data.arrivals, ...data.departures];
    } else if (filter === 'arrivals') {
        flights = data.arrivals;
    } else if (filter === 'departures') {
        flights = data.departures;
    }
    
    // Sort by scheduled time
    flights.sort((a, b) => {
        const timeA = new Date(a.scheduledTime || a.estimatedTime);
        const timeB = new Date(b.scheduledTime || b.estimatedTime);
        return timeA - timeB;
    });
    
    if (flights.length === 0) {
        content.innerHTML = '<div class="empty-timetable">No flights found</div>';
        return;
    }
    
    const table = `
        <table class="timetable-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Flight</th>
                    <th>Airline</th>
                    <th>Route</th>
                    <th>Aircraft</th>
                    <th>Pax</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                ${flights.map(flight => {
                    const time = new Date(flight.scheduledTime || flight.estimatedTime);
                    const timeStr = time.toISOString().substring(11, 16); // HH:MM
                    const route = flight.origin || flight.destination || 'Unknown';
                    const aircraft = flight.aircraftType || 'Unknown';
                    const passengers = flight.estimatedPassengers || '-';
                    const countryCode = (flight.countryCode || 'un').toLowerCase();
                    const countryName = flight.countryName || 'Unknown';
                    const airline = flight.airline || 'Unknown';
                    const airlineCode = airline.trim();
                    const aircraftCode = aircraft.trim();
                    const registration = flight.aircraftRegistration; // Tail number (e.g., CS-TUA)
                    
                    return `
                        <tr>
                            <td class="flight-time-cell">${timeStr}</td>
                            <td class="flight-number-cell">${flight.flightNumber}</td>
                            <td>
                                <span class="tooltip-wrapper" data-tooltip="${airlineCode}">
                                    ${airline}
                                    <span class="airline-tooltip">
                                        <img src="https://raw.githubusercontent.com/sexym0nk3y/airline-logos/master/logos/${airlineCode}.png" 
                                             alt="${airlineCode}" 
                                             class="airline-logo"
                                             onerror="this.onerror=null; 
                                                      this.src='https://raw.githubusercontent.com/Jxck-S/airline-logos/main/logos/${airlineCode}.png'; 
                                                      this.onerror=function(){
                                                          this.src='https://raw.githubusercontent.com/airframesio/airline-images/master/airline_logos/${airlineCode}.png';
                                                          this.onerror=function(){
                                                              this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22%3E%3Cstop offset=%220%25%22 style=%22stop-color:%23088395%22/%3E%3Cstop offset=%22100%25%22 style=%22stop-color:%230a4d68%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill=%22url(%23g)%22 width=%22120%22 height=%22120%22 rx=%2215%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.35em%22 fill=%22white%22 font-size=%2236%22 font-weight=%22bold%22 font-family=%22Arial,sans-serif%22%3E${airlineCode}%3C/text%3E%3C/svg%3E';
                                                          };
                                                      };">
                                        <span class="airline-name">${getAirlineName(airlineCode)}</span>
                                    </span>
                                </span>
                            </td>
                            <td class="route-cell">
                                <img src="https://flagcdn.com/w20/${countryCode}.png" 
                                     alt="${countryName}" 
                                     title="${countryName}"
                                     class="country-flag"
                                     onerror="this.style.display='none'">
                                <span>${route}</span>
                            </td>
                            <td>
                                <span class="tooltip-wrapper" data-tooltip="${aircraftCode}">
                                    ${aircraft}
                                    <span class="aircraft-tooltip">
                                        ${registration ? `
                                            <img src="https://api.planespotters.net/pub/photos/500/${registration}" 
                                                 alt="${registration}" 
                                                 class="aircraft-image"
                                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                                 style="display: block;">
                                        ` : ''}
                                        <div class="aircraft-fallback" style="display: ${registration ? 'none' : 'flex'};">
                                            <svg width="180" height="90" viewBox="0 0 180 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <!-- Fuselage -->
                                                <defs>
                                                    <linearGradient id="fuselageGrad${aircraftCode}" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" style="stop-color:#088395;stop-opacity:0.3" />
                                                        <stop offset="50%" style="stop-color:#088395;stop-opacity:0.5" />
                                                        <stop offset="100%" style="stop-color:#088395;stop-opacity:0.3" />
                                                    </linearGradient>
                                                </defs>
                                                <ellipse cx="90" cy="45" rx="60" ry="14" fill="url(#fuselageGrad${aircraftCode})"/>
                                                <rect x="40" y="36" width="100" height="18" rx="9" fill="#088395"/>
                                                
                                                <!-- Wings -->
                                                <path d="M55 45 L15 33 L15 39 L55 51 Z" fill="#0a4d68" opacity="0.8"/>
                                                <path d="M125 45 L165 33 L165 39 L125 51 Z" fill="#0a4d68" opacity="0.8"/>
                                                
                                                <!-- Tail -->
                                                <path d="M133 36 L145 18 L150 36 Z" fill="#088395"/>
                                                <path d="M136 45 L152 45 L152 51 L136 51 Z" fill="#0a4d68" opacity="0.6"/>
                                                
                                                <!-- Cockpit window -->
                                                <circle cx="42" cy="45" r="7" fill="#c85c5c" opacity="0.3"/>
                                                <circle cx="42" cy="45" r="4" fill="white" opacity="0.6"/>
                                                
                                                <!-- Engine details -->
                                                <ellipse cx="70" cy="54" rx="10" ry="6" fill="#6b6b6b" opacity="0.4"/>
                                                <ellipse cx="110" cy="54" rx="10" ry="6" fill="#6b6b6b" opacity="0.4"/>
                                                
                                                <!-- Passenger windows -->
                                                <circle cx="58" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="68" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="78" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="88" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="98" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="108" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="118" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="128" cy="41" r="2" fill="white" opacity="0.6"/>
                                            </svg>
                                        </div>
                                        <span class="aircraft-name">${getAircraftName(aircraftCode)}${registration ? ` (${registration})` : ''}</span>
                                    </span>
                                </span>
                            </td>
                                                
                                                <!-- Tail -->
                                                <path d="M133 36 L145 18 L150 36 Z" fill="#088395"/>
                                                <path d="M136 45 L152 45 L152 51 L136 51 Z" fill="#0a4d68" opacity="0.6"/>
                                                
                                                <!-- Cockpit window -->
                                                <circle cx="42" cy="45" r="7" fill="#c85c5c" opacity="0.3"/>
                                                <circle cx="42" cy="45" r="4" fill="white" opacity="0.6"/>
                                                
                                                <!-- Engine details -->
                                                <ellipse cx="70" cy="54" rx="10" ry="6" fill="#6b6b6b" opacity="0.4"/>
                                                <ellipse cx="110" cy="54" rx="10" ry="6" fill="#6b6b6b" opacity="0.4"/>
                                                
                                                <!-- Passenger windows -->
                                                <circle cx="58" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="68" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="78" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="88" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="98" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="108" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="118" cy="41" r="2" fill="white" opacity="0.6"/>
                                                <circle cx="128" cy="41" r="2" fill="white" opacity="0.6"/>
                                            </svg>
                                        </div>
                                        <span class="aircraft-name">${getAircraftName(aircraftCode)}</span>
                                    </span>
                                </span>
                            </td>
                            <td><strong>${passengers}</strong></td>
                            <td><span class="flight-badge ${flight.type}">${flight.type}</span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    content.innerHTML = table;
}

// Show warning banner with appropriate message
function showWarningBanner(warning, apiError) {
    const banner = document.getElementById('warningBanner');
    const title = document.getElementById('warningTitle');
    const message = document.getElementById('warningMessage');
    
    // Determine the warning message
    let warningTitle = 'Notice';
    let warningMessage = '';
    
    if (apiError) {
        if (apiError.includes('Rate limit') || apiError.includes('429')) {
            warningTitle = 'Rate Limit Reached';
            warningMessage = '⏱️ The FlightAware API rate limit has been exceeded. The data shown may be incomplete or from cache. Please try again in a few minutes, or results may be limited to cached data.';
        } else if (apiError.includes('Invalid start bound') || apiError.includes('Invalid end bound') || apiError.includes('time is too far')) {
            warningTitle = 'Date Not Available';
            warningMessage = '📅 Flight data is only available for today and the next 2 days per FlightAware API limitations. Please select today, tomorrow, or the day after tomorrow.';
        } else if (apiError.includes('401') || apiError.includes('Invalid API key')) {
            warningTitle = 'API Configuration Issue';
            warningMessage = '🔑 There is an issue with the API key configuration. Please contact the administrator.';
        } else if (apiError.includes('404') || apiError.includes('not found')) {
            warningTitle = 'No Data Available';
            warningMessage = '🔍 No flight data is available for this airport and date. This could be due to API limitations or the selected date being outside the available range.';
        } else {
            warningTitle = 'API Error';
            warningMessage = `⚠️ ${apiError.substring(0, 150)}${apiError.length > 150 ? '...' : ''}`;
        }
    } else if (warning) {
        warningTitle = 'Limited Data';
        warningMessage = warning;
    }
    
    title.textContent = warningTitle;
    message.textContent = warningMessage;
    banner.classList.remove('hidden');
}

// Hide warning banner
function hideWarningBanner() {
    const banner = document.getElementById('warningBanner');
    banner.classList.add('hidden');
}

// Get airline full name from IATA/ICAO code
function getAirlineName(code) {
    const airlines = {
        'TAP': 'TAP Air Portugal',
        'TP': 'TAP Air Portugal',
        'UAL': 'United Airlines',
        'UA': 'United Airlines',
        'TAM': 'LATAM Brasil',
        'JJ': 'LATAM Brasil',
        'ETD': 'Etihad Airways',
        'EY': 'Etihad Airways',
        'BAW': 'British Airways',
        'BA': 'British Airways',
        'RYR': 'Ryanair',
        'FR': 'Ryanair',
        'IBE': 'Iberia',
        'IB': 'Iberia',
        'AFR': 'Air France',
        'AF': 'Air France',
        'DLH': 'Lufthansa',
        'LH': 'Lufthansa',
        'KLM': 'KLM Royal Dutch Airlines',
        'KL': 'KLM Royal Dutch Airlines',
        'EZY': 'easyJet',
        'U2': 'easyJet',
        'EIN': 'Aer Lingus',
        'EI': 'Aer Lingus',
        'SWR': 'Swiss International Air Lines',
        'LX': 'Swiss International Air Lines',
        'AUA': 'Austrian Airlines',
        'OS': 'Austrian Airlines',
        'SAS': 'Scandinavian Airlines',
        'SK': 'Scandinavian Airlines',
        'FIN': 'Finnair',
        'AY': 'Finnair',
        'AAL': 'American Airlines',
        'AA': 'American Airlines',
        'DAL': 'Delta Air Lines',
        'DL': 'Delta Air Lines',
        'UAE': 'Emirates',
        'EK': 'Emirates',
        'QTR': 'Qatar Airways',
        'QR': 'Qatar Airways',
        'THY': 'Turkish Airlines',
        'TK': 'Turkish Airlines',
        'AZA': 'Alitalia',
        'AZ': 'Alitalia',
        'ITA': 'ITA Airways',
        // African airlines
        'DTA': 'TAAG Angola Airlines',
        'DT': 'TAAG Angola Airlines',
        // Brazilian airlines
        'AZU': 'Azul Brazilian Airlines',
        'AD': 'Azul Brazilian Airlines',
        'GLO': 'Gol Transportes Aéreos',
        'G3': 'Gol Transportes Aéreos',
        'MMZ': 'Euro Atlantic Airways',
        'YU': 'Euro Atlantic Airways',
        // Other Portuguese airlines
        'PGA': 'Portugália',
        'NI': 'Portugália',
        'RUK': 'Ryanair UK',
        'RK': 'Ryanair UK',
        'TVF': 'Transavia France',
        'TO': 'Transavia France',
        'TRA': 'Transavia',
        'HV': 'Transavia'
    };
    
    return airlines[code] || code;
}

// Get aircraft full name from type code
function getAircraftName(code) {
    const aircraft = {
        'A20N': 'Airbus A320neo',
        'A21N': 'Airbus A321neo',
        'A318': 'Airbus A318',
        'A319': 'Airbus A319',
        'A320': 'Airbus A320',
        'A321': 'Airbus A321',
        'A332': 'Airbus A330-200',
        'A333': 'Airbus A330-300',
        'A338': 'Airbus A330-800neo',
        'A339': 'Airbus A330-900neo',
        'A359': 'Airbus A350-900',
        'A35K': 'Airbus A350-1000',
        'A380': 'Airbus A380',
        'A388': 'Airbus A380-800',
        'B737': 'Boeing 737',
        'B738': 'Boeing 737-800',
        'B739': 'Boeing 737-900',
        'B37M': 'Boeing 737 MAX 7',
        'B38M': 'Boeing 737 MAX 8',
        'B39M': 'Boeing 737 MAX 9',
        'B3JM': 'Boeing 737 MAX 10',
        'B752': 'Boeing 757-200',
        'B753': 'Boeing 757-300',
        'B762': 'Boeing 767-200',
        'B763': 'Boeing 767-300',
        'B764': 'Boeing 767-400',
        'B772': 'Boeing 777-200',
        'B773': 'Boeing 777-300',
        'B77L': 'Boeing 777-200LR',
        'B77W': 'Boeing 777-300ER',
        'B788': 'Boeing 787-8 Dreamliner',
        'B789': 'Boeing 787-9 Dreamliner',
        'B78X': 'Boeing 787-10 Dreamliner',
        'B747': 'Boeing 747',
        'B74S': 'Boeing 747-8',
        'E190': 'Embraer E190',
        'E195': 'Embraer E195',
        'E290': 'Embraer E190-E2',
        'E295': 'Embraer E195-E2',
        'AT72': 'ATR 72',
        'AT76': 'ATR 72-600',
        'DH8D': 'Bombardier Dash 8-Q400',
        'CRJ7': 'Bombardier CRJ-700',
        'CRJ9': 'Bombardier CRJ-900',
        'CRJX': 'Bombardier CRJ-1000'
    };
    
    // Remove trailing spaces
    const cleanCode = code.trim();
    return aircraft[cleanCode] || cleanCode;
}
// Add dynamic tooltip positioning to prevent clipping
// Position tooltips dynamically when shown
document.addEventListener('mouseover', (e) => {
    const wrapper = e.target.closest('.tooltip-wrapper');
    if (!wrapper) return;
    
    const tooltip = wrapper.querySelector('.airline-tooltip, .aircraft-tooltip');
    if (!tooltip) return;
    
    // Get wrapper position
    const rect = wrapper.getBoundingClientRect();
    
    // Calculate tooltip position (below the element, centered)
    const left = rect.left + (rect.width / 2);
    const top = rect.bottom + 10;
    
    // Apply position
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
    tooltip.style.transform = 'translateX(-50%)';
    
    // Check if tooltip goes off screen and adjust
    setTimeout(() => {
        const tooltipRect = tooltip.getBoundingClientRect();
        
        // Adjust if goes off right side
        if (tooltipRect.right > window.innerWidth) {
            tooltip.style.left = (window.innerWidth - tooltipRect.width - 10) + 'px';
            tooltip.style.transform = 'none';
        }
        
        // Adjust if goes off left side
        if (tooltipRect.left < 0) {
            tooltip.style.left = '10px';
            tooltip.style.transform = 'none';
        }
        
        // Show above if goes off bottom
        if (tooltipRect.bottom > window.innerHeight) {
            tooltip.style.top = (rect.top - tooltipRect.height - 10) + 'px';
        }
    }, 10);
});

// AviationStack enrichment cache
const enrichmentCache = {
    airlines: {},
    aircraft: {}
};

// Fetch airline enrichment data
async function fetchAirlineEnrichment(code) {
    // Check memory cache first (from old implementation)
    if (enrichmentCache.airlines[code]) {
        return enrichmentCache.airlines[code];
    }
    
    // Check persistent cache
    const cacheKey = frontendCache.key('airline', { code });
    const cached = frontendCache.get(cacheKey);
    if (cached) {
        enrichmentCache.airlines[code] = cached; // Update memory cache
        return cached;
    }
    
    try {
        const response = await fetch(`/api/aviationstack?type=airline&code=${code}`);
        if (response.ok) {
            const data = await response.json();
            
            // Cache for 7 days (static data)
            frontendCache.set(cacheKey, data, 7 * 24 * 60 * 60 * 1000);
            enrichmentCache.airlines[code] = data;
            
            return data;
        }
    } catch (e) {
        console.log('Could not fetch airline enrichment:', e);
    }
    
    return null;
}

// Fetch aircraft enrichment data
async function fetchAircraftEnrichment(code) {
    // Check memory cache first
    if (enrichmentCache.aircraft[code]) {
        return enrichmentCache.aircraft[code];
    }
    
    // Check persistent cache
    const cacheKey = frontendCache.key('aircraft', { code });
    const cached = frontendCache.get(cacheKey);
    if (cached) {
        enrichmentCache.aircraft[code] = cached; // Update memory cache
        return cached;
    }
    
    try {
        const response = await fetch(`/api/aviationstack?type=aircraft&code=${code}`);
        if (response.ok) {
            const data = await response.json();
            
            // Cache for 7 days (static data)
            frontendCache.set(cacheKey, data, 7 * 24 * 60 * 60 * 1000);
            enrichmentCache.aircraft[code] = data;
            
            return data;
        }
    } catch (e) {
        console.log('Could not fetch aircraft enrichment:', e);
    }
    
    return null;
}

// Enhanced tooltip with enriched data
async function showEnrichedTooltip(element, type, code) {
    const tooltip = element.querySelector(`.${type}-tooltip`);
    if (!tooltip) return;
    
    const data = type === 'airline' 
        ? await fetchAirlineEnrichment(code)
        : await fetchAircraftEnrichment(code);
    
    if (data && !data.error) {
        if (type === 'airline' && data.logoUrl) {
            const img = tooltip.querySelector('.airline-logo');
            if (img) {
                img.src = data.logoUrl;
            }
        }
        
        if (type === 'aircraft' && data.details) {
            const nameEl = tooltip.querySelector('.aircraft-name');
            if (nameEl && data.name) {
                nameEl.textContent = data.name;
            }
        }
    }
}
// Frontend cache manager with LocalStorage persistence
// Stores API responses locally to minimize network requests

