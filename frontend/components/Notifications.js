'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';

/**
 * @component Notifications
 * @description Cloche de la Navbar : affiche le compteur de notifications non lues
 * et redirige vers la page dédiée /notifications au clic.
 */
export default function Notifications() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/notifications?limit=1', {
        credentials: 'include',
      });
      if (!res.ok) { setUnread(0); return; }
      const data = await res.json();
      setUnread(data.non_lues ?? 0);
    } catch {
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    // Rafraîchissement périodique léger du compteur
    const t = setInterval(fetchUnread, 60000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  // Resynchronise le compteur quand on (re)vient sur la page notifications
  useEffect(() => { fetchUnread(); }, [pathname, fetchUnread]);

  return (
    <Link href="/notifications" className="btn btn-ghost btn-circle" aria-label="Notifications" title="Notifications">
      <div className="indicator">
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="badge badge-xs badge-primary indicator-item font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
    </Link>
  );
}
