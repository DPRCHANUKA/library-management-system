const mongoose = require('mongoose');

const studyGroupSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    maxMembers: {
      type: Number,
      required: true,
      default: 10,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pendingRequests: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // PDF attachments for the group
    attachments: [{
      filename: String,       // original file name
      storedName: String,     // uuid name on disk
      fileUrl: String,        // relative URL path to serve
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      uploadedAt: { type: Date, default: Date.now },
      size: String,
    }],
  },
  {
    timestamps: true,
  }
);

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);
module.exports = StudyGroup;
