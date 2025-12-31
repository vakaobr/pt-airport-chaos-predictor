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

    console.log('========================================');
    console.log('Request received:', { airport, date });
    console.log('Environment check:', {
        hasApiKey: !!process.env.FLIGHTAWARE_API_KEY,
        apiKeyLength: process.env.FLIGHTAWARE_API_KEY?.length
    });
    console.log('========================================');

    if (!airport || !date) {
        return res.status(400).json({ error: 'Missing required parameters: airport and date' });
    }

    // Get API key from environment variable
    const apiKey = process.env.FLIGHTAWARE_API_KEY;
    
    if (!apiKey) {
        console.error('❌ FlightAware API key not configured');
        return res.status(500).json({ 
            error: 'API key not configured',
            details: 'Please add FLIGHTAWARE_API_KEY to your Vercel environment variables and redeploy.',
            hint: 'Check Settings → Environment Variables in Vercel dashboard'
        });
    }

    try {
        // Parse the date - FlightAware expects YYYY-MM-DD format or Unix timestamps
        const targetDate = new Date(date + 'T00:00:00Z');
        
        // Use Unix timestamps (seconds since epoch) - FlightAware accepts these
        const startTimestamp = Math.floor(targetDate.getTime() / 1000);
        const endTimestamp = startTimestamp + (24 * 60 * 60) - 1; // End of day

        console.log('📅 Date range:', { 
            date: date,
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            startDate: new Date(startTimestamp * 1000).toISOString(),
            endDate: new Date(endTimestamp * 1000).toISOString()
        });

        // Fetch arrivals and departures from FlightAware API
        console.log('🛫 Fetching flight data...');
        
        let arrivalsData = [];
        let departuresData = [];
        let apiError = null;

        try {
            [arrivalsData, departuresData] = await Promise.all([
                fetchFlightAwareData(apiKey, airport, 'arrivals', startTimestamp, endTimestamp),
                fetchFlightAwareData(apiKey, airport, 'departures', startTimestamp, endTimestamp)
            ]);
        } catch (fetchError) {
            console.error('❌ FlightAware API fetch error:', fetchError.message);
            apiError = fetchError.message;
            
            // Return mock data for testing if API fails
            console.log('⚠️ Using mock data for testing purposes');
            return res.status(200).json({
                arrivals: [],
                departures: [],
                totalFlights: 0,
                peakHour: 'N/A',
                peakFlights: [],
                flightsByHour: {},
                warning: 'Could not fetch real data from FlightAware API. Please check your API key and permissions.',
                apiError: apiError
            });
        }

        console.log('✅ Flights fetched:', { 
            arrivals: arrivalsData.length, 
            departures: departuresData.length 
        });

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
async function fetchFlightAwareData(apiKey, airport, type, startTimestamp, endTimestamp) {
    // FlightAware AeroAPI v4 endpoint - Updated format
    const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
    const endpoint = type === 'arrivals' 
        ? `${baseUrl}/airports/${airport}/flights/arrivals`
        : `${baseUrl}/airports/${airport}/flights/departures`;

    // Use Unix timestamps (seconds since epoch) - FlightAware prefers this format
    const params = new URLSearchParams({
        start: startTimestamp.toString(),
        end: endTimestamp.toString()
    });

    const url = `${endpoint}?${params}`;
    console.log(`🌐 Fetching ${type} from:`, url);

    const response = await fetch(url, {
        headers: {
            'x-apikey': apiKey,
            'Accept': 'application/json; charset=UTF-8'
        }
    });

    console.log(`📡 FlightAware response status:`, response.status);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FlightAware API error:', { 
            status: response.status, 
            statusText: response.statusText,
            body: errorText.substring(0, 200) // Log first 200 chars
        });
        
        // Provide helpful error messages
        if (response.status === 401) {
            throw new Error('Invalid API key. Please check your FlightAware API key.');
        } else if (response.status === 403) {
            throw new Error('API key does not have permission to access this endpoint.');
        } else if (response.status === 404) {
            throw new Error(`Airport ${airport} not found or no data available.`);
        } else if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please try again later.');
        } else {
            throw new Error(`FlightAware API error (${response.status}): ${errorText.substring(0, 100)}`);
        }
    }

    const data = await response.json();
    console.log(`✅ Received ${type} data:`, {
        hasArrivals: !!data.arrivals,
        hasDepartures: !!data.departures,
        hasFlights: !!data.flights,
        keys: Object.keys(data)
    });
    
    // FlightAware returns data in 'arrivals' or 'departures' or 'flights' key
    return data.arrivals || data.departures || data.flights || [];
}

// Filter for non-EU flights
function filterNonEuFlights(flights, type) {
    if (!flights || flights.length === 0) {
        console.log(`⚠️ No ${type} flights to filter`);
        return [];
    }

    console.log(`🔍 Filtering ${flights.length} ${type} flights...`);
    
    // Log first flight structure for debugging
    if (flights[0]) {
        console.log('📋 Sample flight structure:', JSON.stringify(flights[0], null, 2));
    }

    const filtered = flights.filter(flight => {
        // Get origin/destination based on type
        const location = type === 'arrival' ? flight.origin : flight.destination;
        
        if (!location) {
            console.log(`❌ Flight ${flight.ident} has no ${type === 'arrival' ? 'origin' : 'destination'}`);
            return false;
        }

        // Check ICAO code
        const icaoCode = location.code_icao || location.code;
        if (!icaoCode) {
            console.log(`❌ Flight ${flight.ident} has no ICAO code:`, location);
            return false;
        }
        
        // Extract country prefix from ICAO code
        const countryPrefix = icaoCode.substring(0, 2);
        const isEu = isEuAirport(countryPrefix);
        
        console.log(`✈️ ${flight.ident}: ${icaoCode} (${countryPrefix}) → ${isEu ? 'EU (filtered out)' : 'Non-EU (INCLUDED)'}`);
        
        // Check if it's a non-EU country
        return !isEu;
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
    
    console.log(`✅ Filtered ${type}: ${filtered.length} non-EU flights out of ${flights.length} total`);
    return filtered;
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
