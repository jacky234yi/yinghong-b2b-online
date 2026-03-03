import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Database Setup
const db = new Database('yinghong.db');
db.pragma('journal_mode = WAL');

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('super_admin', 'admin', 'buyer')),
    name TEXT,
    phone TEXT,
    discount_rate REAL DEFAULT 1.0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT,
    category_id TEXT,
    fabric TEXT,
    weight TEXT,
    elasticity TEXT,
    composition TEXT,
    price REAL,
    tags TEXT, -- JSON array
    description TEXT,
    is_deleted INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    color TEXT,
    size TEXT,
    stock INTEGER DEFAULT 0,
    weight REAL, -- kg
    volume REAL, -- m3
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    url TEXT,
    type TEXT CHECK(type IN ('main', 'detail', 'size_chart')),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    status TEXT DEFAULT 'pending', -- pending, processing, shipped, completed, cancelled
    total_amount REAL,
    discount_applied REAL,
    tracking_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    product_id TEXT,
    variant_id TEXT,
    quantity INTEGER,
    price_at_time REAL,
    status TEXT DEFAULT 'normal', -- normal, cancellation_requested, cancelled
    cancellation_reason TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(variant_id) REFERENCES product_variants(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    sender_id TEXT,
    receiver_id TEXT, -- Can be 'all' or specific user_id
    url TEXT,
    name TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );
`);

// Seed Super Admin
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('123', 10);
  db.prepare('INSERT INTO users (id, username, password, role, name) VALUES (?, ?, ?, ?, ?)').run(
    uuidv4(), 'admin', hashedPassword, 'super_admin', 'Super Admin'
  );
  console.log('Super Admin created: admin / 123');
}

// Seed Categories
const categoriesCount = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
if (categoriesCount.count === 0) {
  const cats = ['Jeans (Long)', 'Shorts', 'Plus Size (Long)', 'Plus Size (Shorts)'];
  const insertCat = db.prepare('INSERT INTO categories (id, name) VALUES (?, ?)');
  cats.forEach(c => insertCat.run(uuidv4(), c));
}

// Express App
const app = express();
const PORT = 3000;
const JWT_SECRET = 'yinghong-secret-key-change-in-prod';

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer Config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Middleware: Authenticate Token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- API Routes ---

// Auth
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user) return res.status(400).json({ message: 'User not found' });

  if (bcrypt.compareSync(password, user.password)) {
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { phone, password, name } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = uuidv4();
    db.prepare('INSERT INTO users (id, username, password, role, name, phone) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, phone, hashedPassword, 'buyer', name || phone, phone
    );
    res.json({ message: 'Registered successfully' });
  } catch (err: any) {
    res.status(400).json({ message: 'Username/Phone already exists' });
  }
});

// File Upload
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl, name: req.file.originalname, size: req.file.size });
});

// Products
app.get('/api/products', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE p.is_deleted = 0
    ORDER BY p.created_at DESC
  `).all();
  
  const productsWithDetails = products.map((p: any) => {
    const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id);
    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(p.id);
    return { ...p, variants, images, tags: JSON.parse(p.tags || '[]') };
  });
  
  res.json(productsWithDetails);
});

app.post('/api/products', authenticateToken, (req, res) => {
  if (req.user.role === 'buyer') return res.sendStatus(403);
  
  const { 
    name, sku, category_id, fabric, weight, elasticity, composition, 
    price, tags, description, variants, images 
  } = req.body;

  const productId = uuidv4();
  
  const insertProduct = db.prepare(`
    INSERT INTO products (id, sku, name, category_id, fabric, weight, elasticity, composition, price, tags, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVariant = db.prepare(`
    INSERT INTO product_variants (id, product_id, color, size, stock, weight, volume)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertImage = db.prepare(`
    INSERT INTO product_images (id, product_id, url, type)
    VALUES (?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertProduct.run(productId, sku, name, category_id, fabric, weight, elasticity, composition, price, JSON.stringify(tags), description);
    
    variants.forEach((v: any) => {
      insertVariant.run(uuidv4(), productId, v.color, v.size, v.stock, v.weight || 0, v.volume || 0);
    });

    images.forEach((img: any) => {
      insertImage.run(uuidv4(), productId, img.url, img.type);
    });
  });

  try {
    transaction();
    res.json({ message: 'Product created', id: productId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
    if (req.user.role === 'buyer') return res.sendStatus(403);
    const { id } = req.params;
    const { 
      name, sku, category_id, fabric, weight, elasticity, composition, 
      price, tags, description, variants, images 
    } = req.body;
  
    const transaction = db.transaction(() => {
      db.prepare(`
        UPDATE products SET sku=?, name=?, category_id=?, fabric=?, weight=?, elasticity=?, composition=?, price=?, tags=?, description=?
        WHERE id=?
      `).run(sku, name, category_id, fabric, weight, elasticity, composition, price, JSON.stringify(tags), description, id);
      
      variants.forEach((v: any) => {
        if (v.id) {
            db.prepare(`UPDATE product_variants SET color=?, size=?, stock=?, weight=?, volume=? WHERE id=?`).run(v.color, v.size, v.stock, v.weight, v.volume, v.id);
        } else {
            db.prepare(`INSERT INTO product_variants (id, product_id, color, size, stock, weight, volume) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(uuidv4(), id, v.color, v.size, v.stock, v.weight || 0, v.volume || 0);
        }
      });

      // Images - Replace all is usually fine
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
      images.forEach((img: any) => {
        db.prepare(`INSERT INTO product_images (id, product_id, url, type) VALUES (?, ?, ?, ?)`).run(uuidv4(), id, img.url, img.type);
      });
    });
  
    try {
      transaction();
      res.json({ message: 'Product updated' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
    if (req.user.role === 'buyer') return res.sendStatus(403);
    db.prepare('UPDATE products SET is_deleted = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Product deleted' });
});

// Categories
app.get('/api/categories', (req, res) => {
    const cats = db.prepare('SELECT * FROM categories').all();
    res.json(cats);
});

// Orders
app.post('/api/orders', authenticateToken, (req, res) => {
    const { items } = req.body; // items: [{ variant_id, quantity }]
    const userId = req.user.id;
    
    // Calculate total and check stock
    let totalAmount = 0;
    const orderId = uuidv4();
    const orderItems: any[] = [];

    const transaction = db.transaction(() => {
        // Get user discount
        const user = db.prepare('SELECT discount_rate FROM users WHERE id = ?').get(userId) as any;
        const discountRate = user ? user.discount_rate : 1.0;

        for (const item of items) {
            const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(item.variant_id) as any;
            if (!variant) throw new Error(`Variant not found: ${item.variant_id}`);
            if (variant.stock < item.quantity) throw new Error(`Insufficient stock for variant ${variant.id}`);
            
            const product = db.prepare('SELECT price FROM products WHERE id = ?').get(variant.product_id) as any;
            
            // Deduct stock
            db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?').run(item.quantity, item.variant_id);
            
            const price = product.price * discountRate;
            totalAmount += price * item.quantity;
            
            orderItems.push({
                id: uuidv4(),
                order_id: orderId,
                product_id: variant.product_id,
                variant_id: item.variant_id,
                quantity: item.quantity,
                price_at_time: price
            });
        }

        db.prepare('INSERT INTO orders (id, user_id, status, total_amount, discount_applied) VALUES (?, ?, ?, ?, ?)').run(
            orderId, userId, 'pending', totalAmount, discountRate
        );

        const insertItem = db.prepare('INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?, ?)');
        orderItems.forEach(item => {
            insertItem.run(item.id, item.order_id, item.product_id, item.variant_id, item.quantity, item.price_at_time);
        });
    });

    try {
        transaction();
        res.json({ message: 'Order created', id: orderId });
    } catch (err: any) {
        res.status(400).json({ message: err.message });
    }
});

app.get('/api/orders', authenticateToken, (req, res) => {
    let query = `
        SELECT o.*, u.name as user_name, u.username as user_phone 
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id 
    `;
    
    const params: any[] = [];
    if (req.user.role === 'buyer') {
        query += ' WHERE o.user_id = ?';
        params.push(req.user.id);
    }
    
    query += ' ORDER BY o.created_at DESC';
    
    const orders = db.prepare(query).all(...params);
    
    // Hydrate items
    const ordersWithItems = orders.map((o: any) => {
        const items = db.prepare(`
            SELECT oi.*, p.name as product_name, p.sku, pv.color, pv.size, p.price as original_price
            FROM order_items oi
            LEFT JOIN products p ON oi.product_id = p.id
            LEFT JOIN product_variants pv ON oi.variant_id = pv.id
            WHERE oi.order_id = ?
        `).all(o.id);
        return { ...o, items };
    });
    
    res.json(ordersWithItems);
});

app.put('/api/orders/:id/status', authenticateToken, (req, res) => {
    if (req.user.role === 'buyer') return res.sendStatus(403);
    const { status, tracking_number } = req.body;
    
    db.prepare('UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?').run(status, tracking_number || null, req.params.id);
    res.json({ message: 'Order updated' });
});

// Partial Cancellation
app.post('/api/orders/cancel-item', authenticateToken, (req, res) => {
    const { order_item_id, reason } = req.body;
    
    // If buyer, just mark as requested
    if (req.user.role === 'buyer') {
        db.prepare('UPDATE order_items SET status = \'cancellation_requested\', cancellation_reason = ? WHERE id = ?').run(reason, order_item_id);
        res.json({ message: 'Cancellation requested' });
    } else {
        // Admin approves
        const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(order_item_id) as any;
        if (!item) return res.status(404).json({ message: 'Item not found' });
        
        const transaction = db.transaction(() => {
            // Restore stock
            db.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(item.quantity, item.variant_id);
            // Update item status
            db.prepare('UPDATE order_items SET status = \'cancelled\' WHERE id = ?').run(order_item_id);
            // Update order total? (Optional, but good for accounting)
            db.prepare('UPDATE orders SET total_amount = total_amount - ? WHERE id = ?').run(item.price_at_time * item.quantity, item.order_id);
        });
        
        transaction();
        res.json({ message: 'Item cancelled and stock restored' });
    }
});

// Users (Admin only)
app.get('/api/users', authenticateToken, (req, res) => {
    if (req.user.role === 'buyer') return res.sendStatus(403);
    const users = db.prepare('SELECT id, username, role, name, phone, discount_rate, notes, created_at FROM users WHERE role = \'buyer\'').all();
    res.json(users);
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
    if (req.user.role === 'buyer') return res.sendStatus(403);
    const { discount_rate, notes } = req.body;
    db.prepare('UPDATE users SET discount_rate = ?, notes = ? WHERE id = ?').run(discount_rate, notes, req.params.id);
    res.json({ message: 'User updated' });
});

// Files
app.get('/api/files', authenticateToken, (req, res) => {
    let query = `
        SELECT f.*, s.name as sender_name 
        FROM files f
        LEFT JOIN users s ON f.sender_id = s.id
        WHERE f.receiver_id = 'all' OR f.receiver_id = ? OR f.sender_id = ?
        ORDER BY f.created_at DESC
    `;
    const files = db.prepare(query).all(req.user.id, req.user.id);
    res.json(files);
});

app.post('/api/files/send', authenticateToken, (req, res) => {
    const { receiver_id, url, name, size } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO files (id, sender_id, receiver_id, url, name, size) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, req.user.id, receiver_id, url, name, size
    );
    res.json({ message: 'File sent' });
});

// Dashboard Stats
app.get('/api/stats/admin', authenticateToken, (req, res) => {
    if (req.user.role === 'buyer') return res.sendStatus(403);
    
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';
    
    const dailySales = db.prepare('SELECT SUM(total_amount) as total FROM orders WHERE date(created_at) = ?').get(today) as any;
    const monthlySales = db.prepare('SELECT SUM(total_amount) as total FROM orders WHERE date(created_at) >= ?').get(monthStart) as any;
    
    // Picking list for today (pending/processing)
    const pickingList = db.prepare(`
        SELECT p.name, pv.color, pv.size, SUM(oi.quantity) as qty
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN product_variants pv ON oi.variant_id = pv.id
        WHERE o.status IN ('pending', 'processing') AND oi.status = 'normal'
        GROUP BY p.name, pv.color, pv.size
    `).all();

    res.json({
        dailySales: dailySales.total || 0,
        monthlySales: monthlySales.total || 0,
        pickingList
    });
});

app.get('/api/stats/buyer', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';

    const daily = db.prepare('SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE user_id = ? AND date(created_at) = ?').get(userId, today) as any;
    const monthly = db.prepare('SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE user_id = ? AND date(created_at) >= ?').get(userId, monthStart) as any;
    
    // Last 30 days trend
    const trend = db.prepare(`
        SELECT date(created_at) as date, SUM(total_amount) as amount 
        FROM orders 
        WHERE user_id = ? AND created_at >= date('now', '-30 days')
        GROUP BY date(created_at)
    `).all(userId);

    res.json({
        daily: { count: daily.count, total: daily.total || 0 },
        monthly: { count: monthly.count, total: monthly.total || 0 },
        trend
    });
});


// Start Server
async function startServer() {
  const app = express();
  const PORT = 3000;
  const JWT_SECRET = 'yinghong-secret-key-change-in-prod';

  app.use(cors());
  app.use(express.json());

  // Serve uploaded files
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Multer Config
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    }
  });
  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
  });

  // Middleware: Authenticate Token
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // --- API Routes ---

  // Auth
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user) return res.status(400).json({ message: 'User not found' });

    if (bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    const { phone, password, name } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const id = uuidv4();
      db.prepare('INSERT INTO users (id, username, password, role, name, phone) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, phone, hashedPassword, 'buyer', name || phone, phone
      );
      res.json({ message: 'Registered successfully' });
    } catch (err: any) {
      res.status(400).json({ message: 'Username/Phone already exists' });
    }
  });

  // File Upload
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, name: req.file.originalname, size: req.file.size });
  });

  // Products
  app.get('/api/products', (req, res) => {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.is_deleted = 0
      ORDER BY p.created_at DESC
    `).all();
    
    const productsWithDetails = products.map((p: any) => {
      const variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(p.id);
      const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(p.id);
      return { ...p, variants, images, tags: JSON.parse(p.tags || '[]') };
    });
    
    res.json(productsWithDetails);
  });

  app.post('/api/products', authenticateToken, (req, res) => {
    if (req.user.role === 'buyer') return res.sendStatus(403);
    
    const { 
      name, sku, category_id, fabric, weight, elasticity, composition, 
      price, tags, description, variants, images 
    } = req.body;

    const productId = uuidv4();
    
    const insertProduct = db.prepare(`
      INSERT INTO products (id, sku, name, category_id, fabric, weight, elasticity, composition, price, tags, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertVariant = db.prepare(`
      INSERT INTO product_variants (id, product_id, color, size, stock, weight, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertImage = db.prepare(`
      INSERT INTO product_images (id, product_id, url, type)
      VALUES (?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertProduct.run(productId, sku, name, category_id, fabric, weight, elasticity, composition, price, JSON.stringify(tags), description);
      
      variants.forEach((v: any) => {
        insertVariant.run(uuidv4(), productId, v.color, v.size, v.stock, v.weight || 0, v.volume || 0);
      });

      images.forEach((img: any) => {
        insertImage.run(uuidv4(), productId, img.url, img.type);
      });
    });

    try {
      transaction();
      res.json({ message: 'Product created', id: productId });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.put('/api/products/:id', authenticateToken, (req, res) => {
      if (req.user.role === 'buyer') return res.sendStatus(403);
      const { id } = req.params;
      const { 
        name, sku, category_id, fabric, weight, elasticity, composition, 
        price, tags, description, variants, images 
      } = req.body;
    
      const transaction = db.transaction(() => {
        db.prepare(`
          UPDATE products SET sku=?, name=?, category_id=?, fabric=?, weight=?, elasticity=?, composition=?, price=?, tags=?, description=?
          WHERE id=?
        `).run(sku, name, category_id, fabric, weight, elasticity, composition, price, JSON.stringify(tags), description, id);
        
        variants.forEach((v: any) => {
          if (v.id) {
              db.prepare(`UPDATE product_variants SET color=?, size=?, stock=?, weight=?, volume=? WHERE id=?`).run(v.color, v.size, v.stock, v.weight, v.volume, v.id);
          } else {
              db.prepare(`INSERT INTO product_variants (id, product_id, color, size, stock, weight, volume) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(uuidv4(), id, v.color, v.size, v.stock, v.weight || 0, v.volume || 0);
          }
        });

        // Images - Replace all is usually fine
        db.prepare('DELETE FROM product_images WHERE product_id = ?').run(id);
        images.forEach((img: any) => {
          db.prepare(`INSERT INTO product_images (id, product_id, url, type) VALUES (?, ?, ?, ?)`).run(uuidv4(), id, img.url, img.type);
        });
      });
    
      try {
        transaction();
        res.json({ message: 'Product updated' });
      } catch (err: any) {
        res.status(500).json({ message: err.message });
      }
  });

  app.delete('/api/products/:id', authenticateToken, (req, res) => {
      if (req.user.role === 'buyer') return res.sendStatus(403);
      db.prepare('UPDATE products SET is_deleted = 1 WHERE id = ?').run(req.params.id);
      res.json({ message: 'Product deleted' });
  });

  // Categories
  app.get('/api/categories', (req, res) => {
      const cats = db.prepare('SELECT * FROM categories').all();
      res.json(cats);
  });

  // Orders
  app.post('/api/orders', authenticateToken, (req, res) => {
      const { items } = req.body; // items: [{ variant_id, quantity }]
      const userId = req.user.id;
      
      // Calculate total and check stock
      let totalAmount = 0;
      const orderId = uuidv4();
      const orderItems: any[] = [];

      const transaction = db.transaction(() => {
          // Get user discount
          const user = db.prepare('SELECT discount_rate FROM users WHERE id = ?').get(userId) as any;
          const discountRate = user ? user.discount_rate : 1.0;

          for (const item of items) {
              const variant = db.prepare('SELECT * FROM product_variants WHERE id = ?').get(item.variant_id) as any;
              if (!variant) throw new Error(`Variant not found: ${item.variant_id}`);
              if (variant.stock < item.quantity) throw new Error(`Insufficient stock for variant ${variant.id}`);
              
              const product = db.prepare('SELECT price FROM products WHERE id = ?').get(variant.product_id) as any;
              
              // Deduct stock
              db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?').run(item.quantity, item.variant_id);
              
              const price = product.price * discountRate;
              totalAmount += price * item.quantity;
              
              orderItems.push({
                  id: uuidv4(),
                  order_id: orderId,
                  product_id: variant.product_id,
                  variant_id: item.variant_id,
                  quantity: item.quantity,
                  price_at_time: price
              });
          }

          db.prepare('INSERT INTO orders (id, user_id, status, total_amount, discount_applied) VALUES (?, ?, ?, ?, ?)').run(
              orderId, userId, 'pending', totalAmount, discountRate
          );

          const insertItem = db.prepare('INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?, ?)');
          orderItems.forEach(item => {
              insertItem.run(item.id, item.order_id, item.product_id, item.variant_id, item.quantity, item.price_at_time);
          });
      });

      try {
          transaction();
          res.json({ message: 'Order created', id: orderId });
      } catch (err: any) {
          res.status(400).json({ message: err.message });
      }
  });

  app.get('/api/orders', authenticateToken, (req, res) => {
      let query = `
          SELECT o.*, u.name as user_name, u.username as user_phone 
          FROM orders o 
          LEFT JOIN users u ON o.user_id = u.id 
      `;
      
      const params: any[] = [];
      if (req.user.role === 'buyer') {
          query += ' WHERE o.user_id = ?';
          params.push(req.user.id);
      }
      
      query += ' ORDER BY o.created_at DESC';
      
      const orders = db.prepare(query).all(...params);
      
      // Hydrate items
      const ordersWithItems = orders.map((o: any) => {
          const items = db.prepare(`
              SELECT oi.*, p.name as product_name, p.sku, pv.color, pv.size, p.price as original_price
              FROM order_items oi
              LEFT JOIN products p ON oi.product_id = p.id
              LEFT JOIN product_variants pv ON oi.variant_id = pv.id
              WHERE oi.order_id = ?
          `).all(o.id);
          return { ...o, items };
      });
      
      res.json(ordersWithItems);
  });

  app.put('/api/orders/:id/status', authenticateToken, (req, res) => {
      if (req.user.role === 'buyer') return res.sendStatus(403);
      const { status, tracking_number } = req.body;
      
      db.prepare('UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?').run(status, tracking_number || null, req.params.id);
      res.json({ message: 'Order updated' });
  });

  // Partial Cancellation
  app.post('/api/orders/cancel-item', authenticateToken, (req, res) => {
      const { order_item_id, reason } = req.body;
      
      // If buyer, just mark as requested
      if (req.user.role === 'buyer') {
          db.prepare('UPDATE order_items SET status = \'cancellation_requested\', cancellation_reason = ? WHERE id = ?').run(reason, order_item_id);
          res.json({ message: 'Cancellation requested' });
      } else {
          // Admin approves
          const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(order_item_id) as any;
          if (!item) return res.status(404).json({ message: 'Item not found' });
          
          const transaction = db.transaction(() => {
              // Restore stock
              db.prepare('UPDATE product_variants SET stock = stock + ? WHERE id = ?').run(item.quantity, item.variant_id);
              // Update item status
              db.prepare('UPDATE order_items SET status = \'cancelled\' WHERE id = ?').run(order_item_id);
              // Update order total? (Optional, but good for accounting)
              db.prepare('UPDATE orders SET total_amount = total_amount - ? WHERE id = ?').run(item.price_at_time * item.quantity, item.order_id);
          });
          
          transaction();
          res.json({ message: 'Item cancelled and stock restored' });
      }
  });

  // Users (Admin only)
  app.get('/api/users', authenticateToken, (req, res) => {
      if (req.user.role === 'buyer') return res.sendStatus(403);
      const users = db.prepare('SELECT id, username, role, name, phone, discount_rate, notes, created_at FROM users WHERE role = \'buyer\'').all();
      res.json(users);
  });

  app.put('/api/users/:id', authenticateToken, (req, res) => {
      if (req.user.role === 'buyer') return res.sendStatus(403);
      const { discount_rate, notes } = req.body;
      db.prepare('UPDATE users SET discount_rate = ?, notes = ? WHERE id = ?').run(discount_rate, notes, req.params.id);
      res.json({ message: 'User updated' });
  });

  // Files
  app.get('/api/files', authenticateToken, (req, res) => {
      let query = `
          SELECT f.*, s.name as sender_name 
          FROM files f
          LEFT JOIN users s ON f.sender_id = s.id
          WHERE f.receiver_id = 'all' OR f.receiver_id = ? OR f.sender_id = ?
          ORDER BY f.created_at DESC
      `;
      const files = db.prepare(query).all(req.user.id, req.user.id);
      res.json(files);
  });

  app.post('/api/files/send', authenticateToken, (req, res) => {
      const { receiver_id, url, name, size } = req.body;
      const id = uuidv4();
      db.prepare('INSERT INTO files (id, sender_id, receiver_id, url, name, size) VALUES (?, ?, ?, ?, ?, ?)').run(
          id, req.user.id, receiver_id, url, name, size
      );
      res.json({ message: 'File sent' });
  });

  // Dashboard Stats
  app.get('/api/stats/admin', authenticateToken, (req, res) => {
      if (req.user.role === 'buyer') return res.sendStatus(403);
      
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date().toISOString().slice(0, 7) + '-01';
      
      const dailySales = db.prepare('SELECT SUM(total_amount) as total FROM orders WHERE date(created_at) = ?').get(today) as any;
      const monthlySales = db.prepare('SELECT SUM(total_amount) as total FROM orders WHERE date(created_at) >= ?').get(monthStart) as any;
      
      // Picking list for today (pending/processing)
      const pickingList = db.prepare(`
          SELECT p.name, pv.color, pv.size, SUM(oi.quantity) as qty
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          JOIN products p ON oi.product_id = p.id
          JOIN product_variants pv ON oi.variant_id = pv.id
          WHERE o.status IN ('pending', 'processing') AND oi.status = 'normal'
          GROUP BY p.name, pv.color, pv.size
      `).all();

      res.json({
          dailySales: dailySales.total || 0,
          monthlySales: monthlySales.total || 0,
          pickingList
      });
  });

  app.get('/api/stats/buyer', authenticateToken, (req, res) => {
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date().toISOString().slice(0, 7) + '-01';

      const daily = db.prepare('SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE user_id = ? AND date(created_at) = ?').get(userId, today) as any;
      const monthly = db.prepare('SELECT COUNT(*) as count, SUM(total_amount) as total FROM orders WHERE user_id = ? AND date(created_at) >= ?').get(userId, monthStart) as any;
      
      // Last 30 days trend
      const trend = db.prepare(`
          SELECT date(created_at) as date, SUM(total_amount) as amount 
          FROM orders 
          WHERE user_id = ? AND created_at >= date('now', '-30 days')
          GROUP BY date(created_at)
      `).all(userId);

      res.json({
          daily: { count: daily.count, total: daily.total || 0 },
          monthly: { count: monthly.count, total: monthly.total || 0 },
          trend
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
