'use client';

import React, { useState } from 'react';
import { AlertCircle, X, Image as ImageIcon, Upload } from 'lucide-react';

export default function ResourceModal({
  title,
  icon: Icon,
  fields,
  values,
  error,
  loading,
  submitLabel = 'Enregistrer',
  onChange,
  onClose,
  onSubmit,
  headerExtra = null,
}) {
  const setValue = (name, value) => onChange({ ...values, [name]: value });

  // État local des téléversements d'images (par champ)
  const [uploading, setUploading] = useState({});
  const [uploadError, setUploadError] = useState({});

  const handleImageUpload = async (field, file) => {
    if (!file || typeof field.upload !== 'function') return;
    setUploading((u) => ({ ...u, [field.name]: true }));
    setUploadError((e) => ({ ...e, [field.name]: null }));
    try {
      const url = await field.upload(file);
      setValue(field.name, url);
    } catch (err) {
      setUploadError((e) => ({ ...e, [field.name]: err.message || 'Échec du téléversement.' }));
    } finally {
      setUploading((u) => ({ ...u, [field.name]: false }));
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box relative bg-base-100 rounded-xl shadow-xl border border-base-200 max-w-lg">
        <button onClick={onClose} type="button" className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3">
          <X className="w-4 h-4" />
        </button>

        <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
          {Icon && <Icon className="w-5 h-5 text-primary" />}
          {title}
        </h3>

        {headerExtra}

        {error && (
          <div className="alert alert-error rounded-xl mb-4 py-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {fields.map((field) => {
            const control = field.type === 'select' ? (
              <select
                required={field.required}
                disabled={field.disabled}
                className="select select-bordered rounded-xl w-full disabled:opacity-50"
                value={values[field.name] ?? ''}
                onChange={(e) => setValue(field.name, e.target.value)}
              >
                {field.placeholder && <option value="">{field.placeholder}</option>}
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'image' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-base-200 border border-base-200 overflow-hidden flex items-center justify-center shrink-0">
                    {values[field.name] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={values[field.name]} alt="aperçu" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-base-content/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <label className={`btn btn-outline btn-sm rounded-xl gap-2 w-fit ${uploading[field.name] ? 'btn-disabled' : ''}`}>
                      {uploading[field.name]
                        ? <span className="loading loading-spinner loading-xs"></span>
                        : <Upload className="w-4 h-4" />}
                      {uploading[field.name] ? 'Téléversement...' : 'Téléverser une image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading[field.name]}
                        onChange={(e) => { handleImageUpload(field, e.target.files?.[0]); e.target.value = ''; }}
                      />
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder || 'ou coller une URL d\'image'}
                      className="input input-bordered input-sm rounded-xl w-full"
                      value={values[field.name] ?? ''}
                      onChange={(e) => setValue(field.name, e.target.value)}
                    />
                  </div>
                  {values[field.name] && (
                    <button type="button" onClick={() => setValue(field.name, '')} className="btn btn-ghost btn-sm btn-circle" title="Retirer l'image">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {uploadError[field.name] && (
                  <p className="text-xs text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {uploadError[field.name]}
                  </p>
                )}
              </div>
            ) : field.type === 'textarea' ? (
              <textarea
                required={field.required}
                disabled={field.disabled}
                placeholder={field.placeholder}
                className="textarea textarea-bordered rounded-xl w-full min-h-24 disabled:opacity-50"
                value={values[field.name] ?? ''}
                onChange={(e) => setValue(field.name, e.target.value)}
              />
            ) : field.type === 'checkbox' ? (
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={Boolean(values[field.name])}
                  onChange={(e) => setValue(field.name, e.target.checked)}
                />
                <span className="label-text">{field.help || 'Activé'}</span>
              </label>
            ) : (
              <input
                type={field.type || 'text'}
                required={field.required}
                disabled={field.disabled}
                min={field.min}
                step={field.step}
                placeholder={field.placeholder}
                className="input input-bordered rounded-xl w-full disabled:opacity-50"
                value={values[field.name] ?? ''}
                onChange={(e) => setValue(field.name, e.target.value)}
              />
            );

            return (
              <div className="form-control" key={field.name}>
                <label className="label">
                  <span className="label-text font-semibold">{field.label}</span>
                </label>

                {/* Bouton d'action rapide optionnel (ex : ajout rapide à côté d'un select) */}
                {field.action ? (
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 min-w-0">{control}</div>
                    <button
                      type="button"
                      onClick={field.action.onClick}
                      title={field.action.title}
                      aria-label={field.action.title}
                      className="btn btn-outline btn-primary rounded-xl px-3 shrink-0"
                    >
                      {field.action.icon
                        ? React.createElement(field.action.icon, { className: 'w-4 h-4' })
                        : '+'}
                    </button>
                  </div>
                ) : (
                  control
                )}
              </div>
            );
          })}

          <div className="modal-action">
            <button type="button" onClick={onClose} className="btn btn-ghost rounded-xl">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary rounded-xl gap-2">
              {loading && <span className="loading loading-spinner loading-sm"></span>}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}
