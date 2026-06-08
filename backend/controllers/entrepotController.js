const Entrepot = require('../models/Entrepot');

/**
 * @function getEntrepots
 * @description Contrôleur pour récupérer tous les entrepôts.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
exports.getEntrepots = async (req, res) => {
  try {
    const entrepots = await Entrepot.findAll();
    res.status(200).json(entrepots);
  } catch (error) {
    console.error('Erreur (getEntrepots):', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des entrepôts' });
  }
};

/**
 * @function createEntrepot
 * @description Contrôleur pour créer un entrepôt.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
exports.createEntrepot = async (req, res) => {
  try {
    const { nom } = req.body;
    if (!nom) return res.status(400).json({ message: 'Le nom de l\'entrepôt est requis.' });

    const nouvelEntrepot = await Entrepot.create(req.body);
    res.status(201).json(nouvelEntrepot);
  } catch (error) {
    console.error('Erreur (createEntrepot):', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'entrepôt' });
  }
};

// ... Tu peux facilement déduire getEntrepotById, updateEntrepot, et deleteEntrepot sur le même modèle !