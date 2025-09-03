// routes/sessionRoutes.js
const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const sessionController = require("../controllers/sessionController");

// ✅ Teacher creates a session
router.post(
  "/",
  verifyToken,
  authorizeRoles("teacher"),
  sessionController.createSession
);

// ✅ Teacher activates QR (only after 50% class duration)
router.patch(
  "/activate/:sessionId",
  verifyToken,
  authorizeRoles("teacher"),
  sessionController.activateQR
);

// ✅ Student marks attendance (with QR + location check)
router.post(
  "/mark-attendance/:sessionId",
  verifyToken,
  authorizeRoles("student"),
  sessionController.markAttendance
);

// ✅ Teacher does manual override (only if QR failed)
router.post(
  "/manual-override/:sessionId",
  verifyToken,
  authorizeRoles("teacher"),
  sessionController.manualOverride
);

module.exports = router;
