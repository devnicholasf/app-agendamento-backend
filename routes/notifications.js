// routes/notifications.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");

// garante inicialização no server.js
if (!admin.apps.length) {
  throw new Error("Firebase não inicializado. Importe este arquivo após o initializeApp().");
}

const db = admin.firestore();

// Criar notificação
router.post("/", async (req, res) => {
  try {
    const { userId, title, message, type } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    const notification = {
      userId,
      title,
      message,
      type: type || "info",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    };

    const docRef = await db.collection("notifications").add(notification);
    res.status(201).json({ message: "Notificação criada com sucesso!", id: docRef.id });
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    res.status(500).json({ error: "Erro ao criar notificação." });
  }
});

// Listar notificações de um usuário
// aceita ?userId=... ou /:userId
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "userId query é obrigatório" });

    const snap = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(notifications);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ error: "Erro ao buscar notificações." });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const snap = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json(notifications);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    res.status(500).json({ error: "Erro ao buscar notificações." });
  }
});

// Marcar notificação como lida
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection("notifications").doc(id).update({ read: true });
    res.json({ message: "Notificação marcada como lida." });
  } catch (error) {
    console.error("Erro ao atualizar notificação:", error);
    res.status(500).json({ error: "Erro ao atualizar notificação." });
  }
});

module.exports = router;
