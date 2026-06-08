const Categorie = require('../models/Categorie');

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Categorie.findAll();
    res.status(200).json(categories);
  } catch (error) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.createCategorie = async (req, res) => {
  try {
    const nouvelleCategorie = await Categorie.create(req.body);
    res.status(201).json(nouvelleCategorie);
  } catch (error) { res.status(500).json({ message: 'Erreur de création' }); }
};

// Logique identique pour getById, update, et delete (en adaptant l'appel au modèle)