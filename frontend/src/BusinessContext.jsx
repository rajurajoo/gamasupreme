import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [businesses, setBusinesses] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [businessId, setBusinessIdState] = useState(() => {
    const raw = localStorage.getItem('businessId');
    return raw ? Number(raw) : null;
  });

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);

    // Cold local dev servers can take several seconds to come up, so retry
    // patiently (up to ~30s covered) before showing the manual-retry banner.
    // Even after that, keep trying slowly in the background so the app
    // recovers on its own without the user needing to click Retry.
    function attempt(attemptNumber) {
      api.get('/businesses').then((list) => {
        if (cancelled) return;
        setBusinesses(list);
        setLoadError(false);
        if (!businessId && list.length) setBusinessId(list[0].id);
      }).catch(() => {
        if (cancelled) return;
        if (attemptNumber < 10) {
          setTimeout(() => attempt(attemptNumber + 1), 2000);
        } else {
          setLoadError(true);
          setTimeout(() => attempt(attemptNumber), 5000);
        }
      });
    }
    attempt(0);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryTick]);

  function setBusinessId(id) {
    setBusinessIdState(id);
    localStorage.setItem('businessId', String(id));
  }

  function retryLoadBusinesses() {
    setRetryTick((t) => t + 1);
  }

  const activeBusiness = businesses.find((b) => b.id === businessId) || null;

  return (
    <BusinessContext.Provider value={{ businesses, businessId, activeBusiness, setBusinessId, loadError, retryLoadBusinesses }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
