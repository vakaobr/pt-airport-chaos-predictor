// Vercel Serverless Function for FlightAware API
// This keeps your API key secure on the server side

// EU Countries for filtering
const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH'
];

// Airport to country mapping (you can expand this)
const AIRPORT_TO_COUNTRY = {
    // Add more airports as needed
};

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { airport, date } = req.query;

    if (!airport || !date) {
        return res.status(400).json({ error: 'Missing required parameters: airport and date' });
    }

    // Get API key from environment variable
    const apiKey = process.env.FLIGHTAWARE_API_KEY;
    
    if (!apiKey) {
        console.error('FlightAware API key not configured');
        return res.status(500).json({ error: 'API key not configured. Please add FLIGHTAWARE_API_KEY to your Vercel environment variables.' });
    }

    try {
        // Parse the date
        const targetDate = new Date(date);
        const startTime = new Date(targetDate);
        startTime.setHours(0, 0, 0, 0);
        const endTime = new Date(targetDate);
        endTime.setHours(23, 59, 59, 999);

        // Fetch arrivals and departures from FlightAware API
        const [arrivalsData, departuresData] = await Promise.all([
            fetchFlightAwareData(apiKey, airport, 'arrivals', startTime, endTime),
            fetchFlightAwareData(apiKey, airport, 'departures', startTime, endTime)
        ]);

        // Filter for non-EU flights
        const nonEuArrivals = filterNonEuFlights(arrivalsData, 'arrival');
        const nonEuDepartures = filterNonEuFlights(departuresData, 'departure');

        // Analyze data
        const analysis = analyzeFlights(nonEuArrivals, nonEuDepartures);

        return res.status(200).json(analysis);
    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ 
            error: 'Failed to fetch flight data', 
            details: error.message 
        });
    }
}

// Fetch data from FlightAware API
async function fetchFlightAwareData(apiKey, airport, type, startTime, endTime) {
    // FlightAware AeroAPI v4 endpoint
    const endpoint = type === 'arrivals' 
        ? `https://aeroapi.flightaware.com/aeroapi/airports/${airport}/flights/arrivals`
        : `https://aeroapi.flightaware.com/aeroapi/airports/${airport}/flights/departures`;

    const params = new URLSearchParams({
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        max_pages: '5' // Limit to 5 pages
    });

    const response = await fetch(`${endpoint}?${params}`, {
        headers: {
            'x-apikey': apiKey,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FlightAware API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.arrivals || data.departures || [];
}

// Filter for non-EU flights
function filterNonEuFlights(flights, type) {
    return flights.filter(flight => {
        // Get origin/destination based on type
        const location = type === 'arrival' ? flight.origin : flight.destination;
        
        if (!location || !location.code_icao) {
            return false;
        }

        // Extract country code from ICAO code (first 1-2 letters)
        const icaoCode = location.code_icao;
        const countryPrefix = icaoCode.substring(0, 2);
        
        // Check if it's a non-EU country
        return !isEuAirport(countryPrefix, icaoCode);
    }).map(flight => ({
        flightNumber: flight.ident || 'Unknown',
        airline: flight.operator || 'Unknown',
        origin: type === 'arrival' ? (flight.origin?.city || flight.origin?.code) : null,
        destination: type === 'departure' ? (flight.destination?.city || flight.destination?.code) : null,
        scheduledTime: flight.scheduled_out || flight.scheduled_in,
        estimatedTime: flight.estimated_out || flight.estimated_in,
        type: type
    }));
}

// Check if airport is in EU based on ICAO prefix
function isEuAirport(prefix, fullCode) {
    // EU ICAO prefixes (simplified - you may want to expand this)
    const euPrefixes = [
        'EB', 'ED', 'EE', 'EF', 'EG', 'EH', 'EI', 'EK', 'EL', 'EN',
        'EP', 'ES', 'ET', 'EV', 'EY', 'LB', 'LC', 'LD', 'LE', 'LF',
        'LG', 'LH', 'LI', 'LJ', 'LK', 'LO', 'LP', 'LQ', 'LR', 'LS',
        'LT', 'LU', 'LW', 'LX', 'LY', 'LZ'
    ];
    
    return euPrefixes.includes(prefix);
}

// Analyze flights and calculate peak times
function analyzeFlights(arrivals, departures) {
    const allFlights = [...arrivals, ...departures];
    
    // Group by hour
    const flightsByHour = {};
    
    allFlights.forEach(flight => {
        const time = new Date(flight.scheduledTime || flight.estimatedTime);
        const hour = time.getHours();
        
        if (!flightsByHour[hour]) {
            flightsByHour[hour] = [];
        }
        
        flightsByHour[hour].push({
            ...flight,
            time: `${hour.toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`
        });
    });

    // Find peak hour
    let peakHour = null;
    let maxFlights = 0;
    
    Object.entries(flightsByHour).forEach(([hour, flights]) => {
        if (flights.length > maxFlights) {
            maxFlights = flights.length;
            peakHour = hour;
        }
    });

    const peakHourFormatted = peakHour 
        ? `${peakHour.toString().padStart(2, '0')}:00 - ${(parseInt(peakHour) + 1).toString().padStart(2, '0')}:00`
        : 'N/A';

    return {
        arrivals: arrivals,
        departures: departures,
        totalFlights: allFlights.length,
        peakHour: peakHourFormatted,
        peakFlights: peakHour ? flightsByHour[peakHour].slice(0, 10) : [],
        flightsByHour: flightsByHour
    };
}
