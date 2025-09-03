const admin = require("firebase-admin");
const db = admin.firestore();
const { v4: uuidv4 } = require("uuid"); // For unique QR session IDs

// Helper to get current timestamp
const now = admin.firestore.Timestamp.now();

exports.getDashboard = async (req, res) => {
  try {
    const teacherId = req.user.uid;

    // Get all classes assigned to this teacher
    const classesSnapshot = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();

    const classes = [];
    classesSnapshot.forEach((doc) => {
      classes.push({ id: doc.id, ...doc.data() });
    });

    // For example, also get summary of attendance counts (simplified)
    // You can enhance this later with more aggregation
    // For now just send classes
    return res.json({ classes });
  } catch (error) {
    console.error("getDashboard error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.generateQrCode = async (req, res) => {
  try {
    const teacherId = req.user.uid;
    const classId = req.params.classId;

    // Fetch class info to check class timing and date
    const classDoc = await db.collection("classes").doc(classId).get();
    if (!classDoc.exists)
      return res.status(404).json({ message: "Class not found" });
    const classData = classDoc.data();

    // Check if current time is past 50% of class duration
    const startTime = classData.startTime.toDate(); // Firestore Timestamp to JS Date
    const endTime = classData.endTime.toDate();

    const nowDate = new Date();
    const classDurationMs = endTime - startTime;
    const elapsedMs = nowDate - startTime;

    if (elapsedMs < classDurationMs / 2) {
      return res
        .status(400)
        .json({
          message:
            "QR code can only be generated after 50% of class time has passed",
        });
    }

    // Generate QR session - unique code + expiry 30 min after class end time or 1 hour max (your requirement)
    const qrSessionId = uuidv4();
    const expiryTime = new Date(endTime.getTime() + 30 * 60 * 1000); // 30 minutes after class end time

    await db
      .collection("qrSessions")
      .doc(qrSessionId)
      .set({
        classId,
        teacherId,
        generatedAt: now,
        expiresAt: admin.firestore.Timestamp.fromDate(expiryTime),
        active: true,
      });

    // Return the QR code data (could be the qrSessionId or encoded URL)
    return res.json({
      qrCodeData: qrSessionId,
      expiresAt: expiryTime,
      message: "QR code generated successfully",
    });
  } catch (error) {
    console.error("generateQrCode error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.manualAttendance = async (req, res) => {
  try {
    const teacherId = req.user.uid;
    const classId = req.params.classId;
    const { studentIds } = req.body; // array of student IDs to mark attendance manually

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: "studentIds array is required" });
    }

    const batch = db.batch();
    const todayDate = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

    studentIds.forEach((studentId) => {
      // Attendance doc id = classId_studentId_date to keep unique per session
      const attendanceDocId = `${classId}_${studentId}_${todayDate}`;
      const attendanceRef = db.collection("attendance").doc(attendanceDocId);

      batch.set(
        attendanceRef,
        {
          classId,
          studentId,
          teacherId,
          date: admin.firestore.Timestamp.fromDate(new Date()),
          status: "present",
          markedBy: "manual",
          markedAt: admin.firestore.Timestamp.now(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    return res.json({ message: "Manual attendance marked successfully" });
  } catch (error) {
    console.error("manualAttendance error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getLowAttendanceStudents = async (req, res) => {
  try {
    const teacherId = req.user.uid;

    // Fetch all classes of this teacher
    const classesSnapshot = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();
    if (classesSnapshot.empty) {
      return res.json({ students: [] });
    }

    const classIds = [];
    classesSnapshot.forEach((doc) => classIds.push(doc.id));

    // For simplicity, get all students of these classes from 'students' collection who attend these classes (based on enrollment)
    // You can optimize by storing attendance % precomputed in a separate collection

    // Here we mock: get all students and calculate attendance from attendance collection
    const studentsSnapshot = await db.collection("students").get();
    const students = [];

    for (const studentDoc of studentsSnapshot.docs) {
      const studentData = studentDoc.data();
      // Assume studentData has enrolledClasses array (classIds student belongs to)
      const enrolledClasses = studentData.enrolledClasses || [];

      // Check if this student belongs to teacher's classes
      const commonClasses = classIds.filter((cid) =>
        enrolledClasses.includes(cid)
      );
      if (commonClasses.length === 0) continue;

      // Calculate attendance percentage (very simplified)
      let totalClasses = 0;
      let attendedClasses = 0;

      for (const cid of commonClasses) {
        // Count total classes held (e.g. 10)
        // Here we mock total classes count as 10 for example
        totalClasses += 10;

        // Count how many times student marked present in attendance collection for this class
        const attendanceSnapshot = await db
          .collection("attendance")
          .where("classId", "==", cid)
          .where("studentId", "==", studentDoc.id)
          .where("status", "==", "present")
          .get();

        attendedClasses += attendanceSnapshot.size;
      }

      const attendancePercent =
        totalClasses === 0 ? 0 : (attendedClasses / totalClasses) * 100;

      if (attendancePercent < 50) {
        students.push({
          studentId: studentDoc.id,
          name: studentData.name,
          attendancePercent: attendancePercent.toFixed(2),
        });
      }
    }

    return res.json({ students });
  } catch (error) {
    console.error("getLowAttendanceStudents error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.warnStudent = async (req, res) => {
  try {
    const teacherId = req.user.uid;
    const studentId = req.params.studentId;
    const { warningText } = req.body;

    if (!warningText || warningText.trim() === "") {
      return res.status(400).json({ message: "Warning text is required" });
    }

    const warningRef = db.collection("warnings").doc();

    await warningRef.set({
      studentId,
      teacherId,
      warningText,
      date: admin.firestore.Timestamp.now(),
      read: false,
    });

    return res.json({ message: "Warning sent to student successfully" });
  } catch (error) {
    console.error("warnStudent error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
