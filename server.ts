import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Database setup
const db = new Database('shareitaf.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    uploader_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|ppt|pptx|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, PPT, DOC, JPG, JPEG, and PNG files are allowed.'));
  }
});

app.use(express.json());

// API Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { uploaderName, password } = req.body;
    const file = req.file;

    if (!file || !uploaderName || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const stmt = db.prepare(`
      INSERT INTO files (filename, original_name, uploader_name, password_hash, file_type, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(file.filename, file.originalname, uploaderName, passwordHash, file.mimetype, file.size);

    res.json({ success: true, message: 'File uploaded successfully!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files', (req, res) => {
  try {
    const files = db.prepare('SELECT id, original_name, uploader_name, file_type, file_size, upload_time FROM files ORDER BY upload_time DESC').all();
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const fileRecord = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as any;

    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    const passwordMatch = await bcrypt.compare(password, fileRecord.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const filePath = path.join(UPLOADS_DIR, fileRecord.filename);
    res.download(filePath, fileRecord.original_name);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
