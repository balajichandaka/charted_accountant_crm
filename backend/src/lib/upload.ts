import multer from "multer";
import fs from "fs";
import path from "path";

export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads")
);

// Ensure the upload directory exists at boot.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const storage = multer.diskStorage({
  // Store each firm's uploads under its own subdirectory so files are isolated
  // per tenant on disk (and keys map cleanly to per-firm prefixes for S3 later).
  destination: (req, _file, cb) => {
    const firmId = (req as { user?: { firm?: string } }).user?.firm;
    const dir = firmId ? path.join(UPLOAD_DIR, firmId) : UPLOAD_DIR;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});
