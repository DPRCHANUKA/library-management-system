const mongoose = require('mongoose');

const requestSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['Create Group', 'Join Group'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    
    // For Join Requests
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyGroup',
    },

    // For Create Requests
    title: String,
    module: String,
    path: String,
    isPrivate: Boolean,
    maxMembers: Number,
    members: [
      {
        name: String,
        itNumber: String,
      }
    ],
    
    // Backwards-compatible member details
    leaderName: String,
    leaderId: String,
    member2Name: String,
    member2Id: String,
    member3Name: String,
    member3Id: String,
    member4Name: String,
    member4Id: String,
    member5Name: String,
    member5Id: String,
    description: String,
  },
  {
    timestamps: true,
  }
);

const RequestModel = mongoose.model('Request', requestSchema);
module.exports = RequestModel;
