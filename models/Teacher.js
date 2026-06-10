import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    classes: {
      type: [String],
      default: [],
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    joinDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

teacherSchema.index({ employeeId: 1 });
teacherSchema.index({ department: 1 });
teacherSchema.index({ classes: 1 });

export default mongoose.model("Teacher", teacherSchema);
