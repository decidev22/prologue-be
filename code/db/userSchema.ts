import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  uid: {
    type: Number,
  },
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  verification: {
    randomSeed: String,
    verified: Boolean,
    failCount: Number,
    timestamp: [String],
  },
  authentication: {
    password: { type: String, required: true, select: false },
    salt: { type: String, select: false },
    sessionToken: { type: String, select: false },
  },
  profileTitle: {
    type: String,
  },
  blogHistory: {
    blogids: [String],
  },
  viewedBlogHistory: {
    record: [
      {
        id: String,
        time: String,
      },
    ],
  },
  role: {
    type: String,
  },
  favoriteBlog: {
    blogids: [String],
  },
  popularBlogsWritten: {
    blogids: [String],
  },
  myComments: {
    records: [
      {
        blogId: String,
        comment: String,
        time: Date,
      },
    ],
  },
});

export const UserModel = mongoose.model("User", UserSchema);
