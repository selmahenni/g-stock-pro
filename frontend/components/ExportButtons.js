'use client';

import React, { useState } from 'react';
import { FileText, FileSpreadsheet, Download } from 'lucide-react';

/**
 * @component ExportButtons
 * @description Boutons « Exporter en PDF » et « Exporter en Excel » pour une table.
 * Récupère l'intégralité des données via `fetchRows` (pas seulement la page affichée),
 * puis génère le fichier côté client. Les bibliothèques (jspdf, xlsx) sont chargées
 * dynamiquement au clic (code-splitting → bundle initial allégé).
 *
 * @param {string}   filename   - Nom de base du fichier (sans extension).
 * @param {string}   [title]    - Titre affiché en tête du PDF.
 * @param {Array}    columns    - [{ header, accessor }] ; accessor = clé ou (row)=>valeur.
 * @param {Function} fetchRows  - async () => Array : toutes les lignes à exporter.
 * @param {Array}    [formats]  - Boutons à afficher : ['excel'], ['pdf'] ou les deux. Défaut ['excel','pdf'].
 */
export default function ExportButtons({ filename = 'export', title, columns = [], fetchRows, formats = ['excel', 'pdf'] }) {
  const [busy, setBusy] = useState(null); // 'pdf' | 'xlsx' | null

  const buildMatrix = (rows) => {
    const headers = columns.map((c) => c.header);
    const body = rows.map((r) =>
      columns.map((c) => {
        const v = typeof c.accessor === 'function' ? c.accessor(r) : r[c.accessor];
        return v == null ? '' : v;
      })
    );
    return { headers, body };
  };

  const exportPDF = async () => {
    setBusy('pdf');
    try {
      const rows = await fetchRows();
      const { headers, body } = buildMatrix(rows);
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text(title || filename, 14, 14);
      doc.setFontSize(9);
      doc.text(`Généré le ${new Date().toLocaleString('fr-FR')} — ${rows.length} ligne(s)`, 14, 20);
      autoTable(doc, {
        head: [headers],
        body,
        startY: 25,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 25, 230], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 243, 255] },
      });
      doc.save(`${filename}.pdf`);
    } catch (e) {
      alert('Export PDF échoué : ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  const exportExcel = async () => {
    setBusy('xlsx');
    try {
      const rows = await fetchRows();
      const { headers, body } = buildMatrix(rows);
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Export');
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (e) {
      alert('Export Excel échoué : ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {formats.includes('pdf') && (
        <button
          onClick={exportPDF}
          disabled={!!busy}
          className="btn btn-sm rounded-xl gap-2 bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20"
          title="Exporter en PDF"
        >
          {busy === 'pdf' ? <span className="loading loading-spinner loading-xs"></span> : <FileText className="w-4 h-4" />}
          <span className="hidden sm:inline">PDF</span>
        </button>
      )}
      {formats.includes('excel') && (
        <button
          onClick={exportExcel}
          disabled={!!busy}
          className="btn btn-sm rounded-xl gap-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20"
          title="Exporter en Excel"
        >
          {busy === 'xlsx' ? <span className="loading loading-spinner loading-xs"></span> : <FileSpreadsheet className="w-4 h-4" />}
          <span className="hidden sm:inline">Excel</span>
        </button>
      )}
    </div>
  );
}
