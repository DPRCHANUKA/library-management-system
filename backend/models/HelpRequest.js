const mongoose = require('mongoose');

const helpRequestSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Resolved'],
      default: 'Open',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin or Senior who answers
    },
  },
  {
    timestamps: true,
  }
);

const HelpRequestModel = mongoose.model('HelpRequest', helpRequestSchema);
module.exports = HelpRequestModel;
