// routes/services.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * 🔹 Middleware opcional — verifica se o usuário está autenticado
 * (usado para saber qual empresa pertence ao criador do serviço)
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: "Token ausente" });

    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error("Erro verifyToken:", err);
    return res.status(401).json({ error: "Token inválido" });
  }
}

/**
 * 🔹 Cria novo serviço automaticamente vinculado à empresa (companyId)
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, duration, price } = req.body;
    const uid = req.user?.uid;

    if (!name || !uid) {
      return res.status(400).json({ error: "Nome e autenticação são obrigatórios." });
    }

    // 🔍 Encontra a empresa onde o admin logado é o owner
    const companySnap = await db.collection("companies").where("ownerId", "==", uid).limit(1).get();

    if (companySnap.empty) {
      return res.status(403).json({ error: "Você não possui uma empresa vinculada." });
    }

    const companyId = companySnap.docs[0].id;

    // 🔧 Cria o serviço já com o companyId correto
    const newService = {
      name,
      duration: duration || "30min",
      price: price || 0,
      companyId,
      createdAt: new Date(),
    };

    const docRef = await db.collection("services").add(newService);

    res.status(201).json({
      message: "Serviço criado com sucesso e vinculado à sua empresa!",
      id: docRef.id,
      ...newService,
    });
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    res.status(500).json({ error: "Erro ao criar serviço." });
  }
});

/**
 * 🔹 Lista serviços (opcional: filtra por companyId)
 * GET /api/services?companyId=abc123
 */
router.get("/", async (req, res) => {
  try {
    const { companyId } = req.query;

    let query = db.collection("services");
    if (companyId) query = query.where("companyId", "==", companyId);

    const snapshot = await query.get();
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(services);
  } catch (error) {
    console.error("Erro ao listar serviços:", error);
    res.status(500).json({ error: "Erro ao buscar serviços." });
  }
});

module.exports = router;
