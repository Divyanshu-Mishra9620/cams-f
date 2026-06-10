class AttendanceSystem {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem("currentUser"));
    this.students = [];
    this.attendance = [];
    this.loadFromBackend();
  }

  async loadFromBackend() {
    try {
      this.students = await apiClient.getAllStudents();
      console.log("Students loaded from backend");
    } catch (error) {
      console.error("Error loading students from backend:", error);
      this.students = JSON.parse(localStorage.getItem("students")) || [];
    }
  }

  async addStudent(student) {
    try {
      const response = await apiClient.createStudent({
        userId: this.currentUser.userId,
        studentId: student.id,
        name: student.name,
        email: student.email,
        semester: student.semester,
        classes: student.classes || [],
      });
      this.students.push(response);
      console.log("Student added to backend");
      return response;
    } catch (error) {
      console.error("Error adding student to backend:", error);
      this.students.push(student);
      this.saveDataLocally();
    }
  }

  async getStudentsByClass(className) {
    try {
      return await apiClient.getStudentsByClass(className);
    } catch (error) {
      console.error("Error fetching students:", error);
      return this.students.filter(
        (student) => student.classes && student.classes.includes(className),
      );
    }
  }

  async markAttendance(date, className, studentId, status) {
    try {
      await apiClient.markAttendance({
        studentId: studentId,
        className: className,
        subject: "General",
        date: date,
        status: status,
      });
      console.log("Attendance marked in backend");
    } catch (error) {
      console.error("Error marking attendance:", error);
      const attendanceRecord = {
        date,
        class: className,
        studentId,
        status,
      };
      this.attendance.push(attendanceRecord);
      this.saveDataLocally();
    }
  }

  async getClassStatistics(className) {
    try {
      return await apiClient.getClassAttendanceStats(className);
    } catch (error) {
      console.error("Error fetching class stats:", error);
      const students = await this.getStudentsByClass(className);
      return {
        totalStudents: students.length,
        presentToday: 0,
        overallPercentage: 0,
      };
    }
  }

  saveDataLocally() {
    localStorage.setItem("students", JSON.stringify(this.students));
    localStorage.setItem("attendance", JSON.stringify(this.attendance));
  }
}

const attendanceSystem = new AttendanceSystem();

document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();

  if (currentPage.includes("teacher")) {
    initializeTeacherPage();
  }
});

function initializeTeacherPage() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser || currentUser.role !== "teacher") {
    window.location.href = "index.html";
    return;
  }

  setupTeacherDashboard();
}

function setupTeacherDashboard() {
  const addStudentForm = document.getElementById("addStudentForm");
  if (addStudentForm) {
    addStudentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = {
        id: document.getElementById("studentId").value,
        name: document.getElementById("studentName").value,
        email: document.getElementById("studentEmail").value,
        semester: parseInt(document.getElementById("studentSemester").value),
        classes: document.getElementById("studentClass").value.split(","),
      };

      try {
        await attendanceSystem.addStudent(formData);
        alert("Student added successfully");
        addStudentForm.reset();
        displayStudents();
      } catch (error) {
        alert("Error adding student: " + error.message);
      }
    });
  }

  const markAttendanceForm = document.getElementById("markAttendanceForm");
  if (markAttendanceForm) {
    markAttendanceForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const date = document.getElementById("attendanceDate").value;
      const className = document.getElementById("attendanceClass").value;
      const studentId = document.getElementById("attendanceStudentId").value;
      const status = document.getElementById("attendanceStatus").value;

      try {
        await attendanceSystem.markAttendance(
          date,
          className,
          studentId,
          status,
        );
        alert("Attendance marked successfully");
        markAttendanceForm.reset();
      } catch (error) {
        alert("Error marking attendance: " + error.message);
      }
    });
  }

  displayStudents();
}

async function displayStudents() {
  try {
    const students = await apiClient.getAllStudents();
    const container = document.getElementById("studentsList");

    if (!container) return;

    container.innerHTML = "";

    if (students.length === 0) {
      container.innerHTML = "<p>No students found</p>";
      return;
    }

    students.forEach((student) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${student.studentId}</td>
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.semester}</td>
                <td>${student.classes.join(", ")}</td>
                <td>
                    <button onclick="deleteStudent('${student._id}')" class="btn btn-danger">Delete</button>
                </td>
            `;
      container.appendChild(row);
    });
  } catch (error) {
    console.error("Error displaying students:", error);
  }
}

async function deleteStudent(studentId) {
  if (!confirm("Are you sure you want to delete this student?")) {
    return;
  }

  try {
    await apiClient.deleteStudent(studentId);
    alert("Student deleted successfully");
    displayStudents();
  } catch (error) {
    alert("Error deleting student: " + error.message);
  }
}

function logout() {
  apiClient.clearToken();
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
