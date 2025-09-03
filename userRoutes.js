// routes/userRoutes.js
const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const {
  registerStudentProfile,
  getPendingStudentApprovals,
  approveStudent,
} = require("../controllers/userController");

// Student registers profile (after Firebase auth signup)
router.post(
  "/register-profile",
  verifyToken,
  authorizeRoles("student"),
  registerStudentProfile
);

// Teacher gets pending student approval requests
router.get(
  "/pending-approvals",
  verifyToken,
  authorizeRoles("teacher"),
  getPendingStudentApprovals
);

// Teacher approves a student
router.patch(
  "/approve-student/:studentId",
  verifyToken,
  authorizeRoles("teacher"),
  approveStudent
);

module.exports = router;
