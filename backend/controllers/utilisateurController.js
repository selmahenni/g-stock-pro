// backend/controllers/utilisateurController.js

const Utilisateur = require('../models/Utilisateur');
const pool = require('../config/db');

const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const auditService = require('../services/auditService');



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

    // 1. Vérification des identifiants (email + mot de passe) -> 401 générique
    const isMatch = utilisateur
      ? await bcrypt.compare(mot_de_passe, utilisateur.hash_mot_de_passe)
      : false;

    if (!utilisateur || !isMatch) {
      auditService.enregistrer({
        utilisateur_id: utilisateur?.id || null,
        action: 'connexion_echec',
        entite: 'utilisateurs',
        entite_id: utilisateur?.id || null,
        details: `Échec de connexion (identifiants invalides) : ${adresse_email}`,
      });
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    // 2. Identifiants valides mais COMPTE DÉSACTIVÉ -> 403 propre et distinct
    if (!utilisateur.est_actif) {
      auditService.enregistrer({
        utilisateur_id: utilisateur.id,
        action: 'connexion_echec',
        entite: 'utilisateurs',
        entite_id: utilisateur.id,
        details: `Tentative de connexion sur un compte désactivé : ${adresse_email}`,
      });
      return res.status(403).json({ message: "Votre compte a été désactivé. Veuillez contacter un administrateur." });
    }

    // 3. Création du Payload JWT

    const payload = { id: utilisateur.id, role: utilisateur.role };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });



    // Placement du token dans un Cookie HTTP-Only sécurisé (Conforme CDC)

    res.cookie('token', token, {

      httpOnly: true,

      secure: process.env.NODE_ENV === 'production',

      sameSite: 'strict',

      maxAge: 24 * 60 * 60 * 1000

    });

    auditService.enregistrer({
      utilisateur_id: utilisateur.id,
      action: 'connexion',
      entite: 'utilisateurs',
      entite_id: utilisateur.id,
      details: `Connexion réussie : ${adresse_email}`,
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = (req.query.search || '').trim();
    const role = req.query.role || null; // 'super_admin' | 'magasinier' | 'technicien' | 'consultant'

    // Pagination + recherche + filtre rôle, poussés dans le SQL (page demandée uniquement)
    const { rows, total } = await Utilisateur.findPaginated({ page, limit, search, role });
    const totalPages = Math.ceil(total / limit) || 1;

    // Compteurs GLOBAUX (indépendants de la page/du filtre) pour les cartes de stats
    const { rows: s } = await pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE est_actif)::int                              AS actifs,
             COUNT(*) FILTER (WHERE role = 'super_admin')::int                   AS super_admins,
             COUNT(*) FILTER (WHERE role IN ('technicien','magasinier'))::int    AS techniciens
      FROM utilisateurs`);

    res.status(200).json({
      stats: s[0],
      metadata: {
        total_items: total,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1
      },
      utilisateurs: rows
    });
  } catch (error) {
    // Si ça plante, le terminal de VS Code t'affichera la cause exacte
    console.error("Erreur lors de la récupération paginée :", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération" });
  }
};


/**
 * @function getUtilisateurById
 * @description Récupère un utilisateur par son ID (sans son mot de passe).
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
const getUtilisateurById = async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateur = await Utilisateur.findById(id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }
    return res.status(200).json(utilisateur);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la récupération", erreur: error.message });
  }
};

/**
 * @function updateUtilisateur
 * @description Met à jour le profil d'un utilisateur (nom, email, rôle, statut).
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
const updateUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateurExistant = await Utilisateur.findById(id);
    if (!utilisateurExistant) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    const { nom, nom_complet, adresse_email, role, est_actif } = req.body;

    // Garde-fous de désactivation (cohérents avec toggleStatut)
    if (est_actif === false) {
      if (Number(id) === Number(req.utilisateur.id)) {
        return res.status(403).json({ message: "Vous ne pouvez pas désactiver votre propre compte." });
      }
      if (utilisateurExistant.role === 'super_admin') {
        return res.status(403).json({ message: "Un compte super-administrateur ne peut pas être désactivé." });
      }
    }

    // Fusion sécurisée des données envoyées avec les valeurs existantes
    const dataToUpdate = {
      nom_complet: nom_complet !== undefined ? nom_complet : (nom !== undefined ? nom : utilisateurExistant.nom_complet),
      adresse_email: adresse_email !== undefined ? adresse_email : utilisateurExistant.adresse_email,
      role: role !== undefined ? role : utilisateurExistant.role,
      est_actif: est_actif !== undefined ? est_actif : utilisateurExistant.est_actif
    };

    const utilisateurMisAJour = await Utilisateur.update(id, dataToUpdate);
    return res.status(200).json({
      message: "Utilisateur mis à jour avec succès",
      utilisateur: utilisateurMisAJour
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la mise à jour", erreur: error.message });
  }
};

/**
 * @function deleteUtilisateur
 * @description Supprime un utilisateur du système.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
const deleteUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;
    const estSupprime = await Utilisateur.delete(id);
    if (!estSupprime) {
      return res.status(404).json({ message: "Utilisateur non trouvé ou déjà supprimé." });
    }
    return res.status(200).json({ message: "Utilisateur supprimé avec succès." });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur :", error);
    return res.status(500).json({ message: "Erreur serveur lors de la suppression", erreur: error.message });
  }
};



/**
 * @function toggleStatut
 * @description Bascule le statut actif/inactif d'un utilisateur (super-admin).
 */
const toggleStatut = async (req, res) => {
  try {
    const { id } = req.params;
    const utilisateur = await Utilisateur.findById(id);
    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Garde-fou 1 : anti-verrouillage — on ne modifie pas son propre statut
    if (Number(id) === Number(req.utilisateur.id)) {
      return res.status(403).json({ message: "Vous ne pouvez pas modifier le statut de votre propre compte." });
    }

    // Garde-fou 2 : un super-administrateur actif ne peut pas être désactivé
    if (utilisateur.role === 'super_admin' && utilisateur.est_actif) {
      return res.status(403).json({ message: "Un compte super-administrateur ne peut pas être désactivé." });
    }

    const nouveauStatut = !utilisateur.est_actif;
    const maj = await Utilisateur.update(id, {
      role: utilisateur.role,
      nom_complet: utilisateur.nom_complet,
      adresse_email: utilisateur.adresse_email,
      est_actif: nouveauStatut,
    });

    return res.status(200).json({
      message: `Compte ${nouveauStatut ? 'activé' : 'désactivé'} avec succès.`,
      utilisateur: maj,
    });
  } catch (error) {
    console.error("Erreur lors du changement de statut :", error);
    return res.status(500).json({ message: "Erreur serveur lors du changement de statut.", erreur: error.message });
  }
};



// L'export correct attendu par ton fichier Routes

module.exports = {

  createUtilisateur,

  connexion,

  deconnexion,

  getAllUtilisateurs,

  getUtilisateurById,

  updateUtilisateur,

  deleteUtilisateur,

  toggleStatut

};

