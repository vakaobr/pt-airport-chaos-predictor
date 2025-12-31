// AviationStack API integration for enriched data
// This endpoint fetches airline logos, aircraft details, and historical data

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { type, code, airport, date } = req.query;

    // Get API key from environment
    const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY;

    if (!AVIATIONSTACK_API_KEY) {
        return res.status(500).json({
            error: 'AviationStack API key not configured'
        });
    }

    try {
        let data = {};

        switch (type) {
            case 'airline':
                data = await fetchAirlineData(code, AVIATIONSTACK_API_KEY);
                break;
            
            case 'aircraft':
                data = await fetchAircraftData(code, AVIATIONSTACK_API_KEY);
                break;
            
            case 'historical':
                data = await fetchHistoricalData(airport, date, AVIATIONSTACK_API_KEY);
                break;
            
            default:
                return res.status(400).json({ error: 'Invalid type parameter' });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('AviationStack API error:', error);
        return res.status(500).json({
            error: error.message || 'Failed to fetch data from AviationStack'
        });
    }
}

// Fetch airline data
async function fetchAirlineData(code, apiKey) {
    const url = `http://api.aviationstack.com/v1/airlines?access_key=${apiKey}&search=${code}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`AviationStack API error: ${response.status}`);
    }
    
    const json = await response.json();
    
    if (json.data && json.data.length > 0) {
        const airline = json.data[0];
        return {
            name: airline.airline_name,
            iata: airline.iata_code,
            icao: airline.icao_code,
            callsign: airline.callsign,
            country: airline.country_name,
            fleetSize: airline.fleet_size,
            fleetAge: airline.fleet_average_age,
            founded: airline.date_founded,
            status: airline.status,
            // Construct logo URL from AirHex
            logoUrl: `https://content.airhex.com/content/logos/airlines_${airline.iata_code}_100_100_s.png`
        };
    }
    
    return { error: 'Airline not found' };
}

// Fetch aircraft type data
async function fetchAircraftData(code, apiKey) {
    const url = `http://api.aviationstack.com/v1/aircraft_types?access_key=${apiKey}&search=${code}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`AviationStack API error: ${response.status}`);
    }
    
    const json = await response.json();
    
    if (json.data && json.data.length > 0) {
        const aircraft = json.data[0];
        return {
            name: aircraft.aircraft_name,
            iataCode: aircraft.iata_code,
            // Try to get more details by searching airplanes endpoint
            details: await fetchAircraftDetails(code, apiKey)
        };
    }
    
    return { error: 'Aircraft type not found' };
}

// Fetch detailed aircraft information
async function fetchAircraftDetails(code, apiKey) {
    const url = `http://api.aviationstack.com/v1/airplanes?access_key=${apiKey}&iata_type=${code}&limit=1`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        
        const json = await response.json();
        
        if (json.data && json.data.length > 0) {
            const plane = json.data[0];
            return {
                modelName: plane.model_name,
                modelCode: plane.model_code,
                productionLine: plane.production_line,
                engines: plane.engines_type,
                engineCount: plane.engines_count
            };
        }
    } catch (e) {
        console.error('Error fetching aircraft details:', e);
    }
    
    return null;
}

// Fetch historical flight data
async function fetchHistoricalData(airport, date, apiKey) {
    // Historical flights for the specified airport and date
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_date=${date}&dep_iata=${airport}&limit=100`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`AviationStack API error: ${response.status}`);
    }
    
    const json = await response.json();
    
    if (json.data) {
        // Process and return historical data
        const flights = json.data.map(flight => ({
            flightNumber: flight.flight?.iata,
            airline: flight.airline?.name,
            departure: flight.departure?.airport,
            arrival: flight.arrival?.airport,
            scheduled: flight.departure?.scheduled,
            actual: flight.departure?.actual,
            status: flight.flight_status,
            aircraft: flight.aircraft?.iata
        }));
        
        return {
            date,
            airport,
            totalFlights: flights.length,
            flights: flights
        };
    }
    
    return { error: 'No historical data found' };
}
