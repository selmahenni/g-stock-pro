'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, Keyboard } from 'lucide-react';

/**
 * @component CameraReader
 * @description Cœur de lecture caméra (QR / code-barres), sans habillage de modale.
 * Réutilisé par QrScanner (scan unique) et AuditSession (scan continu).
 * Robuste : repli sur la 1re caméra si « environment » indisponible (PC), arrêt sécurisé
 * (attend la fin du démarrage avant stop), id unique par instance, + saisie manuelle de secours.
 *
 * @param {Function} onResult            - Appelé avec le texte décodé / saisi.
 * @param {boolean}  [continuous=false]  - true : émet chaque code (dédoublonné) sans s'arrêter.
 * @param {string}   [regionId]          - Préfixe d'id du conteneur vidéo.
 */
export default function CameraReader({ onResult, continuous = false, regionId = 'camera-region' }) {
  // Id UNIQUE par montage : évite toute collision de DOM (remontages StrictMode).
  const [uid] = useState(() => `${regionId}-${Math.random().toString(36).slice(2, 8)}`);
  const startedRef = useRef(false);
  const lastRef = useRef({ code: null, t: 0 });
  const onResultRef = useRef(onResult);     onResultRef.current = onResult;
  const continuousRef = useRef(continuous); continuousRef.current = continuous;

  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const [manuel, setManuel] = useState('');

  useEffect(() => {
    let cancelled = false;
    const qr = new Html5Qrcode(uid, { verbose: false });
    const config = { fps: 10, qrbox: { width: 240, height: 240 } };

    const onScan = (decodedText) => {
      const code = String(decodedText).trim();
      if (continuousRef.current) {
        const now = Date.now();
        if (code === lastRef.current.code && now - lastRef.current.t < 1500) return; // dédoublonnage
        lastRef.current = { code, t: now };
        onResultRef.current(code);
      } else if (startedRef.current) {
        startedRef.current = false;
        qr.stop().catch(() => {}).finally(() => onResultRef.current(code));
      }
    };

    // Démarrage : caméra arrière, sinon repli sur la première caméra détectée (cas PC).
    const startPromise = (async () => {
      try {
        await qr.start({ facingMode: 'environment' }, config, onScan, () => {});
      } catch {
        const cams = await Html5Qrcode.getCameras().catch(() => []);
        if (!cams || cams.length === 0) throw new Error('Aucune caméra détectée sur cet appareil.');
        await qr.start(cams[0].id, config, onScan, () => {});
      }
    })()
      .then(() => { startedRef.current = true; if (!cancelled) setStarting(false); })
      .catch((err) => {
        if (cancelled) return;
        setStarting(false);
        setError(err?.name === 'NotAllowedError'
          ? "Accès à la caméra refusé (autorise-la dans le navigateur)."
          : (err?.message || "Caméra inaccessible sur cet appareil."));
      });

    // Nettoyage : on ATTEND la fin du démarrage avant d'arrêter (évite la course start/stop).
    return () => {
      cancelled = true;
      startPromise.finally(() => {
        if (startedRef.current) {
          startedRef.current = false;
          qr.stop().catch(() => {}).finally(() => { try { qr.clear(); } catch { /* ignore */ } });
        } else {
          try { qr.clear(); } catch { /* ignore */ }
        }
      });
    };
  }, [uid]);

  const validerManuel = (e) => {
    e.preventDefault();
    const v = manuel.trim();
    if (v) { onResultRef.current(v); setManuel(''); }
  };

  return (
    <>
      {!error ? (
        <>
          <div id={uid} className="w-full overflow-hidden rounded-xl border border-base-200 bg-base-200/60 [&_video]:w-full [&_video]:rounded-xl" />
          <p className="text-xs text-base-content/50 mt-2 text-center">
            {starting ? 'Démarrage de la caméra…' : 'Placez le QR / code‑barres dans le cadre.'}
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-warning/25 bg-warning/5 p-4 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <span>{error} Saisis le n° de série manuellement ci‑dessous.</span>
        </div>
      )}

      {/* Saisie manuelle (repli si pas de caméra — ex. sur PC) */}
      <form onSubmit={validerManuel} className="flex items-center gap-2 mt-3">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
          <input
            value={manuel}
            onChange={(e) => setManuel(e.target.value)}
            placeholder="Saisir un n° de série…"
            className="input input-bordered input-sm rounded-xl w-full pl-9"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-sm rounded-xl">Valider</button>
      </form>
    </>
  );
}
