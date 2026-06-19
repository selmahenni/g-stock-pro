'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Package, ArrowLeft, RefreshCw, AlertCircle, Image as ImageIcon,
  Tag, Building2, Wrench, Layers, CheckCircle2, Monitor, Clock, XCircle,
  DollarSign, Hash,
} from 'lucide-react';

/**
 * @component FicheProduit
 * @description Fiche détaillée d'un produit : informations catalogue, image,
 * et inventaire des actifs physiques rattachés (avec valeur et statuts).
 */
export default function FicheProduit() {
  const { id } = useParams();
  const [produit, setProduit] = useState(null);
  const [actifs, setActifs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [prodRes, actifsRes, catRes, fournRes] = await Promise.all([
          fetch(`http://localhost:5000/api/produits/${id}`, { credentials: 'include' }),
          fetch('http://localhost:5000/api/actifs?limit=500', { credentials: 'include' }),
          fetch('http://localhost:5000/api/categories?limit=500', { credentials: 'include' }),
          fetch('http://localhost:5000/api/fournisseurs?limit=500', { credentials: 'include' }),
        ]);

        if (prodRes.status === 401 || prodRes.status === 403) { window.location.href = '/login'; return; }
        if (!prodRes.ok) throw new Error(prodRes.status === 404 ? 'Produit introuvable.' : `Erreur serveur (${prodRes.status})`);

        const prod = await prodRes.json();
        const actifsData = actifsRes.ok ? await actifsRes.json() : { actifs: [] };
        const catData = catRes.ok ? await catRes.json() : { categories: [] };
        const fournData = fournRes.ok ? await fournRes.json() : { fournisseurs: [] };

        if (cancelled) return;
        setProduit(prod);
        setActifs((actifsData.actifs || []).filter(a => String(a.produit_id) === String(id)));
        setCategories(catData.categories || []);
        setFournisseurs(fournData.fournisseurs || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [id, refreshKey]);

  const categorieNom = produit && categories.find(c => c.id === produit.categorie_id)?.nom;
  const fournisseurNom = produit && fournisseurs.find(f => f.id === produit.fournisseur_id)?.nom;

  // Agrégats sur les actifs rattachés
  const nbActifs = actifs.length;
  const enStock = actifs.filter(a => a.statut === 'en_stock').length;
  const valeurTotale = actifs.reduce((s, a) => s + (parseFloat(a.prix_unitaire) || 0), 0);

  const statutBadge = (statut) => {
    const map = {
      en_stock:       { label: 'En stock',       cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CheckCircle2 },
      deploye:        { label: 'Déployé',        cls: 'bg-sky-500/10 text-sky-600 border-sky-500/20',             icon: Monitor },
      affecte:        { label: 'Affecté',        cls: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',    icon: Monitor },
      en_maintenance: { label: 'En maintenance', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20',      icon: Clock },
      reforme:        { label: 'Réformé',        cls: 'bg-rose-500/10 text-rose-600 border-rose-500/20',          icon: XCircle },
    };
    const s = map[statut] || { label: statut || '—', cls: 'badge-ghost', icon: null };
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 badge badge-sm py-2 px-2.5 rounded-lg font-semibold border ${s.cls}`}>
        {Icon && <Icon className="w-3 h-3" />} {s.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-100 to-base-200/50 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Barre de navigation retour */}
        <div className="flex items-center justify-between gap-4">
          <Link href="/produits" className="btn btn-ghost btn-sm rounded-xl gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour au catalogue
          </Link>
          <button onClick={() => setRefreshKey(p => p + 1)} disabled={loading} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2 hover:scale-105 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-base-100 rounded-2xl shadow-xl border border-base-200">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm text-base-content/60 font-medium animate-pulse">Chargement de la fiche produit...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error shadow-lg rounded-2xl border border-rose-500/25 p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-rose-800">Erreur</h3>
              <p className="text-sm text-rose-700/80 mt-1">{error}</p>
              <Link href="/produits" className="btn btn-sm btn-outline border-rose-500/30 text-rose-800 font-semibold rounded-lg mt-4">Retour au catalogue</Link>
            </div>
          </div>
        ) : produit && (
          <>
            {/* En-tête produit */}
            <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md p-6 flex flex-col sm:flex-row gap-6">
              <div className="w-full sm:w-44 h-44 rounded-2xl bg-base-200 border border-base-200 overflow-hidden shrink-0 flex items-center justify-center">
                {produit.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={produit.image_url} alt={produit.libelle} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-base-content/20" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono text-base-content/50">
                  <Hash className="w-3.5 h-3.5" /> {produit.sku || `Produit #${produit.id}`}
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mt-1">
                  {produit.libelle}
                </h1>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 badge py-3 px-3 rounded-lg bg-primary/10 text-primary border border-primary/20 font-semibold">
                    <Tag className="w-3.5 h-3.5" /> {categorieNom || 'Sans catégorie'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 badge py-3 px-3 rounded-lg bg-secondary/10 text-secondary border border-secondary/20 font-semibold">
                    <Building2 className="w-3.5 h-3.5" /> {fournisseurNom || 'Sans fournisseur'}
                  </span>
                  {produit.est_maintenable && (() => {
                    const valeur = produit.intervalle_valeur ?? produit.intervalle_maintenance_jours;
                    const labelUnite = { minute: 'min', heure: 'h', jour: 'j', mois: 'mois', annee: 'an' }[produit.intervalle_unite || 'jour'] || 'j';
                    return (
                      <span className="inline-flex items-center gap-1.5 badge py-3 px-3 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/20 font-semibold">
                        <Wrench className="w-3.5 h-3.5" />
                        {valeur ? `Préventive · tous les ${valeur} ${labelUnite}` : 'Curative (à la demande)'}
                      </span>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                  <div>
                    <p className="text-xs text-base-content/50 font-semibold uppercase">Stock minimum</p>
                    <p className="text-lg font-bold mt-0.5">{produit.stock_minimum ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 font-semibold uppercase">Seuil critique</p>
                    <p className="text-lg font-bold mt-0.5">{produit.stock_critique ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-base-content/50 font-semibold uppercase">Ajouté le</p>
                    <p className="text-lg font-bold mt-0.5">
                      {produit.cree_le ? new Date(produit.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiques inventaire */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl text-primary"><Layers className="w-6 h-6" /></div>
                <div><p className="text-xs text-base-content/50 font-semibold uppercase">Actifs rattachés</p><h3 className="text-2xl font-bold mt-0.5">{nbActifs}</h3></div>
              </div>
              <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><CheckCircle2 className="w-6 h-6" /></div>
                <div><p className="text-xs text-base-content/50 font-semibold uppercase">En stock</p><h3 className="text-2xl font-bold mt-0.5">{enStock}</h3></div>
              </div>
              <div className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-md flex items-center gap-4 col-span-2 lg:col-span-1">
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500"><DollarSign className="w-6 h-6" /></div>
                <div><p className="text-xs text-base-content/50 font-semibold uppercase">Valeur du parc</p><h3 className="text-2xl font-bold mt-0.5">{valeurTotale.toLocaleString('fr-FR')} DA</h3></div>
              </div>
            </div>

            {/* Inventaire des actifs */}
            <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md overflow-hidden">
              <div className="px-5 py-4 border-b border-base-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-base-content">Inventaire physique</h2>
                <span className="text-xs font-medium text-base-content/50 ml-auto">{nbActifs} actif{nbActifs > 1 ? 's' : ''}</span>
              </div>

              {nbActifs === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                  <div className="p-3 bg-base-200 rounded-full text-base-content/40"><Package className="w-6 h-6" /></div>
                  <p className="text-sm font-semibold text-base-content/70">Aucun actif rattaché</p>
                  <p className="text-xs text-base-content/50">Ce produit n'a pas encore d'unité physique enregistrée.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-md w-full">
                    <thead>
                      <tr className="bg-base-200/40 text-base-content/80 text-xs uppercase tracking-wider">
                        <th className="py-3 px-5 text-left">N° Série</th>
                        <th className="py-3 px-5 text-left">Entrepôt</th>
                        <th className="py-3 px-5 text-left">Emplacement</th>
                        <th className="py-3 px-5 text-left">Prix (DA)</th>
                        <th className="py-3 px-5 text-left">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actifs.map(a => (
                        <tr key={a.id} className="border-b border-base-200/60 hover:bg-base-200/30 transition-colors">
                          <td className="py-3 px-5 font-mono text-sm font-semibold">{a.numero_serie}</td>
                          <td className="py-3 px-5 text-sm">{a.entrepot_nom || '—'}</td>
                          <td className="py-3 px-5 text-sm text-base-content/70">{a.emplacement || '—'}</td>
                          <td className="py-3 px-5 text-sm font-semibold">
                            {(() => { const v = parseFloat(a.prix_unitaire); return isNaN(v) ? '—' : `${v.toLocaleString('fr-FR')} DA`; })()}
                          </td>
                          <td className="py-3 px-5">{statutBadge(a.statut)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
