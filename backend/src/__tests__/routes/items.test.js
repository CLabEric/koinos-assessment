const request = require('supertest');
const express = require('express');
const fs = require('fs').promises;

// Mock fs before requiring the router
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  }
}));

const itemsRouter = require('../../routes/items');

// Test data
const mockItems = [
  { id: 1, name: "Laptop Pro", category: "Electronics", price: 2499 },
  { id: 2, name: "Noise Cancelling Headphones", category: "Electronics", price: 399 },
  { id: 3, name: "Ergonomic Chair", category: "Furniture", price: 799 },
];

// Create test Express app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/items', itemsRouter);
  
  // Error handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  
  return app;
};

describe('Items Routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default mock: successful file read
    fs.readFile.mockResolvedValue(JSON.stringify(mockItems));
    fs.writeFile.mockResolvedValue();
  });

  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const response = await request(app)
        .get('/api/items')
        .expect(200);

      expect(response.body.items).toHaveLength(3);
      expect(response.body.items).toEqual(mockItems);
      expect(response.body.pagination).toBeDefined();
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should filter items by search query (case insensitive)', async () => {
      const response = await request(app)
        .get('/api/items?q=laptop')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe("Laptop Pro");
    });

    it('should filter items with partial match', async () => {
      const response = await request(app)
        .get('/api/items?q=chair')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].name).toBe("Ergonomic Chair");
    });

    it('should return empty array when no items match search', async () => {
      const response = await request(app)
        .get('/api/items?q=nonexistent')
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.items).toEqual([]);
    });

    it('should limit results when limit parameter provided', async () => {
      const response = await request(app)
        .get('/api/items?limit=2')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].id).toBe(1);
      expect(response.body[1].id).toBe(2);
    });

    it('should combine search and limit parameters', async () => {
      const response = await request(app)
        .get('/api/items?q=noise&limit=1')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].name).toContain("Noise");
    });

    it('should handle file read errors', async () => {
      fs.readFile.mockRejectedValue(new Error('File not found'));

      const response = await request(app)
        .get('/api/items')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      fs.readFile.mockResolvedValue('invalid json {{{');

      const response = await request(app)
        .get('/api/items')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/items/:id', () => {
    it('should return item by id when it exists', async () => {
      const response = await request(app)
        .get('/api/items/1')
        .expect(200);

      expect(response.body).toEqual(mockItems[0]);
      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe("Laptop Pro");
    });

    it('should return another item by different id', async () => {
      const response = await request(app)
        .get('/api/items/3')
        .expect(200);

      expect(response.body).toEqual(mockItems[2]);
      expect(response.body.id).toBe(3);
      expect(response.body.name).toBe("Ergonomic Chair");
    });

    it('should return 404 when item not found', async () => {
      const response = await request(app)
        .get('/api/items/999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Item not found');
    });

    it('should handle invalid id format gracefully', async () => {
      const response = await request(app)
        .get('/api/items/invalid')
        .expect(404);

      // parseInt('invalid') returns NaN, which won't match any item
      expect(response.body).toHaveProperty('error');
    });

    it('should handle file read errors', async () => {
      fs.readFile.mockRejectedValue(new Error('Permission denied'));

      const response = await request(app)
        .get('/api/items/1')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/items', () => {
    it('should create new item successfully', async () => {
      const newItem = {
        name: "Mechanical Keyboard",
        category: "Electronics",
        price: 150
      };

      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(newItem.name);
      expect(response.body.category).toBe(newItem.category);
      expect(response.body.price).toBe(newItem.price);
      
      // Verify file operations were called
      expect(fs.readFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
    });

    it('should assign unique id using Date.now()', async () => {
      const newItem = {
        name: "Test Item",
        category: "Test",
        price: 100
      };

      const beforeTime = Date.now();
      
      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      const afterTime = Date.now();

      expect(response.body.id).toBeGreaterThanOrEqual(beforeTime);
      expect(response.body.id).toBeLessThanOrEqual(afterTime);
    });

    it('should write updated data to file', async () => {
      const newItem = {
        name: "Standing Desk",
        category: "Furniture",
        price: 500
      };

      await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      // Verify writeFile was called with correct structure
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      const writeCall = fs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);
      
      expect(writtenData).toHaveLength(4); // Original 3 + 1 new
      expect(writtenData[3].name).toBe(newItem.name);
    });

    it('should handle file read errors during creation', async () => {
      fs.readFile.mockRejectedValue(new Error('Cannot read file'));

      const newItem = {
        name: "Test",
        category: "Test",
        price: 100
      };

      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      fs.writeFile.mockRejectedValue(new Error('Cannot write file'));

      const newItem = {
        name: "Test",
        category: "Test",
        price: 100
      };

      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/items')
        .send({})
        .expect(201);

      // Without validation, it will still create an item (intentional for assessment)
      expect(response.body).toHaveProperty('id');
    });

    it('should handle missing fields in request body', async () => {
      const incompleteItem = {
        name: "Only Name"
        // missing category and price
      };

      const response = await request(app)
        .post('/api/items')
        .send(incompleteItem)
        .expect(201);

      // Without validation, it will accept incomplete data
      expect(response.body.name).toBe("Only Name");
      expect(response.body).toHaveProperty('id');
    });
  });
});
