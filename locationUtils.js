// utils/locationUtils.js

// Haversine formula to calculate distance in meters between two lat/lng points
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c;
  return d;
}

// Check if distance within given radius (e.g., 5m)
function isWithinRadius(loc1, loc2, radiusMeters = 5) {
  const dist = getDistanceMeters(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
  return dist <= radiusMeters;
}

module.exports = { getDistanceMeters, isWithinRadius };
