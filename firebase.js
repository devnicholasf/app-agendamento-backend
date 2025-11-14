// app-agendamento-backend/firebase.js
import admin from "firebase-admin";
import { readFileSync } from "fs";

// Carrega a chave de serviço (arquivo JSON que você já colocou)
const serviceAccount = JSON.parse(
  readFileSync("./serviceAccountKey.json", "utf8")
);

// Inicializa o Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Exporta o Firestore para usar em outras partes
export const db = admin.firestore();
