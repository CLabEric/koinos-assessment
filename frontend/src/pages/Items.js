import React, { useEffect, useState } from 'react';
import { List } from 'react-virtualized';
import AutoSizer from 'react-virtualized/dist/commonjs/AutoSizer';
import 'react-virtualized/styles.css';
import { useData } from '../state/DataContext';
import { Link } from 'react-router-dom';

function Items() {
  const { items, pagination, loading, fetchItems } = useData();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const abortController = new AbortController();

    const loadItems = async () => {
      try {
        await fetchItems(abortController.signal, {
          page: currentPage,
          pageSize: 10,
          search: searchTerm
        });
      } catch (err) {
        // Ignore abort errors - these are expected when component unmounts
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch items:', err);
        }
      }
    };

    loadItems();

    // Clean up: abort fetch if component unmounts before request completes
    return () => {
      abortController.abort();
    };
  }, [fetchItems, currentPage, searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  if (loading && (!items || items.length === 0)) {
    return <p>Loading...</p>;
  }

  // Safety check: ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div style={{ padding: '20px' }}>
      {/* Search Form */}
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search items by name or category..."
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '300px',
            marginRight: '10px'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Search
        </button>
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSearchInput('');
              setCurrentPage(1);
            }}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            Clear
          </button>
        )}
      </form>

      {/* Search Results Info */}
      {pagination && (
        <p style={{ color: '#666', marginBottom: '10px' }}>
          {searchTerm && `Search results for "${searchTerm}" - `}
          Showing {pagination.totalItems} item{pagination.totalItems !== 1 ? 's' : ''}
          {pagination.totalPages > 1 && ` (Page ${pagination.currentPage} of ${pagination.totalPages})`}
        </p>
      )}

      {/* Virtualized Items List */}
      {safeItems.length === 0 ? (
        <p>No items found.</p>
      ) : (
        <div style={{ height: '400px', border: '1px solid #eee', borderRadius: '4px' }}>
          <AutoSizer>
            {({ height, width }) => (
              <List
                width={width}
                height={height}
                rowCount={safeItems.length}
                rowHeight={60}
                rowRenderer={({ index, key, style }) => {
                  const item = safeItems[index];
                  return (
                    <div
                      key={key}
                      style={{
                        ...style,
                        padding: '12px',
                        borderBottom: '1px solid #eee',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Link 
                        to={'/items/' + item.id}
                        style={{ 
                          textDecoration: 'none',
                          color: '#007bff',
                          fontSize: '16px'
                        }}
                      >
                        {item.name}
                      </Link>
                      <span style={{ 
                        color: '#666', 
                        fontSize: '14px',
                        marginLeft: '10px'
                      }}>
                        ({item.category}) - ${item.price}
                      </span>
                    </div>
                  );
                }}
              />
            )}
          </AutoSizer>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPreviousPage || loading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: pagination.hasPreviousPage ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: pagination.hasPreviousPage ? 'pointer' : 'not-allowed'
            }}
          >
            Previous
          </button>

          {/* Page Numbers */}
          {pagination && Array.from({ length: pagination.totalPages || 0 }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              disabled={loading}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                backgroundColor: pageNum === currentPage ? '#007bff' : '#f8f9fa',
                color: pageNum === currentPage ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: pageNum === currentPage ? 'bold' : 'normal'
              }}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.hasNextPage || loading}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: pagination.hasNextPage ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: pagination.hasNextPage ? 'pointer' : 'not-allowed'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Items;
