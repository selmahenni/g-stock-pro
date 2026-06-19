// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const cookieParser = require('cookie-parser'); // Permet de lire et décoder les cookies HTTP-Only
require('dotenv').config();

// Initialisation de l'application Express
const app = express();

// ==========================================
// Middlewares globaux
// ==========================================

// 1. Sécurise les en-têtes HTTP contre les vulnérabilités courantes
app.use(helmet()); 

// 2. Configure CORS pour autoriser le frontend Next.js et l'échange sécurisé de cookies
app.use(cors({
  origin: 'http://localhost:3000', // URL de ton application Next.js
  credentials: true                // Permet l'envoi et la réception des cookies HTTP-Only
}));   

// 3. Permet de lire le JSON dans le corps des requêtes (req.body)
app.use(express.json()); 

// 4. Active l'analyseur de cookies pour récupérer req.cookies dans l'authentification
app.use(cookieParser());

// 5. Sert les images téléversées en statique (/uploads).
//    CORP 'cross-origin' pour autoriser l'affichage depuis le front (port 3000).
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res) => res.set('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

// ==========================================
// Import des routes
// ==========================================
const produitRoutes = require('./routes/produitRoutes');
const utilisateurRoutes = require('./routes/utilisateurRoutes');
const categorieRoutes = require('./routes/categorieRoutes');
const fournisseurRoutes = require('./routes/fournisseurRoutes');
const mouvementRoutes = require('./routes/mouvementRoutes');
const actifRoutes = require('./routes/actifRoutes');
const entrepotRoutes = require('./routes/entrepotRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const stockRoutes = require('./routes/stockRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// ==========================================
// Montage des routes (End-points API)
// ==========================================
app.use('/api/produits', produitRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/categories', categorieRoutes);
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/mouvements', mouvementRoutes);
app.use('/api/actifs', actifRoutes);
app.use('/api/entrepots', entrepotRoutes);
app.use('/api/maintenances', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ==========================================
// Route de test (Health Check)
// ==========================================
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bienvenue sur l\'API G-Stock Pro',
    status: 'En ligne',
    security: 'Middlewares d\'authentification et de validation prêts'
  });
});

// ==========================================
// Gestion des routes inexistantes (404)
// ==========================================
app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

// ==========================================
// Démarrage du serveur
// ==========================================
const PORT = process.env.PORT || 5000;

// Planificateur de maintenance préventive (vérifie les échéances et notifie les techniciens)
const { demarrerPlanificateurMaintenance } = require('./services/maintenanceScheduler');
demarrerPlanificateurMaintenance();

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Serveur G-Stock Pro démarré avec succès !`);
  console.log(`📡 Port d'écoute : ${PORT}`);
  console.log(`🔗 URL de base  : http://localhost:${PORT}`);
  console.log(`🔒 Mode sécurisé : Activé (Cookies & CORS configurés)`);
  console.log(`=================================================`);
});