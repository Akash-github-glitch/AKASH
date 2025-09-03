// controllers/classController.js
const admin = require("firebase-admin");
const db = admin.firestore();

exports.addClass = async (req, res) => {
  try {
    const {
      teacherId,
      subjectName,
      semester,
      department,
      section,
      days, // e.g., ['Monday', 'Wednesday']
      timings, // e.g., { start: "9:00", end: "10:30" }
      semesterYear, // e.g., 2024
    } = req.body;

    const newClass = {
      teacherId,
      subjectName,
      semester,
      department,
      section,
      days,
      timings,
      semesterYear,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("classes").add(newClass);

    // Optionally update teacher's assignedClasses
    await db
      .collection("teachers")
      .doc(teacherId)
      .update({
        assignedClasses: admin.firestore.FieldValue.arrayUnion(docRef.id),
      });

    res.status(201).json({ message: "Class added", classId: docRef.id });
  } catch (error) {
    console.error("Add class error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get upcoming classes for a teacher (next 30 days)
exports.getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.uid; // From token
    const classesSnap = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();

    const classes = [];
    classesSnap.forEach((doc) => classes.push({ id: doc.id, ...doc.data() }));

    res.json(classes);
  } catch (error) {
    console.error("Get teacher classes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get upcoming classes for student based on their department, semester, section
exports.getStudentClasses = async (req, res) => {
  try {
    const { department, semester, section } = req.user; // these should be part of the decoded token or user profile

    const classesSnap = await db
      .collection("classes")
      .where("department", "==", department)
      .where("semester", "==", semester)
      .where("section", "==", section)
      .get();

    const classes = [];
    classesSnap.forEach((doc) => classes.push({ id: doc.id, ...doc.data() }));

    res.json(classes);
  } catch (error) {
    console.error("Get student classes error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
