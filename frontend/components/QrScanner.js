'use client';

import React from 'react';
import CameraReader from './CameraReader';
import { X, Camera } from 'lucide-react';

/**
 * @component QrScanner
 * @description Modale de scan QR / code-barres à usage UNIQUE : renvoie le premier code
 * détecté à `onResult` puis se ferme. (S'appuie sur CameraReader.)
 *
 * @param {Function} onResult - Appelé avec le texte décodé (string).
 * @param {Function} onClose  - Ferme la modale.
 * @param {string}  [title]   - Titre affiché.
 */
export default function QrScanner({ onResult, onClose, title = 'Scanner un code' }) {
  return (
    <div className="modal modal-open">
      <div className="modal-box relative bg-base-100 rounded-xl shadow-xl border border-base-200 max-w-md">
        <button onClick={onClose} type="button" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-primary" /> {title}
        </h3>

        <CameraReader onResult={onResult} regionId="qr-scanner-region" />

        <div className="modal-action">
          <button onClick={onClose} type="button" className="btn btn-ghost rounded-xl">Fermer</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
