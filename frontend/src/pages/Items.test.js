import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Items from './Items';
import { DataProvider } from '../state/DataContext';

// Mock AutoSizer to provide fixed dimensions in tests
jest.mock('react-virtualized/dist/commonjs/AutoSizer', () => {
  return {
    __esModule: true,
    default: ({ children }) => children({ height: 600, width: 800 })
  };
});

// Mock data
const mockItemsResponse = {
  items: [
    { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 },
    { id: 2, name: 'Office Chair', category: 'Furniture', price: 399 },
    { id: 3, name: 'Desk Lamp', category: 'Furniture', price: 79 }
  ],
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 3,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

const mockSearchResponse = {
  items: [
    { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 }
  ],
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalItems: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  }
};

// Helper to render component with providers
const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <DataProvider>
        {component}
      </DataProvider>
    </BrowserRouter>
  );
};

describe('Items Component', () => {
  beforeEach(() => {
    // Mock fetch
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders loading state initially', () => {
    global.fetch.mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<Items />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders items list after successful fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockItemsResponse
    });

    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
      expect(screen.getByText('Office Chair')).toBeInTheDocument();
      expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
    });
  });

  test('displays item details (category and price)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockItemsResponse
    });

    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText(/Electronics/)).toBeInTheDocument();
      expect(screen.getByText(/\$2499/)).toBeInTheDocument();
    });
  });

  test('renders search input', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockItemsResponse
    });

    renderWithProviders(<Items />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/search items/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  test('handles search functionality', async () => {
    // Initial load
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockItemsResponse
    });

    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    });

    // Search
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse
    });

    const searchInput = screen.getByPlaceholderText(/search items/i);
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'laptop' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q=laptop'),
        expect.anything()
      );
    });
  });

  test('displays pagination info when available', async () => {
    const responseWithPages = {
      items: mockItemsResponse.items,
      pagination: {
        ...mockItemsResponse.pagination,
        totalItems: 25,
        totalPages: 3,
        hasNextPage: true
      }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => responseWithPages
    });

    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 25 items/)).toBeInTheDocument();
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });
  });

  test('shows "No items found" when list is empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      })
    });

    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText(/no items found/i)).toBeInTheDocument();
    });
  });

  test('handles fetch errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText(/no items found/i)).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  test('displays clear button when search term is active', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockItemsResponse
    });

    renderWithProviders(<Items />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search items/i);
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  test('items are clickable links', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockItemsResponse
    });

    renderWithProviders(<Items />);

    await waitFor(() => {
      const laptopLink = screen.getByText('Laptop Pro').closest('a');
      expect(laptopLink).toHaveAttribute('href', '/items/1');
    });
  });
});
