import { connectDb } from '../_lib/db';
import { FileModel } from '../_lib/file-model';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load bcrypt lazily so native-module failures don't crash the whole lambda.
    const bcryptMod: any = await import('bcrypt');
    const bcrypt = bcryptMod.default || bcryptMod;

    await connectDb();
    const { id } = req.query;
    const { password } = req.body || {};

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    let fileRecord: any;
    try {
      fileRecord = await FileModel.findById(id).lean();
    } catch (_e) {
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
      return res
        .status(410)
        .json({ error: 'This file is no longer available (One-time download only)' });
    }

    if (fileRecord.one_time_open) {
      await FileModel.findByIdAndUpdate(id, { is_opened: true });
    }

    res.setHeader('Content-Type', fileRecord.file_type);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileRecord.original_name}"`
    );
    return res.send(fileRecord.file_data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Download failed' });
  }
}
