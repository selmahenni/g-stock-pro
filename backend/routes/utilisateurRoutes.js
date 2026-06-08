const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateurController');

/**
 * @route   GET /api/utilisateurs
 * @desc    Récupérer la liste de tous les utilisateurs
 */
router.get('/', utilisateurController.getAllUtilisateurs);

/**
 * @route   GET /api/utilisateurs/:id
 * @desc    Récupérer un utilisateur par son ID
 */
router.get('/:id', utilisateurController.getUtilisateurById);

/**
 * @route   POST /api/utilisateurs
 * @desc    Créer un nouvel utilisateur
 */
router.post('/', utilisateurController.createUtilisateur);

/**
 * @route   PUT /api/utilisateurs/:id
 * @desc    Mettre à jour les informations d'un utilisateur
 */
router.put('/:id', utilisateurController.updateUtilisateur);

/**
 * @route   DELETE /api/utilisateurs/:id
 * @desc    Supprimer un utilisateur
 */
router.delete('/:id', utilisateurController.deleteUtilisateur);

module.exports = router;