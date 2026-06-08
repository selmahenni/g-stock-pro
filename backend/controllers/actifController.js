const Actif = require('../models/Actif');

/**
 * @function getAllActifs
 * @description Récupère tout l'inventaire physique.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllActifs = async (req, res) => {
  try {
    const actifs = await Actif.findAll();
    res.status(200).json(actifs);
  } catch (error) {
    console.error('Erreur lors de la récupération des actifs:', error);
    res.status(500).json({ message: 'Erreur serveur interne' });
  }
};

/**
 * @function createActif
 * @description Enregistre un nouveau matériel dans le parc.
 * @param {Object} req - Objet de requête Express.
 * @param {Object} res - Objet de réponse Express.
 */
exports.createActif = async (req, res) => {
  try {
    const { produit_id, numero_serie, entrepot_id } = req.body;
    
    // Validation basique
    if (!produit_id || !numero_serie || !entrepot_id) {
      return res.status(400).json({ 
        message: 'produit_id, numero_serie et entrepot_id sont obligatoires.' 
      });
    }

    const nouvelActif = await Actif.create(req.body);
    res.status(201).json({
      message: 'Actif enregistré avec succès',
      actif: nouvelActif
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'actif:', error);
    // Gestion du cas où le numéro de série existe déjà (erreur PostgreSQL 23505)
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Ce numéro de série existe déjà dans le système.' });
    }
    res.status(500).json({ message: 'Erreur lors de la création' });
  }
};