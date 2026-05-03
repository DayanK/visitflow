const { geocodeAddress } = require('../services/azureMapsService');
const { getCachedCoordinates, storeCoordinates } = require('../services/tableStorageService');
const { optimize } = require('../services/routeOptimizer');

/**
 * POST /ContactCordinate
 * Input:  Array<{ id?, street, city, postalcode, country, Geocoordinates? }>
 * Output: IContactCoordinates[] = Array<{ Id, Latitude, Longitude }>
 */
const getContactCoordinates = async (req, res) => {
  const contacts = req.body;

  if (!Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Expected an array of contacts' });
  }

  const results = [];

  for (const contact of contacts) {
    const id = contact.id || contact.Id;
    if (!id) continue;

    // If coordinates already provided (Dynamics CRM), skip geocoding
    const pre = contact.Geocoordinates || contact.geocoordinates;
    if (pre?.Latitude && pre?.Longitude) {
      results.push({ Id: id, Latitude: pre.Latitude, Longitude: pre.Longitude });
      continue;
    }

    const street = contact.street || contact.Street || '';
    const city = contact.city || contact.City || '';
    const postalCode = contact.postalcode || contact.Postalcode || contact.postalCode || '';
    const country = contact.country || contact.Country || '';

    if (!street && !city) continue; // no address to geocode

    // Check cache first
    let coords = null;
    try {
      coords = await getCachedCoordinates(postalCode || city, street || city);
    } catch (err) {
      console.error('Cache lookup failed:', err.message);
    }

    if (!coords) {
      coords = await geocodeAddress({ street, city, postalCode, country });
      if (coords) {
        try {
          await storeCoordinates(postalCode || city, street || city, coords.latitude, coords.longitude);
        } catch (err) {
          console.error('Cache store failed:', err.message);
        }
      }
    }

    if (coords) {
      results.push({ Id: id, Latitude: coords.latitude, Longitude: coords.longitude });
    }
  }

  res.json(results);
};

/**
 * POST /RoutePlanning
 * Input:  RoutePlanningInput { Jobs, JobDispositions, Workers, OptimizationParams }
 * Output: OptimizeResult { JobDispositions, NotDispatchableJobs, State }
 */
const routePlanning = async (req, res) => {
  const context = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  const { Jobs, Workers, OptimizationParams } = context;

  if (!Jobs || !Workers || !OptimizationParams) {
    return res.status(400).json({ error: 'Missing required fields: Jobs, Workers, OptimizationParams' });
  }

  try {
    // Geocode all jobs
    const geocodedJobs = await Promise.all(
      Jobs.map(async (job) => {
        // Dynamics records already have coordinates
        const pre = job.Geocoordinates || job.geocoordinates;
        if (pre?.Latitude && pre?.Longitude) {
          return { ...job, durationMinutes: job.Duration, coords: { latitude: pre.Latitude, longitude: pre.Longitude } };
        }

        let coords = null;
        try {
          coords = await getCachedCoordinates(job.Postalcode || job.City, job.Street || job.City);
        } catch (_) {}

        if (!coords) {
          coords = await geocodeAddress({
            street: job.Street,
            city: job.City,
            postalCode: job.Postalcode,
            country: job.Country,
          });
          if (coords) {
            try {
              await storeCoordinates(job.Postalcode || job.City, job.Street || job.City, coords.latitude, coords.longitude);
            } catch (_) {}
          }
        }

        return { ...job, durationMinutes: job.Duration, coords };
      })
    );

    // Geocode worker start location
    const worker = Workers[0];
    let workerCoords = null;
    const workerPre = worker.Geocoordinates || worker.geocoordinates;
    if (workerPre?.Latitude && workerPre?.Longitude) {
      workerCoords = { latitude: workerPre.Latitude, longitude: workerPre.Longitude };
    } else {
      try {
        workerCoords = await getCachedCoordinates(worker.Postalcode || worker.City, worker.Street || worker.City);
      } catch (_) {}
      if (!workerCoords) {
        workerCoords = await geocodeAddress({
          street: worker.Street,
          city: worker.City,
          postalCode: worker.Postalcode,
          country: worker.Country,
        });
        if (workerCoords) {
          try {
            await storeCoordinates(worker.Postalcode || worker.City, worker.Street || worker.City, workerCoords.latitude, workerCoords.longitude);
          } catch (_) {}
        }
      }
    }

    if (!workerCoords) {
      return res.status(422).json({ error: 'Could not geocode worker start address' });
    }

    const enrichedContext = {
      ...context,
      Jobs: geocodedJobs,
      Workers: [{ ...worker, coords: workerCoords }],
    };

    const result = optimize(enrichedContext);
    res.json(result);
  } catch (err) {
    console.error('Route planning error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getContactCoordinates, routePlanning };
