class StudentAttendanceSystem {
  constructor() {
    this.currentUser = JSON.parse(localStorage.getItem("currentUser"));
  }

  async getMyAttendanceStats() {
    try {
      if (!this.currentUser.studentId) {
        throw new Error("Student ID not found");
      }
      return await apiClient.getStudentAttendanceStats(
        this.currentUser.studentId,
      );
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
      return null;
    }
  }

  async getMyAttendanceRecords() {
    try {
      if (!this.currentUser.studentId) {
        throw new Error("Student ID not found");
      }
      return await apiClient.getStudentAttendance(this.currentUser.studentId);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
      return [];
    }
  }

  async getMyProfile() {
    try {
      return await apiClient.getCurrentUser();
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }
}
const studentSystem = new StudentAttendanceSystem();

document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();

  if (currentPage.includes("student")) {
    initializeStudentPage();
  }
});

function initializeStudentPage() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  if (!currentUser || currentUser.role !== "student") {
    window.location.href = "index.html";
    return;
  }

  setupStudentDashboard();
}

function setupStudentDashboard() {
  loadAttendanceStats();
  loadAttendanceRecords();
}

async function loadAttendanceStats() {
  try {
    const stats = await studentSystem.getMyAttendanceStats();

    if (!stats) {
      console.log("No attendance stats available yet");
      return;
    }

    const container = document.getElementById("attendanceStatsContainer");
    if (container) {
      container.innerHTML = `
                <div class="stats-card">
                    <h3>Attendance Overview</h3>
                    <div class="stat">
                        <span>Total Classes:</span>
                        <strong>${stats.total}</strong>
                    </div>
                    <div class="stat">
                        <span>Present:</span>
                        <strong>${stats.present}</strong>
                    </div>
                    <div class="stat">
                        <span>Absent:</span>
                        <strong>${stats.absent}</strong>
                    </div>
                    <div class="stat">
                        <span>Late:</span>
                        <strong>${stats.late}</strong>
                    </div>
                    <div class="stat">
                        <span>Excused:</span>
                        <strong>${stats.excused}</strong>
                    </div>
                    <div class="stat highlight">
                        <span>Attendance Percentage:</span>
                        <strong>${stats.percentage}%</strong>
                    </div>
                </div>
            `;
    }
  } catch (error) {
    console.error("Error loading attendance stats:", error);
  }
}

async function loadAttendanceRecords() {
  try {
    const records = await studentSystem.getMyAttendanceRecords();

    const container = document.getElementById("attendanceRecordsContainer");
    if (!container) return;

    if (records.length === 0) {
      container.innerHTML = "<p>No attendance records found</p>";
      return;
    }

    const table = document.createElement("table");
    table.className = "attendance-table";

    const headerRow = table.createTHead().insertRow();
    headerRow.innerHTML = `
            <th>Date</th>
            <th>Class</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Marked By</th>
            <th>Remarks</th>
        `;

    const tbody = table.createTBody();
    records.forEach((record) => {
      const row = tbody.insertRow();
      const date = new Date(record.date).toLocaleDateString();
      const markedBy = record.markedBy ? record.markedBy.name : "N/A";

      row.innerHTML = `
                <td>${date}</td>
                <td>${record.className}</td>
                <td>${record.subject}</td>
                <td class="status-${record.status}">${record.status.toUpperCase()}</td>
                <td>${markedBy}</td>
                <td>${record.remarks || "-"}</td>
            `;
    });

    container.innerHTML = "";
    container.appendChild(table);
  } catch (error) {
    console.error("Error loading attendance records:", error);
  }
}

function logout() {
  apiClient.clearToken();
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
