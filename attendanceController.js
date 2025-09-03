const admin = require("firebase-admin");
const db = admin.firestore();
const { isWithinRadius } = require("../utils/locationUtils");

// Mark attendance via QR scan
exports.markAttendance = async (req, res) => {
  try {
    const {
      studentId,
      classSessionId,
      studentLocation,
      teacherLocation,
      ipStudent,
      ipTeacher,
    } = req.body;

    // Check if student location is within 5 meters of teacher location
    if (!isWithinRadius(studentLocation, teacherLocation, 5)) {
      return res
        .status(403)
        .json({
          message: "Location check failed: Student is not in required range.",
        });
    }

    // Check IPs - (You can implement your IP subnet logic here or call a helper function)
    if (!checkIPRange(ipStudent, ipTeacher)) {
      return res.status(403).json({ message: "IP address validation failed." });
    }

    // Check if attendance already marked for this student and session
    const attendanceDocRef = db
      .collection("attendance")
      .doc(`${classSessionId}_${studentId}`);
    const attendanceDoc = await attendanceDocRef.get();

    if (attendanceDoc.exists) {
      return res
        .status(400)
        .json({ message: "Attendance already marked for this session." });
    }

    // Mark attendance
    await attendanceDocRef.set({
      studentId,
      classSessionId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      method: "QR Scan",
    });

    return res.status(200).json({ message: "Attendance marked successfully." });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Manual override attendance marking by teacher
exports.manualOverrideAttendance = async (req, res) => {
  try {
    const { teacherId, classSessionId, studentIds } = req.body;

    // Verify teacher permission logic here if needed

    const batch = db.batch();

    studentIds.forEach((studentId) => {
      const attendanceDocRef = db
        .collection("attendance")
        .doc(`${classSessionId}_${studentId}`);
      batch.set(attendanceDocRef, {
        studentId,
        classSessionId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        method: "Manual Override",
        markedBy: teacherId,
      });
    });

    await batch.commit();

    return res
      .status(200)
      .json({ message: "Manual attendance override completed." });
  } catch (error) {
    console.error("Manual override error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// Get attendance summary for student
exports.getStudentAttendanceSummary = async (req, res) => {
  try {
    const { studentId, semester, department, section } = req.params;

    // Fetch classes for student's semester, department, section
    const classesSnapshot = await db
      .collection("classes")
      .where("semester", "==", parseInt(semester))
      .where("department", "==", department)
      .where("section", "==", section)
      .get();

    const classIds = classesSnapshot.docs.map((doc) => doc.id);

    // Fetch attendance docs for this student for these classes
    const attendanceSnapshot = await db
      .collection("attendance")
      .where("studentId", "==", studentId)
      .where("classSessionId", "in", classIds)
      .get();

    const attendedSessions = attendanceSnapshot.size;
    const totalSessions = classIds.length; // Assuming one attendance per class (You may want to sum sessions count)

    res.status(200).json({
      totalSessions,
      attendedSessions,
      attendancePercent:
        totalSessions === 0 ? 0 : (attendedSessions / totalSessions) * 100,
    });
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Fetch students with less than 50% attendance for a class (teacher view)
exports.getStudentsWithLowAttendance = async (req, res) => {
  try {
    const { classId } = req.params;

    // Fetch all students for this class (department, semester, section)
    const classDoc = await db.collection("classes").doc(classId).get();
    if (!classDoc.exists) {
      return res.status(404).json({ message: "Class not found." });
    }
    const classData = classDoc.data();

    const studentsSnapshot = await db
      .collection("students")
      .where("department", "==", classData.department)
      .where("semester", "==", classData.semester)
      .where("section", "==", classData.section)
      .get();

    const students = studentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Count total sessions for the class
    const totalSessionsSnapshot = await db
      .collection("classSessions")
      .where("classId", "==", classId)
      .get();
    const totalSessions = totalSessionsSnapshot.size;

    if (totalSessions === 0) {
      return res
        .status(200)
        .json({ message: "No sessions conducted yet.", students: [] });
    }

    // For each student, count attendance sessions
    const lowAttendanceStudents = [];

    for (const student of students) {
      const attendanceSnapshot = await db
        .collection("attendance")
        .where(
          "classSessionId",
          "in",
          totalSessionsSnapshot.docs.map((d) => d.id)
        )
        .where("studentId", "==", student.id)
        .get();

      const attended = attendanceSnapshot.size;
      const percent = (attended / totalSessions) * 100;

      if (percent < 50) {
        lowAttendanceStudents.push({ student, attendancePercent: percent });
      }
    }

    res.status(200).json({ lowAttendanceStudents });
  } catch (error) {
    console.error("Error fetching low attendance students:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Utility function placeholder for IP range check (you can improve logic)
function checkIPRange(ipStudent, ipTeacher) {
  // Here you implement your logic to check if IP addresses are in the same subnet or within range.
  // For now, simple equality or subnet matching can be done.
  return ipStudent === ipTeacher; // Replace with real logic
}
