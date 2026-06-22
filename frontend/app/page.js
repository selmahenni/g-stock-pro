'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import usePermissions from '../hooks/usePermissions';
import StatusBadge from '../components/StatusBadge';
import { FluxChart, CategorieChart } from '../components/DashboardCharts';
import {
  ShieldCheck, Boxes, Wrench, ShoppingCart, DollarSign, Package, Layers,
  Building2, CalendarClock, AlertTriangle, ClipboardList, ArrowRight, RefreshCw,
  CheckCircle2, Monitor, Clock, XCircle,
} from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function PageAccueil() {
  const { role } = usePermissions();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    try { setUserName(localStorage.getItem('userName') || ''); } catch {}
  }, []);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${API}/dashboard/stats`, { credentials: 'include' });
      if (res.status === 401 || res.status === 403) { window.location.href = '/login'; return null; }
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      return res.json();
    },
  });

  const roleName = { super_admin: 'Super administrateur', magasinier: 'Magasinier', technicien: 'Technicien', consultant: 'Consultant' }[role] || 'Utilisateur';
  const k = data?.kpis || {};
  const fmt = (n) => (n ?? 0).toLocaleString('fr-FR');

  // KPI principaux
  const kpis = [
    { label: 'Stock total', value: fmt(k.stock_total), icon: Boxes, color: 'primary', href: '/inventaire' },
    { label: 'Actifs en maintenance', value: fmt(k.actifs_en_maintenance), icon: Wrench, color: 'warning', href: '/maintenances' },
    { label: 'Alertes achat', value: fmt(k.alertes_achat), icon: ShoppingCart, color: 'error', href: '/inventaire' },
    { label: 'Valeur du parc', value: `${fmt(k.valeur_parc)} DA`, icon: DollarSign, color: 'success', href: '/actifs' },
  ];
  // Tonalités sémantiques DaisyUI → s'adaptent au thème (clair / sombre)
  const colorCls = {
    primary: { icon: 'bg-primary/10 text-primary', bar: 'bg-primary' },
    warning: { icon: 'bg-warning/10 text-warning', bar: 'bg-warning' },
    error:   { icon: 'bg-error/10 text-error',     bar: 'bg-error' },
    success: { icon: 'bg-success/10 text-success', bar: 'bg-success' },
  };

  const secondaires = [
    { label: 'Produits', value: k.produits_total, icon: Package, href: '/produits' },
    { label: 'Actifs', value: k.actifs_total, icon: Layers, href: '/actifs' },
    { label: 'Entrepôts', value: k.entrepots_total, icon: Building2, href: '/entrepots' },
    { label: 'Préventives dues', value: k.preventives_dues, icon: CalendarClock, href: '/maintenances' },
    { label: 'Tickets en cours', value: k.tickets_en_cours, icon: ClipboardList, href: '/maintenances' },
  ];

  const statutMeta = {
    en_stock:    { label: 'En stock',    icon: CheckCircle2, bar: 'bg-success' },
    affecte:     { label: 'Affecté',     icon: Monitor,      bar: 'bg-info' },
    maintenance: { label: 'Maintenance', icon: Clock,        bar: 'bg-warning' },
    rebut:       { label: 'Rebut',       icon: XCircle,      bar: 'bg-error' },
  };
  const repartition = data?.actifs_par_statut || [];
  const totalActifsRep = repartition.reduce((s, r) => s + Number(r.total), 0) || 1;

  return (
    <main className="min-h-screen bg-base-200 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* En-tête */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-base-200 pb-6">
          <div>
            <p className="text-sm font-medium text-base-content/50">Tableau de bord</p>
            <h1 className="text-3xl font-bold tracking-tight text-base-content mt-1">
              Bonjour, {userName || 'Utilisateur'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-base-200/70 text-sm font-semibold text-base-content/70">
              <ShieldCheck className="w-4 h-4 text-primary" /> {roleName}
            </span>
            <button onClick={() => refetch()} disabled={isFetching} className="btn btn-outline btn-primary btn-sm rounded-xl gap-2">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Actualiser
            </button>
          </div>
        </section>

        {isError ? (
          <div className="rounded-2xl border border-error/25 bg-error/5 p-5 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-error mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-error">Erreur de chargement</h3>
              <p className="text-sm text-base-content/70 mt-1">{error?.message}</p>
              <button onClick={() => refetch()} className="btn btn-sm btn-outline btn-error rounded-lg mt-4">Réessayer</button>
            </div>
          </div>
        ) : (
          <>
            {/* KPI principaux */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const c = colorCls[kpi.color];
                return (
                  <Link key={kpi.label} href={kpi.href} className="relative overflow-hidden bg-base-100 p-5 rounded-2xl border border-base-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/30 transition-all group">
                    <span className={`absolute inset-x-0 top-0 h-1 ${c.bar}`} />
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl ${c.icon}`}><Icon className="w-6 h-6" /></div>
                      <ArrowRight className="w-4 h-4 text-base-content/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-xs text-base-content/50 font-semibold uppercase mt-4">{kpi.label}</p>
                    <h3 className="text-2xl font-bold mt-0.5 tabular-nums">
                      {isLoading ? <span className="inline-block h-7 w-20 rounded bg-base-200 animate-pulse align-middle" /> : kpi.value}
                    </h3>
                  </Link>
                );
              })}
            </section>

            {/* KPI secondaires */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {secondaires.map((s) => {
                const Icon = s.icon;
                return (
                  <Link key={s.label} href={s.href} className="bg-base-100 p-4 rounded-2xl border border-base-200 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-base-200 text-base-content/70"><Icon className="w-4 h-4" /></div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-base-content/50 font-semibold uppercase truncate">{s.label}</p>
                      <p className="text-xl font-bold tabular-nums">{isFetching && !data ? '—' : fmt(s.value)}</p>
                    </div>
                  </Link>
                );
              })}
            </section>

            {/* Graphiques analytiques (chart.js) */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <FluxChart flux={data?.flux_mensuel || []} loading={isLoading} />
              </div>
              <div className="lg:col-span-1">
                <CategorieChart categories={data?.actifs_par_categorie || []} loading={isLoading} />
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alertes d'achat */}
              <section className="bg-base-100 rounded-2xl border border-base-200 shadow-md overflow-hidden">
                <div className="px-5 py-4 border-b border-base-200 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-error" />
                  <h2 className="font-bold">Alertes d'achat</h2>
                  <span className="text-xs font-medium text-base-content/50 ml-auto">stock sous le seuil critique</span>
                </div>
                {(data?.alertes_achat?.length || 0) === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <div className="p-3 bg-success/10 rounded-full text-success"><CheckCircle2 className="w-6 h-6" /></div>
                    <p className="text-sm font-semibold text-base-content/70">Aucune alerte</p>
                    <p className="text-xs text-base-content/50">Tous les stocks sont au-dessus du seuil.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-base-200">
                    {data.alertes_achat.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-base-200/40 transition-colors">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{a.produit_libelle || '—'}</p>
                          <p className="text-xs text-base-content/50">{a.entrepot_nom || '—'}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-lg border font-semibold text-xs px-2.5 py-1 bg-error/10 text-error border-error/25 shrink-0 tabular-nums">
                          <AlertTriangle className="w-3 h-3" /> {a.quantite} / {a.stock_critique}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Répartition des actifs + derniers tickets */}
              <section className="space-y-6">
                <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md p-5">
                  <h2 className="font-bold mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> Répartition des actifs</h2>
                  {repartition.length === 0 ? (
                    <p className="text-sm text-base-content/50">Aucun actif.</p>
                  ) : (
                    <div className="space-y-3">
                      {repartition.map((r) => {
                        const m = statutMeta[r.statut] || { label: r.statut, bar: 'bg-base-300' };
                        const pct = Math.round((Number(r.total) / totalActifsRep) * 100);
                        return (
                          <div key={r.statut}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium">{m.label}</span>
                              <span className="tabular-nums text-base-content/60">{r.total} ({pct}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-base-200 overflow-hidden">
                              <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md overflow-hidden">
                  <div className="px-5 py-4 border-b border-base-200 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h2 className="font-bold">Derniers tickets de maintenance</h2>
                  </div>
                  {(data?.derniers_tickets?.length || 0) === 0 ? (
                    <p className="text-sm text-base-content/50 px-5 py-6">Aucun ticket.</p>
                  ) : (
                    <ul className="divide-y divide-base-200">
                      {data.derniers_tickets.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-semibold truncate">{t.numero_serie || '—'}</p>
                            <p className="text-xs text-base-content/50">{t.type_maintenance} · {t.date_intervention ? new Date(t.date_intervention).toLocaleDateString('fr-FR') : '—'}</p>
                          </div>
                          <StatusBadge status={t.statut} className="shrink-0" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
