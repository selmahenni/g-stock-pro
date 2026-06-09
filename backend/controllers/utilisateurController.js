// backend/controllers/utilisateurController.js
const Utilisateur = require('../models/Utilisateur');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createUtilisateur = async (req, res) => {
  try {
    const { nom, adresse_email, mot_de_passe, role } = req.body;

    // 1. Vérification si l'email existe déjà
    const utilisateurExistant = await Utilisateur.findByEmail(adresse_email); 
    if (utilisateurExistant) {
      return res.status(400).json({ message: "Cet email est déjà enregistré." });
    }

    // 2. Hachage du mot de passe
    const salt = await bcrypt.genSalt(10);
    const motDePasseHache = await bcrypt.hash(mot_de_passe, salt);

    // 3. Insertion en Base de Données (Adapté aux noms de colonnes SQL)
    const nouvelUtilisateur = await Utilisateur.create({
      nom_complet: nom,
      adresse_email,
      hash_mot_de_passe: motDePasseHache,
      role,
      est_actif: true
    });

    return res.status(201).json({
      message: "Utilisateur enregistré avec succès",
      utilisateur: {
        id: nouvelUtilisateur.id,
        nom: nouvelUtilisateur.nom_complet,
        adresse_email: nouvelUtilisateur.adresse_email,
        role: nouvelUtilisateur.role
      }
    });

  } catch (error) {
    console.error("Erreur serveur lors de l'inscription :", error);
    return res.status(500).json({ message: "Erreur lors de l'inscription", erreur: error.message });
  }
};

const connexion = async (req, res) => {
  try {
    const { adresse_email, mot_de_passe } = req.body;

    const utilisateur = await Utilisateur.findByEmail(adresse_email);
    if (!utilisateur || !utilisateur.est_actif) {
      return res.status(401).json({ message: "Identifiants invalides ou compte inactif." });
    }

    const isMatch = await bcrypt.compare(mot_de_passe, utilisateur.hash_mot_de_passe);
    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    // Création du Payload JWT
    const payload = { id: utilisateur.id, role: utilisateur.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Placement du token dans un Cookie HTTP-Only sécurisé (Conforme CDC)
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      message: "Connexion réussie",
      utilisateur: { id: utilisateur.id, nom: utilisateur.nom_complet, role: utilisateur.role }
    });

  } catch (error) {
    console.error("Erreur de connexion:", error);
    return res.status(500).json({ message: "Erreur serveur lors de la connexion", erreur: error.message });
  }
};

const deconnexion = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.status(200).json({ message: "Déconnexion réussie" });
};

const getAllUtilisateurs = async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.findAll();
    res.status(200).json(utilisateurs);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Stubs pour finaliser le CRUD plus tard
const getUtilisateurById = async (req, res) => { res.status(501).json({ message: "Non implémenté" }); };
const updateUtilisateur = async (req, res) => { res.status(501).json({ message: "Non implémenté" }); };
const deleteUtilisateur = async (req, res) => { res.status(501).json({ message: "Non implémenté" }); };

// L'export correct attendu par ton fichier Routes
module.exports = {
  createUtilisateur,
  connexion,
  deconnexion,
  getAllUtilisateurs,
  getUtilisateurById,
  updateUtilisateur,
  deleteUtilisateur
};