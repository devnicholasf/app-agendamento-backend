# 🛠️ App Agendamento — Backend
<p align="center"> <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge" /> <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" /> <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" /> <img src="https://img.shields.io/badge/Firebase%20Admin-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" /> <img src="https://img.shields.io/badge/Firestore-FFA000?style=for-the-badge&logo=firebase&logoColor=white" />  </p>


## Sobre o Projeto
Este é o backend do sistema de agendamento, desenvolvido em Node.js com Express e Firebase Admin SDK. Ele fornece uma API REST para gerenciar dados principais, como empresas, profissionais, serviços, agendamentos, usuários e notificações.



## 🚀 Tecnologias Utilizadas
- **Node.js**: Ambiente de execução JavaScript.
- **Express**: Framework para criação de APIs.
- **Firebase Admin SDK**: Integração com Firestore e autenticação.
- **Firestore**: Banco de dados NoSQL em tempo real.

## 📁 Estrutura do Projeto
- **`server.js`**: Ponto de entrada da aplicação.
- **`routes/`**: Contém os endpoints da API (ex.: `appointments.js`, `users.js`).
- **`firebase.js`**: Inicialização do Firebase Admin.
- **`scripts/`**: Scripts utilitários, como `setupFirestore.js` e `setAdminClaim.js`.

## ▶️ Como Rodar o Projeto

### Pré-requisitos
- Node.js instalado.
- Firebase configurado com uma conta de serviço válida.

### Passos
1. Clone o repositório:
   ```bash
   git clone https://github.com/devnicholasf/app-agendamento-backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as credenciais do Firebase:
   - Adicione o arquivo `serviceAccountKey.json` na raiz do projeto **ou** defina a variável de ambiente `SERVICE_ACCOUNT_JSON` com o conteúdo JSON da conta de serviço.
4. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
5. (Opcional) Popule o Firestore com dados de exemplo:
   ```bash
   node scripts/setupFirestore.js
   ```

## 🔌 Endpoints Principais
## 📆 Agendamentos
- **GET `/api/appointments/available`**: Verifica horários disponíveis.
- **POST `/api/appointments`**: Cria um novo agendamento.

## 👤 Usuários

- **GET `/api/users`**: Lista usuários.

---

## 👨‍💻 Autor

Nicholas
