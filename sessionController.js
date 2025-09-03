const admin = require("firebase-admin");
const db = admin.firestore();
const { isWithinRadius } = require("../utils/locationUtils");
const { generateUUID } = require("../utils/uuidUtils");
const { generateQRCode } = require("../utils/qrUtils");

/**
 * Teacher creates a session
 */
exports.createSession = async (req, res) => {
  try {
    const { teacherId, classId, date, startTime, endTime, location } = req.body;

    if (
      !teacherId ||
      !classId ||
      !date ||
      !startTime ||
      !endTime ||
      !location
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newSession = {
      teacherId,
      classId,
      date,
      startTime,
      endTime,
      location,
      qrActive: false,
      qrCode: null,
      qrActivatedAt: null,
      attendanceMap: {},
    };

    const sessionRef = await db.collection("sessions").add(newSession);
    res
      .status(201)
      .json({ message: "Session created", sessionId: sessionRef.id });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Teacher activates QR after 50% of class
 */
exports.activateQR = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists)
      return res.status(404).json({ message: "Session not found" });

    const sessionData = sessionDoc.data();
    const now = new Date();
    const classDate = new Date(sessionData.date);

    const [startHour, startMin] = sessionData.startTime.split(":").map(Number);
    const [endHour, endMin] = sessionData.endTime.split(":").map(Number);

    const classStart = new Date(classDate);
    classStart.setHours(startHour, startMin, 0, 0);
    const classEnd = new Date(classDate);
    classEnd.setHours(endHour, endMin, 0, 0);

    const classDurationMs = classEnd - classStart;
    const timeElapsed = now - classStart;

    if (timeElapsed < classDurationMs / 2) {
      return res
        .status(400)
        .json({ message: "Cannot activate QR before 50% of class" });
    }

    const uuid = generateUUID();
    const qrCode = await generateQRCode(uuid);

    await sessionRef.update({
      qrActive: true,
      qrActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      qrCode,
      qrUUID: uuid,
    });

    res.json({ message: "QR activated", qrCode, uuid });
  } catch (error) {
    console.error("Activate QR error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Student marks attendance
 */
exports.markAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user.uid;
    const { qrUUID, location } = req.body;

    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists)
      return res.status(404).json({ message: "Session not found" });

    const sessionData = sessionDoc.data();

    if (!sessionData.qrActive)
      return res.status(403).json({ message: "QR not active" });

    if (qrUUID !== sessionData.qrUUID)
      return res.status(400).json({ message: "Invalid QR code" });

    if (!location || !isWithinRadius(sessionData.location, location, 5))
      return res.status(403).json({ message: "Out of location range" });

    const now = new Date();
    const classDate = new Date(sessionData.date);
    const [endHour, endMin] = sessionData.endTime.split(":").map(Number);
    const classEnd = new Date(classDate);
    classEnd.setHours(endHour, endMin, 0, 0);
    const expiry = new Date(classEnd.getTime() + 30 * 60000);

    if (now > expiry) return res.status(403).json({ message: "QR expired" });

    const attendanceMap = sessionData.attendanceMap || {};
    if (attendanceMap[studentId])
      return res.status(400).json({ message: "Already marked" });

    attendanceMap[studentId] = true;
    await sessionRef.update({ attendanceMap });

    res.json({ message: "Attendance marked" });
  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Manual override (only if QR failed)
 */
exports.manualOverride = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ message: "studentIds must be an array" });
    }

    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists)
      return res.status(404).json({ message: "Session not found" });

    const sessionData = sessionDoc.data();

    // only allow manual override if QR failed (never activated or expired with no scans)
    if (sessionData.qrActive) {
      return res.status(400).json({
        message: "Manual override only allowed if QR failed or expired",
      });
    }

    const attendanceMap = sessionData.attendanceMap || {};
    studentIds.forEach((id) => {
      attendanceMap[id] = true;
    });

    await sessionRef.update({ attendanceMap });
    res.json({ message: "Manual override completed", studentIds });
  } catch (error) {
    console.error("Manual override error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
