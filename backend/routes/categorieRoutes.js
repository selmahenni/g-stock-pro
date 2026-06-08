const express = require('express');
const router = express.Router();
const categorieController = require('../controllers/categorieController');

/**
 * @route   GET /api/categories
 * @desc    Récupérer toutes les catégories
 */
router.get('/', categorieController.getAllCategories);

/**
 * @route   POST /api/categories
 * @desc    Créer une nouvelle catégorie
 */
router.post('/', categorieController.createCategorie);

// Note : Tu pourras ajouter GET /:id, PUT /:id et DELETE /:id en t'inspirant des utilisateurs
// router.get('/:id', categorieController.getCategorieById);
// router.put('/:id', categorieController.updateCategorie);
// router.delete('/:id', categorieController.deleteCategorie);

module.exports = router;