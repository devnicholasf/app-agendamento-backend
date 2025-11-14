// server.js
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

const app = express();

// ✅ Inicializa o Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Middlewares
app.use(cors());
app.use(express.json());

// Importa as rotas (após inicialização do Firebase)
const appointmentsRoutes = require("./routes/appointments");
const professionalsRoutes = require("./routes/professionals");
const servicesRoutes = require("./routes/services");
const notificationsRoutes = require("./routes/notifications");
const adminRoutes = require("./routes/admin");
const usersRoutes = require("./routes/users");

// Usa as rotas
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/professionals", professionalsRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);

// Rota de teste
app.get("/", (req, res) => {
  res.send("Servidor Node.js está rodando ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
