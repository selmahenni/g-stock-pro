'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Initialiser le thème au montage côté client
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') || 'light';
    setTheme(storedTheme);
    document.documentElement.setAttribute('data-theme', storedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Pour éviter le décalage d'hydratation (Hydration Mismatch), 
  // on affiche rien côté serveur, on attend que le composant soit monté
  if (!mounted) return <div className="w-8 h-8"></div>;

  return (
    <label className="swap swap-rotate btn btn-ghost btn-circle">
      {/* this hidden checkbox controls the state */}
      <input 
        type="checkbox" 
        onChange={toggleTheme} 
        checked={theme === 'dark'} 
        aria-label="Toggle Theme"
      />
      
      {/* sun icon */}
      <Sun className="swap-off w-5 h-5 text-amber-500" />
      
      {/* moon icon */}
      <Moon className="swap-on w-5 h-5 text-indigo-400" />
    </label>
  );
}
