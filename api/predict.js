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
        // Parse the date - FlightAware expects ISO8601 format without milliseconds
        const targetDate = new Date(date + 'T00:00:00Z');
        
        // Create start and end times in ISO8601 format (YYYY-MM-DDTHH:MM:SSZ)
        const startTime = new Date(targetDate);
        startTime.setUTCHours(0, 0, 0, 0);
        
        const endTime = new Date(targetDate);
        endTime.setUTCHours(23, 59, 59, 0); // No milliseconds!

        // Format to ISO8601 without milliseconds
        const startISO = startTime.toISOString().split('.')[0] + 'Z';
        const endISO = endTime.toISOString().split('.')[0] + 'Z';

        console.log('📅 Date range:', { 
            date: date,
            start: startISO,
            end: endISO
        });

        // Fetch arrivals and departures from FlightAware API
        console.log('🛫 Fetching flight data...');
        
        let arrivalsData = [];
        let departuresData = [];
        let apiError = null;

        try {
            [arrivalsData, departuresData] = await Promise.all([
                fetchFlightAwareData(apiKey, airport, 'arrivals', startISO, endISO),
                fetchFlightAwareData(apiKey, airport, 'departures', startISO, endISO)
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
async function fetchFlightAwareData(apiKey, airport, type, startISO, endISO) {
    // FlightAware AeroAPI v4 endpoint - Updated format
    const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
    const endpoint = type === 'arrivals' 
        ? `${baseUrl}/airports/${airport}/flights/arrivals`
        : `${baseUrl}/airports/${airport}/flights/departures`;

    // Use ISO8601 format without milliseconds (YYYY-MM-DDTHH:MM:SSZ)
    const params = new URLSearchParams({
        start: startISO,
        end: endISO
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
        const icaoCode = location.code_icao || location.code || location.code_iata;
        if (!icaoCode) {
            console.log(`❌ Flight ${flight.ident} has no ICAO code. Location:`, JSON.stringify(location));
            return false;
        }
        
        // Extract country prefix from ICAO code (first 2 letters)
        const countryPrefix = icaoCode.substring(0, 2);
        const isEu = isEuAirport(countryPrefix);
        
        const locationName = location.city || location.name || location.code || 'Unknown';
        console.log(`✈️  ${flight.ident} → ${locationName} (${icaoCode}) [${countryPrefix}] = ${isEu ? '🇪🇺 EU (FILTERED OUT)' : '🌍 NON-EU (✅ INCLUDED)'}`);
        
        // Check if it's a non-EU country
        return !isEu;
    }).map(flight => {
        const scheduledTime = flight.scheduled_out || flight.scheduled_in || flight.scheduled_off || flight.scheduled_on;
        const estimatedTime = flight.estimated_out || flight.estimated_in || flight.estimated_off || flight.estimated_on;
        
        // Extract aircraft information
        const aircraftType = flight.aircraft_type || flight.aircraft?.type || 'Unknown';
        const passengers = estimatePassengersForAircraft(aircraftType);
        
        return {
            flightNumber: flight.ident || flight.flight_number || 'Unknown',
            airline: flight.operator || flight.operator_iata || 'Unknown',
            origin: type === 'arrival' ? (flight.origin?.city || flight.origin?.code || flight.origin?.name) : null,
            destination: type === 'departure' ? (flight.destination?.city || flight.destination?.code || flight.destination?.name) : null,
            scheduledTime: scheduledTime,
            estimatedTime: estimatedTime,
            type: type,
            aircraftType: aircraftType,
            estimatedPassengers: passengers
        };
    });
    
    console.log(`✅ Filtered ${type}: ${filtered.length} non-EU flights out of ${flights.length} total`);
    return filtered;
}

// Check if airport is in EU/Schengen based on ICAO prefix
function isEuAirport(prefix) {
    // EU + Schengen + EFTA ICAO prefixes (comprehensive list)
    // https://en.wikipedia.org/wiki/List_of_airports_by_ICAO_code
    const euSchengenPrefixes = [
        // Western Europe
        'EB', // Belgium
        'ED', 'ET', // Germany
        'EF', // Finland
        'EG', // UK (not EU but often grouped for travel)
        'EH', // Netherlands
        'EI', // Ireland
        'EK', // Denmark
        'EL', // Luxembourg
        'EN', // Norway
        'EP', // Poland
        'ES', // Sweden
        'EV', // Latvia
        'EY', // Lithuania
        
        // Southern Europe
        'LB', // Bulgaria
        'LC', // Cyprus
        'LD', // Croatia
        'LE', // Spain
        'LF', // France
        'LG', // Greece
        'LH', // Hungary
        'LI', // Italy
        'LJ', // Slovenia
        'LK', // Czech Republic
        'LO', // Austria
        'LP', // Portugal
        'LQ', // Bosnia (not EU but close)
        'LR', // Romania
        'LS', // Switzerland
        'LT', // Turkey (not EU but border country)
        'LU', // Moldova
        'LW', // North Macedonia
        'LX', // Gibraltar
        'LY', // Serbia, Montenegro
        'LZ', // Slovakia
        
        // Baltic
        'EE', // Estonia
    ];
    
    console.log(`🔍 Checking ICAO prefix: ${prefix} → ${euSchengenPrefixes.includes(prefix) ? 'EU/Schengen' : 'NON-EU'}`);
    
    return euSchengenPrefixes.includes(prefix);
}

// Estimate passengers based on aircraft type
function estimatePassengersForAircraft(aircraftType) {
    if (!aircraftType || aircraftType === 'Unknown') {
        return 180; // Default estimate
    }
    
    // Common aircraft capacity mapping (typical economy configuration)
    const aircraftCapacities = {
        // Airbus narrow-body
        'A318': 132, 'A319': 156, 'A320': 180, 'A321': 220,
        'A20N': 180, 'A21N': 220, // Neo versions
        
        // Airbus wide-body
        'A330': 290, 'A332': 290, 'A333': 300, 'A338': 260, 'A339': 310,
        'A350': 325, 'A359': 325, 'A35K': 366,
        'A380': 555, 'A388': 555,
        
        // Boeing narrow-body
        'B737': 189, 'B738': 189, 'B739': 220, 'B37M': 210,
        'B38M': 210, 'B39M': 220, // MAX versions
        'B752': 200, 'B753': 230,
        
        // Boeing wide-body
        'B763': 290, 'B764': 290, 'B772': 305, 'B773': 368, 'B77L': 396,
        'B77W': 396, 'B788': 242, 'B789': 290, 'B78X': 330,
        'B747': 416, 'B74S': 416, 'B74R': 416,
        
        // Embraer
        'E190': 114, 'E195': 124, 'E290': 114, 'E295': 146,
        
        // Bombardier
        'CRJ7': 78, 'CRJ9': 90, 'CRJX': 100,
        
        // Other regional
        'AT72': 70, 'AT76': 78, 'DH8D': 78,
        
        // Business jets (small capacity)
        'GLF5': 16, 'GLF6': 19, 'G650': 19, 'PC12': 9
    };
    
    // Try exact match first
    if (aircraftCapacities[aircraftType]) {
        return aircraftCapacities[aircraftType];
    }
    
    // Try partial match (e.g., "A320-200" matches "A320")
    for (const [key, capacity] of Object.entries(aircraftCapacities)) {
        if (aircraftType.startsWith(key)) {
            return capacity;
        }
    }
    
    // Fallback: estimate based on aircraft size indicators
    if (aircraftType.includes('380')) return 555; // A380
    if (aircraftType.includes('777') || aircraftType.includes('77')) return 350; // 777
    if (aircraftType.includes('787') || aircraftType.includes('78')) return 280; // 787
    if (aircraftType.includes('747')) return 416; // 747
    if (aircraftType.includes('350')) return 325; // A350
    if (aircraftType.includes('330')) return 290; // A330
    if (aircraftType.includes('321') || aircraftType.includes('21')) return 220; // A321
    if (aircraftType.includes('320') || aircraftType.includes('20')) return 180; // A320
    if (aircraftType.includes('737') || aircraftType.includes('38')) return 189; // 737
    
    // Default fallback
    return 180;
}

// Analyze flights and calculate peak times
function analyzeFlights(arrivals, departures) {
    const allFlights = [...arrivals, ...departures];
    
    if (allFlights.length === 0) {
        return {
            arrivals: [],
            departures: [],
            totalFlights: 0,
            totalPassengers: 0,
            peakHour: 'N/A',
            peakFlights: [],
            flightsByHour: {}
        };
    }
    
    // Calculate actual total passengers based on aircraft types
    const totalPassengers = allFlights.reduce((sum, flight) => {
        return sum + (flight.estimatedPassengers || 180);
    }, 0);
    
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
        totalPassengers: totalPassengers,
        peakHour: peakHourFormatted,
        peakFlights: peakHour ? flightsByHour[peakHour].slice(0, 10) : [],
        flightsByHour: flightsByHour
    };
}