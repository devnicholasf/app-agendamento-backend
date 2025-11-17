// routes/admin.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

/* ---------------------- 🔐 Middlewares ---------------------- */

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: "Token ausente" });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error("Erro verifyToken:", err);
    return res.status(401).json({ error: "Token inválido" });
  }
}

async function verifyAdmin(req, res, next) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: "Sem credenciais" });

    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: "Usuário não encontrado" });

    const data = userDoc.data();
    if (data.userRole !== "admin") {
      return res.status(403).json({ error: "Acesso restrito a administradores" });
    }

    next();
  } catch (err) {
    console.error("Erro verifyAdmin:", err);
    return res.status(500).json({ error: "Erro ao verificar administrador" });
  }
}

// Protege todas rotas admin
router.use(verifyToken, verifyAdmin);

/* ---------------------- 👥 Usuários ---------------------- */

// Listar
router.get("/users", async (req, res) => {
  try {
    const snap = await db.collection("users").get();
    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    console.error("Erro /admin/users:", err);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

// Atualizar role (ex: cliente -> profissional -> admin)
// Permite também definir companyId quando promover para profissional
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role, companyId } = req.body;

    if (!role) return res.status(400).json({ error: "Campo 'role' é obrigatório" });

    const updates = { userRole: role };
    if (role === "profissional" && companyId) updates.companyId = companyId;
    if (role !== "profissional") updates.companyId = admin.firestore.FieldValue.delete();

    await db.collection("users").doc(id).update(updates);

    // Opcional: set custom claim (se desejar)
    // await admin.auth().setCustomUserClaims(id, { admin: role === 'admin' });

    res.json({ message: "Role atualizado com sucesso", id, role });
  } catch (err) {
    console.error("Erro patch role:", err);
    res.status(500).json({ error: "Erro ao atualizar role" });
  }
});

/* ---------------------- 📅 Agendamentos ---------------------- */

router.get("/appointments", async (req, res) => {
  try {
    const snap = await db.collection("appointments").orderBy("createdAt", "desc").limit(200).get();
    const appts = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        const userDoc = await db.collection("users").doc(data.userId).get().catch(() => null);
        const proDoc = await db.collection("users").doc(data.professionalId).get().catch(() => null);
        return {
          id: d.id,
          ...data,
          userName: userDoc?.exists ? userDoc.data().nome : "Cliente",
          professionalName: proDoc?.exists ? proDoc.data().nome : "Profissional",
        };
      })
    );
    res.json(appts);
  } catch (err) {
    console.error("Erro /admin/appointments:", err);
    res.status(500).json({ error: "Erro ao listar agendamentos" });
  }
});

/* ---------------------- 🔔 Notificações ---------------------- */

router.get("/notifications", async (req, res) => {
  try {
    const snap = await db.collection("notifications").orderBy("createdAt", "desc").limit(200).get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(list);
  } catch (err) {
    console.error("Erro /admin/notifications:", err);
    res.status(500).json({ error: "Erro ao listar notificações" });
  }
});

/* ---------------------- 📊 Overview ---------------------- */

router.get("/overview", async (req, res) => {
  try {
    const usersSnap = await db.collection("users").get();
    const appointmentsSnap = await db.collection("appointments").get();
    const notificationsSnap = await db.collection("notifications").get();

    const recentUsersSnap = await db.collection("users").orderBy("createdAt", "desc").limit(5).get();
    const recentAppointmentsSnap = await db.collection("appointments").orderBy("createdAt", "desc").limit(5).get();

    const recentUsers = recentUsersSnap.docs.map((d) => ({
      id: d.id,
      nome: d.data().nome,
      email: d.data().email,
      createdAt: d.data().createdAt?._seconds ? new Date(d.data().createdAt._seconds * 1000).toLocaleDateString("pt-BR") : "—",
    }));

    const recentAppointments = recentAppointmentsSnap.docs.map((d) => ({
      id: d.id,
      date: d.data().date,
      time: d.data().time,
      status: d.data().status,
    }));

    res.json({
      usersCount: usersSnap.size,
      appointmentsCount: appointmentsSnap.size,
      notificationsCount: notificationsSnap.size,
      recentUsers,
      recentAppointments,
    });
  } catch (err) {
    console.error("Erro /admin/overview:", err);
    res.status(500).json({ error: "Erro ao gerar overview" });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayKey = `${yyyy}-${mm}-${dd}`;

    const todaySnap = await db.collection("appointments").where("date", "==", todayKey).get();
    const professionalsSnap = await db.collection("users").where("userRole", "==", "profissional").get();

    res.json({
      todayAppointments: todaySnap.size,
      totalProfessionals: professionalsSnap.size,
    });
  } catch (err) {
    console.error("Erro /admin/stats:", err);
    res.status(500).json({ error: "Erro ao gerar estatísticas" });
  }
});

module.exports = router;
