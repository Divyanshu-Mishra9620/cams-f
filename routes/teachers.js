import express from "express";
import Teacher from "../models/Teacher.js";
import { verifyToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/profile/me",
  verifyToken,
  authorizeRole(["teacher", "admin"]),
  async (req, res) => {
    try {
      const teacher = await Teacher.findOne({ userId: req.user.userId });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher profile not found" });
      }

      res.json(teacher);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/department/:department", verifyToken, async (req, res) => {
  try {
    const teachers = await Teacher.find({
      department: req.params.department,
    }).populate("userId", "username email");
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", verifyToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const { department } = req.query;
    let query = {};

    if (department) {
      query.department = department;
    }

    const teachers = await Teacher.find(query).populate(
      "userId",
      "username email",
    );
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", verifyToken, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).populate(
      "userId",
      "username email",
    );

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", verifyToken, authorizeRole(["admin"]), async (req, res) => {
  try {
    const {
      userId,
      employeeId,
      name,
      email,
      department,
      subjects,
      classes,
      phoneNumber,
    } = req.body;

    const existingTeacher = await Teacher.findOne({ employeeId });
    if (existingTeacher) {
      return res.status(400).json({ error: "Employee ID already exists" });
    }

    const teacher = new Teacher({
      userId,
      employeeId,
      name,
      email,
      department,
      subjects: subjects || [],
      classes: classes || [],
      phoneNumber,
    });

    await teacher.save();
    res.status(201).json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put(
  "/:id",
  verifyToken,
  authorizeRole(["teacher", "admin"]),
  async (req, res) => {
    try {
      const { name, email, department, subjects, classes, phoneNumber } =
        req.body;

      const teacher = await Teacher.findByIdAndUpdate(
        req.params.id,
        {
          name,
          email,
          department,
          subjects,
          classes,
          phoneNumber,
          updatedAt: new Date(),
        },
        { new: true },
      );

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      res.json(teacher);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const teacher = await Teacher.findByIdAndDelete(req.params.id);

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      res.json({ message: "Teacher deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
