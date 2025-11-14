// routes/appointments.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

const db = admin.firestore();

/**
 * Helper: Generate predefined slots for a day
 * - startHour, endHour in 24h (e.g. 9, 17)
 * - interval in minutes (e.g. 30)
 */
function generateDaySlots(startHour = 9, endHour = 18, interval = 30) {
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

/* GET /available?professionalId=...&date=YYYY-MM-DD
   Retorna lista de slots com boolean ocupado */
router.get("/available", async (req, res) => {
  try {
    const { professionalId, date } = req.query;
    if (!professionalId || !date) {
      return res.status(400).json({ error: "professionalId e date são obrigatórios" });
    }

    // Padrão: slots 09:00..17:30 cada 30min (ajuste se quiser)
    const allSlots = generateDaySlots(9, 18, 30);

    // Busca agendamentos do profissional na data
    const snap = await db
      .collection("appointments")
      .where("professionalId", "==", professionalId)
      .where("date", "==", date)
      .get();

    const occupied = snap.docs.map(d => d.data().time);

    const slots = allSlots.map(slot => ({
      time: slot,
      occupied: occupied.includes(slot),
    }));

    return res.json({ date, slots });
  } catch (err) {
    console.error("Erro em /available:", err);
    res.status(500).json({ error: "Erro ao buscar disponibilidade" });
  }
});

/* 🔹 Criar novo agendamento */
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      serviceId,
      professionalId,
      date,
      time,
      status,
      hiddenFromClient,
    } = req.body;

    if (!userId || !serviceId || !professionalId || !date || !time) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios." });
    }

    // Verifica disponibilidade: se já existe agendamento no mesmo profissional/data/hora
    const conflictSnap = await db
      .collection("appointments")
      .where("professionalId", "==", professionalId)
      .where("date", "==", date)
      .where("time", "==", time)
      .get();

    if (!conflictSnap.empty) {
      return res.status(409).json({ error: "Horário não disponível" });
    }

    // Salva (armazena a data tal como veio)
    const [year, month, day] = date.split("-");
    const adjustedDate = `${year}-${month}-${day}`;

    const newAppointment = {
      userId,
      serviceId,
      professionalId,
      date: adjustedDate,
      time,
      status: status || "Pendente",
      hiddenFromClient: hiddenFromClient || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Adiciona no Firestore
    const docRef = await db.collection("appointments").add(newAppointment);

    // Notificação para o cliente
    await db.collection("notifications").add({
      userId,
      title: "Novo agendamento criado",
      message: `Seu agendamento foi marcado para ${day}/${month}/${year} às ${time}.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      type: "appointment",
    });

    // Notificação para o profissional (se existir usuário)
    try {
      const proUserSnap = await db.collection("users").doc(professionalId).get();
      if (proUserSnap.exists) {
        await db.collection("notifications").add({
          userId: professionalId,
          title: "Novo agendamento recebido",
          message: `Você recebeu um agendamento para ${day}/${month}/${year} às ${time}.`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          type: "appointment",
        });
      }
    } catch (err) {
      console.warn("Não foi criada notificação do profissional:", err);
    }

    res.status(201).json({
      id: docRef.id,
      ...newAppointment,
    });
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    res.status(500).json({ error: "Erro interno ao criar o agendamento." });
  }
});

/* 🔹 Função auxiliar: buscar nomes relacionados */
async function getUserAndServiceNames(appointment) {
  let userName = "Usuário desconhecido";
  let professionalName = "Profissional desconhecido";
  let serviceName = "Serviço desconhecido";

  try {
    const userDoc = await db.collection("users").doc(appointment.userId).get();
    if (userDoc.exists) userName = userDoc.data().nome || userName;

    const proDoc = await db
      .collection("users")
      .doc(appointment.professionalId)
      .get();
    if (proDoc.exists) professionalName = proDoc.data().nome || professionalName;

    const serviceDoc = await db
      .collection("services")
      .doc(appointment.serviceId)
      .get();
    if (serviceDoc.exists) {
      const sData = serviceDoc.data();
      serviceName = sData.nome || sData.name || serviceName;
    }
  } catch (err) {
    console.error("Erro ao buscar nomes relacionados:", err);
  }

  return {
    ...appointment,
    userName,
    professionalName,
    serviceName,
  };
}

/* 🔹 Rota para listar agendamentos */
router.get("/", async (req, res) => {
  try {
    const { userId, professionalId, history } = req.query;

    if (!userId && !professionalId) {
      return res
        .status(400)
        .json({ error: "Informe userId ou professionalId na consulta" });
    }

    let query = db.collection("appointments");
    if (userId) query = query.where("userId", "==", userId);
    if (professionalId) query = query.where("professionalId", "==", professionalId);

    const snapshot = await query.get();
    if (snapshot.empty) return res.status(200).json([]);

    const appointments = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        return await getUserAndServiceNames({ id: doc.id, ...data });
      })
    );

    if (history === "true") {
      const now = Date.now();
      const last24h = 24 * 60 * 60 * 1000;

      const filtered = appointments.filter((a) => {
        const createdAt = a.createdAt?._seconds ? a.createdAt._seconds * 1000 : 0;
        return a.status === "Completo" && createdAt > now - last24h;
      });

      return res.status(200).json(filtered);
    }

    res.status(200).json(appointments);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ error: "Erro ao buscar agendamentos" });
  }
});

/* 🔹 Atualizar status ou ocultar */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID é obrigatório" });
    }

    const docRef = db.collection("appointments").doc(id);
    await docRef.update(updates);

    // Se o status foi atualizado, cria notificação apropriada
    if (updates.status) {
      const snap = await docRef.get();
      const a = snap.data();

      if (updates.status === "Completo") {
        await db.collection("notifications").add({
          userId: a.userId,
          title: "Serviço concluído",
          message: `Seu agendamento de ${a.date} às ${a.time} foi concluído com sucesso.`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      } else if (updates.status === "Cancelado") {
        await db.collection("notifications").add({
          userId: a.userId,
          title: "Agendamento cancelado",
          message: `Seu agendamento para ${a.date} às ${a.time} foi cancelado.`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      } else if (updates.status === "Atrasado") {
        await db.collection("notifications").add({
          userId: a.userId,
          title: "Agendamento atrasado",
          message: `Seu agendamento de ${a.date} às ${a.time} está marcado como ATRASADO.`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      }
    }

    res.status(200).json({ message: "Agendamento atualizado com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    res.status(500).json({ error: "Erro ao atualizar agendamento" });
  }
});

/* 🔹 Cancelar agendamento (via delete) */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID não informado" });

    const docRef = db.collection("appointments").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists)
      return res.status(404).json({ error: "Agendamento não encontrado" });

    await docRef.update({
      status: "Cancelado",
      removedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const a = docSnap.data();
    await db.collection("notifications").add({
      userId: a.userId,
      title: "Agendamento cancelado",
      message: `Seu agendamento para ${a.date} às ${a.time} foi cancelado.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });

    res.status(200).json({ message: "Agendamento cancelado com sucesso!", id });
  } catch (error) {
    console.error("Erro ao cancelar agendamento:", error);
    res.status(500).json({ error: "Erro ao cancelar agendamento" });
  }
});

module.exports = router;
