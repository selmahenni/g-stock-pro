'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, Boxes, AlertCircle, ShieldAlert } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Message propre quand l'utilisateur est redirigé par le middleware (?error=unauthorized)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'unauthorized') {
        setNotice("Vous devez être connecté pour accéder à cette page. Votre session a peut-être expiré.");
      }
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/utilisateurs/connexion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include', // Important pour recevoir le cookie JWT
        body: JSON.stringify({
          adresse_email: email,
          mot_de_passe: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Identifiants invalides');
      }

      // Connexion réussie : Le navigateur a stocké le cookie HTTP-Only.
      // On stocke les infos de profil dans localStorage pour le frontend (RBAC visuel).
      if (data.utilisateur) {
        localStorage.setItem('userRole', data.utilisateur.role);
        localStorage.setItem('userName', data.utilisateur.nom);
        localStorage.setItem('userId', data.utilisateur.id);
      }

      // On redirige l'utilisateur vers le dashboard.
      window.location.href = '/';
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-100 to-base-200/80 p-4 relative overflow-hidden">
      
      {/* Absolute Theme Toggle at top right */}
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl mix-blend-multiply animate-blob hidden md:block"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/20 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000 hidden md:block"></div>

      <div className="card w-full max-w-md bg-base-100 shadow-2xl border border-base-200/50 backdrop-blur-sm z-10 transition-all duration-300">
        <div className="card-body p-8 sm:p-10">
          
          <div className="flex flex-col items-center justify-center mb-8 gap-3">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary to-secondary text-primary-content rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 transition-transform duration-300 hover:rotate-12 hover:scale-110">
              <Boxes className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-base-content">
                G-Stock Pro
              </h2>
              <p className="text-sm text-base-content/60 font-medium mt-1">
                Portail Sécurisé
              </p>
            </div>
          </div>

          {notice && !error && (
            <div className="alert shadow-lg rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-start gap-3 mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-warning text-sm">Connexion requise</h3>
                <p className="text-xs text-base-content/70 mt-0.5">{notice}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-error/25 bg-error/5 p-4 flex items-start gap-3 mb-6 animate-in slide-in-from-top-2 fade-in duration-300">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-error text-sm">Échec de la connexion</h3>
                <p className="text-xs text-base-content/70 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="form-control w-full group">
              <label className="label">
                <span className="label-text font-semibold text-base-content/80 group-focus-within:text-primary transition-colors">
                  Adresse Email
                </span>
              </label>
              <div className="relative flex items-center">
                <Mail className="w-5 h-5 absolute left-3.5 text-base-content/40 group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  placeholder="admin@g-stock.pro"
                  className="input input-bordered w-full pl-11 rounded-xl bg-base-200/50 focus:bg-base-100 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-control w-full group">
              <label className="label">
                <span className="label-text font-semibold text-base-content/80 group-focus-within:text-primary transition-colors">
                  Mot de passe
                </span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 absolute left-3.5 text-base-content/40 group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="input input-bordered w-full pl-11 rounded-xl bg-base-200/50 focus:bg-base-100 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn btn-primary w-full rounded-xl shadow-lg shadow-primary/25 mt-4 hover:scale-[1.02] transition-transform"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  Se connecter
                  <LogIn className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
      
      <p className="absolute bottom-6 text-xs text-base-content/40 font-medium tracking-wide">
        &copy; 2026 G-Stock Pro - V1.0
      </p>
    </div>
  );
}
