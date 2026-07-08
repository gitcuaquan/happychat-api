import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Vui lòng cung cấp tên người dùng"],
      trim: true,
      minlength: [6, "Tên người dùng tối thiểu 6 ký tự"],
      maxlength: [32, "Tên người dùng tối đa 32 ký tự"],
    },

    password: {
      type: String,
      required: [true, "Vui lòng cung cấp mật khẩu"],
      minlength: [6, "Mật khẩu tối thiểu 6 ký tự"],
      select: false, // Mặc định không trả về trường password khi query
    },
    fullName: {
      type: String,
      trim: true,
      minlength: [2, "Họ tên tối thiểu 2 ký tự"],
      maxlength: [32, "Họ tên tối đa 32 ký tự"],
      default: "Bé Gạo",
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: "https://api.dicebear.com/10.x/big-smile/svg?seed=o5lgii8t",
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Mã hóa (hash) password trước khi lưu vào database
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Phương thức so sánh password người dùng nhập với password đã mã hóa trong database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Tự động format dữ liệu khi gọi res.json()
userSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.id = ret._id; // Đổi tên _id thành id cho đẹp
    delete ret._id; // Xóa _id gốc
    delete ret.__v; // Xóa version key của Mongoose
    delete ret.password; // Luôn luôn giấu password
    return ret;
  }
});


export default mongoose.model("User", userSchema);
