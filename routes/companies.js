// routes/companies.js
const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

/**
 * Middleware verifyToken - espera header Authorization: Bearer <idToken>
 * injeta req.user (decoded token)
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
    console.error("verifyToken error:", err);
    return res.status(401).json({ error: "Token inválido" });
  }
}

// POST /api/companies  -- cria empresa (somente users com userRole === 'admin' no Firestore)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, slug } = req.body;
    if (!name) return res.status(400).json({ error: "name é obrigatório" });

    const userRef = db.collection("users").doc(req.user.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(403).json({ error: "Usuário não encontrado" });
    const u = userSnap.data();
    if (u.userRole !== "admin") return res.status(403).json({ error: "Apenas admins podem criar empresas" });

    const newCompany = {
      name,
      ownerId: req.user.uid,
      slug: slug || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("companies").add(newCompany);
    res.status(201).json({ id: docRef.id, ...newCompany });
  } catch (err) {
    console.error("Erro POST /api/companies", err);
    res.status(500).json({ error: "Erro ao criar empresa" });
  }
});

// GET /api/companies  -- lista empresas
router.get("/", async (req, res) => {
  try {
    const snap = await db.collection("companies").get();
    const companies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(companies);
  } catch (err) {
    console.error("Erro GET /api/companies", err);
    res.status(500).json({ error: "Erro ao listar empresas" });
  }
});

// GET /api/companies/:id  -- detalhes da company, inclui services subcollection
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const compSnap = await db.collection("companies").doc(id).get();
    if (!compSnap.exists) return res.status(404).json({ error: "Empresa não encontrada" });

    // buscar services
    const servicesSnap = await db.collection("companies").doc(id).collection("services").get();
    const services = servicesSnap.docs.map(s => ({ id: s.id, ...s.data() }));

    res.json({ id: compSnap.id, ...compSnap.data(), services });
  } catch (err) {
    console.error("Erro GET /api/companies/:id", err);
    res.status(500).json({ error: "Erro ao buscar empresa" });
  }
});

// POST /api/companies/:id/services  -- criar serviço (só owner/admin)
router.post("/:id/services", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, duration, price } = req.body;
    if (!name) return res.status(400).json({ error: "name é obrigatório" });

    const compRef = db.collection("companies").doc(id);
    const compSnap = await compRef.get();
    if (!compSnap.exists) return res.status(404).json({ error: "Empresa não encontrada" });

    // verificar owner
    const ownerId = compSnap.data().ownerId;
    if (ownerId !== req.user.uid) {
      // pode expandir para permitir admin global, etc.
      return res.status(403).json({ error: "Somente o dono da empresa pode adicionar serviços" });
    }

    const newService = {
      name,
      duration: duration || "30min",
      price: price || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await compRef.collection("services").add(newService);
    res.status(201).json({ id: docRef.id, ...newService });
  } catch (err) {
    console.error("Erro POST /api/companies/:id/services", err);
    res.status(500).json({ error: "Erro ao criar serviço" });
  }
});

// GET /api/companies/:id/services
router.get("/:id/services", async (req, res) => {
  try {
    const { id } = req.params;
    const compRef = db.collection("companies").doc(id);
    const compSnap = await compRef.get();
    if (!compSnap.exists) return res.status(404).json({ error: "Empresa não encontrada" });

    const servicesSnap = await compRef.collection("services").get();
    const services = servicesSnap.docs.map(s => ({ id: s.id, ...s.data() }));
    res.json(services);
  } catch (err) {
    console.error("Erro GET /api/companies/:id/services", err);
    res.status(500).json({ error: "Erro ao listar serviços" });
  }
});

module.exports = router;
