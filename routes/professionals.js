// routes/professionals.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

// Listar profissionais (busca users com userRole == 'profissional')
router.get("/", async (req, res) => {
  try {
    const q = db.collection("users").where("userRole", "==", "profissional");
    const snapshot = await q.get();
    const professionals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(professionals);
  } catch (error) {
    console.error("Erro ao listar profissionais:", error);
    res.status(500).json({ error: "Erro ao buscar profissionais" });
  }
});

// (Opcional) criar profissional via Postman inserindo na coleção users
router.post("/", async (req, res) => {
  try {
    const { uid, nome, email } = req.body;
    if (!uid || !nome) return res.status(400).json({ error: "uid e nome obrigatórios" });

    await db.collection("users").doc(uid).set({
      nome,
      email: email || "",
      userRole: "profissional",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ message: "Usuário promovido a profissional com sucesso!", uid });
  } catch (error) {
    console.error("Erro ao criar/atualizar profissional:", error);
    res.status(500).json({ error: "Erro ao criar profissional" });
  }
});

module.exports = router;
