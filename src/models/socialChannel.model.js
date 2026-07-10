import mongoose from "mongoose";

const socialChannelSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    socialAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SocialAccount",
      required: true,
    },
    platform: {
      type: String,
      required: true,
      enum: ["facebook", "zalo", "telegram", "instagram", "whatsapp"],
    },
    platformChannelId: {
      type: String,
      required: true, // ID của Page, OA ID, hoặc Username Bot
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
    },
    avatarUrl: {
      type: String,
    },
    accessToken: {
      type: String,
      required: true, // Token gửi tin phản hồi của Page/Bot
    },
    isConnected: {
      type: Boolean,
      default: true,
    },
    syncMessenger: {
      type: Boolean,
      default: true,
    },
    syncComments: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Ràng buộc một user chỉ kết nối một channel duy nhất cho mỗi nền tảng
socialChannelSchema.index({ user: 1, platform: 1, platformChannelId: 1 }, { unique: true });

// Tự động format dữ liệu khi gọi res.json()
socialChannelSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.accessToken; // Bảo mật: Ẩn channel token khi gửi về client
    return ret;
  },
});

export default mongoose.model("SocialChannel", socialChannelSchema);
