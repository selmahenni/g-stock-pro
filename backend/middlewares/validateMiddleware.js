// backend/middlewares/validateMiddleware.js
const { ZodError } = require('zod');

/**
 * Middleware pour valider les données entrantes (req.body) avec un schéma Zod.
 */
const validate = (schema) => (req, res, next) => {
  try {
    // On valide les données. Si tout est correct, on passe à la suite.
    schema.parse(req.body);
    return next();
  } catch (error) {
    // Vérification ultra-robuste pour identifier une erreur Zod
    const isZodError = error instanceof ZodError || error.name === 'ZodError' || Array.isArray(error.issues);

    if (isZodError) {
      // Sécurité absolue : on récupère les erreurs de Zod ou un tableau vide par défaut
      const listeErreurs = error.issues || error.errors || [];

      return res.status(400).json({
        statut: 'erreur_validation',
        message: 'Erreur de validation des données.',
        erreurs: listeErreurs.map((err) => ({
          champ: Array.isArray(err.path) ? err.path.join('.') : 'champ',
          message: err.message || 'Donnée invalide'
        }))
      });
    }

    // Si c't une autre erreur (ex: bug interne), on l'envoie au gestionnaire global d'Express
    return next(error);
  }
};

module.exports = validate;