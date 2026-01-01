// server/utils/distance.js

function toRad(value) {
  return (value * Math.PI) / 180;
}

// Haversine distance (meters)
function distanceBetween(a, b) {
  const R = 6371000; // Earth radius in meters

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

module.exports = { distanceBetween };
