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

// Global variables
let flightsChart = null;
let currentFlightData = null;

// Display the prediction results
function displayResults(data) {
    // Store data globally for interactive features
    currentFlightData = data;
    
    // Update crowd level badge and meter
    const crowdLevel = calculateCrowdLevel(data.totalFlights);
    updateCrowdDisplay(crowdLevel, data.totalFlights);

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
    const flightCounts = hours.map(hour => {
        const flights = flightsByHour[hour.toString()] || [];
        return flights.length;
    });

    // Create labels (00:00, 01:00, etc.)
    const labels = hours.map(h => `${h.toString().padStart(2, '0')}:00`);

    // Create gradient for bars
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, '#088395');
    gradient.addColorStop(1, '#0a4d68');

    flightsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Non-EU Flights',
                data: flightCounts,
                backgroundColor: gradient,
                borderColor: '#0a4d68',
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: '#c85c5c',
                hoverBorderColor: '#c85c5c'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
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
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const count = context.parsed.y;
                            const plural = count === 1 ? 'flight' : 'flights';
                            return `${count} ${plural}`;
                        }
                    }
                }
            },
            scales: {
                y: {
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
                },
                x: {
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
        showTimetable('arrivals', 'Arrivals Timetable');
    };
    
    // Departures panel click
    document.getElementById('departuresPanel').onclick = () => {
        showTimetable('departures', 'Departures Timetable');
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
function showTimetable(type, title) {
    if (!currentFlightData) return;
    
    const flights = type === 'arrivals' 
        ? currentFlightData.arrivals 
        : currentFlightData.departures;
    
    currentTimetableData = { arrivals: currentFlightData.arrivals, departures: currentFlightData.departures };
    
    document.getElementById('timetableTitle').textContent = title;
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
    
    const hourLabel = hour.toString().padStart(2, '0') + ':00';
    document.getElementById('timetableTitle').textContent = `Flights at ${hourLabel} UTC`;
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
                    
                    return `
                        <tr>
                            <td class="flight-time-cell">${timeStr}</td>
                            <td class="flight-number-cell">${flight.flightNumber}</td>
                            <td>${flight.airline}</td>
                            <td>${route}</td>
                            <td>${aircraft}</td>
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
