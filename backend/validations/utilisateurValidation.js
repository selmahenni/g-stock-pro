// backend/validations/utilisateurValidation.js
const { z } = require('zod');

// Schéma de validation pour l'inscription
exports.registerSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  adresse_email: z.string().email("Format de l'email invalide"),
  mot_de_passe: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  role: z.enum(['super_admin', 'magasinier', 'technicien', 'consultant']).default('consultant')
});

// Schéma de validation pour la connexion
exports.loginSchema = z.object({
  adresse_email: z.string().email("Format de l'email invalide"),
  mot_de_passe: z.string().min(1, "Le mot de passe est requis")
});