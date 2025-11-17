// app-agendamento-backend/firebase.js
import admin from "firebase-admin";
import { readFileSync } from "fs";

// Tenta obter a chave do SERVICE_ACCOUNT_JSON (string JSON) ou ler localmente
let serviceAccount;
if (process.env.SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  } catch (e) {
    console.warn('SERVICE_ACCOUNT_JSON inválido.');
  }
} else {
  try {
    serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));
  } catch (e) {
    console.warn('serviceAccountKey.json não encontrado; usando credenciais padrão.');
  }
}

if (!admin.apps.length) {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    admin.initializeApp();
  }
}

export const db = admin.firestore();
