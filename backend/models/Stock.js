// models/Stock.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Assure-toi que ce chemin correspond à ton fichier de config

/**
 * @module Stock
 * @description Modèle représentant la table 'stocks' dans Supabase.
 * Stocke la quantité totale précalculée d'un produit dans un entrepôt.
 */
const Stock = sequelize.define('Stock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  produit_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'produits', // Doit correspondre exactement au nom de ta table produits
      key: 'id'
    }
  },
  entrepot_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'entrepots', // Doit correspondre exactement au nom de ta table entrepots
      key: 'id'
    }
  },
  numero_lot: {
    type: DataTypes.STRING(50),
    allowNull: true // Permet les valeurs nulles si on ne gère pas par lot
  },
  quantite: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  mis_a_jour_le: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'stocks', // Fait le lien direct avec la table créée par le script SQL
  timestamps: false    // Désactivé car 'mis_a_jour_le' gère déjà la date
});

module.exports = Stock;