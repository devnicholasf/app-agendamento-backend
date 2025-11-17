// routes/users.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

// GET /api/users/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const snap = await db.collection("users").doc(id).get();
    if (!snap.exists) return res.status(404).json({ error: "Usuário não encontrado" });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error("Erro GET /api/users/:id", err);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

module.exports = router;
