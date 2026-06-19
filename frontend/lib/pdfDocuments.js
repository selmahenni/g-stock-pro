// lib/pdfDocuments.js
// Génération de documents PDF professionnels (impression / archivage).
// jsPDF est importé dynamiquement → pas d'impact sur le bundle initial.

const PRIMARY = [100, 25, 230]; // ~ #6419e6 (couleur primaire G-Stock Pro)
const DARK = [40, 40, 50];
const GREY = [120, 120, 130];

const fmtDate = (d, withTime = false) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

/** En-tête commun : bandeau coloré + identité + cartouche titre/numéro. */
function entete(doc, { titre, numero }) {
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, 210, 30, 'F');

  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('G-STOCK PRO', 14, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Gestion de parc informatique & stock', 14, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(titre, 196, 16, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`N° ${numero ?? '—'}`, 196, 23, { align: 'right' });
}

/** Pied de page commun. */
function pied(doc) {
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(14, 282, 196, 282);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text(`Document généré le ${fmtDate(new Date(), true)} — G-Stock Pro`, 14, 287);
  doc.text('Page 1/1', 196, 287, { align: 'right' });
}

/** Bloc de lignes "label : valeur". */
function fiche(doc, y, lignes) {
  doc.setFontSize(11);
  lignes.forEach(([label, valeur]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(valeur ?? '—'), 72, y);
    y += 9;
  });
  return y;
}

/** Cadre de texte libre (notes / rapport). */
function cadreTexte(doc, y, titre, contenu, hauteur = 40) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.text(titre, 14, y);
  y += 3;
  doc.setDrawColor(210);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, hauteur, 2, 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  const lignes = doc.splitTextToSize(contenu && String(contenu).trim() ? String(contenu) : '—', 176);
  doc.text(lignes, 17, y + 7);
  return y + hauteur + 8;
}

/** Zone de signatures. */
function signatures(doc, gauche, droite) {
  const y = 255;
  doc.setDrawColor(...DARK);
  doc.setLineWidth(0.3);
  doc.line(22, y, 86, y);
  doc.line(124, y, 188, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(gauche, 30, y + 6);
  doc.text(droite, 138, y + 6);
}

/**
 * Bon de sortie / d'entrée (module Mouvements).
 * @param {Object} m - mouvement { id, type_mouvement, numero_serie, produit_libelle, entrepot_nom, effectue_par_nom, notes, cree_le }
 */
export async function genererBonDeSortie(m) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const estSortie = m.type_mouvement === 'sortie';
  const titre = estSortie ? 'BON DE SORTIE' : "BON D'ENTRÉE";

  entete(doc, { titre, numero: m.id });

  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(estSortie ? 'Sortie de stock' : 'Entrée en stock', 14, y);
  y += 10;

  y = fiche(doc, y, [
    ['Date', fmtDate(m.cree_le, true)],
    ['Type de mouvement', estSortie ? 'Sortie' : 'Entrée'],
    ['Actif (N° série)', m.numero_serie],
    ['Produit', m.produit_libelle],
    ['Entrepôt', m.entrepot_nom],
    ['Quantité', '1'],
    ['Effectué par', m.effectue_par_nom],
  ]);

  y += 4;
  cadreTexte(doc, y, 'Notes / Motif', m.notes, 34);

  signatures(doc, 'Responsable magasin', estSortie ? 'Bénéficiaire' : 'Réceptionnaire');
  pied(doc);

  doc.save(`bon-${estSortie ? 'sortie' : 'entree'}-${m.id}.pdf`);
}

/**
 * Rapport de maintenance (module Maintenance).
 * @param {Object} t - ticket { id, type_maintenance, statut, date_intervention, actif_serie, produit_libelle, technicien_nom, cout, rapport }
 */
export async function genererRapportMaintenance(t) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  entete(doc, { titre: 'RAPPORT DE MAINTENANCE', numero: t.id });

  const typeLabel = t.type_maintenance === 'curatif' ? 'Curatif (réparation)' : 'Préventif (planifié)';
  const statutLabel = { planifie: 'Planifié', en_cours: 'En cours', termine: 'Terminé', annule: 'Annulé' }[t.statut] || t.statut;

  let y = 46;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(`Intervention ${typeLabel}`, 14, y);
  y += 10;

  y = fiche(doc, y, [
    ["Date d'intervention", fmtDate(t.date_intervention)],
    ['Type', typeLabel],
    ['Statut', statutLabel],
    ['Actif (N° série)', t.actif_serie],
    ['Produit', t.produit_libelle],
    ['Technicien', t.technicien_nom],
    ['Coût', t.cout != null ? `${Number(t.cout).toLocaleString('fr-FR')} DA` : '—'],
  ]);

  y += 4;
  cadreTexte(doc, y, "Rapport d'intervention", t.rapport, 60);

  signatures(doc, 'Technicien', 'Responsable');
  pied(doc);

  doc.save(`rapport-maintenance-${t.id}.pdf`);
}
