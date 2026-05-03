const axios = require('axios');
require('dotenv').config();

const BING_KEY = process.env.BING_MAPS_API_KEY;
const BASE_URL = 'https://dev.virtualearth.net/REST/v1';

/**
 * Geocode an address using Bing Maps Locations API.
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
      const response = await axios.get(`${BASE_URL}/Locations`, {
        params: { q: query, key: BING_KEY, maxResults: 1 },
        timeout: 8000,
      });

      const sets = response.data?.resourceSets;
      if (!sets || sets.length === 0 || sets[0].estimatedTotal === 0) continue;

      const point = sets[0].resources[0]?.point?.coordinates;
      if (point && point.length === 2) {
        return { latitude: point[0], longitude: point[1] };
      }
    } catch (err) {
      console.error(`Geocode attempt failed for "${query}":`, err.message);
    }
  }
  return null;
}

/**
 * Get a route between an ordered list of waypoints.
 * waypoints: [{ latitude, longitude }, ...]
 * Returns { durationSeconds, distanceKm } or null.
 */
async function getRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) return null;

  const params = { key: BING_KEY, optimizeWaypoints: false };
  waypoints.forEach((wp, i) => {
    params[`wp.${i}`] = `${wp.latitude},${wp.longitude}`;
  });

  try {
    const response = await axios.get(`${BASE_URL}/Routes`, {
      params,
      timeout: 15000,
    });

    const sets = response.data?.resourceSets;
    if (!sets || sets.length === 0 || sets[0].estimatedTotal === 0) return null;

    const route = sets[0].resources[0];
    return {
      durationSeconds: route.travelDuration,
      distanceKm: route.travelDistance,
    };
  } catch (err) {
    console.error('Route calculation failed:', err.message);
    return null;
  }
}

module.exports = { geocodeAddress, getRoute };
