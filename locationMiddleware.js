const geoip = require("geoip-lite"); // For IP geolocation, install this package

/**
 * Check if two IP addresses are geographically within 5 meters range.
 * Note: IP geolocation is approximate, actual 5m accuracy is nearly impossible via IP.
 * For demo, we check if city or region matches, or do a rough distance check.
 */
function isWithinRange(ip1, ip2, maxMeters = 5) {
  const loc1 = geoip.lookup(ip1);
  const loc2 = geoip.lookup(ip2);

  if (!loc1 || !loc2) return false;

  // Approximate check: same city and region
  if (loc1.city === loc2.city && loc1.region === loc2.region) return true;

  // You can enhance this with real GPS lat/lon if you get from client side

  return false;
}

const checkIpLocation = (req, res, next) => {
  try {
    const teacherIp = req.headers["x-teacher-ip"];
    const studentIp = req.headers["x-student-ip"];

    if (!teacherIp || !studentIp) {
      return res
        .status(400)
        .json({ message: "IP addresses required in headers" });
    }

    if (!isWithinRange(teacherIp, studentIp)) {
      return res
        .status(403)
        .json({ message: "IP addresses are not in allowed proximity" });
    }

    next();
  } catch (error) {
    console.error("IP/location check error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { checkIpLocation };
