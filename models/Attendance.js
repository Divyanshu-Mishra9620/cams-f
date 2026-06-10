import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    className: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "excused", "leave"],
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

attendanceSchema.index(
  { studentId: 1, className: 1, subject: 1, date: 1 },
  { unique: true },
);
attendanceSchema.index({ className: 1, date: 1 });
attendanceSchema.index({ date: 1 });

export default mongoose.model("Attendance", attendanceSchema);
