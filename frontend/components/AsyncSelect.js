'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Filter, X, Search } from 'lucide-react';

/**
 * @component AsyncSelect
 * @description Filtre/sélecteur dont les options sont chargées DEPUIS LE SERVEUR à la frappe
 * (recherche), sans jamais tout charger d'avance. Idéal pour des listes longues (produits…).
 *
 * @param {string|number} value        - Valeur sélectionnée ('' = aucune).
 * @param {string}        selectedLabel - Libellé de la valeur sélectionnée (affiché).
 * @param {Function}      onChange      - (value, label) lors d'une sélection (ou ('','') pour réinitialiser).
 * @param {Function}      fetchOptions  - async (search) => [{ value, label }] (limité côté serveur).
 * @param {string}        [allLabel='Tous']
 * @param {string}        [placeholder='Rechercher…']
 */
export default function AsyncSelect({ value, selectedLabel, onChange, fetchOptions, allLabel = 'Tous', placeholder = 'Rechercher…' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  // Fermeture au clic extérieur
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Recherche serveur débouncée (uniquement quand le menu est ouvert)
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const opts = await fetchOptions(query).catch(() => []);
      if (active) { setOptions(opts || []); setLoading(false); }
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [query, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choisir = (val, label) => { onChange(val, label); setOpen(false); setQuery(''); };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`select select-bordered select-sm rounded-lg pl-8 pr-8 flex items-center min-w-[190px] max-w-[230px] ${value ? 'border-primary/40 text-primary font-semibold' : ''}`}
      >
        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40 pointer-events-none" />
        <span className="truncate">{value ? (selectedLabel || '…') : allLabel}</span>
        {value ? (
          <X
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-base-content/40 hover:text-error"
            onClick={(e) => { e.stopPropagation(); choisir('', ''); }}
          />
        ) : null}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-72 bg-base-100 border border-base-300 rounded-xl shadow-xl p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="input input-bordered input-sm rounded-lg w-full pl-8"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            <button type="button" onClick={() => choisir('', '')} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-base-200">
              {allLabel}
            </button>
            {loading ? (
              <p className="text-xs text-base-content/50 px-3 py-3 text-center">Recherche…</p>
            ) : options.length === 0 ? (
              <p className="text-xs text-base-content/50 px-3 py-3 text-center">{query ? 'Aucun résultat' : 'Tapez pour rechercher'}</p>
            ) : options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => choisir(o.value, o.label)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-base-200 ${String(o.value) === String(value) ? 'bg-primary/10 text-primary font-semibold' : ''}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
