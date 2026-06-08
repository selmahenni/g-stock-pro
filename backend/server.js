// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Initialisation de l'application Express
const app = express();

// ==========================================
// Middlewares globaux
// ==========================================
// helmet sécurise les en-têtes HTTP (protection de base contre les vulnérabilités web courantes)
app.use(helmet()); 

// cors permet à ton frontend (Next.js) de faire des requêtes vers cette API sans être bloqué par le navigateur
app.use(cors());   

// express.json parse les requêtes entrantes pour que tu puisses accéder à req.body sous forme d'objet JavaScript
app.use(express.json()); 

// ==========================================
// Import des routes
// ==========================================
// On importe chaque module de route que nous avons créé dans le dossier "routes"
const produitRoutes = require('./routes/produitRoutes');
const utilisateurRoutes = require('./routes/utilisateurRoutes');
const categorieRoutes = require('./routes/categorieRoutes');
const fournisseurRoutes = require('./routes/fournisseurRoutes');
const mouvementRoutes = require('./routes/mouvementRoutes');
const actifRoutes = require('./routes/actifRoutes');
const entrepotRoutes = require('./routes/entrepotRoutes');

// ==========================================
// Montage des routes (End-points API)
// ==========================================
// On attache chaque fichier de route à une URL de base spécifique
// Ex: Les requêtes vers "http://localhost:5000/api/produits" iront dans produitRoutes
app.use('/api/produits', produitRoutes);
app.use('/api/utilisateurs', utilisateurRoutes);
app.use('/api/categories', categorieRoutes);
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/mouvements', mouvementRoutes);
app.use('/api/actifs', actifRoutes);
app.use('/api/entrepots', entrepotRoutes);

// ==========================================
// Route de test (Health Check)
// ==========================================
// Permet de s'assurer rapidement que le serveur tourne quand tu visites la racine de l'API
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bienvenue sur l\'API G-Stock Pro',
    status: 'En ligne'
  });
});

// ==========================================
// Gestion des routes inexistantes (404)
// ==========================================
// Si l'utilisateur tape une route API qui n'est pas définie plus haut, on renvoie une erreur propre
app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

// ==========================================
// Démarrage du serveur
// ==========================================
// Utilise le port défini dans le fichier .env (5000 en général), sinon fallback sur 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Serveur G-Stock Pro démarré avec succès !`);
  console.log(`📡 Port d'écoute : ${PORT}`);
  console.log(`🔗 URL de base  : http://localhost:${PORT}`);
  console.log(`=================================================`);
});