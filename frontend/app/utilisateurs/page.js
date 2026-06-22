'use client';

import React, { useState, useEffect } from 'react';
import DataTable from '../../components/DataTable';
import { ActiveBadge, RoleBadge } from '../../components/StatusBadge';
import usePermissions from '../../hooks/usePermissions';
import { Users, UserCheck, ShieldAlert, Wrench, RefreshCw, AlertCircle, UserPlus, Pencil, Trash2, X, Eye, EyeOff, Power } from 'lucide-react';

/**
 * @typedef {Object} Utilisateur
 * @property {number} id - L'identifiant de l'utilisateur.
 * @property {string} nom_complet - Le nom complet.
 * @property {string} adresse_email - L'adresse email.
 * @property {string} role - Le rôle de l'utilisateur ('super_admin', 'magasinier', 'technicien', 'consultant').
 * @property {boolean} est_actif - Le statut d'activité.
 * @property {string} cree_le - La date de création au format ISO.
 */

/**
 * @component PageUtilisateurs
 * @description Page principale d'affichage et de gestion des utilisateurs. Récupère la liste des utilisateurs
 * depuis le serveur backend et l'affiche à l'aide du composant générique DataTable.
 * Le masquage visuel des boutons d'action respecte la matrice RBAC.
 * @returns {React.JSX.Element} La structure complète de la page.
 */
export default function PageUtilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { canAccess } = usePermissions();

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    adresse_email: '',
    mot_de_passe: '',
    role: 'consultant',
  });

  // Identifiant de l'utilisateur connecté (pour les garde-fous d'auto-action)
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    try { setCurrentUserId(Number(localStorage.getItem('userId'))); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    /**
     * Récupère la liste des utilisateurs depuis l'API backend en envoyant le cookie de session (credentials).
     */
    async function fetchUtilisateurs() {
      try {
        setLoading(true);
        setError(null);

        // Fetch avec credentials pour transmettre les cookies HTTP-Only
        const res = await fetch('http://localhost:5000/api/utilisateurs?limit=100', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login';
            return;
          }
          throw new Error(`Erreur serveur (${res.status}) lors de la récupération des données.`);
        }

        const data = await res.json();
        setUtilisateurs(data.utilisateurs || []);
      } catch (err) {
        setError(err.message || 'Impossible de se connecter au serveur backend.');
      } finally {
        setLoading(false);
      }
    }

    fetchUtilisateurs();
  }, [refreshKey]);

  // ==========================================
  // Handlers CRUD
  // ==========================================
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch('http://localhost:5000/api/utilisateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la création');
      setShowCreateModal(false);
      setFormData({ nom: '', adresse_email: '', mot_de_passe: '', role: 'consultant' });
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/utilisateurs/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom_complet: formData.nom,
          adresse_email: formData.adresse_email,
          role: formData.role,
          est_actif: formData.est_actif,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la mise à jour');
      setShowEditModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/utilisateurs/${selectedUser.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la suppression');
      setShowDeleteModal(false);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  /**
   * Bascule le statut actif/inactif d'un utilisateur (super-admin).
   */
  const handleToggleStatut = async (user) => {
    try {
      const res = await fetch(`http://localhost:5000/api/utilisateurs/${user.id}/statut`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      alert(err.message);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      nom: user.nom_complet || '',
      adresse_email: user.adresse_email || '',
      mot_de_passe: '',
      role: user.role || 'consultant',
      est_actif: user.est_actif,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setFormError(null);
    setShowDeleteModal(true);
  };

  // Droits RBAC
  const canCreate = canAccess('utilisateurs', 'create');
  const canUpdate = canAccess('utilisateurs', 'update');
  const canDelete = canAccess('utilisateurs', 'delete');

  // Définition des colonnes pour TanStack Table
  const columns = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: (info) => <span className="font-mono text-xs text-base-content/50">#{info.getValue()}</span>,
    },
    {
      accessorKey: 'nom_complet',
      header: 'Utilisateur',
      cell: (info) => {
        const nom = info.getValue() || 'Inconnu';
        const initiales = nom
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        
        return (
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-primary/10 text-primary rounded-xl w-10 h-10 font-bold flex items-center justify-center transition-all duration-200 hover:scale-105">
                <span className="text-xs">{initiales}</span>
              </div>
            </div>
            <div>
              <div className="font-bold text-base-content/90">{nom}</div>
              <div className="text-xs text-base-content/50">{info.row.original.adresse_email}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Rôle',
      cell: (info) => <RoleBadge role={info.getValue()} size="md" />,
    },
    {
      accessorKey: 'est_actif',
      header: 'Statut',
      cell: (info) => <ActiveBadge active={!!info.getValue()} />,
    },
    {
      accessorKey: 'cree_le',
      header: "Date d'inscription",
      cell: (info) => {
        const dateStr = info.getValue();
        if (!dateStr) return '-';
        const dateObj = new Date(dateStr);
        return (
          <span className="text-base-content/80 text-xs">
            {dateObj.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        );
      },
    },
    // Colonne d'actions conditionnelle (visible uniquement pour super_admin)
    ...(canUpdate || canDelete ? [{
      id: 'actions',
      header: 'Actions',
      cell: (info) => {
        const user = info.row.original;
        return (
          <div className="flex items-center gap-1">
            {canUpdate && (() => {
              const estSoi = Number(user.id) === currentUserId;
              const superAdminProtege = user.role === 'super_admin' && user.est_actif;
              const bloque = estSoi || superAdminProtege;
              const tip = estSoi
                ? 'Vous ne pouvez pas modifier votre propre statut'
                : superAdminProtege
                  ? 'Un super-administrateur ne peut pas être désactivé'
                  : user.est_actif ? 'Désactiver le compte' : 'Activer le compte';
              return (
                <button
                  onClick={() => { if (!bloque) handleToggleStatut(user); }}
                  disabled={bloque}
                  className={`btn btn-ghost btn-xs rounded-lg tooltip ${
                    bloque
                      ? 'text-base-content/25 cursor-not-allowed'
                      : user.est_actif ? 'text-base-content/40 hover:text-primary hover:bg-base-200' : 'text-base-content/40 hover:text-error hover:bg-base-200'
                  }`}
                  data-tip={tip}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              );
            })()}
            {canUpdate && (
              <button
                onClick={() => openEditModal(user)}
                className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-primary hover:bg-base-200 hover:text-sky-600 tooltip"
                data-tip="Modifier"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => openDeleteModal(user)}
                className="btn btn-ghost btn-xs rounded-lg text-base-content/40 hover:text-error hover:bg-base-200 hover:text-error tooltip"
                data-tip="Supprimer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    }] : []),
  ];

  // Calcul des statistiques rapides
  const totalUsers = utilisateurs.length;
  const activeUsers = utilisateurs.filter((u) => u.est_actif).length;
  const superAdmins = utilisateurs.filter((u) => u.role === 'super_admin').length;
  const technicians = utilisateurs.filter((u) => u.role === 'technicien' || u.role === 'magasinier').length;

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      {/* Container Principal */}
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* En-tête de page */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-base-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-base-content">
              Gestion des Utilisateurs
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              Consultez, filtrez et gérez les comptes utilisateurs et leurs permissions système.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setRefreshKey((prev) => prev + 1)}
              disabled={loading}
              className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 transition-all hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>

            {/* Bouton "Ajouter" visible uniquement pour super_admin */}
            {canCreate && (
              <button
                onClick={() => {
                  setFormData({ nom: '', adresse_email: '', mot_de_passe: '', role: 'consultant' });
                  setFormError(null);
                  setShowCreateModal(true);
                }}
                className="btn btn-primary btn-sm rounded-xl gap-2 transition-all hover:scale-105 shadow-lg shadow-primary/25"
              >
                <UserPlus className="w-4 h-4" />
                Ajouter un utilisateur
              </button>
            )}
          </div>
        </div>

        {/* Cartes de statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-base-100 p-4 sm:p-5 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 transition-all duration-300 hover:shadow-lg">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-base-content/50 font-semibold uppercase">Total Utilisateurs</p>
              <h3 className="text-2xl font-bold mt-0.5">{loading ? '-' : totalUsers}</h3>
            </div>
          </div>

          <div className="bg-base-100 p-4 sm:p-5 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 transition-all duration-300 hover:shadow-lg">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-base-content/50 font-semibold uppercase">Comptes Actifs</p>
              <h3 className="text-2xl font-bold mt-0.5">{loading ? '-' : activeUsers}</h3>
            </div>
          </div>

          <div className="bg-base-100 p-4 sm:p-5 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 transition-all duration-300 hover:shadow-lg">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-base-content/50 font-semibold uppercase">Super Admins</p>
              <h3 className="text-2xl font-bold mt-0.5">{loading ? '-' : superAdmins}</h3>
            </div>
          </div>

          <div className="bg-base-100 p-4 sm:p-5 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 transition-all duration-300 hover:shadow-lg">
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-500">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-base-content/50 font-semibold uppercase">Opérateurs Terrain</p>
              <h3 className="text-2xl font-bold mt-0.5">{loading ? '-' : technicians}</h3>
            </div>
          </div>
        </div>

        {/* Zone Principale de données */}
        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement des données utilisateurs...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-error mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-error">Une erreur est survenue</h3>
                <p className="text-sm text-base-content/70 mt-1">{error}</p>
                <button
                  onClick={() => setRefreshKey((prev) => prev + 1)}
                  className="btn btn-sm btn-outline border-error/40 hover:bg-rose-500 hover:border-transparent text-error font-semibold rounded-lg mt-4 transition-all"
                >
                  Réessayer
                </button>
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={utilisateurs}
              searchPlaceholder="Rechercher par nom, email..."
            />
          )}
        </div>

      </div>

      {/* ==========================================
          MODAL : Créer un utilisateur
          ========================================== */}
      {showCreateModal && (
        <div className="modal modal-open">
          <div className="modal-box relative bg-base-100 rounded-2xl shadow-2xl border border-base-200 max-w-md">
            <button onClick={() => setShowCreateModal(false)} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
              <UserPlus className="w-5 h-5 text-primary" />
              Nouvel Utilisateur
            </h3>
            {formError && (
              <div className="alert alert-error rounded-xl mb-4 py-2 text-sm">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Nom complet</span></label>
                <input
                  type="text" required placeholder="Jean Dupont"
                  className="input input-bordered rounded-xl w-full"
                  value={formData.nom}
                  onChange={e => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Adresse email</span></label>
                <input
                  type="email" required placeholder="jean@g-stock.pro"
                  className="input input-bordered rounded-xl w-full"
                  value={formData.adresse_email}
                  onChange={e => setFormData({ ...formData, adresse_email: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Mot de passe</span></label>
                <input
                  type="password" required placeholder="••••••••" minLength={6}
                  className="input input-bordered rounded-xl w-full"
                  value={formData.mot_de_passe}
                  onChange={e => setFormData({ ...formData, mot_de_passe: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Rôle</span></label>
                <select
                  className="select select-bordered rounded-xl w-full"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="consultant">Consultant</option>
                  <option value="technicien">Technicien</option>
                  <option value="magasinier">Magasinier</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-ghost rounded-xl">Annuler</button>
                <button type="submit" disabled={formLoading} className="btn btn-primary rounded-xl gap-2 shadow-lg shadow-primary/25">
                  {formLoading ? <span className="loading loading-spinner loading-sm"></span> : <UserPlus className="w-4 h-4" />}
                  Créer
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}></div>
        </div>
      )}

      {/* ==========================================
          MODAL : Modifier un utilisateur
          ========================================== */}
      {showEditModal && selectedUser && (
        <div className="modal modal-open">
          <div className="modal-box relative bg-base-100 rounded-2xl shadow-2xl border border-base-200 max-w-md">
            <button onClick={() => setShowEditModal(false)} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
              <Pencil className="w-5 h-5 text-sky-500" />
              Modifier l'utilisateur
            </h3>
            {formError && (
              <div className="alert alert-error rounded-xl mb-4 py-2 text-sm">
                <AlertCircle className="w-4 h-4" /> {formError}
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Nom complet</span></label>
                <input
                  type="text" required
                  className="input input-bordered rounded-xl w-full"
                  value={formData.nom}
                  onChange={e => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Adresse email</span></label>
                <input
                  type="email" required
                  className="input input-bordered rounded-xl w-full"
                  value={formData.adresse_email}
                  onChange={e => setFormData({ ...formData, adresse_email: e.target.value })}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text font-semibold">Rôle</span></label>
                <select
                  className="select select-bordered rounded-xl w-full"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="consultant">Consultant</option>
                  <option value="technicien">Technicien</option>
                  <option value="magasinier">Magasinier</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={formData.est_actif}
                    onChange={e => setFormData({ ...formData, est_actif: e.target.checked })}
                  />
                  <span className="label-text font-semibold flex items-center gap-2">
                    {formData.est_actif ? (
                      <><Eye className="w-4 h-4 text-emerald-500" /> Compte actif</>
                    ) : (
                      <><EyeOff className="w-4 h-4 text-rose-500" /> Compte inactif</>
                    )}
                  </span>
                </label>
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-ghost rounded-xl">Annuler</button>
                <button type="submit" disabled={formLoading} className="btn btn-primary rounded-xl gap-2 shadow-lg shadow-primary/25">
                  {formLoading ? <span className="loading loading-spinner loading-sm"></span> : <Pencil className="w-4 h-4" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowEditModal(false)}></div>
        </div>
      )}

      {/* ==========================================
          MODAL : Confirmer la suppression
          ========================================== */}
      {showDeleteModal && selectedUser && (
        <div className="modal modal-open">
          <div className="modal-box relative bg-base-100 rounded-2xl shadow-2xl border border-base-200 max-w-sm">
            <button onClick={() => setShowDeleteModal(false)} className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
              <X className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Supprimer l'utilisateur ?</h3>
                <p className="text-sm text-base-content/60 mt-1">
                  Êtes-vous sûr de vouloir supprimer <strong>{selectedUser.nom_complet}</strong> ? Cette action est irréversible.
                </p>
              </div>
              {formError && (
                <div className="alert alert-error rounded-xl py-2 text-sm w-full">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </div>
              )}
              <div className="flex gap-3 w-full mt-2">
                <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost rounded-xl flex-1">Annuler</button>
                <button onClick={handleDelete} disabled={formLoading} className="btn btn-error rounded-xl flex-1 gap-2">
                  {formLoading ? <span className="loading loading-spinner loading-sm"></span> : <Trash2 className="w-4 h-4" />}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}></div>
        </div>
      )}
    </div>
  );
}
