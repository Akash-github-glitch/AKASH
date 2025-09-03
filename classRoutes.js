// routes/classRoutes.js
const express = require("express");
const router = express.Router();
const {
  verifyToken,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const classController = require("../controllers/classController");

router.post(
  "/",
  verifyToken,
  authorizeRoles("teacher"),
  classController.addClass
);
router.get(
  "/teacher",
  verifyToken,
  authorizeRoles("teacher"),
  classController.getTeacherClasses
);
router.get(
  "/student",
  verifyToken,
  authorizeRoles("student"),
  classController.getStudentClasses
);

module.exports = router;
