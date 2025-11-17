// routes/professionals.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

// GET /api/professionals -> lista todos usuários com userRole == 'profissional'
router.get("/", async (req, res) => {
  try {
    const snap = await db.collection("users").where("userRole", "==", "profissional").get();
    const professionals = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(professionals);
  } catch (error) {
    console.error("Erro ao listar profissionais:", error);
    res.status(500).json({ error: "Erro ao buscar profissionais" });
  }
});

// POST /api/professionals -> criar manualmente (opcional - apenas para admin; aqui simplificado)
router.post("/", async (req, res) => {
  try {
    const { uid, name, email, companyId } = req.body;
    if (!uid || !name || !email) return res.status(400).json({ error: "Campos obrigatórios" });

    // cria/atualiza no users collection
    await db.collection("users").doc(uid).set({
      nome: name,
      email,
      userRole: "profissional",
      companyId: companyId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ message: "Profissional criado/atualizado" });
  } catch (err) {
    console.error("Erro POST /api/professionals", err);
    res.status(500).json({ error: "Erro ao criar profissional" });
  }
});

module.exports = router;
