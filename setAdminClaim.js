// setAdminClaim.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// UID vem da linha de comando
const uid = process.argv[2];

if (!uid) {
  console.error("ERRO: você precisa informar o UID.\nUso: node setAdminClaim.js <UID>");
  process.exit(1);
}

async function run() {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });

    console.log("✅ Usuário agora é admin:", uid);

    const user = await admin.auth().getUser(uid);
    console.log("Claims atuais:", user.customClaims);
    process.exit(0);
  } catch (err) {
    console.error("Erro:", err);
    process.exit(1);
  }
}

run();
