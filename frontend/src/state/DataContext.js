import React, { createContext, useCallback, useContext, useState } from 'react';

const DataContext = createContext({
  items: [],
  pagination: null,
  loading: false,
  fetchItems: () => Promise.resolve()
});

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async (signal, options = {}) => {
    const { page = 1, pageSize = 10, search = '' } = options;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      
      if (search) {
        params.append('q', search);
      }

      const res = await fetch(`http://localhost:3001/api/items?${params}`, { signal });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const json = await res.json();
      
      // Handle both paginated and legacy responses
      if (json && json.items && json.pagination) {
        setItems(Array.isArray(json.items) ? json.items : []);
        setPagination(json.pagination);
      } else if (Array.isArray(json)) {
        // Legacy format (array)
        setItems(json);
        setPagination(null);
      } else {
        // Fallback: ensure items is always an array
        setItems([]);
        setPagination(null);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <DataContext.Provider value={{ 
      items: items || [], 
      pagination, 
      loading, 
      fetchItems 
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
