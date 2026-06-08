const Utilisateur = require('../models/Utilisateur');

exports.getAllUtilisateurs = async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.findAll();
    res.status(200).json(utilisateurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
};

exports.getUtilisateurById = async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.id);
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json(utilisateur);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

exports.createUtilisateur = async (req, res) => {
  try {
    const nouvelUtilisateur = await Utilisateur.create(req.body);
    res.status(201).json(nouvelUtilisateur);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur' });
  }
};

exports.updateUtilisateur = async (req, res) => {
  try {
    const utilisateurMisAJour = await Utilisateur.update(req.params.id, req.body);
    if (!utilisateurMisAJour) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json(utilisateurMisAJour);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

exports.deleteUtilisateur = async (req, res) => {
  try {
    const estSupprime = await Utilisateur.delete(req.params.id);
    if (!estSupprime) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};