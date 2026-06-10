import express from "express";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Teacher from "../models/Teacher.js";
import { verifyToken, authorizeRole } from "../middleware/auth.js";

const router = express.Router();

const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

const startOfDay = (date = new Date()) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return null;
  }
  value.setHours(0, 0, 0, 0);
  return value;
};

const nextDay = (date) => {
  const value = new Date(date);
  value.setDate(value.getDate() + 1);
  return value;
};

const resolveStudent = async (studentId) => {
  const query = isObjectId(studentId) ? { _id: studentId } : { studentId };
  return Student.findOne(query);
};

const populateAttendance = (query) =>
  query
    .populate("studentId", "name studentId email semester classes")
    .populate("markedBy", "name employeeId email");

router.post(
  "/mark",
  verifyToken,
  authorizeRole(["teacher", "admin"]),
  async (req, res) => {
    try {
      const { studentId, className, subject, date, status, remarks } = req.body;

      if (!studentId || !className || !status) {
        return res.status(400).json({
          error: "studentId, className, and status are required",
        });
      }

      const student = await resolveStudent(studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const attendanceDate = startOfDay(date);
      if (!attendanceDate) {
        return res.status(400).json({ error: "Invalid attendance date" });
      }

      const teacher = await Teacher.findOne({ userId: req.user.userId });

      const attendance = await Attendance.findOneAndUpdate(
        {
          studentId: student._id,
          className,
          subject: subject || className,
          date: attendanceDate,
        },
        {
          studentId: student._id,
          className,
          subject: subject || className,
          date: attendanceDate,
          status,
          markedBy: teacher?._id || null,
          remarks,
        },
        { new: true, upsert: true, runValidators: true },
      );

      const populatedAttendance = await Attendance.findById(attendance._id)
        .populate("studentId", "name studentId email semester classes")
        .populate("markedBy", "name employeeId email");

      res.status(201).json(populatedAttendance);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.get("/", verifyToken, async (req, res) => {
  try {
    const { studentId, className, startDate, endDate } = req.query;
    const query = {};

    if (studentId) {
      const student = await resolveStudent(studentId);
      if (!student) {
        return res.json([]);
      }
      query.studentId = student._id;
    }

    if (className) {
      query.className = className;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startOfDay(startDate);
      if (endDate) query.date.$lt = nextDay(startOfDay(endDate));
    }

    const attendance = await populateAttendance(
      Attendance.find(query).sort({ date: -1, createdAt: -1 }),
    );

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/student/:studentId", verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const student = await resolveStudent(req.params.studentId);

    if (!student) {
      return res.json([]);
    }

    let query = { studentId: student._id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startOfDay(startDate);
      if (endDate) query.date.$lt = nextDay(startOfDay(endDate));
    }

    const attendance = await populateAttendance(
      Attendance.find(query).sort({ date: -1 }),
    );

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/class/:className/date/:date", verifyToken, async (req, res) => {
  try {
    const dateObj = startOfDay(req.params.date);
    if (!dateObj) {
      return res.status(400).json({ error: "Invalid attendance date" });
    }

    const attendance = await populateAttendance(
      Attendance.find({
        className: req.params.className,
        date: {
          $gte: dateObj,
          $lt: nextDay(dateObj),
        },
      }).sort({ createdAt: -1 }),
    );

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats/student/:studentId", verifyToken, async (req, res) => {
  try {
    const student = await resolveStudent(req.params.studentId);
    if (!student) {
      return res.json({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        excused: 0,
        percentage: 0,
      });
    }

    const attendance = await Attendance.find({
      studentId: student._id,
    });

    const stats = {
      total: attendance.length,
      present: attendance.filter((a) => a.status === "present").length,
      absent: attendance.filter((a) => a.status === "absent").length,
      late: attendance.filter((a) => a.status === "late").length,
      leave: attendance.filter((a) => a.status === "leave").length,
      excused: attendance.filter((a) => a.status === "excused").length,
    };

    stats.percentage =
      stats.total > 0
        ? Math.round(((stats.present + stats.late) / stats.total) * 100)
        : 0;

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats/class/:className", verifyToken, async (req, res) => {
  try {
    const attendance = await Attendance.find({
      className: req.params.className,
    });
    const students = await Student.find({ classes: req.params.className });

    const stats = {
      totalStudents: students.length,
      totalRecords: attendance.length,
      present: attendance.filter((a) => a.status === "present").length,
      absent: attendance.filter((a) => a.status === "absent").length,
      late: attendance.filter((a) => a.status === "late").length,
      leave: attendance.filter((a) => a.status === "leave").length,
      excused: attendance.filter((a) => a.status === "excused").length,
    };

    stats.percentage =
      stats.totalRecords > 0
        ? Math.round(((stats.present + stats.late) / stats.totalRecords) * 100)
        : 0;

    res.json(stats);
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
      const { status, remarks } = req.body;

      const attendance = await Attendance.findByIdAndUpdate(
        req.params.id,
        { status, remarks, updatedAt: new Date() },
        { new: true },
      )
        .populate("studentId", "name studentId email semester classes")
        .populate("markedBy", "name employeeId email");

      if (!attendance) {
        return res.status(404).json({ error: "Attendance record not found" });
      }

      res.json(attendance);
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
      const attendance = await Attendance.findByIdAndDelete(req.params.id);

      if (!attendance) {
        return res.status(404).json({ error: "Attendance record not found" });
      }

      res.json({ message: "Attendance record deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

router.post(
  "/bulk/mark-class",
  verifyToken,
  authorizeRole(["teacher", "admin"]),
  async (req, res) => {
    try {
      const { className, subject, date, attendanceData } = req.body;

      if (!className || !Array.isArray(attendanceData)) {
        return res.status(400).json({
          error: "className and attendanceData are required",
        });
      }

      const attendanceDate = startOfDay(date);
      if (!attendanceDate) {
        return res.status(400).json({ error: "Invalid attendance date" });
      }

      const teacher = await Teacher.findOne({ userId: req.user.userId });
      const operations = [];

      for (const record of attendanceData) {
        const student = await resolveStudent(record.studentId);
        if (!student || !record.status) continue;

        operations.push({
          updateOne: {
            filter: {
              studentId: student._id,
              className,
              subject: subject || className,
              date: attendanceDate,
            },
            update: {
              $set: {
                studentId: student._id,
                className,
                subject: subject || className,
                date: attendanceDate,
                status: record.status,
                markedBy: teacher?._id || null,
                remarks: record.remarks,
              },
            },
            upsert: true,
          },
        });
      }

      if (operations.length === 0) {
        return res.status(400).json({ error: "No valid attendance records" });
      }

      const result = await Attendance.bulkWrite(operations, {
        ordered: false,
      });

      res.status(201).json({
        message: `${operations.length} attendance records saved`,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

export default router;
