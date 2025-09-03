const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");

router.use(verifyToken);
router.use(authorizeRoles("student"));

router.get("/dashboard", studentController.getDashboard);

router.get("/attendance-history", studentController.getAttendanceHistory);

router.get("/warnings", studentController.getWarnings);

module.exports = router;
