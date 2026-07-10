import mongoose from "mongoose";

const socialAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["facebook", "zalo", "telegram", "instagram", "whatsapp"],
    },
    platformId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    avatarUrl: {
      type: String,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String, 
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Đảm bảo mỗi user chỉ có một liên kết duy nhất cho một tài khoản của một nền tảng
socialAccountSchema.index({ user: 1, platform: 1, platformId: 1 }, { unique: true });

export default mongoose.model("SocialAccount", socialAccountSchema);
