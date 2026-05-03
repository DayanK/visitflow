const axios = require('axios');
require('dotenv').config();

const AZURE_MAPS_KEY = process.env.AZURE_MAPS_KEY;
const BASE_URL = 'https://atlas.microsoft.com';

/**
 * Geocode an address using Azure Maps Search API.
 * Tries progressively simpler queries until a result is found.
 * Returns { latitude, longitude } or null on failure.
 */
async function geocodeAddress({ street, city, postalCode, country }) {
  const attempts = [
    [street, city, postalCode, country].filter(Boolean).join(', '),
    [street, city, postalCode].filter(Boolean).join(', '),
    [street, city].filter(Boolean).join(', '),
  ];

  for (const query of attempts) {
    if (!query.trim()) continue;
    try {
      const response = await axios.get(`${BASE_URL}/search/address/json`, {
        params: {
          'api-version': '1.0',
          'subscription-key': AZURE_MAPS_KEY,
          query,
          limit: 1,
        },
        timeout: 8000,
      });

      const results = response.data?.results;
      if (!results || results.length === 0) continue;

      const pos = results[0]?.position;
      if (pos?.lat != null && pos?.lon != null) {
        return { latitude: pos.lat, longitude: pos.lon };
      }
    } catch (err) {
      console.error(`Azure Maps geocode failed for "${query}":`, err.message);
    }
  }
  return null;
}

/**
 * Get route distance/duration between ordered waypoints.
 * waypoints: [{ latitude, longitude }, ...]
 * Returns { durationSeconds, distanceMeters } or null.
 */
async function getRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;

  // Azure Maps route query format: lat0,lon0:lat1,lon1:...
  const query = waypoints.map((wp) => `${wp.latitude},${wp.longitude}`).join(':');

  try {
    const response = await axios.get(`${BASE_URL}/route/directions/json`, {
      params: {
        'api-version': '1.0',
        'subscription-key': AZURE_MAPS_KEY,
        query,
      },
      timeout: 15000,
    });

    const routes = response.data?.routes;
    if (!routes || routes.length === 0) return null;

    const summary = routes[0].summary;
    return {
      durationSeconds: summary.travelTimeInSeconds,
      distanceMeters: summary.lengthInMeters,
    };
  } catch (err) {
    console.error('Azure Maps route failed:', err.message);
    return null;
  }
}

module.exports = { geocodeAddress, getRoute };
