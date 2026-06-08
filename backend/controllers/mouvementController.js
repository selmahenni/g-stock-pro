const Mouvement = require('../models/Mouvement');

exports.getAllMouvements = async (req, res) => {
  try {
    const mouvements = await Mouvement.findAll();
    res.status(200).json(mouvements);
  } catch (error) { res.status(500).json({ message: 'Erreur serveur' }); }
};

exports.createMouvement = async (req, res) => {
  try {
    const nouveauMouvement = await Mouvement.create(req.body);
    res.status(201).json(nouveauMouvement);
  } catch (error) { res.status(500).json({ message: 'Erreur lors de l\'enregistrement du mouvement' }); }
};