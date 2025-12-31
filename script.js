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
    const timetableCard = document.getElementById('timetableCard');

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
                    
                    return `
                        <tr>
                            <td class="flight-time-cell">${timeStr}</td>
                            <td class="flight-number-cell">${flight.flightNumber}</td>
                            <td>
                                <span class="tooltip-wrapper" data-tooltip="${airlineCode}">
                                    ${airline}
                                    <span class="airline-tooltip">
                                        <img src="https://content.airhex.com/content/logos/airlines_${airlineCode}_100_100_s.png" 
                                             alt="${airlineCode}" 
                                             class="airline-logo"
                                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2224%22%3E${airlineCode}%3C/text%3E%3C/svg%3E'">
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
                                        <img src="https://content.airhex.com/content/logos/aircraft_${aircraftCode}_350_100_r.png" 
                                             alt="${aircraftCode}" 
                                             class="aircraft-image"
                                             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22350%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22350%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2224%22%3E✈ ${aircraftCode}%3C/text%3E%3C/svg%3E'">
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

// Setup warning banner close button
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeWarning');
    if (closeBtn) {
        closeBtn.onclick = () => {
            hideWarningBanner();
        };
    }
});

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
