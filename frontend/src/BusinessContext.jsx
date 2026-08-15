import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const BusinessContext = createContext(null);

export function BusinessProvider({ children }) {
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessIdState] = useState(() => {
    const raw = localStorage.getItem('businessId');
    return raw ? Number(raw) : null;
  });

  useEffect(() => {
    api.get('/businesses').then((list) => {
      setBusinesses(list);
      if (!businessId && list.length) setBusinessId(list[0].id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setBusinessId(id) {
    setBusinessIdState(id);
    localStorage.setItem('businessId', String(id));
  }

  const activeBusiness = businesses.find((b) => b.id === businessId) || null;

  return (
    <BusinessContext.Provider value={{ businesses, businessId, activeBusiness, setBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
