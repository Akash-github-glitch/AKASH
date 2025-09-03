// controllers/userController.js
const admin = require("firebase-admin");
const db = admin.firestore();

// Student registers profile data after Firebase Auth signup
exports.registerStudentProfile = async (req, res) => {
  try {
    const uid = req.user.uid; // from middleware
    const {
      name,
      email,
      rollNo,
      department,
      semester,
      section,
      collegeId,
      // any other student info
    } = req.body;

    const studentData = {
      name,
      email,
      rollNo,
      department,
      semester,
      section,
      collegeId,
      approved: false, // default false until teacher approves
      role: "student",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(uid).set(studentData, { merge: true });

    res
      .status(201)
      .json({ message: "Profile registered. Awaiting teacher approval." });
  } catch (error) {
    console.error("Register student error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Teacher gets pending approvals
exports.getPendingStudentApprovals = async (req, res) => {
  try {
    // For teacher, fetch students assigned to their classes with approved:false
    // Assuming teacher's assigned dept/semester known by req.user or params
    const studentsRef = db
      .collection("users")
      .where("role", "==", "student")
      .where("approved", "==", false);
    const snapshot = await studentsRef.get();

    let pendingStudents = [];
    snapshot.forEach((doc) => {
      pendingStudents.push({ id: doc.id, ...doc.data() });
    });

    res.json(pendingStudents);
  } catch (error) {
    console.error("Get pending approvals error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Teacher approves student
exports.approveStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    await db.collection("users").doc(studentId).update({ approved: true });

    res.json({ message: "Student approved successfully" });
  } catch (error) {
    console.error("Approve student error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
