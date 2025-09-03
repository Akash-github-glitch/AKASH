// controllers/warningController.js
const admin = require("firebase-admin");
const db = admin.firestore();

exports.getLowAttendanceStudents = async (req, res) => {
  try {
    const teacherId = req.user.uid;
    const attendanceThreshold = 0.5; // 50%

    // Fetch classes of this teacher
    const classesSnap = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();

    const lowAttendanceStudents = [];

    for (const classDoc of classesSnap.docs) {
      const classId = classDoc.id;

      // Fetch sessions for class
      const sessionsSnap = await db
        .collection("sessions")
        .where("classId", "==", classId)
        .get();
      const totalSessions = sessionsSnap.size;
      if (totalSessions === 0) continue;

      // Aggregate attendance per student
      const attendanceCount = {}; // studentId => attended count

      sessionsSnap.forEach((sessionDoc) => {
        const attendanceMap = sessionDoc.data().attendanceMap || {};
        Object.keys(attendanceMap).forEach((studentId) => {
          if (attendanceMap[studentId]) {
            attendanceCount[studentId] = (attendanceCount[studentId] || 0) + 1;
          }
        });
      });

      // Calculate attendance percentage
      for (const studentId in attendanceCount) {
        const attendancePercent = attendanceCount[studentId] / totalSessions;
        if (attendancePercent < attendanceThreshold) {
          lowAttendanceStudents.push({ studentId, classId, attendancePercent });
        }
      }
    }

    res.json(lowAttendanceStudents);
  } catch (error) {
    console.error("Get low attendance students error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.sendWarning = async (req, res) => {
  try {
    const teacherId = req.user.uid;
    const { studentId, classId, message } = req.body;

    const warning = {
      studentId,
      teacherId,
      classId,
      message,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("warnings").add(warning);

    res.json({ message: "Warning sent to student" });
  } catch (error) {
    console.error("Send warning error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Student gets warnings for them
exports.getStudentWarnings = async (req, res) => {
  try {
    const studentId = req.user.uid;

    const warningsSnap = await db
      .collection("warnings")
      .where("studentId", "==", studentId)
      .get();

    const warnings = [];
    warningsSnap.forEach((doc) => {
      warnings.push({ id: doc.id, ...doc.data() });
    });

    res.json(warnings);
  } catch (error) {
    console.error("Get student warnings error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
