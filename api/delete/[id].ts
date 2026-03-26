import { connectDb } from '../_lib/db';
import { FileModel } from '../_lib/file-model';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load bcrypt lazily so native-module failures don't crash the whole lambda.
    const bcryptMod: any = await import('bcrypt');
    const bcrypt = bcryptMod.default || bcryptMod;

    await connectDb();
    const { id } = req.query;
    const { answer } = req.body || {};

    if (!answer) {
      return res.status(400).json({ error: 'Security answer is required to delete' });
    }

    const fileRecord: any = await FileModel.findById(id);
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!fileRecord.security_answer_hash) {
      return res
        .status(400)
        .json({ error: 'This file cannot be deleted via security question (Legacy record)' });
    }

    const answerMatch = await bcrypt.compare(
      answer.toLowerCase().trim(),
      fileRecord.security_answer_hash
    );

    if (!answerMatch) {
      return res.status(401).json({ error: 'Incorrect security answer' });
    }

    await FileModel.findByIdAndDelete(id);
    return res.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Delete failed' });
  }
}
