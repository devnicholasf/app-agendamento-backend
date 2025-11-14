// routes/availability.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * GET /api/professionals/:id/availability?date=YYYY-MM-DD
 * Retorna lista de horários (slots) com available: true/false
 * Configuração de horários e intervalo pode ser ajustada abaixo.
 */

function generateTimeSlots(start = "09:00", end = "17:00", intervalMinutes = 30) {
  const slots = [];
  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);
  let cur = new Date();
  cur.setHours(sH, sM, 0, 0);
  const endDate = new Date();
  endDate.setHours(eH, eM, 0, 0);

  while (cur <= endDate) {
    const hh = String(cur.getHours()).padStart(2, "0");
    const mm = String(cur.getMinutes()).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
    cur = new Date(cur.getTime() + intervalMinutes * 60 * 1000);
  }
  return slots;
}

router.get("/professionals/:id/availability", async (req, res) => {
  try {
    const { id: professionalId } = req.params;
    const { date } = req.query; // espera YYYY-MM-DD
    if (!professionalId || !date) {
      return res.status(400).json({ error: "professionalId e date são obrigatórios" });
    }

    // Configuráveis — se quiser, depois traz isso de um documento de configuração
    const START = "09:00";
    const END = "18:00";
    const INTERVAL = 30; // minutos

    const allSlots = generateTimeSlots(START, END, INTERVAL);

    // Buscar agendamentos do profissional no dia (exceto cancelados)
    const snap = await db.collection("appointments")
      .where("professionalId", "==", professionalId)
      .where("date", "==", date)
      .get();

    const occupied = snap.docs
      .filter(d => d.data().status !== "Cancelado")
      .map(d => d.data().time);

    const availability = allSlots.map(time => ({
      time,
      available: !occupied.includes(time)
    }));

    res.json({ date, availability });
  } catch (error) {
    console.error("Erro ao buscar disponibilidade:", error);
    res.status(500).json({ error: "Erro ao buscar disponibilidade do profissional." });
  }
});

module.exports = router;
