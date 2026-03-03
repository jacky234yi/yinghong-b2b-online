import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('inventory.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'super_admin', 'supplier_admin', 'buyer'
    discount REAL DEFAULT 1.0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS partitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partition_id INTEGER,
    sku TEXT UNIQUE,
    fabric TEXT,
    weight REAL,
    elasticity TEXT,
    composition TEXT,
    color TEXT,
    price REAL,
    main_images TEXT, -- JSON array
    detail_images TEXT, -- JSON array
    size_chart TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(partition_id) REFERENCES partitions(id)
  );

  CREATE TABLE IF NOT EXISTS skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    size TEXT,
    stock INTEGER DEFAULT 0,
    restock_date TEXT,
    restock_quantity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- 'low_stock', 'system'
    message TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, -- Custom ID: username + YYYYMMDD + serial
    user_id INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'completed', 'cancelled'
    total_amount REAL,
    tracking_number TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    product_id INTEGER,
    sku_id INTEGER,
    size TEXT,
    quantity INTEGER,
    price REAL,
    status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'cancel_pending'
    cancel_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(sku_id) REFERENCES skus(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER, -- 0 for all/broadcast, -1 for all admins
    filename TEXT,
    original_name TEXT,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id)
  );

  -- Performance Indexes
  CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_skus_product ON skus(product_id);
  CREATE INDEX IF NOT EXISTS idx_files_receiver ON files(receiver_id);
`);

// Migration: Add columns to skus if not exists
try {
  db.prepare('ALTER TABLE skus ADD COLUMN restock_date TEXT').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE skus ADD COLUMN restock_quantity INTEGER DEFAULT 0').run();
} catch (e) {}
try {
  db.prepare('ALTER TABLE files ADD COLUMN note TEXT').run();
} catch (e) {}

// Seed initial users if not exist
const seedUsers = () => {
  const superAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('super');
  if (!superAdmin) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('super', '123', 'super_admin');
  }
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', '123', 'supplier_admin');
  }
};
seedUsers();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.use(express.json({ limit: '50mb' }));

// Multer setup for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Notifications
app.get('/api/notifications', (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50').all();
  res.json(notifications);
});

app.post('/api/notifications/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1').run();
  res.json({ success: true });
});

// SKUs
app.get('/api/skus/low-stock', (req, res) => {
  const lowStock = db.prepare(`
    SELECT p.sku, s.size, s.stock 
    FROM skus s 
    JOIN products p ON s.product_id = p.id 
    WHERE s.stock <= 10
  `).all();
  res.json(lowStock);
});

app.patch('/api/skus/:id/stock', (req, res) => {
  try {
    const { stock, restock_date, restock_quantity } = req.body;
    if (typeof stock === 'number') {
      db.prepare('UPDATE skus SET stock = ?, restock_date = ?, restock_quantity = ? WHERE id = ?').run(stock, restock_date, restock_quantity, req.params.id);
      
      // Check for low stock notification after manual update
      const updatedSku = db.prepare('SELECT p.sku, s.size, s.stock FROM skus s JOIN products p ON s.product_id = p.id WHERE s.id = ?').get(req.params.id);
      if (updatedSku && (updatedSku.stock === 10 || updatedSku.stock === 5)) {
        const message = `库存预警: 商品 ${updatedSku.sku} (尺码: ${updatedSku.size}) 仅剩 ${updatedSku.stock} 件`;
        db.prepare('INSERT INTO notifications (type, message) VALUES (?, ?)').run('low_stock', message);
        io.emit('notification:created', { type: 'low_stock', message });
      }
    } else {
      db.prepare('UPDATE skus SET restock_date = ?, restock_quantity = ? WHERE id = ?').run(restock_date, restock_quantity, req.params.id);
    }
    res.json({ success: true });
  } catch (error: any) {
    console.error('Stock update error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auth
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
  if (user) {
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, discount: user.discount } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  try {
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, 'buyer');
    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ success: false, message: 'Username already exists' });
  }
});

// User Management (Super Admin)
app.get('/api/admins', (req, res) => {
  const admins = db.prepare("SELECT id, username, role, created_at FROM users WHERE role = 'supplier_admin'").all();
  res.json(admins);
});

app.post('/api/admins', (req, res) => {
  const { username, password } = req.body;
  try {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, 'supplier_admin');
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ success: false });
  }
});

app.delete('/api/admins/:id', (req, res) => {
  db.prepare("DELETE FROM users WHERE id = ? AND role = 'supplier_admin'").run(req.params.id);
  res.json({ success: true });
});

// Buyer Management (Supplier Admin)
app.get('/api/buyers', (req, res) => {
  const buyers = db.prepare("SELECT id, username, discount, notes, created_at FROM users WHERE role = 'buyer'").all();
  res.json(buyers);
});

app.put('/api/buyers/:id', (req, res) => {
  const { discount, notes } = req.body;
  db.prepare('UPDATE users SET discount = ?, notes = ? WHERE id = ?').run(discount, notes, req.params.id);
  res.json({ success: true });
});

// Partitions
app.get('/api/partitions', (req, res) => {
  res.json(db.prepare('SELECT * FROM partitions').all());
});

app.post('/api/partitions', (req, res) => {
  const { name } = req.body;
  db.prepare('INSERT INTO partitions (name) VALUES (?)').run(name);
  res.json({ success: true });
});

app.delete('/api/partitions/:id', (req, res) => {
  db.prepare('DELETE FROM partitions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Products
app.get('/api/products', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, pr.name as partition_name 
    FROM products p 
    JOIN partitions pr ON p.partition_id = pr.id
  `).all();
  
  const productsWithSkus = products.map((p: any) => {
    const skus = db.prepare('SELECT * FROM skus WHERE product_id = ?').all(p.id);
    return { 
      ...p, 
      skus,
      main_images: JSON.parse(p.main_images || '[]'),
      detail_images: JSON.parse(p.detail_images || '[]')
    };
  });
  res.json(productsWithSkus);
});

app.post('/api/products', (req, res) => {
  const { partition_id, sku, fabric, weight, elasticity, composition, color, price, main_images, detail_images, size_chart, notes, skus } = req.body;
  
  const transaction = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO products (partition_id, sku, fabric, weight, elasticity, composition, color, price, main_images, detail_images, size_chart, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(partition_id, sku, fabric, weight, elasticity, composition, color, price, JSON.stringify(main_images), JSON.stringify(detail_images), size_chart, notes);
    
    const productId = result.lastInsertRowid;
    const insertSku = db.prepare('INSERT INTO skus (product_id, size, stock) VALUES (?, ?, ?)');
    for (const s of skus) {
      insertSku.run(productId, s.size, s.stock);
    }
    return productId;
  });

  try {
    const id = transaction();
    res.json({ success: true, id });
  } catch (e) {
    res.status(400).json({ success: false, message: 'SKU must be unique' });
  }
});

app.put('/api/products/:id', (req, res) => {
  const { partition_id, sku, fabric, weight, elasticity, composition, color, price, main_images, detail_images, size_chart, notes, skus } = req.body;
  
  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE products SET 
        partition_id = ?, sku = ?, fabric = ?, weight = ?, elasticity = ?, 
        composition = ?, color = ?, price = ?, main_images = ?, 
        detail_images = ?, size_chart = ?, notes = ?
      WHERE id = ?
    `).run(partition_id, sku, fabric, weight, elasticity, composition, color, price, JSON.stringify(main_images), JSON.stringify(detail_images), size_chart, notes, req.params.id);
    
    // Simple way: delete and re-insert SKUs or update existing ones
    // For simplicity in this demo, we'll update matching sizes and insert new ones
    const existingSkus = db.prepare('SELECT * FROM skus WHERE product_id = ?').all(req.params.id);
    const insertSku = db.prepare('INSERT INTO skus (product_id, size, stock) VALUES (?, ?, ?)');
    const updateSku = db.prepare('UPDATE skus SET stock = ? WHERE id = ?');
    
    for (const s of skus) {
      const existing = existingSkus.find((es: any) => es.size === s.size);
      if (existing) {
        updateSku.run(s.stock, existing.id);
      } else {
        insertSku.run(req.params.id, s.size, s.stock);
      }
    }
  });

  transaction();
  res.json({ success: true });
});

app.delete('/api/products/:id', (req, res) => {
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM skus WHERE product_id = ?').run(req.params.id);
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  });
  transaction();
  res.json({ success: true });
});

// Orders
app.post('/api/orders', (req, res) => {
  const { user_id, items, total_amount } = req.body;
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(user_id);
  
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = db.prepare('SELECT COUNT(*) as count FROM orders WHERE id LIKE ?').get(user.username + dateStr + '%').count;
  const orderId = `${user.username}${dateStr}${(count + 1).toString().padStart(3, '0')}`;

  const transaction = db.transaction(() => {
    db.prepare('INSERT INTO orders (id, user_id, total_amount) VALUES (?, ?, ?)').run(orderId, user_id, total_amount);
    
    const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, sku_id, size, quantity, price) VALUES (?, ?, ?, ?, ?, ?)');
    const updateStock = db.prepare('UPDATE skus SET stock = stock - ? WHERE id = ? AND stock >= ?');

    for (const item of items) {
      const result = updateStock.run(item.quantity, item.sku_id, item.quantity);
      if (result.changes === 0) {
        const skuInfo = db.prepare('SELECT p.sku, s.size FROM skus s JOIN products p ON s.product_id = p.id WHERE s.id = ?').get(item.sku_id);
        throw new Error(`库存不足: ${skuInfo.sku} (尺码: ${skuInfo.size})`);
      }
      insertItem.run(orderId, item.product_id, item.sku_id, item.size, item.quantity, item.price);

      // Check for low stock notification
      const updatedSku = db.prepare('SELECT p.sku, s.size, s.stock FROM skus s JOIN products p ON s.product_id = p.id WHERE s.id = ?').get(item.sku_id);
      if (updatedSku.stock === 10 || updatedSku.stock === 5) {
        const message = `库存预警: 商品 ${updatedSku.sku} (尺码: ${updatedSku.size}) 仅剩 ${updatedSku.stock} 件`;
        db.prepare('INSERT INTO notifications (type, message) VALUES (?, ?)').run('low_stock', message);
        io.emit('notification:created', { type: 'low_stock', message });
      }
    }
  });

  try {
    transaction();
    io.emit('order:created'); // Notify all clients
    res.json({ success: true, orderId });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
});

app.get('/api/orders', (req, res) => {
  const { user_id, role } = req.query;
  let query = `
    SELECT o.*, u.username as buyer_name 
    FROM orders o 
    JOIN users u ON o.user_id = u.id
  `;
  let params: any[] = [];

  if (role === 'buyer') {
    query += ' WHERE o.user_id = ?';
    params.push(user_id);
  }

  query += ' ORDER BY o.created_at DESC';
  const orders = db.prepare(query).all(...params);
  
  const ordersWithItems = orders.map((o: any) => {
    const items = db.prepare(`
      SELECT oi.*, p.sku, p.color 
      FROM order_items oi 
      JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `).all(o.id);
    return { ...o, items };
  });

  res.json(ordersWithItems);
});

app.put('/api/orders/:id/status', (req, res) => {
  const { status, tracking_number } = req.body;
  db.prepare('UPDATE orders SET status = ?, tracking_number = ? WHERE id = ?').run(status, tracking_number || null, req.params.id);
  res.json({ success: true });
});

// Partial Cancellation
app.post('/api/orders/:id/cancel-request', (req, res) => {
  const { item_ids, reason } = req.body;
  const updateItem = db.prepare("UPDATE order_items SET status = 'cancel_pending', cancel_reason = ? WHERE id = ? AND order_id = ?");
  for (const id of item_ids) {
    updateItem.run(reason, id, req.params.id);
  }
  res.json({ success: true });
});

app.post('/api/orders/:id/cancel-approve', (req, res) => {
  const { item_id, approve } = req.body;
  const transaction = db.transaction(() => {
    const item = db.prepare('SELECT * FROM order_items WHERE id = ?').get(item_id);
    if (approve) {
      db.prepare("UPDATE order_items SET status = 'cancelled' WHERE id = ?").run(item_id);
      db.prepare('UPDATE skus SET stock = stock + ? WHERE id = ?').run(item.quantity, item.sku_id);
      
      // Recalculate order total
      const remainingTotal = db.prepare("SELECT SUM(quantity * price) as total FROM order_items WHERE order_id = ? AND status != 'cancelled'").get(req.params.id).total || 0;
      db.prepare('UPDATE orders SET total_amount = ? WHERE id = ?').run(remainingTotal, req.params.id);
    } else {
      db.prepare("UPDATE order_items SET status = 'active' WHERE id = ?").run(item_id);
    }
  });
  transaction();
  res.json({ success: true });
});

// Files
app.post('/api/files', upload.single('file'), (req: any, res) => {
  const { sender_id, receiver_id, note } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ success: false });

  const sender = db.prepare('SELECT role FROM users WHERE id = ?').get(sender_id);
  let finalReceiverId = parseInt(receiver_id);

  // If buyer is sending, it must go to all admins (-1)
  if (sender.role === 'buyer') {
    finalReceiverId = -1;
  }

  db.prepare('INSERT INTO files (sender_id, receiver_id, filename, original_name, size, note) VALUES (?, ?, ?, ?, ?, ?)')
    .run(sender_id, finalReceiverId, file.filename, file.originalname, file.size, note);
  
  res.json({ success: true });
});

app.get('/api/files', (req, res) => {
  const { user_id } = req.query;
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(user_id);
  
  let query = `
    SELECT f.*, u.username as sender_name 
    FROM files f 
    JOIN users u ON f.sender_id = u.id 
    WHERE f.receiver_id = 0 OR f.sender_id = ?
  `;
  let params: any[] = [user_id];

  if (user.role === 'super_admin' || user.role === 'supplier_admin') {
    query += ' OR f.receiver_id = -1 OR f.receiver_id = ?';
    params.push(user_id);
  } else {
    query += ' OR f.receiver_id = ?';
    params.push(user_id);
  }

  query += ' ORDER BY f.created_at DESC';
  const files = db.prepare(query).all(...params);
  res.json(files);
});

app.get('/api/files/download/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// Reports
app.get('/api/reports/admin', (req, res) => {
  const { buyer_id, start_date, end_date } = req.query;
  let query = `
    SELECT 
      DATE(o.created_at) as date, 
      SUM(o.total_amount) as total_sales, 
      COUNT(o.id) as order_count,
      SUM((SELECT SUM(quantity) FROM order_items WHERE order_id = o.id AND status != 'cancelled')) as total_items
    FROM orders o
    WHERE o.status != 'cancelled'
  `;
  let params: any[] = [];
  
  if (buyer_id && buyer_id !== '') {
    query += ' AND o.user_id = ?';
    params.push(parseInt(buyer_id as string));
  }
  if (start_date) {
    query += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }
  query += ' GROUP BY DATE(o.created_at) ORDER BY date ASC';
  
  const daily = db.prepare(query).all(...params);
  res.json(daily);
});

app.get('/api/reports/fulfillment', (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);
  
  const stats = db.prepare(`
    SELECT 
      p.sku, 
      oi.size, 
      p.color, 
      SUM(oi.quantity) as total_quantity,
      GROUP_CONCAT(DISTINCT u.username) as buyers
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON o.user_id = u.id
    WHERE DATE(o.created_at) = ? AND o.status != 'cancelled'
    GROUP BY p.sku, oi.size, p.color
    ORDER BY p.sku ASC, oi.size ASC
  `).all(targetDate);
  
  res.json(stats);
});

app.get('/api/reports/detailed', (req, res) => {
  const { buyer_id, start_date, end_date } = req.query;
  let query = `
    SELECT 
      DATE(o.created_at) as date,
      u.username as buyer_name,
      p.sku,
      p.color,
      oi.size,
      SUM(oi.quantity) as total_quantity,
      oi.price as unit_price,
      SUM(oi.quantity * oi.price) as total_cost
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON o.user_id = u.id
    WHERE o.status != 'cancelled' AND oi.status != 'cancelled'
  `;
  let params: any[] = [];

  if (buyer_id && buyer_id !== '') {
    query += ' AND o.user_id = ?';
    params.push(parseInt(buyer_id as string));
  }
  if (start_date) {
    query += ' AND DATE(o.created_at) >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND DATE(o.created_at) <= ?';
    params.push(end_date);
  }

  query += `
    GROUP BY DATE(o.created_at), u.username, p.sku, p.color, oi.size, oi.price
    ORDER BY date ASC, buyer_name ASC, p.sku ASC
  `;

  const data = db.prepare(query).all(...params);
  res.json(data);
});

app.get('/api/reports/buyer/:id', (req, res) => {
  const daily = db.prepare(`
    SELECT DATE(created_at) as date, SUM(total_amount) as sales, COUNT(id) as orders
    FROM orders 
    WHERE user_id = ? AND status != 'cancelled'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
    LIMIT 30
  `).all(req.params.id);
  
  const stats = db.prepare(`
    SELECT 
      SUM(total_amount) as total_sales, 
      COUNT(id) as total_orders,
      AVG(total_amount) as avg_order_value
    FROM orders 
    WHERE user_id = ? AND status != 'cancelled'
  `).get(req.params.id);

  res.json({ daily, stats });
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
