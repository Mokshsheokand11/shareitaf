import multer from 'multer';
import path from 'path';
import { connectDb } from './_lib/db';
import { FileModel } from './_lib/file-model';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /pdf|ppt|pptx|doc|docx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }

    cb(new Error('Only PDF, PPT, DOC, JPG, JPEG, and PNG files are allowed.'));
  },
});

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise<void>((resolve, reject) => {
    fn(req, res, (result: unknown) => {
      if (result instanceof Error) {
        return reject(result);
      }
      resolve();
    });
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load bcrypt lazily so native-module failures don't crash the whole lambda.
    const bcryptMod: any = await import('bcrypt');
    const bcrypt = bcryptMod.default || bcryptMod;

    await connectDb();
    await runMiddleware(req, res, upload.single('file'));

    const { uploaderName, password, securityQuestion, securityAnswer } = req.body as any;
    const file = (req as any).file;

    if (!file || !uploaderName || !password || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const securityAnswerHash = await bcrypt.hash(
      securityAnswer.toLowerCase().trim(),
      10
    );

    const uniqueFilename =
      Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

    const newFile = new FileModel({
      filename: uniqueFilename,
      original_name: file.originalname,
      uploader_name: uploaderName,
      password_hash: passwordHash,
      security_question: securityQuestion,
      security_answer_hash: securityAnswerHash,
      file_type: file.mimetype,
      file_size: file.size,
      one_time_open: String((req.body as any).oneTimeOpen) === 'true',
      file_data: file.buffer,
    });

    await newFile.save();
    return res.json({ success: true, message: 'File uploaded successfully to database!' });
  } catch (error: any) {
    if (error?.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large for Vercel deployment (max 4MB).' });
    }
    return res.status(500).json({ error: error.message || 'Upload failed' });
  }
}
