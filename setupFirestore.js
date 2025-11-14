// setupFirestore.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function setupFirestore() {
  console.log("🚀 Iniciando configuração do Firestore...\n");

  // 1️⃣ Admin principal
  const adminUser = {
    uid: "admin001",
    nome: "Admin Master",
    email: "admin@empresa.com",
    userRole: "admin",
    companyId: null, // será preenchido após criar a empresa
    createdAt: new Date(),
  };
  await db.collection("users").doc(adminUser.uid).set(adminUser);
  console.log("✅ Usuário admin criado:", adminUser.email);

  // 2️⃣ Empresa vinculada ao admin
  const companyRef = await db.collection("companies").add({
    name: "Loja do Admin Master",
    ownerId: adminUser.uid,
    createdAt: new Date(),
  });
  const companyId = companyRef.id;
  console.log("🏢 Empresa criada:", companyId);

  // Atualiza admin com o ID da empresa
  await db.collection("users").doc(adminUser.uid).update({ companyId });

  // 3️⃣ Profissional vinculado à empresa
  const profUser = {
    uid: "prof001",
    nome: "Carlos Profissional",
    email: "prof@empresa.com",
    userRole: "profissional",
    companyId,
    createdAt: new Date(),
  };
  await db.collection("users").doc(profUser.uid).set(profUser);
  console.log("🧑‍🔧 Profissional criado:", profUser.email);

  // 4️⃣ Cliente genérico (não vinculado a empresa diretamente)
  const clientUser = {
    uid: "client001",
    nome: "Marcos Cliente",
    email: "cliente@teste.com",
    userRole: "cliente",
    companyId: null,
    createdAt: new Date(),
  };
  await db.collection("users").doc(clientUser.uid).set(clientUser);
  console.log("🙋 Cliente criado:", clientUser.email);

  // 5️⃣ Serviço da empresa
  const serviceRef = await db
    .collection("companies")
    .doc(companyId)
    .collection("services")
    .add({
      name: "Corte de cabelo masculino",
      duration: "45min",
      price: 40,
      createdAt: new Date(),
    });
  const serviceId = serviceRef.id;
  console.log("✂️ Serviço criado:", serviceId);

  // 6️⃣ Agendamento de exemplo
  const appointmentRef = await db.collection("appointments").add({
    companyId,
    professionalId: profUser.uid,
    userId: clientUser.uid,
    serviceId,
    date: "2025-11-20",
    time: "15:00",
    status: "Pendente",
    createdAt: new Date(),
  });
  console.log("📅 Agendamento criado:", appointmentRef.id);

  // 7️⃣ Notificação de exemplo
  await db.collection("notifications").add({
    userId: clientUser.uid,
    title: "Novo agendamento criado",
    message: "Seu agendamento para 20/11/2025 às 15:00 foi confirmado.",
    createdAt: new Date(),
    read: false,
  });
  console.log("🔔 Notificação criada para o cliente");

  console.log("\n✅ Firestore configurado com sucesso!");
  console.log(`
Resumo:
👑 Admin: ${adminUser.email}
🏢 Empresa: ${companyId}
🧑‍🔧 Profissional: ${profUser.email}
🙋 Cliente: ${clientUser.email}
✂️ Serviço: Corte de cabelo masculino
📅 Agendamento: ${appointmentRef.id}
`);
}

setupFirestore().catch((err) => {
  console.error("❌ Erro ao configurar Firestore:", err);
});
