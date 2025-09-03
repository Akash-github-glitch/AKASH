// seed.js

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const teachers = require("./teachers");

initializeApp({
  credential: applicationDefault(), // Make sure GOOGLE_APPLICATION_CREDENTIALS is set
});

const db = getFirestore();

async function seedData() {
  for (const [teacherName, classes] of Object.entries(teachers)) {
    // create teacher document
    const teacherRef = db.collection("teachers").doc();
    await teacherRef.set({
      name: teacherName,
      totalClasses: classes.length,
    });

    // add classes subcollection
    for (const c of classes) {
      await teacherRef.collection("classes").add({
        ...c,
        createdAt: new Date(),
      });
    }

    console.log(`✅ Seeded ${classes.length} classes for ${teacherName}`);
  }

  console.log("🎉 All data seeded successfully!");
}

seedData().catch(console.error);
