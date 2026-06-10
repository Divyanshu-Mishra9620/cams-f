class AttendanceSystem {
  constructor() {
    this.students = JSON.parse(localStorage.getItem("students")) || [];
    this.attendance = JSON.parse(localStorage.getItem("attendance")) || [];
    this.currentUser = JSON.parse(localStorage.getItem("currentUser"));
    this.syncFromDB();
  }

  async syncFromDB(options = {}) {
    try {
      const { notify = true } = options;
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const currentUser = JSON.parse(localStorage.getItem("currentUser"));
      const requests = [];

      if (currentUser?.role === "teacher" || currentUser?.role === "admin") {
        requests.push(fetch("http://localhost:5000/api/students", { headers }));
        requests.push(
          fetch("http://localhost:5000/api/attendance", { headers }),
        );
      } else if (currentUser?.role === "student" && currentUser.studentId) {
        requests.push(
          fetch("http://localhost:5000/api/students/profile/me", { headers }),
        );
        requests.push(
          fetch(
            `http://localhost:5000/api/attendance/student/${encodeURIComponent(currentUser.studentId)}`,
            { headers },
          ),
        );
      } else {
        return;
      }

      const [studentsRes, attendanceRes] = await Promise.all(requests);

      if (studentsRes?.ok) {
        const dbStudentsResponse = await studentsRes.json();
        const dbStudents = Array.isArray(dbStudentsResponse)
          ? dbStudentsResponse
          : [dbStudentsResponse];

        if (dbStudents.length > 0) {
          const mappedStudents = dbStudents.map((db) => ({
            id: db.studentId,
            name: db.name,
            email: db.email,
            semester: db.semester,
            classes: db.classes || [],
          }));

          const mergedStudents = [...this.students];
          mappedStudents.forEach((dbStudent) => {
            const index = mergedStudents.findIndex(
              (s) => s.id === dbStudent.id,
            );
            if (index > -1) {
              mergedStudents[index] = dbStudent;
            } else {
              mergedStudents.push(dbStudent);
            }
          });
          this.students = mergedStudents;
          this.saveData();

          if (currentUser?.role === "student") {
            const profile = mappedStudents[0];
            const nextUser = {
              ...currentUser,
              studentId: profile.id,
              name: profile.name,
              email: profile.email,
              semester: profile.semester,
              classes: profile.classes,
            };
            localStorage.setItem("currentUser", JSON.stringify(nextUser));
            this.currentUser = nextUser;
          }
        }
      }

      if (attendanceRes?.ok) {
        const dbAttendance = await attendanceRes.json();
        if (Array.isArray(dbAttendance) && dbAttendance.length > 0) {
          this.attendance = dbAttendance.map((record) => {
            const d = new Date(record.date);
            const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            let studentIdValue = currentUser?.studentId;
            if (record.studentId) {
              if (typeof record.studentId === "object") {
                studentIdValue =
                  record.studentId?.studentId || record.studentId?._id;
              } else {
                studentIdValue = record.studentId;
              }
            }

            return {
              id: record._id,
              date: localDate,
              class: record.className || record.subject || "Unknown Class",
              studentId: studentIdValue,
              status: record.status,
            };
          });
          this.saveData();
        }
      }

      if (notify) {
        window.dispatchEvent(new CustomEvent("cams:data-synced"));
      }
    } catch (error) {
      console.log("Could not sync with DB:", error);
    }
  }

  saveData() {
    localStorage.setItem("students", JSON.stringify(this.students));
    localStorage.setItem("attendance", JSON.stringify(this.attendance));
  }

  addStudent(student) {
    const existingIndex = this.students.findIndex(
      (item) => item.id === student.id,
    );
    if (existingIndex >= 0) {
      this.students[existingIndex] = student;
    } else {
      this.students.push(student);
    }
    this.saveData();

    const token =
      localStorage.getItem("authToken") || localStorage.getItem("token");
    return fetch("http://localhost:5000/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        studentId: student.id,
        name: student.name,
        email: student.email,
        semester: student.semester,
        classes: student.classes,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "Failed to save student to database");
        }
        return response.json();
      })
      .catch((e) => {
        console.error("DB Sync Error:", e);
        throw e;
      });
  }

  getStudentsByClass(className) {
    return this.students.filter((student) =>
      student.classes?.includes(className),
    );
  }
  getStudentsBySemester(semester) {
    return this.students.filter((student) => student.semester == semester);
  }

  getAllStudents() {
    return this.students;
  }

  async removeStudent(studentId) {
    this.students = this.students.filter((student) => student.id !== studentId);
    this.attendance = this.attendance.filter(
      (record) => record.studentId !== studentId,
    );
    this.saveData();

    const token =
      localStorage.getItem("authToken") || localStorage.getItem("token");
    if (token) {
      fetch(
        `http://localhost:5000/api/students/${encodeURIComponent(studentId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      ).catch((e) => console.error("DB Sync Error:", e));
    }
  }

  markAttendance(date, className, studentId, status) {
    const attendanceRecord = {
      date,
      class: className,
      studentId,
      status,
    };
    const existingIndex = this.attendance.findIndex(
      (record) =>
        record.studentId === studentId &&
        record.date === date &&
        record.class === className,
    );

    if (existingIndex >= 0) {
      this.attendance[existingIndex] = attendanceRecord;
    } else {
      this.attendance.push(attendanceRecord);
    }
    this.saveData();

    const token =
      localStorage.getItem("authToken") || localStorage.getItem("token");
    return fetch("http://localhost:5000/api/attendance/mark", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({
        studentId: studentId,
        className: className,
        subject: className,
        date: date,
        status: status,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "Failed to save attendance");
        }
        return response.json();
      })
      .catch((e) => {
        console.error("DB Sync Error:", e);
        throw e;
      });
  }

  hasAttendanceForDate(studentId, date, className = null) {
    return this.attendance.some(
      (record) =>
        record.studentId === studentId &&
        record.date === date &&
        (!className || record.class === className),
    );
  }

  getAttendanceByDate(date, className) {
    return this.attendance.filter(
      (record) => record.date === date && record.class === className,
    );
  }

  getStudentAttendance(studentId) {
    if (!studentId) return [];
    const normalizedId = String(studentId).trim().toLowerCase();

    return this.attendance.filter((record) => {
      const recordId = String(record.studentId || "")
        .trim()
        .toLowerCase();
      return recordId === normalizedId;
    });
  }

  getStudentById(studentId) {
    if (!studentId) return null;
    return this.students.find(
      (student) =>
        String(student.id).trim().toLowerCase() ===
        String(studentId).trim().toLowerCase(),
    );
  }

  calculateAttendancePercentage(studentId) {
    const studentAttendance = this.getStudentAttendance(studentId);
    if (studentAttendance.length === 0) return 0;

    const present = studentAttendance.filter(
      (record) => record.status === "present",
    ).length;
    return Math.round((present / studentAttendance.length) * 100);
  }

  getClassStatistics(className) {
    const students = this.getStudentsByClass(className);
    const totalStudents = students.length;

    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        presentToday: 0,
        overallPercentage: 0,
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = this.getAttendanceByDate(today, className);
    const presentToday = todayAttendance.filter(
      (record) => record.status === "present",
    ).length;

    let totalRecords = 0;
    let totalPresent = 0;

    students.forEach((student) => {
      const attendance = this.getStudentAttendance(student.id);
      totalRecords += attendance.length;
      totalPresent += attendance.filter(
        (record) => record.status === "present",
      ).length;
    });

    const overallPercentage =
      totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

    return {
      totalStudents,
      presentToday,
      overallPercentage,
    };
  }
}

const attendanceSystem = new AttendanceSystem();
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();

  if (currentPage === "index.html" || currentPage === "") {
    initializeLoginPage();
  }
});

function initializeLoginPage() {
  const teacherLoginBtn = document.getElementById("teacherLogin");
  const studentLoginBtn = document.getElementById("studentLogin");
  const loginForm = document.getElementById("loginForm");
  const authForm = document.getElementById("authForm");
  const errorMessage = document.getElementById("errorMessage");

  let selectedRole = "";

  teacherLoginBtn.addEventListener("click", () => {
    selectedRole = "teacher";
    showLoginForm("Teacher");
  });

  studentLoginBtn.addEventListener("click", () => {
    selectedRole = "student";
    showLoginForm("Student");
  });

  function showLoginForm(role) {
    document.getElementById("formTitle").textContent = `${role} Login`;
    loginForm.style.display = "block";
  }

  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const storeBackendSession = (data) => {
      const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("tokenExpiry", expiryTime.toString());
      localStorage.setItem("currentUser", JSON.stringify(data.user));
    };
    if (selectedRole === "teacher") {
      try {
        const loginRes = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: username === "teacher" ? "teacher@cams.local" : username,
            password,
          }),
        });
        if (loginRes.ok) {
          const data = await loginRes.json();
          if (data.user?.role === "teacher") {
            storeBackendSession(data);
            window.location.href = "teacher.html";
            return;
          }
        }
      } catch (err) {
        console.log(
          "Backend login failed or unreachable. Falling back to offline mode.",
        );
      }
      if (username === "teacher" && password === "teacher") {
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            role: "teacher",
            username: username,
            name: "Teacher",
            email: "teacher@cams.local",
            isDemo: true,
          }),
        );
        window.location.href = "teacher.html";
      } else {
        showError("Invalid teacher credentials. Use: teacher / teacher");
      }
    } else if (selectedRole === "student") {
      try {
        const loginRes = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: username, password }),
        });
        if (loginRes.ok) {
          const data = await loginRes.json();
          if (data.user?.role === "student") {
            storeBackendSession(data);
            window.location.href = "student.html";
            return;
          }
        }
      } catch (err) {
        console.log("Backend login failed or unreachable for student.");
      }

      let student = attendanceSystem.getStudentById(username);
      if (!student) {
        student = attendanceSystem.students.find(
          (s) =>
            String(s.email).trim().toLowerCase() ===
              String(username).trim().toLowerCase() ||
            String(s.name).trim().toLowerCase() ===
              String(username).trim().toLowerCase(),
        );
      }

      if (
        student &&
        (password === "student" ||
          password === username ||
          password === student.id)
      ) {
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            role: "student",
            username: username,
            studentId: student.id,
            name: student.name,
            email: student.email,
            classes: student.classes,
            semester: student.semester,
            isDemo: true,
          }),
        );
        window.location.href = "student.html";
      } else if (username === "student" && password === "student") {
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            role: "student",
            username: username,
            studentId: "S001",
            name: "Student",
            email: "student@cams.local",
            classes: [],
            semester: 1,
            isDemo: true,
          }),
        );
        window.location.href = "student.html";
      } else {
        showError(
          "Invalid student credentials. Use your Student ID, Name, or Email as username and 'student' as password.",
        );
      }
    }
  });

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 3000);
  }
}
