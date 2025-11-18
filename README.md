# App Agendamento - Backend

## Sobre o Projeto
Este é o backend do sistema de agendamento, desenvolvido em Node.js com Express e Firebase Admin SDK. Ele fornece uma API REST para gerenciar dados principais, como empresas, profissionais, serviços, agendamentos, usuários e notificações.

⚠️ **Status do Projeto**: Em andamento.

## Tecnologias Utilizadas
- **Node.js**: Ambiente de execução JavaScript.
- **Express**: Framework para criação de APIs.
- **Firebase Admin SDK**: Integração com Firestore e autenticação.
- **Firestore**: Banco de dados NoSQL em tempo real.

## Estrutura do Projeto
- **`server.js`**: Ponto de entrada da aplicação.
- **`routes/`**: Contém os endpoints da API (ex.: `appointments.js`, `users.js`).
- **`firebase.js`**: Inicialização do Firebase Admin.
- **`scripts/`**: Scripts utilitários, como `setupFirestore.js` e `setAdminClaim.js`.

## Como Rodar o Projeto

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

## Endpoints Principais
- **GET `/api/appointments/available`**: Verifica horários disponíveis.
- **POST `/api/appointments`**: Cria um novo agendamento.
- **GET `/api/users`**: Lista usuários.

## Contribuição
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

---

Desenvolvido por Nicholas.