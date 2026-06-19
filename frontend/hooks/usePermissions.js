'use client';

/**
 * @module usePermissions
 * @description Hook React et utilitaire RBAC pour G-Stock Pro.
 * Permet de vérifier les permissions de l'utilisateur connecté côté Frontend.
 * Le rôle est récupéré depuis localStorage (stocké au moment du login).
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Constantes de la matrice RBAC — miroir exact du backend.
 * Chaque clé de module contient les rôles autorisés par type d'action.
 */
export const PERMISSIONS = {
  utilisateurs: {
    read:   ['super_admin'],
    create: ['super_admin'],
    update: ['super_admin'],
    delete: ['super_admin'],
  },
  produits: {
    read:   ['super_admin', 'magasinier', 'technicien', 'consultant'],
    create: ['super_admin', 'magasinier'],
    update: ['super_admin', 'magasinier'],
    delete: ['super_admin'],
  },
  actifs: {
    read:   ['super_admin', 'magasinier', 'technicien', 'consultant'],
    create: ['super_admin', 'magasinier', 'technicien'],
    update: ['super_admin', 'magasinier', 'technicien'],
    delete: ['super_admin'],
  },
  mouvements: {
    read:   ['super_admin', 'magasinier', 'consultant'],
    create: ['super_admin', 'magasinier'],
    update: ['super_admin', 'magasinier'],
    delete: ['super_admin'],
  },
  categories: {
    read:   ['super_admin', 'magasinier', 'consultant'],
    create: ['super_admin', 'magasinier'],
    update: ['super_admin', 'magasinier'],
    delete: ['super_admin'],
  },
  fournisseurs: {
    read:   ['super_admin', 'magasinier', 'consultant'],
    create: ['super_admin', 'magasinier'],
    update: ['super_admin', 'magasinier'],
    delete: ['super_admin'],
  },
  entrepots: {
    read:   ['super_admin', 'magasinier', 'technicien', 'consultant'],
    create: ['super_admin', 'magasinier'],
    update: ['super_admin', 'magasinier'],
    delete: ['super_admin'],
  },
  stocks: {
    read:   ['super_admin', 'magasinier', 'consultant'],
    create: ['super_admin', 'magasinier'],
    update: ['super_admin', 'magasinier'],
    delete: ['super_admin'],
  },
  maintenances: {
    read:   ['super_admin', 'technicien', 'consultant'],
    create: ['super_admin', 'technicien'],
    update: ['super_admin', 'technicien'],
    delete: ['super_admin'],
  },
};

/**
 * Vérifie si un rôle donné est autorisé.
 * @param {string|null} userRole - Le rôle de l'utilisateur connecté.
 * @param {string[]} allowedRoles - Tableau des rôles autorisés pour l'action.
 * @returns {boolean} true si autorisé, false sinon.
 */
export function hasPermission(userRole, allowedRoles) {
  if (!userRole || !allowedRoles) return false;
  return allowedRoles.includes(userRole);
}

/**
 * @hook usePermissions
 * @description Hook React personnalisé pour gérer les permissions RBAC côté client.
 * Récupère le rôle de l'utilisateur depuis localStorage et expose des fonctions utilitaires.
 * @returns {{ role: string|null, loading: boolean, hasPermission: function, canAccess: function }}
 */
export default function usePermissions() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedRole = localStorage.getItem('userRole');
      setRole(storedRole);
    } catch {
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Vérifie si l'utilisateur a l'un des rôles requis.
   * @param {string[]} allowedRoles - Tableau des rôles autorisés.
   * @returns {boolean}
   */
  const checkPermission = useCallback(
    (allowedRoles) => hasPermission(role, allowedRoles),
    [role]
  );

  /**
   * Vérifie si l'utilisateur peut effectuer une action sur un module.
   * @param {string} moduleName - Nom du module (ex: 'produits', 'actifs').
   * @param {string} action - Type d'action (ex: 'read', 'create', 'update', 'delete').
   * @returns {boolean}
   */
  const canAccess = useCallback(
    (moduleName, action) => {
      const modulePermissions = PERMISSIONS[moduleName];
      if (!modulePermissions || !modulePermissions[action]) return false;
      return hasPermission(role, modulePermissions[action]);
    },
    [role]
  );

  return {
    role,
    loading,
    hasPermission: checkPermission,
    canAccess,
  };
}
