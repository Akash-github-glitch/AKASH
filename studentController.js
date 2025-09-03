const admin = require("firebase-admin");
const db = admin.firestore();

exports.getDashboard = async (req, res) => {
  try {
    const studentId = req.user.uid;

    // Fetch student profile for enrolled classes, section, semester, department
    const studentDoc = await db.collection("students").doc(studentId).get();
    if (!studentDoc.exists)
      return res.status(404).json({ message: "Student not found" });

    const studentData = studentDoc.data();
    const { enrolledClasses = [] } = studentData;

    // Get upcoming classes only (filter by current time)
    const now = admin.firestore.Timestamp.now();
    const upcomingClasses = [];

    if (enrolledClasses.length > 0) {
      // Get class details
      const classRefs = enrolledClasses.map((cid) =>
        db.collection("classes").doc(cid)
      );
      const classDocs = await Promise.all(classRefs.map((ref) => ref.get()));

      classDocs.forEach((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        if (data.endTime.toMillis() > now.toMillis()) {
          upcomingClasses.push({ id: doc.id, ...data });
        }
      });
    }

    // Get attendance summary (for example, total attended classes, total classes)
    // This can be optimized with precomputed attendance data, here we keep it simple

    // Fetch attendance docs for this student
    const attendanceSnapshot = await db
      .collection("attendance")
      .where("studentId", "==", studentId)
      .where("status", "==", "present")
      .get();

    const attendedCount = attendanceSnapshot.size;

    // For total classes, count all attendance docs for enrolled classes (assuming 'attendance' docs exist even for absentees)
    const totalClassesSnapshot = await db
      .collection("attendance")
      .where("studentId", "==", studentId)
      .get();

    const totalClasses = totalClassesSnapshot.size || 1; // avoid div by zero

    const attendancePercent = (attendedCount / totalClasses) * 100;

    return res.json({
      upcomingClasses,
      attendanceSummary: {
        attended: attendedCount,
        total: totalClasses,
        percentage: attendancePercent.toFixed(2),
      },
    });
  } catch (error) {
    console.error("getDashboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const studentId = req.user.uid;

    // Get attendance records (present only) ordered by date desc
    const attendanceSnapshot = await db
      .collection("attendance")
      .where("studentId", "==", studentId)
      .where("status", "==", "present")
      .orderBy("date", "desc")
      .get();

    const attendanceRecords = [];
    attendanceSnapshot.forEach((doc) => {
      attendanceRecords.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ attendanceRecords });
  } catch (error) {
    console.error("getAttendanceHistory error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getWarnings = async (req, res) => {
  try {
    const studentId = req.user.uid;

    // Fetch warnings for this student ordered by date desc
    const warningsSnapshot = await db
      .collection("warnings")
      .where("studentId", "==", studentId)
      .orderBy("date", "desc")
      .get();

    const warnings = [];
    warningsSnapshot.forEach((doc) => {
      warnings.push({ id: doc.id, ...doc.data() });
    });

    return res.json({ warnings });
  } catch (error) {
    console.error("getWarnings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
