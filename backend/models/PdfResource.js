const mongoose = require('mongoose');

const pdfResourceSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    size: {
      type: String, // e.g., "2.4 MB"
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
      // For now it can just be a mock string or an S3 path
    },
  },
  {
    timestamps: true,
  }
);

const PdfResource = mongoose.model('PdfResource', pdfResourceSchema);
module.exports = PdfResource;
