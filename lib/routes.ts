export type AppRole = 'admin' | 'user';

export const ADMIN_TAB_ROUTES: Record<string, string> = {
  dashboard: '/admin/dashboard',
  products: '/admin/produk',
  pos: '/admin/kasir',
  reports: '/admin/laporan',
  settings: '/admin/pengaturan',
};

export const USER_TAB_ROUTES: Record<string, string> = {
  pos: '/kasir',
  'my-transactions': '/kasir/riwayat',
};

/** Returns the default workspace URL for a given authenticated role. */
export function getDefaultRouteForRole(role: AppRole): string {
  return role === 'admin' ? '/admin/dashboard' : '/kasir';
}

/** Resolves a legacy internal tab ID to its concrete App Router path for a role. */
export function getRouteForTab(tab: string, role: AppRole): string {
  if (role === 'admin') {
    return ADMIN_TAB_ROUTES[tab] ?? '/admin/dashboard';
  }
  return USER_TAB_ROUTES[tab] ?? '/kasir';
}

/** Infers the matching tab ID from the current pathname so Sidebar and Header stay synced. */
export function getTabFromPathname(pathname: string, role?: AppRole): string | null {
  const cleanPath = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');

  if (cleanPath === '/admin' || cleanPath === '/admin/dashboard') return 'dashboard';
  if (cleanPath === '/admin/produk') return 'products';
  if (cleanPath === '/admin/laporan') return 'reports';
  if (cleanPath === '/admin/pengaturan') return 'settings';
  if (cleanPath === '/admin/kasir') return 'pos';
  if (cleanPath === '/kasir/riwayat') return 'my-transactions';
  if (cleanPath === '/kasir') return 'pos';

  if (role === 'admin' && cleanPath === '/dashboard') return 'dashboard';
  return null;
}

/** Validates an optional post-login `next` path against role permissions before redirecting. */
export function resolvePostLoginRedirect(
  nextPath: string | null | undefined,
  role: AppRole
): string {
  const fallback = getDefaultRouteForRole(role);
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//')) {
    return fallback;
  }

  const normalized = nextPath.replace(/\/+$/, '') || '/';

  if (role === 'admin') {
    if (normalized === '/' || normalized === '/dashboard' || normalized === '/admin' || normalized === '/showcase') {
      return '/admin/dashboard';
    }
    if (normalized === '/kasir') {
      return '/admin/kasir';
    }
    if (normalized === '/kasir/riwayat') {
      return '/admin/laporan';
    }
    if (Object.values(ADMIN_TAB_ROUTES).includes(normalized)) {
      return normalized;
    }
    return fallback;
  }

  if (Object.values(USER_TAB_ROUTES).includes(normalized)) {
    return normalized;
  }
  return fallback;
}
