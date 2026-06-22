'use client';

import React, { useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { BarChart3, PieChart } from 'lucide-react';

// Enregistrement unique des éléments Chart.js utilisés (bar + doughnut).
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// Palette cohérente avec le thème (indigo / emerald / amber / rose / cyan / violet…).
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6', '#ec4899', '#84cc16', '#f97316', '#14b8a6'];

/** 'YYYY-MM' → 'juin 2026' (libellé FR, année en entier pour éviter toute ambiguïté avec un jour). */
function moisLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

/** Squelette de chargement réutilisable pour un graphique. */
function ChartSkeleton() {
  return (
    <div className="h-64 w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-base-content/40">
        <span className="loading loading-spinner loading-md text-primary"></span>
        <span className="text-sm font-medium animate-pulse">Chargement du graphique…</span>
      </div>
    </div>
  );
}

function ChartEmpty({ message }) {
  return (
    <div className="h-64 w-full flex items-center justify-center">
      <p className="text-sm text-base-content/50">{message}</p>
    </div>
  );
}

/**
 * Histogramme comparatif Entrées vs Sorties sur les 12 derniers mois.
 * @param {Array} flux - [{ mois:'YYYY-MM', entrees:int, sorties:int }]
 * @param {boolean} loading
 */
export function FluxChart({ flux = [], loading = false }) {
  const { chartData, options } = useMemo(() => {
    const labels = flux.map((f) => moisLabel(f.mois));
    return {
      chartData: {
        labels,
        datasets: [
          {
            label: 'Entrées',
            data: flux.map((f) => Number(f.entrees) || 0),
            backgroundColor: '#10b981',
            borderRadius: 6,
            maxBarThickness: 22,
          },
          {
            label: 'Sorties',
            data: flux.map((f) => Number(f.sorties) || 0),
            backgroundColor: '#f43f5e',
            borderRadius: 6,
            maxBarThickness: 22,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 16 } },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
      },
    };
  }, [flux]);

  return (
    <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h2 className="font-bold">Flux de mouvements</h2>
        <span className="text-xs font-medium text-base-content/50 ml-auto">entrées vs sorties · 12 derniers mois</span>
      </div>
      <div className="h-64">
        {loading ? <ChartSkeleton /> : flux.length === 0 ? <ChartEmpty message="Aucun mouvement enregistré." /> : <Bar data={chartData} options={options} />}
      </div>
    </div>
  );
}

/**
 * Donut de répartition des actifs par catégorie de produit.
 * @param {Array} categories - [{ categorie:string, total:int }]
 * @param {boolean} loading
 */
export function CategorieChart({ categories = [], loading = false }) {
  const total = categories.reduce((s, c) => s + Number(c.total), 0);
  const { chartData, options } = useMemo(() => ({
    chartData: {
      labels: categories.map((c) => c.categorie),
      datasets: [
        {
          data: categories.map((c) => Number(c.total) || 0),
          backgroundColor: categories.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 14, font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed;
              const pct = total ? Math.round((v / total) * 100) : 0;
              return ` ${ctx.label} : ${v} (${pct}%)`;
            },
          },
        },
      },
    },
  }), [categories, total]);

  return (
    <div className="bg-base-100 rounded-2xl border border-base-200 shadow-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-4 h-4 text-primary" />
        <h2 className="font-bold">Actifs par catégorie</h2>
        <span className="text-xs font-medium text-base-content/50 ml-auto">{total} actif{total > 1 ? 's' : ''}</span>
      </div>
      <div className="h-64">
        {loading ? <ChartSkeleton /> : categories.length === 0 ? <ChartEmpty message="Aucun actif catégorisé." /> : <Doughnut data={chartData} options={options} />}
      </div>
    </div>
  );
}
