// routes/users.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * GET /api/users/:id
 * Retorna dados públicos do usuário (nome, email, role, telefone, endereco, companyId).
 * Não exige autenticação (útil para o admin validar role via frontend).
 * Se você quiser tornar privada, podemos exigir token.
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID não informado" });

    const userRef = db.collection("users").doc(id);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const data = snap.data();

    // Retorna apenas campos não sensíveis
    const safe = {
      id: snap.id,
      nome: data.nome || null,
      email: data.email || null,
      userRole: data.userRole || "cliente",
      telefone: data.telefone || null,
      endereco: data.endereco || null,
      companyId: data.companyId || null,
      createdAt: data.createdAt || null,
    };

    return res.json(safe);
  } catch (err) {
    console.error("Erro GET /api/users/:id", err);
    return res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

module.exports = router;
