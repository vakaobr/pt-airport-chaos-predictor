// Vercel Serverless Function for FlightAware API
// This keeps your API key secure on the server side

// EU Countries for filtering
const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH'
];

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

    console.log('Request received:', { airport, date });

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
        startTime.setUTCHours(0, 0, 0, 0);
        const endTime = new Date(targetDate);
        endTime.setUTCHours(23, 59, 59, 999);

        console.log('Fetching flights for:', { airport, start: startTime.toISOString(), end: endTime.toISOString() });

        // Fetch arrivals and departures from FlightAware API
        const [arrivalsData, departuresData] = await Promise.all([
            fetchFlightAwareData(apiKey, airport, 'arrivals', startTime, endTime),
            fetchFlightAwareData(apiKey, airport, 'departures', startTime, endTime)
        ]);

        console.log('Flights fetched:', { arrivals: arrivalsData.length, departures: departuresData.length });

        // Filter for non-EU flights
        const nonEuArrivals = filterNonEuFlights(arrivalsData, 'arrival');
        const nonEuDepartures = filterNonEuFlights(departuresData, 'departure');

        console.log('Non-EU flights:', { arrivals: nonEuArrivals.length, departures: nonEuDepartures.length });

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
    // FlightAware AeroAPI v4 endpoint - Updated format
    const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
    const endpoint = type === 'arrivals' 
        ? `${baseUrl}/airports/${airport}/flights/arrivals`
        : `${baseUrl}/airports/${airport}/flights/departures`;

    // Format dates for FlightAware API (ISO 8601)
    const params = new URLSearchParams({
        start: startTime.toISOString(),
        end: endTime.toISOString()
    });

    const url = `${endpoint}?${params}`;
    console.log('Fetching from:', url);

    const response = await fetch(url, {
        headers: {
            'x-apikey': apiKey,
            'Accept': 'application/json; charset=UTF-8'
        }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('FlightAware API error:', { status: response.status, body: errorText });
        throw new Error(`FlightAware API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // FlightAware returns data in 'arrivals' or 'departures' or 'flights' key
    return data.arrivals || data.departures || data.flights || [];
}

// Filter for non-EU flights
function filterNonEuFlights(flights, type) {
    if (!flights || flights.length === 0) {
        return [];
    }

    return flights.filter(flight => {
        // Get origin/destination based on type
        const location = type === 'arrival' ? flight.origin : flight.destination;
        
        if (!location) {
            return false;
        }

        // Check ICAO code
        const icaoCode = location.code_icao || location.code;
        if (!icaoCode) {
            return false;
        }
        
        // Extract country prefix from ICAO code
        const countryPrefix = icaoCode.substring(0, 2);
        
        // Check if it's a non-EU country
        return !isEuAirport(countryPrefix);
    }).map(flight => {
        const scheduledTime = flight.scheduled_out || flight.scheduled_in || flight.scheduled_off || flight.scheduled_on;
        const estimatedTime = flight.estimated_out || flight.estimated_in || flight.estimated_off || flight.estimated_on;
        
        return {
            flightNumber: flight.ident || flight.flight_number || 'Unknown',
            airline: flight.operator || flight.operator_iata || 'Unknown',
            origin: type === 'arrival' ? (flight.origin?.city || flight.origin?.code || flight.origin?.name) : null,
            destination: type === 'departure' ? (flight.destination?.city || flight.destination?.code || flight.destination?.name) : null,
            scheduledTime: scheduledTime,
            estimatedTime: estimatedTime,
            type: type
        };
    });
}

// Check if airport is in EU based on ICAO prefix
function isEuAirport(prefix) {
    // EU ICAO prefixes
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
    
    if (allFlights.length === 0) {
        return {
            arrivals: [],
            departures: [],
            totalFlights: 0,
            peakHour: 'N/A',
            peakFlights: [],
            flightsByHour: {}
        };
    }
    
    // Group by hour
    const flightsByHour = {};
    
    allFlights.forEach(flight => {
        const timeStr = flight.scheduledTime || flight.estimatedTime;
        if (!timeStr) return;
        
        const time = new Date(timeStr);
        const hour = time.getUTCHours();
        
        if (!flightsByHour[hour]) {
            flightsByHour[hour] = [];
        }
        
        flightsByHour[hour].push({
            ...flight,
            time: `${hour.toString().padStart(2, '0')}:${time.getUTCMinutes().toString().padStart(2, '0')}`
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