// routes/appointments.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();
const { verifyToken } = require("./verifyToken");

function parseDateKey(dateStr) {
  // espera YYYY-MM-DD
  return dateStr;
}

/**
 * GET /api/appointments/available
 * query: companyId, professionalId, date (YYYY-MM-DD)
 * retorna lista de slots (ex.: ["09:00", "09:30", ...]) com available: true/false
 *
 * Observação: aqui fazemos uma versão simples:
 * - janela fixa das 09:00 às 18:00
 * - intervalo de 30 minutos
 * - se existir um agendamento com same professional/date/time => indisponível
 */
router.get("/available", async (req, res) => {
  try {
    const { companyId, professionalId, date } = req.query;
    if (!companyId || !professionalId || !date) return res.status(400).json({ error: "companyId, professionalId e date são obrigatórios" });

    // gerar slots 09:00 -> 17:30 com step 30min
    const slots = [];
    for (let h = 9; h < 18; h++) {
      slots.push(`${String(h).padStart(2,'0')}:00`);
      slots.push(`${String(h).padStart(2,'0')}:30`);
    }
    // remove 18:30 se passou
    // buscar agendamentos do profissional na data
    const snap = await db.collection("appointments")
      .where("professionalId", "==", professionalId)
      .where("date", "==", date)
      .get();

    const taken = new Set(snap.docs.map(d => d.data().time));

    const result = slots.map(s => ({ time: s, available: !taken.has(s) }));

    res.json(result);
  } catch (err) {
    console.error("Erro GET /api/appointments/available", err);
    res.status(500).json({ error: "Erro ao buscar slots" });
  }
});

/* Criar novo agendamento */
// Protegemos a criação de agendamentos: cliente deve enviar Authorization: Bearer <idToken>
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      companyId,
      serviceId,
      professionalId,
      date,
      time,
      status,
      hiddenFromClient,
    } = req.body;

    // usar o uid do token, não confiar no userId do corpo
    const userId = req.user && req.user.uid;

    if (!userId || !companyId || !serviceId || !professionalId || !date || !time) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios." });
    }

    // checar disponibilidade simples (mesma data, mesmo profissional e mesmo horário)
    const conflictSnap = await db.collection("appointments")
      .where("professionalId", "==", professionalId)
      .where("date", "==", date)
      .where("time", "==", time)
      .get();

    if (!conflictSnap.empty) {
      return res.status(409).json({ error: "Horário já reservado para esse profissional." });
    }

    const newAppointment = {
      userId,
      companyId,
      serviceId,
      professionalId,
      date,
      time,
      status: status || "Pendente",
      hiddenFromClient: hiddenFromClient || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("appointments").add(newAppointment);

    // criar notificação para o cliente (usar serverTimestamp para consistência)
    await db.collection("notifications").add({
      userId,
      title: "Novo agendamento",
      message: `Agendamento marcado para ${date} às ${time}.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });

    res.status(201).json({ id: docRef.id, ...newAppointment });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    res.status(500).json({ error: "Erro interno ao criar o agendamento." });
  }
});

/* Rota para listar agendamentos (por userId ou professionalId) */
router.get("/", async (req, res) => {
  try {
    const { userId, professionalId, history } = req.query;
    if (!userId && !professionalId) {
      return res.status(400).json({ error: "Informe userId ou professionalId na consulta" });
    }

    let queryRef = db.collection("appointments");
    if (userId) queryRef = queryRef.where("userId", "==", userId);
    if (professionalId) queryRef = queryRef.where("professionalId", "==", professionalId);

    const snap = await queryRef.get();
    if (snap.empty) return res.status(200).json([]);

    const appts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(appts);
  } catch (err) {
    console.error("Erro GET /api/appointments", err);
    res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
});

/* Atualizar (status, hiddenFromClient, etc) */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const docRef = db.collection("appointments").doc(id);
    await docRef.update(updates);

    // se status mudou para "Completo" ou "Cancelado" você pode criar notificações aqui
    if (updates.status === "Completo" || updates.status === "Cancelado") {
      const snap = await docRef.get();
      const a = snap.data();
      await db.collection("notifications").add({
        userId: a.userId,
        title: updates.status === "Completo" ? "Serviço concluído" : "Agendamento cancelado",
        message: `Seu agendamento de ${a.date} às ${a.time} foi ${updates.status.toLowerCase()}.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    }

    res.json({ message: "Agendamento atualizado" });
  } catch (err) {
    console.error("Erro PATCH /api/appointments/:id", err);
    res.status(500).json({ error: "Erro ao atualizar agendamento" });
  }
});

/* Cancelar (delete opcional) */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("appointments").doc(id).update({
      status: "Cancelado",
      removedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ message: "Agendamento cancelado (soft delete)" });
  } catch (err) {
    console.error("Erro DELETE /api/appointments/:id", err);
    res.status(500).json({ error: "Erro ao cancelar agendamento" });
  }
});

module.exports = router;
