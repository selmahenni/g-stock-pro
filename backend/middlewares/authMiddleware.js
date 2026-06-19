// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

/**
 * Vérifie la présence et la validité du cookie HTTP-Only contenant le JWT.
 */
exports.verifyToken = (req, res, next) => {
  // On récupère le token depuis les cookies grâce à cookie-parser
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Accès refusé. Veuillez vous connecter.' });
  }

  try {
    // Décodage du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // On attache les infos de l'utilisateur (id, role) à la requête pour les contrôleurs
    req.utilisateur = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide ou expiré.' });
  }
};

/**
 * Vérifie si le rôle de l'utilisateur l'autorise à accéder à la route (RBAC).
 * @param {Array<string>} allowedRoles - Tableau des rôles autorisés (ex: ['super_admin', 'magasinier']).
 */
exports.requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.utilisateur || !allowedRoles.includes(req.utilisateur.role)) {
      return res.status(403).json({ message: 'Accès interdit : privilèges insuffisants.' });
    }
    next();
  };
};