// routes/notifications.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const { verifyToken } = require("./verifyToken");

// Garante que o app do Firebase já foi inicializado no server.js
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

    await db.collection("notifications").add(notification);
    res.status(201).json({ message: "Notificação criada com sucesso!" });
  } catch (error) {
    console.error("Erro ao criar notificação:", error);
    res.status(500).json({ error: "Erro ao criar notificação." });
  }
});

// Listar notificações de um usuário
// Proteger leitura de notificações: o usuário deve estar autenticado e pode acessar apenas as suas próprias notificações,
// a menos que possua claims administrativos.
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // permitir se for o mesmo uid do token ou se tiver claim admin
    if (req.user.uid !== userId && !req.user.admin) {
      return res.status(403).json({ error: 'Acesso negado às notificações deste usuário.' });
    }

    const snapshot = await db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const notifications = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
