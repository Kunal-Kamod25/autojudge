const fs = require('fs');

/**
 * cleanupUploadedFile handles deleting a file if it exists.
 * @param {Object} file - The file object from multer.
 */
exports.cleanupUploadedFile = (file) => {
  if (file?.path) {
    fs.unlink(file.path, () => {});
  }
};
