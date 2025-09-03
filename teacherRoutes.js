const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const { checkIpLocation } = require("../middlewares/locationIpMiddleware");

router.use(verifyToken);
router.use(authorizeRoles("teacher"));

router.get("/dashboard", teacherController.getDashboard);

router.post("/class/:classId/generate-qr", teacherController.generateQrCode);

router.post(
  "/class/:classId/manual-attendance",
  teacherController.manualAttendance
);

router.get("/low-attendance", teacherController.getLowAttendanceStudents);

router.post("/warn-student/:studentId", teacherController.warnStudent);

module.exports = router;
