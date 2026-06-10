function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function initializeStudentPage() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== "student") {
    globalThis.location.href = "/";
    return;
  }

  await attendanceSystem.syncFromDB({ notify: false });
  const syncedUser =
    JSON.parse(localStorage.getItem("currentUser")) || currentUser;
  let student = attendanceSystem.getStudentById(syncedUser.studentId);

  if (!student) {
    student = {
      id: syncedUser.studentId || syncedUser.id,
      name: syncedUser.name || "Student",
      email: syncedUser.email,
      classes: syncedUser.classes || [],
      semester: syncedUser.semester || 1,
    };
  }

  displayStudentInfo(student);
  await displayTodayAttendance(student.id);
  displayStudentAttendance(student.id);
  displaySubjectWiseAttendance(student.id, student.classes);
  displayRecentAttendance(student.id);
}

function displayStudentInfo(student) {
  document.getElementById("studentIdDisplay").textContent = student.id;
  document.getElementById("studentNameDisplay").textContent = student.name;
  const classesDisplay = student.classes
    ? student.classes.join(", ")
    : "No classes assigned";
  document.getElementById("studentClassDisplay").textContent = classesDisplay;
}

function displayStudentAttendance(studentId) {
  const attendance = attendanceSystem.getStudentAttendance(studentId);
  const totalDays = attendance.length;
  const presentDays = attendance.filter(
    (record) => record.status === "present",
  ).length;
  const percentage =
    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  document.getElementById("totalDays").textContent = totalDays;
  document.getElementById("presentDays").textContent = presentDays;
  document.getElementById("overallAttendance").textContent = percentage + "%";

  drawAttendanceChart(percentage);
}

function drawAttendanceChart(percentage) {
  const canvas = document.getElementById("attendanceChart");
  const ctx = canvas.getContext("2d");
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 40;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "#dc3545";
  ctx.fill();
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + (percentage / 100) * 2 * Math.PI;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = "#28a745";
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(percentage + "%", centerX, centerY);
}

function displaySubjectWiseAttendance(studentId, classes) {
  const attendance = attendanceSystem.getStudentAttendance(studentId);
  const subjectStats = {};
  if (classes && classes.length > 0) {
    classes.forEach((className) => {
      subjectStats[className] = {
        total: 0,
        present: 0,
        absent: 0,
        leave: 0,
      };
    });
  }
  attendance.forEach((record) => {
    if (!subjectStats[record.class]) {
      subjectStats[record.class] = {
        total: 0,
        present: 0,
        absent: 0,
        leave: 0,
      };
    }
    subjectStats[record.class].total++;
    if (record.status === "excused") {
      subjectStats[record.class].leave++;
    } else if (subjectStats[record.class][record.status] !== undefined) {
      subjectStats[record.class][record.status]++;
    }
  });

  const tbody = document.getElementById("subjectAttendanceBody");
  if (Object.keys(subjectStats).length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align: center;">No subject data available</td></tr>';
    return;
  }

  tbody.innerHTML = Object.entries(subjectStats)
    .map(([subject, stats]) => {
      const percentage =
        stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
      return `
            <tr>
                <td>${subject}</td>
                <td>${stats.total}</td>
                <td>${stats.present}</td>
                <td>${stats.absent}</td>
                <td>${stats.leave}</td>
                <td class="percentage-${percentage >= 75 ? "high" : percentage >= 50 ? "medium" : "low"}">
                    ${percentage}%
                </td>
            </tr>
        `;
    })
    .join("");
}

async function displayTodayAttendance(studentId) {
  const today = getTodayDateString();
  let attendance = attendanceSystem.getStudentAttendance(studentId);
  let todayAttendance = attendance.find((record) => record.date === today);
  if (!todayAttendance) {
    try {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      if (token) {
        const response = await fetch(
          `http://localhost:5000/api/attendance/student/${encodeURIComponent(studentId)}?startDate=${today}&endDate=${today}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.ok) {
          const records = await response.json();
          if (Array.isArray(records) && records.length > 0) {
            const record = records[0];
            todayAttendance = {
              id: record._id,
              date: today,
              class: record.className || record.subject,
              studentId: studentId,
              status: record.status,
            };
            console.log("Fetched today attendance from API:", todayAttendance);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching today attendance from API:", error);
    }
  }
  if (todayAttendance && todayAttendance.status) {
    document.getElementById("todayStatus").textContent =
      todayAttendance.status.charAt(0).toUpperCase() +
      todayAttendance.status.slice(1);
    document.getElementById("todaySubject").textContent =
      todayAttendance.class || "-";
  } else {
    document.getElementById("todayStatus").textContent = "Not Marked";
    document.getElementById("todaySubject").textContent = "-";
  }
}

function displayRecentAttendance(studentId) {
  const attendance = attendanceSystem.getStudentAttendance(studentId);
  const recentAttendance = attendance
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const tbody = document.getElementById("recentAttendanceBody");
  if (recentAttendance.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" style="text-align: center;">No attendance records yet</td></tr>';
    return;
  }

  tbody.innerHTML = recentAttendance
    .map(
      (record) => `
        <tr>
            <td>${record.date}</td>
            <td>${record.class}</td>
            <td>
                <span class="attendance-btn ${record.status}">
                    ${record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </span>
            </td>
        </tr>
    `,
    )
    .join("");
}

function logout() {
  authService.logout();
  window.location.href = "/";
}
document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage === "student.html") {
    initializeStudentPage();
    window.addEventListener("cams:data-synced", initializeStudentPage);
  }
});
