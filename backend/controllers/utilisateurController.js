// backend/controllers/utilisateurController.js
const Utilisateur = require('../models/Utilisateur');
const bcrypt = require('bcryptjs'); // Assure-toi que c'est bien bcryptjs qui est utilisé

const createUtilisateur = async (req, res) => {
  console.log('\n==================================================');
  console.log('🚀 [LOG] -> Début de la procédure d\'inscription');
  console.log('📦 [LOG] -> Données reçues (req.body) :', req.body);
  console.log('==================================================');

  try {
    const { nom, adresse_email, mot_de_passe, role } = req.body;

    // Étape 1 : Vérification d'existence
    console.log(`🔍 [LOG] Étape 1 -> Vérification en BDD pour l'email : ${adresse_email}`);
    
    // C'est souvent ici que ça plante si la table n'existe pas
    const utilisateurExistant = await Utilisateur.findByEmail(adresse_email); 
    
    if (utilisateurExistant) {
      console.log('⚠️ [LOG] -> Échec : Cet email existe déjà en base de données.');
      return res.status(400).json({ message: "Cet email est déjà enregistré." });
    }
    console.log('✅ [LOG] -> Email disponible, poursuite de l\'inscription.');

    // Étape 2 : Hachage sécurisé
    console.log('🔑 [LOG] Étape 2 -> Génération du sel et hachage du mot de passe...');
    const salt = await bcrypt.genSalt(10);
    const motDePasseHache = await bcrypt.hash(mot_de_passe, salt);
    console.log('✅ [LOG] -> Mot de passe haché avec succès.');

    // Étape 3 : Insertion SQL
    console.log('💾 [LOG] Étape 3 -> Tentative d\'insertion de la ligne dans PostgreSQL...');
    const nouvelUtilisateur = await Utilisateur.create({
      nom,
      adresse_email,
      mot_de_passe: motDePasseHache,
      role
    });

    console.log('🎉 [LOG] -> SUCCÈS ! Utilisateur inséré avec l\'ID :', nouvelUtilisateur.id);
    console.log('==================================================\n');

    return res.status(201).json({
      message: "Utilisateur enregistré avec succès",
      utilisateur: {
        id: nouvelUtilisateur.id,
        nom: nouvelUtilisateur.nom,
        adresse_email: nouvelUtilisateur.adresse_email,
        role: nouvelUtilisateur.role
      }
    });

  } catch (error) {
    // 💥 ZONE INTERCEPTION CRITIQUE
    console.error('\n❌ 🔥 [ERREUR SERVEUR DETECTÉE] 🔥 ❌');
    console.error('--------------------------------------------------');
    console.error('Message brut de l\'erreur :', error.message);
    console.error('Code d\'erreur SQL / Système :', error.code || 'Non spécifié');
    console.error('--------------------------------------------------');
    console.error('📋 PILE D\'EXÉCUTION (Indique la ligne exacte du crash) :');
    console.error(error.stack); // Affiche le fichier et la ligne exacte (ex: Utilisateur.js:12)
    console.error('==================================================\n');

    return res.status(500).json({
      message: "Erreur lors de l'inscription",
      erreur: error.message
    });
  }
};

module.exports = {
  createUtilisateur
};