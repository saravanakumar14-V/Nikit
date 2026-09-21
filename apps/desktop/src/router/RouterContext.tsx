import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { PrimaryRouteId } from '../state/types';
import { ROUTES } from './routes';

export interface RouterState {
  currentRouteId: PrimaryRouteId;
  currentPath: string;
  params: Record<string, string>;
  navigate: (routeIdOrPath: PrimaryRouteId | string, params?: Record<string, string>) => void;
  goBack: () => void;
}

const RouterContext = createContext<RouterState | undefined>(undefined);

function parseHash(hash: string): { routeId: PrimaryRouteId; path: string; params: Record<string, string> } {
  const cleanHash = hash.replace(/^#\/?/, '').trim();
  if (!cleanHash) {
    return { routeId: 'chat', path: '/chat', params: {} };
  }

  const [pathPart, queryPart] = cleanHash.split('?');
  const pathSegment = pathPart.toLowerCase();

  // Extract query parameters
  const params: Record<string, string> = {};
  if (queryPart) {
    const searchParams = new URLSearchParams(queryPart);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }

  // Match known route id
  let routeId: PrimaryRouteId = 'chat';
  for (const [id, config] of Object.entries(ROUTES)) {
    const routePath = config.path.replace(/^\//, '').toLowerCase();
    if (pathSegment === id || pathSegment === routePath || pathSegment.startsWith(`${id}/`)) {
      routeId = id as PrimaryRouteId;
      break;
    }
  }

  return { routeId, path: `/${pathSegment}`, params };
}

export interface RouterProviderProps {
  children: ReactNode;
  initialRoute?: PrimaryRouteId;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({ children, initialRoute = 'chat' }) => {
  const [{ routeId, path, params }, setRouteState] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return parseHash(window.location.hash);
    }
    return { routeId: initialRoute, path: `/${initialRoute}`, params: {} };
  });

  // Listen to hashchange
  useEffect(() => {
    const handleHashChange = () => {
      setRouteState(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback(
    (routeIdOrPath: PrimaryRouteId | string, newParams?: Record<string, string>) => {
      let targetPath = routeIdOrPath;
      if (routeIdOrPath in ROUTES) {
        targetPath = ROUTES[routeIdOrPath as PrimaryRouteId].path;
      }
      if (!targetPath.startsWith('/')) {
        targetPath = `/${targetPath}`;
      }

      let queryString = '';
      if (newParams && Object.keys(newParams).length > 0) {
        const sp = new URLSearchParams();
        Object.entries(newParams).forEach(([k, v]) => sp.set(k, v));
        queryString = `?${sp.toString()}`;
      }

      const fullHash = `#${targetPath}${queryString}`;
      window.location.hash = fullHash;
    },
    []
  );

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const value: RouterState = {
    currentRouteId: routeId,
    currentPath: path,
    params,
    navigate,
    goBack,
  };

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

export const useRouter = (): RouterState => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
