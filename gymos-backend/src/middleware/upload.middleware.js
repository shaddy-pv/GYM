const multer = require('multer');
const FileType = require('file-type');
const { errorResponse } = require('../utils/ApiResponse');

// Use memory storage — files are passed as buffers to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp, gif)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

/**
 * Middleware factory for single file uploads
 * @param {string} fieldName - Form field name
 */
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(res, 'File size must not exceed 5MB', null, 400);
        }
        return errorResponse(res, `Upload error: ${err.message}`, null, 400);
      }
      if (err) {
        return errorResponse(res, err.message, null, 400);
      }

      // Magic byte validation (L-1 security finding)
      if (req.file) {
        const type = await FileType.fromBuffer(req.file.buffer);
        if (!type || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type.mime)) {
          return errorResponse(res, 'Invalid file content. Only valid images are allowed.', null, 400);
        }
      }

      next();
    });
  };
};

module.exports = { uploadSingle };
