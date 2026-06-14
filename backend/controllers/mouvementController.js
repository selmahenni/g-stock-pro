// controllers/mouvementController.js
const Mouvement = require('../models/Mouvement');
const Produit = require('../models/Produit'); // Ajout du modèle Produit
const notificationService = require('../services/notificationService'); // Ajout du service de notification

/**
 * @function getAllMouvements
 * @description Récupère l'historique des mouvements avec un système de pagination.
 * @param {Object} req - Objet de requête Express (accepte ?page=X&limit=Y).
 * @param {Object} res - Objet de réponse Express.
 */
exports.getAllMouvements = async (req, res) => {
  try {
    // 1. Paramètres de pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 2. Extraction complète depuis le modèle
    const tousLesMouvements = await Mouvement.findAll();

    // 3. Application de la pagination "en mémoire"
    const totalItems = tousLesMouvements.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const mouvementsPagines = tousLesMouvements.slice(startIndex, endIndex);

    // 4. Envoi au client
    res.status(200).json({
      metadata: {
        total_items: totalItems,
        total_pages: totalPages,
        current_page: page,
        per_page: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1
      },
      mouvements: mouvementsPagines
    });
  } catch (error) { 
    console.error('Erreur lors de la récupération des mouvements:', error);
    res.status(500).json({ message: 'Erreur serveur interne' }); 
  }
};

/**
 * @function createMouvement
 * @description Enregistre un nouveau mouvement de stock et déclenche une alerte email si le seuil critique est atteint.
 * @param {Object} req - Objet de requête Express contenant les détails du mouvement.
 * @param {Object} res - Objet de réponse Express.
 */
exports.createMouvement = async (req, res) => {
  try {
    // 1. Création et enregistrement du mouvement en base de données
    const nouveauMouvement = await Mouvement.create(req.body);

    // 2. Logique de Notification : Vérification du seuil critique
    if (req.body.produit_id) {
      // On récupère les informations mises à jour du produit concerné
      const produitMisAJour = await Produit.findById(req.body.produit_id);

      // On s'assure que le produit existe ET que sa quantité est passée sous le seuil
      if (produitMisAJour && produitMisAJour.quantite_actuelle <= produitMisAJour.seuil_alerte) {
        
        // Liste temporaire des emails (à terme, tu pourras les récupérer depuis ta table Utilisateurs)
        const emailsMagasiniers = ['super_admin@gstockpro.com', 'magasinier@gstockpro.com'];
        
        // On déclenche le service en arrière-plan (sans await) pour ne pas ralentir la réponse HTTP
        notificationService.alerterRuptureStock(produitMisAJour, emailsMagasiniers)
          .catch(err => console.error("❌ Erreur lors de l'envoi de l'alerte email:", err));
      }
    }

    // 3. Réponse de succès au client
    res.status(201).json({
      message: "Mouvement enregistré avec succès.",
      mouvement: nouveauMouvement
    });
  } catch (error) { 
    console.error('Erreur lors de l\'enregistrement du mouvement:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement du mouvement.' }); 
  }
};