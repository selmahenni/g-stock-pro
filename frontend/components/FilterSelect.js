'use client';

import React from 'react';
import { Filter } from 'lucide-react';

/**
 * @component FilterSelect
 * @description Petit sélecteur de filtre réutilisable (avec option « Tous »).
 * @param {string}   value    - Valeur courante ('' = tous).
 * @param {Function} onChange - Reçoit la nouvelle valeur.
 * @param {Array}    options  - [{ value, label }].
 * @param {string}   [allLabel='Tous']
 * @param {string}   [title]  - Libellé accessible / infobulle.
 */
export default function FilterSelect({ value, onChange, options, allLabel = 'Tous', title }) {
  return (
    <div className="relative">
      <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40 pointer-events-none" />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        title={title}
        className={`select select-bordered select-sm rounded-lg pl-8 focus:outline-none focus:ring-2 focus:ring-primary/20 ${value ? 'border-primary/40 text-primary font-semibold' : ''}`}
      >
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
