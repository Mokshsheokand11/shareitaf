import { connectDb } from './_lib/db';
import { FileModel } from './_lib/file-model';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await connectDb();
    const files = await FileModel.find()
      .sort({ upload_time: -1 })
      .select(
        'original_name uploader_name file_type file_size upload_time one_time_open is_opened security_question'
      )
      .lean();

    const mappedFiles = files.map((f: any) => ({ ...f, id: f._id }));
    return res.json(mappedFiles);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to load files' });
  }
}
