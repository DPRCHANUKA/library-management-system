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
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileUrl: {
      type: String,
    },
    storedName: {
      type: String,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyGroup',
    },
  },
  {
    timestamps: true,
  }
);

const PdfResource = mongoose.model('PdfResource', pdfResourceSchema);
module.exports = PdfResource;
