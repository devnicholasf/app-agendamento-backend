// routes/admin.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

/* ---------------------- 🔐 Middlewares ---------------------- */

// ✅ Verifica token Firebase (Authorization: Bearer <idToken>)
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

// ✅ Verifica se o usuário é administrador
async function verifyAdmin(req, res, next) {
  try {
    if (!req.user?.uid) return res.status(401).json({ error: "Sem credenciais" });

    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: "Usuário não encontrado" });

    const data = userDoc.data();
    if (data.userRole !== "admin") {
      return res.status(403).json({ error: "Acesso restrito a administradores" });
    }

    req.adminCompanyId = data.companyId || null; // salva o companyId do admin logado
    next();
  } catch (err) {
    console.error("Erro verifyAdmin:", err);
    return res.status(500).json({ error: "Erro ao verificar administrador" });
  }
}

// 🔐 Todas as rotas abaixo são protegidas
router.use(verifyToken, verifyAdmin);

/* ---------------------- 👥 Usuários ---------------------- */

// 📋 Listar todos os usuários (ou apenas os da empresa do admin)
router.get("/users", async (req, res) => {
  try {
    let snap;
    if (req.adminCompanyId) {
      // lista apenas usuários da empresa do admin
      snap = await db.collection("users").where("companyId", "==", req.adminCompanyId).get();
    } else {
      // se não tiver empresa associada (admin master)
      snap = await db.collection("users").get();
    }

    const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    console.error("Erro /admin/users:", err);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

// 🔄 Atualizar role (ex: cliente → profissional → admin)
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "Campo 'role' é obrigatório" });

    await db.collection("users").doc(id).update({ userRole: role });
    res.json({ message: "Role atualizado com sucesso", id, role });
  } catch (err) {
    console.error("Erro patch role:", err);
    res.status(500).json({ error: "Erro ao atualizar role" });
  }
});

// 🚀 Promover usuário (cliente → profissional / admin)
router.post("/users/:id/promote", async (req, res) => {
  try {
    const { id } = req.params;
    const { newRole } = req.body;

    if (!["profissional", "admin"].includes(newRole)) {
      return res.status(400).json({ error: "Função inválida." });
    }

    const userRef = db.collection("users").doc(id);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "Usuário não encontrado" });

    const updateData = {
      userRole: newRole,
      updatedAt: new Date(),
    };

    // Se for promover para profissional, vincula à empresa do admin
    if (newRole === "profissional" && req.adminCompanyId) {
      updateData.companyId = req.adminCompanyId;
    }

    await userRef.update(updateData);

    res.json({ message: `Usuário promovido a ${newRole}`, id, ...updateData });
  } catch (err) {
    console.error("Erro promote user:", err);
    res.status(500).json({ error: "Erro ao promover usuário" });
  }
});

/* ---------------------- 📅 Agendamentos ---------------------- */

// 📋 Listar todos agendamentos
router.get("/appointments", async (req, res) => {
  try {
    const snap = await db.collection("appointments").orderBy("createdAt", "desc").limit(100).get();
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

// 📋 Listar notificações
router.get("/notifications", async (req, res) => {
  try {
    const snap = await db.collection("notifications").orderBy("createdAt", "desc").limit(200).get();
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(list);
  } catch (err) {
    console.error("Erro /admin/notifications:", err);
    res.status(500).json({ error: "Erro ao listar notificações" });
  }
});

/* ---------------------- 📊 Painel /overview ---------------------- */

// 📊 Resumo para o dashboard admin
router.get("/overview", async (req, res) => {
  try {
    const usersSnap = req.adminCompanyId
      ? await db.collection("users").where("companyId", "==", req.adminCompanyId).get()
      : await db.collection("users").get();

    const appointmentsSnap = await db.collection("appointments").get();
    const notificationsSnap = await db.collection("notifications").get();

    const recentUsersSnap = await db.collection("users").orderBy("createdAt", "desc").limit(5).get();
    const recentAppointmentsSnap = await db
      .collection("appointments")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get();

    const recentUsers = recentUsersSnap.docs.map((d) => ({
      id: d.id,
      nome: d.data().nome,
      email: d.data().email,
      createdAt: d.data().createdAt?._seconds
        ? new Date(d.data().createdAt._seconds * 1000).toLocaleDateString("pt-BR")
        : "—",
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

/* ---------------------- 🧮 Estatísticas extras ---------------------- */

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
