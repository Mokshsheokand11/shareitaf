import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import mongoose from 'mongoose';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3001;

// Database setup: Adding timeouts for more robust connection on unstable networks
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shareitaf', {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error details:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
        console.error('TIP: This often means DNS for SRV records is failing. Check your DNS or use a non-SRV connection string.');
    }
  });

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  original_name: { type: String, required: true },
  uploader_name: { type: String, required: true },
  password_hash: { type: String, required: true },
  security_question: { type: String, required: true },
  security_answer_hash: { type: String, required: true },
  file_type: { type: String, required: true },
  file_size: { type: Number, required: true },
  upload_time: { type: Date, default: Date.now },
  one_time_open: { type: Boolean, default: false },
  is_opened: { type: Boolean, default: false },
  file_data: { type: Buffer, required: true }
});

const FileModel = mongoose.model('File', fileSchema);

// Multer configuration: Use memory storage to store file in MongoDB
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB (MongoDB limit is 16MB)
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
    const { uploaderName, password, securityQuestion, securityAnswer } = req.body;
    const file = req.file;

    if (!file || !uploaderName || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const securityAnswerHash = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
    const uniqueFilename = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

    const newFile = new FileModel({
      filename: uniqueFilename,
      original_name: file.originalname,
      uploader_name: uploaderName,
      password_hash: passwordHash,
      security_question: securityQuestion,
      security_answer_hash: securityAnswerHash,
      file_type: file.mimetype,
      file_size: file.size,
      one_time_open: req.body.oneTimeOpen === 'true',
      file_data: file.buffer
    });

    await newFile.save();

    res.json({ success: true, message: 'File uploaded successfully to database!' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const files = await FileModel.find()
      .sort({ upload_time: -1 })
      .select('original_name uploader_name file_type file_size upload_time one_time_open is_opened security_question')
      .lean();
    
    const mappedFiles = files.map(f => ({ ...f, id: f._id }));
    res.json(mappedFiles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    let fileRecord;
    try {
      fileRecord = await FileModel.findById(id).lean() as any;
    } catch (e) {
      return res.status(404).json({ error: 'Invalid file ID format' });
    }

    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    const passwordMatch = await bcrypt.compare(password, fileRecord.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    if (fileRecord.one_time_open && fileRecord.is_opened) {
      return res.status(410).json({ error: 'This file is no longer available (One-time download only)' });
    }

    if (fileRecord.one_time_open) {
      await FileModel.findByIdAndUpdate(id, { is_opened: true });
    }

    res.setHeader('Content-Type', fileRecord.file_type);
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.original_name}"`);
    res.send(fileRecord.file_data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({ error: 'Security answer is required to delete' });
    }

    const fileRecord = await FileModel.findById(id) as any;
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fileRecord.security_answer_hash) {
        return res.status(400).json({ error: 'This file cannot be deleted via security question (Legacy record)' });
    }

    const answerMatch = await bcrypt.compare(answer.toLowerCase().trim(), fileRecord.security_answer_hash);
    if (!answerMatch) {
      return res.status(401).json({ error: 'Incorrect security answer' });
    }

    await FileModel.findByIdAndDelete(id);
    res.json({ success: true, message: 'File deleted successfully' });
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

