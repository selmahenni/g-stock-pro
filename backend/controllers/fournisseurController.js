const Fournisseur = require('../models/Fournisseur');

exports.getAllFournisseurs = async (req, res) => {
  try {
    const fournisseurs = await Fournisseur.findAll();
    res.status(200).json(fournisseurs);
  } catch (error) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.createFournisseur = async (req, res) => {
  try {
    const nouveau = await Fournisseur.create(req.body);
    res.status(201).json(nouveau);
  } catch (error) { res.status(500).json({ message: 'Erreur de création' }); }
};