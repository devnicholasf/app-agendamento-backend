// server.js
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const app = express();

// Inicializa Firebase Admin (apenas uma vez)
let serviceAccount;
if (process.env.SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  } catch (e) {
    console.warn('SERVICE_ACCOUNT_JSON inválido.');
  }
} else {
  try {
    serviceAccount = require("./serviceAccountKey.json");
  } catch (e) {
    // arquivo não existe no repositório (recomendado em produção)
    console.warn('serviceAccountKey.json não encontrado; esperando credenciais via env.');
  }
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // tenta inicializar com as credenciais padrão da aplicação (ex: GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp();
  }
}

const db = admin.firestore();

// Middlewares
const corsOptions = process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",") } : undefined;
app.use(cors(corsOptions));
app.use(express.json());

// Rotas
const appointmentsRoutes = require("./routes/appointments");
const professionalsRoutes = require("./routes/professionals");
const servicesRoutes = require("./routes/services");
const notificationsRoutes = require("./routes/notifications");
const adminRoutes = require("./routes/admin");
const companiesRoutes = require("./routes/companies");
const usersRoutes = require("./routes/users");

// Usar rotas
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/professionals", professionalsRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/users", usersRoutes);

// Rota de teste
app.get("/", (req, res) => {
  res.send("Servidor Node.js está rodando ✅");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
