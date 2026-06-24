// config/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Pool de connexions UNIQUE pour toute l'application : le module étant mis en cache
// par Node (require), ce pool n'est instancié qu'une seule fois.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Vérification de connectivité au démarrage : on logue UNE seule fois.
// (Auparavant on écoutait l'événement 'connect', déclenché à CHAQUE nouveau client
//  ouvert par le pool → des dizaines de messages identiques en boucle.)
pool.query('SELECT 1')
  .then(() => console.log('Connexion à la base de données PostgreSQL établie avec succès.'))
  .catch((err) => console.error('❌ Échec de connexion à la base de données PostgreSQL :', err.message));

// Bonne pratique pg : ne pas laisser une erreur de client inactif planter le process.
pool.on('error', (err) => console.error('❌ Erreur inattendue sur un client PostgreSQL inactif :', err.message));

module.exports = pool;