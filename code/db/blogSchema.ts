import mongoose from "mongoose";

const CommnetSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  lastEdited: {
    type: Date,
  },
});

const BlogSchema = new mongoose.Schema({
  bid: {
    type: String,
  },
  username: {
    type: String,
  },
  userId: {
    type: String,
  },
  title: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
  },
  lastEdited: {
    type: Date,
  },
  content: {
    type: String,
    required: true,
  },
  hashTag: {
    type: [String],
  },
  category: {
    type: [String],
  },
  viewCount: {
    type: Number,
  },
  recentAccess: {
    type: [String],
  },
  lastTrendingTime: {
    type: Date,
  },
  comments: [CommnetSchema],
});

export const BlogModel = mongoose.model("Blog", BlogSchema);
