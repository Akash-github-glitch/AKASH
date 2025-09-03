const express = require("express");
const admin = require("firebase-admin");
const userRoutes = require("./routes/userRoutes");
const classRoutes = require("./routes/classRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const warningRoutes = require("./routes/warningRoutes");

const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(
    require("./path/to/serviceAccountKey.json")
  ),
  databaseURL: "https://your-project.firebaseio.com",
});

app.use("/api/users", userRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/warnings", warningRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));




