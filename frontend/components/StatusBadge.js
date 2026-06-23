'use client';

import React from 'react';
import {
  CheckCircle2, Monitor, Wrench, XCircle, Clock, CalendarClock, Ban,
  ShieldCheck, ShieldOff, AlertTriangle, ShieldAlert, PackageCheck, PackageX,
  ArrowDownCircle, ArrowUpCircle, ArrowRightLeft,
} from 'lucide-react';

/**
 * @component StatusBadge
 * @description Badge de statut unifié pour toute l'application (couleurs, formes et
 * icônes cohérentes). On peut soit passer un `status` métier connu (résolu via PRESETS),
 * soit fournir manuellement `label` / `tone` / `icon`.
 *
 * @param {string} [status]  - Clé métier (ex: 'en_stock', 'en_cours'…), résolue par PRESETS.
 * @param {string} [label]   - Texte affiché (sinon dérivé du preset).
 * @param {string} [tone]    - Tonalité de couleur ('success'|'warning'|'error'|'info'|'primary'|'neutral').
 * @param {React.ComponentType} [icon] - Icône lucide (sinon celle du preset).
 * @param {'sm'|'md'} [size='sm']
 * @param {string} [className]
 */

// Palette des tonalités — basée sur les couleurs SÉMANTIQUES DaisyUI : elles
// s'adaptent automatiquement au thème (clair « gstock » et mode sombre).
const TONES = {
  success: 'text-success bg-success/10 border-success/25',
  warning: 'text-warning bg-warning/10 border-warning/25',
  error:   'text-error bg-error/10 border-error/25',
  info:    'text-info bg-info/10 border-info/25',
  primary: 'text-primary bg-primary/10 border-primary/20',
  neutral: 'text-base-content/70 bg-base-200 border-base-300',
};

// Dictionnaire des statuts métier → { label, tone, icon }
const PRESETS = {
  // Statut d'un actif
  en_stock:    { label: 'En stock',    tone: 'success', icon: CheckCircle2 },
  affecte:     { label: 'Affecté',     tone: 'info',    icon: Monitor },
  maintenance: { label: 'Maintenance', tone: 'warning', icon: Wrench },
  rebut:       { label: 'Rebut',       tone: 'error',   icon: XCircle },
  // Niveau de stock
  rupture:        { label: 'Rupture',        tone: 'error',   icon: PackageX },
  sous_seuil:     { label: 'Sous seuil',     tone: 'error',   icon: AlertTriangle },
  seuil_critique: { label: 'Seuil critique', tone: 'warning', icon: AlertTriangle },
  ok:             { label: 'OK',             tone: 'success', icon: PackageCheck },
  // Statut d'un ticket de maintenance
  planifie:    { label: 'Planifié',    tone: 'info',    icon: CalendarClock },
  en_cours:    { label: 'En cours',    tone: 'warning', icon: Clock },
  termine:     { label: 'Terminé',     tone: 'success', icon: CheckCircle2 },
  annule:      { label: 'Annulé',      tone: 'neutral', icon: Ban },
  // Type de maintenance
  preventif:   { label: 'Préventif',   tone: 'info',    icon: CalendarClock },
  curatif:     { label: 'Curatif',     tone: 'warning', icon: Wrench },
  // Compte utilisateur
  actif:       { label: 'Actif',       tone: 'success', icon: ShieldCheck },
  inactif:     { label: 'Inactif',     tone: 'error',   icon: ShieldOff },
};

export default function StatusBadge({ status, label, tone, icon: IconProp, size = 'sm', className = '' }) {
  const preset = status != null ? PRESETS[String(status)] : null;
  const t = tone || preset?.tone || 'neutral';
  const Icon = IconProp !== undefined ? IconProp : preset?.icon || null;
  const text = label ?? preset?.label ?? (status != null ? String(status) : '');
  const sizeCls = size === 'md' ? 'text-sm px-3 py-1.5 gap-1.5' : 'text-xs px-2.5 py-1 gap-1';

  return (
    <span className={`inline-flex items-center rounded-lg border font-semibold whitespace-nowrap transition-all duration-150 hover:shadow-sm hover:brightness-[0.98] ${TONES[t] || TONES.neutral} ${sizeCls} ${className}`}>
      {Icon && <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      {text}
    </span>
  );
}

/** Badge booléen Actif / Inactif (comptes utilisateurs). */
export function ActiveBadge({ active, size = 'sm' }) {
  return active
    ? <StatusBadge label="Actif" tone="success" icon={ShieldCheck} size={size} />
    : <StatusBadge label="Inactif" tone="error" icon={ShieldOff} size={size} />;
}

/** Badge d'alerte de seuil de stock (Sous seuil / OK). */
export function StockAlertBadge({ enAlerte, size = 'sm' }) {
  return enAlerte
    ? <StatusBadge label="Sous seuil" tone="error" icon={AlertTriangle} size={size} />
    : <StatusBadge label="OK" tone="success" icon={PackageCheck} size={size} />;
}

// Rôles RBAC → libellé + tonalité (couleurs distinctes et cohérentes).
const ROLE_PRESET = {
  super_admin: { label: 'Super Admin', tone: 'error' },
  magasinier:  { label: 'Magasinier',  tone: 'warning' },
  technicien:  { label: 'Technicien',  tone: 'info' },
  consultant:  { label: 'Consultant',  tone: 'success' },
};

/** Badge de rôle utilisateur (Super Admin / Magasinier / Technicien / Consultant). */
export function RoleBadge({ role, size = 'sm' }) {
  const p = ROLE_PRESET[role] || { label: role || '—', tone: 'neutral' };
  return <StatusBadge label={p.label} tone={p.tone} icon={null} size={size} />;
}

/** Badge de type de mouvement (Entrée / Sortie / Transfert). */
export function MovementBadge({ type, size = 'sm' }) {
  if (type === 'sortie') return <StatusBadge label="Sortie" tone="error" icon={ArrowUpCircle} size={size} />;
  if (type === 'transfert') return <StatusBadge label="Transfert" tone="info" icon={ArrowRightLeft} size={size} />;
  return <StatusBadge label="Entrée" tone="success" icon={ArrowDownCircle} size={size} />;
}

export { ShieldAlert };
