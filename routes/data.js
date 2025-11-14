// routes/data.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

// 🔹 Lista todos os serviços
router.get("/services", async (req, res) => {
  try {
    const snapshot = await db.collection("services").get();
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(services);
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    res.status(500).json({ error: "Erro ao buscar serviços." });
  }
});

// 🔹 Lista todos os profissionais
router.get("/professionals", async (req, res) => {
  try {
    const snapshot = await db.collection("professionals").get();
    const pros = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(pros);
  } catch (error) {
    console.error("Erro ao buscar profissionais:", error);
    res.status(500).json({ error: "Erro ao buscar profissionais." });
  }
});

module.exports = router;
