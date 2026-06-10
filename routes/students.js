import express from "express";
import Student from "../models/Student.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { verifyToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

router.get(
  "/",
  verifyToken,
  authorizeRole(["teacher", "admin"]),
  async (req, res) => {
    try {
      const { semester, className } = req.query;
      let query = {};

      if (semester) {
        query.semester = parseInt(semester);
      }
      if (className) {
        query.classes = className;
      }

      const students = await Student.find(query).populate(
        "userId",
        "username email",
      );
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/class/:className", verifyToken, async (req, res) => {
  try {
    const students = await Student.find({
      classes: req.params.className,
    }).populate("userId", "username email");
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/semester/:semester", verifyToken, async (req, res) => {
  try {
    const students = await Student.find({
      semester: parseInt(req.params.semester),
    }).populate("userId", "username email");
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get(
  "/profile/me",
  verifyToken,
  authorizeRole(["student"]),
  async (req, res) => {
    try {
      const student = await Student.findOne({ userId: req.user.userId });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      res.json(student);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const query = isObjectId(req.params.id)
      ? { _id: req.params.id }
      : { studentId: req.params.id };
    const student = await Student.findOne(query).populate(
      "userId",
      "username email",
    );

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/",
  verifyToken,
  authorizeRole(["teacher", "admin"]),
  async (req, res) => {
    try {
      const { userId, studentId, name, email, semester, classes, phoneNumber } =
        req.body;
      const normalizedEmail = email?.toLowerCase().trim();
      const normalizedStudentId = studentId?.trim();

      if (!normalizedStudentId || !name || !normalizedEmail || !semester) {
        return res.status(400).json({
          error: "studentId, name, email, and semester are required",
        });
      }

      const existingStudent = await Student.findOne({
        studentId: normalizedStudentId,
      });
      if (existingStudent) {
        return res.status(400).json({ error: "Student ID already exists" });
      }

      let accountId = userId;
      if (!accountId) {
        const existingUser = await User.findOne({
          $or: [{ email: normalizedEmail }, { username: normalizedStudentId }],
        });

        if (existingUser) {
          return res.status(400).json({
            error: "A user with this email or student ID already exists",
          });
        }

        const user = await User.create({
          username: normalizedStudentId,
          email: normalizedEmail,
          password: "student",
          role: "student",
        });
        accountId = user._id;
      }

      const student = new Student({
        userId: accountId,
        studentId: normalizedStudentId,
        name,
        email: normalizedEmail,
        semester: Number(semester),
        classes: classes || [],
        phoneNumber,
      });

      await student.save();
      res.status(201).json(student);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.put(
  "/:id",
  verifyToken,
  authorizeRole(["teacher", "admin"]),
  async (req, res) => {
    try {
      const { name, email, semester, classes, phoneNumber } = req.body;
      const query = isObjectId(req.params.id)
        ? { _id: req.params.id }
        : { studentId: req.params.id };

      const student = await Student.findOneAndUpdate(
        query,
        { name, email, semester, classes, phoneNumber, updatedAt: new Date() },
        { new: true, runValidators: true },
      );

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      res.json(student);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRole(["teacher", "admin"]),
  async (req, res) => {
    try {
      const query = isObjectId(req.params.id)
        ? { _id: req.params.id }
        : { studentId: req.params.id };
      const student = await Student.findOneAndDelete(query);

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      await Attendance.deleteMany({ studentId: student._id });

      res.json({ message: "Student deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
