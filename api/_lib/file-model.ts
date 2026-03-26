import mongoose from 'mongoose';

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
  file_data: { type: Buffer, required: true },
});

export const FileModel =
  (mongoose.models.File as mongoose.Model<any>) ||
  mongoose.model('File', fileSchema);
