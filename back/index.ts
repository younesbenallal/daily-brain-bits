import * as dotenv from "dotenv";
import { createApp } from "./src/app";

// Charger les variables d'environnement
dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3001;

console.log(`🚀 Serveur Hono démarré sur le port ${PORT}`);
console.log(
  `📊 Base de données: ${
    process.env.DATABASE_URL ? "Configurée" : "Non configurée"
  }`
);

export default {
  port: PORT,
  fetch: app.fetch,
};
