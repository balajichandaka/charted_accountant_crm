import { Router } from "express";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { UPLOAD_DIR } from "../lib/upload";

const router = Router();
router.use(authMiddleware);

// GET /api/attachments/:id — stream a stored file (auth required)
router.get("/:id", async (req, res, next) => {
  try {
    // findUnique is auto-scoped to the caller's firm by the Prisma extension,
    // so an attachment belonging to another firm resolves to null (404).
    const att = await prisma.attachment.findUnique({ where: { id: req.params.id } });
    if (!att) { res.status(404).json({ ok: false, error: "Not found" }); return; }

    // Resolve within UPLOAD_DIR and reject any path-traversal in the stored key.
    const filePath = path.resolve(UPLOAD_DIR, att.storageKey);
    if (filePath !== UPLOAD_DIR && !filePath.startsWith(UPLOAD_DIR + path.sep)) {
      res.status(400).json({ ok: false, error: "Invalid file path" }); return;
    }
    if (!fs.existsSync(filePath)) { res.status(404).json({ ok: false, error: "File missing" }); return; }

    res.setHeader("Content-Type", att.mimeType);
    const isImage = att.mimeType.startsWith("image/");
    const disposition = isImage ? "inline" : "attachment";
    res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(att.fileName)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
});

export default router;
