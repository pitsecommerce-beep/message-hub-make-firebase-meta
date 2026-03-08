import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTeam } from '@/services/firestore';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [brandApplied, setBrandApplied] = useState(false);

  useEffect(() => {
    if (!user?.teamId || brandApplied) return;
    getTeam(user.teamId).then(team => {
      if (!team) return;
      const brandName = team.settings?.brandName || 'Message Hub';
      const faviconUrl = team.settings?.faviconUrl || '';

      // Update document title
      document.title = brandName;

      // Update favicon if provided
      if (faviconUrl) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = faviconUrl;
      }

      setBrandApplied(true);
    }).catch(() => {});
  }, [user?.teamId, brandApplied]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-surface-50 dark:bg-surface-900 transition-colors duration-200">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
