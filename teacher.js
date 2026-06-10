const allSubjects = [
  "software engineering",
  "CAHM",
  "CPUC",
  "Web development using php",
  "IOT",
  "Minor project Work",
];

const subjectsBySemester = {
  1: [
    "communication skills - I",
    "applied mathematics - 1",
    "applied physics - 1",
    "applied chemistry - 1",
    "technical drawing",
    "workshop practice",
  ],
  2: [
    "applied mathematics - 2",
    "applied physics - 2",
    "multimedia and animation",
    "basics of electronics and electrical engineering",
    "programming in C",
  ],
  3: [
    "applied mathematics - 3",
    "data structures using C",
    "internet and web technologies",
    "environmental studies",
    "digital electronics",
    "data communications and computer networks",
  ],
  4: [
    "object oriented programming",
    "java programming",
    "computer networks",
    "system software",
    "web programming",
  ],
  5: [
    "software engineering",
    "CAHM",
    "CPUC",
    "Web development using php",
    "IOT",
  ],
  6: [
    "Minor project Work",
    "industrial training",
    "elective 1",
    "elective 2",
    "elective 3",
  ],
};

function initializeTeacherPage() {
  updateClassStatistics();
  displayAllStudents();

  document
    .getElementById("studentSemester")
    .addEventListener("change", function () {
      const semester = this.value;
      const subjectSelect = document.getElementById("studentSubject");
      subjectSelect.innerHTML = '<option value="">Select Subject</option>';
      if (subjectsBySemester[semester]) {
        subjectsBySemester[semester].forEach((subject) => {
          const option = document.createElement("option");
          option.value = subject;
          option.textContent = subject;
          subjectSelect.appendChild(option);
        });
      }
    });

  document
    .getElementById("attendanceSemester")
    .addEventListener("change", function () {
      const semester = this.value;
      const subjectSelect = document.getElementById("attendanceClass");
      subjectSelect.innerHTML = '<option value="">Select Subject</option>';
      if (subjectsBySemester[semester]) {
        subjectsBySemester[semester].forEach((subject) => {
          const option = document.createElement("option");
          option.value = subject;
          option.textContent = subject;
          subjectSelect.appendChild(option);
        });
      }
    });

  document
    .getElementById("addStudentForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("studentName").value;
      const id = document.getElementById("studentId").value;
      const email = document.getElementById("studentEmail").value;
      const className = document.getElementById("studentClass").value;
      const semester = document.getElementById("studentSemester").value;
      const subject = document.getElementById("studentSubject").value;

      if (attendanceSystem.students.find((s) => s.id === id)) {
        alert("Student ID already exists!");
        return;
      }

      const student = {
        id,
        name,
        email,
        semester,
        subject,
        classes: subjectsBySemester[semester] || allSubjects,
      };

      try {
        await attendanceSystem.addStudent(student);
        alert("Student added successfully! Login password is: student");
        e.target.reset();
        displayAllStudents();
        updateClassStatistics();
      } catch (error) {
        alert(error.message || "Student could not be saved");
      }
    });

  document.getElementById("attendanceForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const semester = document.getElementById("attendanceSemester").value;
    const className = document.getElementById("attendanceClass").value;
    const date = document.getElementById("attendanceDate").value;

    if (!semester || !className || !date) {
      alert("Please select semester, subject and date");
      return;
    }

    const students = attendanceSystem.getStudentsBySemester(semester);
    if (students.length === 0) {
      alert("No students found in this semester");
      return;
    }

    displayStudentsForAttendance(students, className, date);
  });

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const query = document.getElementById("searchInput").value.trim();
    const classFilter = document.getElementById("searchClass").value;

    const results = searchStudents(query, classFilter);
    displaySearchResults(results);
  });

  document
    .getElementById("statsSemester")
    .addEventListener("change", function () {
      const semester = this.value;
      updateClassStatistics(semester);
    });

  document
    .getElementById("filterSemester")
    .addEventListener("change", function () {
      const semester = this.value;
      displayAllStudents(semester || null);
    });
}

function displayStudentsForAttendance(students, className, date) {
  const attendanceList = document.getElementById("attendanceList");
  const studentsForAttendance = document.getElementById(
    "studentsForAttendance",
  );
  const selectedClass = document.getElementById("selectedClass");
  const selectedDate = document.getElementById("selectedDate");

  selectedClass.textContent = className;
  selectedDate.textContent = date;
  attendanceList.style.display = "block";

  const existingAttendance = attendanceSystem.getAttendanceByDate(
    date,
    className,
  );

  studentsForAttendance.innerHTML = students
    .map((student) => {
      const hasAttendanceForDate = attendanceSystem.hasAttendanceForDate(
        student.id,
        date,
        className,
      );
      const attendance = existingAttendance.find(
        (a) => a.studentId === student.id,
      );
      const status = attendance ? attendance.status : "";
      const isDisabled = hasAttendanceForDate;

      return `
            <div class="student-item">
                <span>${student.name} (${student.id}) ${isDisabled ? "(Attendance Already Marked for Today)" : ""}</span>
                <div>
                    <button class="attendance-btn present ${status === "present" ? "active" : ""} ${isDisabled ? "disabled" : ""}"
                            data-student-id="${student.id}" data-status="present"
                            onclick="${isDisabled ? "" : `markStudentAttendance('${student.id}', 'present')`}" ${isDisabled ? "disabled" : ""}>
                        Present
                    </button>
                    <button class="attendance-btn absent ${status === "absent" ? "active" : ""} ${isDisabled ? "disabled" : ""}"
                            data-student-id="${student.id}" data-status="absent"
                            onclick="${isDisabled ? "" : `markStudentAttendance('${student.id}', 'absent')`}" ${isDisabled ? "disabled" : ""}>
                        Absent
                    </button>
                    <button class="attendance-btn leave ${status === "leave" ? "active" : ""} ${isDisabled ? "disabled" : ""}"
                            data-student-id="${student.id}" data-status="leave"
                            onclick="${isDisabled ? "" : `markStudentAttendance('${student.id}', 'leave')`}" ${isDisabled ? "disabled" : ""}>
                        Leave
                    </button>
                </div>
            </div>
        `;
    })
    .join("");
}

function markStudentAttendance(studentId, status) {
  const buttons = document.querySelectorAll(
    `[onclick="markStudentAttendance('${studentId}', 'present')"]`,
  );
  const buttons2 = document.querySelectorAll(
    `[onclick="markStudentAttendance('${studentId}', 'absent')"]`,
  );
  const buttons3 = document.querySelectorAll(
    `[onclick="markStudentAttendance('${studentId}', 'leave')"]`,
  );

  const allButtons = [...buttons, ...buttons2, ...buttons3];

  allButtons.forEach((btn) => {
    btn.disabled = true;
    btn.classList.add("disabled");
    btn.onclick = null;
  });

  if (status === "present") {
    buttons.forEach((btn) => btn.classList.add("active"));
  } else if (status === "absent") {
    buttons2.forEach((btn) => btn.classList.add("active"));
  } else {
    buttons3.forEach((btn) => btn.classList.add("active"));
  }
}

async function saveAttendance() {
  const selectedClass = document.getElementById("selectedClass").textContent;
  const selectedDate = document.getElementById("selectedDate").textContent;
  const semester = document.getElementById("attendanceSemester").value;
  const saveButton = document.querySelector(
    'button[onclick="saveAttendance()"]',
  );
  const originalButtonText = saveButton?.textContent || "Save Attendance";

  const students = attendanceSystem.getStudentsBySemester(semester);
  let savedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  if (saveButton) {
    saveButton.disabled = true;
    saveButton.classList.add("is-loading");
    saveButton.textContent = "Saving...";
  }

  try {
    for (const student of students) {
      const presentBtn = document.querySelector(
        `[data-student-id="${student.id}"][data-status="present"]`,
      );
      const absentBtn = document.querySelector(
        `[data-student-id="${student.id}"][data-status="absent"]`,
      );
      const leaveBtn = document.querySelector(
        `[data-student-id="${student.id}"][data-status="leave"]`,
      );

      let status = "";
      if (presentBtn && presentBtn.classList.contains("active")) {
        status = "present";
      } else if (absentBtn && absentBtn.classList.contains("active")) {
        status = "absent";
      } else if (leaveBtn && leaveBtn.classList.contains("active")) {
        status = "leave";
      }

      if (status) {
        if (
          !attendanceSystem.hasAttendanceForDate(
            student.id,
            selectedDate,
            selectedClass,
          )
        ) {
          try {
            await attendanceSystem.markAttendance(
              selectedDate,
              selectedClass,
              student.id,
              status,
            );
            savedCount++;
          } catch (error) {
            failedCount++;
            console.error(error);
          }
        } else {
          skippedCount++;
        }
      }
    }

    await attendanceSystem.syncFromDB();
    const currentSemester = document.getElementById("statsSemester").value;
    updateClassStatistics(currentSemester || null);
    const semesterStudents = attendanceSystem.getStudentsBySemester(semester);
    displayStudentsForAttendance(semesterStudents, selectedClass, selectedDate);

    if (savedCount > 0) {
      alert(
        `Attendance saved for ${savedCount} students!${skippedCount > 0 ? ` ${skippedCount} students already had attendance marked for this subject/date.` : ""}${failedCount > 0 ? ` ${failedCount} failed to save.` : ""}`,
      );
    } else if (failedCount > 0) {
      alert(
        "Attendance could not be saved. Please check the server and try again.",
      );
    } else {
      alert(
        "No attendance marked! All selected students already have attendance for this subject/date.",
      );
    }
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.classList.remove("is-loading");
      saveButton.textContent = originalButtonText;
    }
  }
}

function displayAllStudents(semester = null) {
  const allStudentsList = document.getElementById("allStudentsList");
  let students = attendanceSystem.getAllStudents();

  if (semester) {
    students = students.filter((student) => student.semester === semester);
  }

  if (students.length === 0) {
    allStudentsList.innerHTML = "<p>No students added yet.</p>";
    return;
  }

  allStudentsList.innerHTML = students
    .map((student) => {
      const percentage = attendanceSystem.calculateAttendancePercentage(
        student.id,
      );
      const classesDisplay = student.classes
        ? student.classes.join(", ")
        : "No classes assigned";
      const semesterDisplay = student.semester
        ? `Semester: ${student.semester}`
        : "";
      const subjectDisplay = student.subject
        ? `Subject: ${student.subject}`
        : "";

      return `
            <div class="student-item">
                <div>
                    <strong>${student.name}</strong><br>
                    <small>ID: ${student.id} | ${semesterDisplay} | ${subjectDisplay} | Classes: ${classesDisplay} | Email: ${student.email}</small>
                </div>
                <div>
                    <span class="percentage-${percentage >= 75 ? "high" : percentage >= 50 ? "medium" : "low"}">
                        ${percentage}%
                    </span>
                    <button class="btn btn-danger remove-btn" onclick="attendanceSystem.removeStudent('${student.id}'); displayAllStudents(${semester ? `'${semester}'` : ""}); updateClassStatistics(); alert('Student removed successfully!');" style="margin-left: 10px; padding: 5px 10px; font-size: 12px;">
                        Remove
                    </button>
                </div>
            </div>
        `;
    })
    .join("");
}

function searchStudents(query, classFilter) {
  let students = attendanceSystem.getAllStudents();

  if (classFilter) {
    students = students.filter(
      (student) => student.classes && student.classes.includes(classFilter),
    );
  }

  if (query) {
    const lowerQuery = query.toLowerCase();
    students = students.filter(
      (student) =>
        student.name.toLowerCase().includes(lowerQuery) ||
        student.id.toLowerCase().includes(lowerQuery),
    );
  }

  return students;
}

function displaySearchResults(results) {
  const searchResults = document.getElementById("searchResults");

  if (results.length === 0) {
    searchResults.innerHTML = "<p>No students found matching the criteria.</p>";
    searchResults.style.display = "block";
    return;
  }

  searchResults.innerHTML = results
    .map((student) => {
      const percentage = attendanceSystem.calculateAttendancePercentage(
        student.id,
      );
      const classesDisplay = student.classes
        ? student.classes.join(", ")
        : "No classes assigned";

      return `
            <div class="student-item">
                <div>
                    <strong>${student.name}</strong><br>
                    <small>ID: ${student.id} | Classes: ${classesDisplay} | Email: ${student.email}</small>
                </div>
                <div>
                    <span class="percentage-${percentage >= 75 ? "high" : percentage >= 50 ? "medium" : "low"}">
                        ${percentage}%
                    </span>
                </div>
            </div>
        `;
    })
    .join("");

  searchResults.style.display = "block";
}

function updateClassStatistics(semester = null) {
  const classStatsDiv = document.getElementById("classStats");
  classStatsDiv.innerHTML = "";

  let classesToShow = [];
  if (semester) {
    classesToShow = subjectsBySemester[semester] || [];
  } else {
    classesToShow = [
      "software engineering",
      "CAHM",
      "CPUC",
      "Web development using php",
      "IOT",
      "Minor project Work",
    ];
  }

  classesToShow.forEach((className) => {
    const stats = attendanceSystem.getClassStatistics(className);
    const percentage =
      stats.totalStudents > 0
        ? Math.round((stats.presentToday / stats.totalStudents) * 100)
        : 0;
    const classDiv = document.createElement("div");
    classDiv.className = "class-stat-item";
    classDiv.innerHTML = `
            <h4>${className}</h4>
            <div class="stat-details">
                <span>Total Students: ${stats.totalStudents}</span>
                <span>Present Today: ${stats.presentToday}</span>
                <span>Today's Attendance: ${percentage}%</span>
            </div>
        `;
    classStatsDiv.appendChild(classDiv);
  });

  if (classStatsDiv.children.length === 0) {
    classStatsDiv.innerHTML = "<p>No classes with students.</p>";
  }
}

function logout() {
  authService.logout();
  window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();
  if (currentPage === "teacher.html") {
    initializeTeacherPage();
    window.addEventListener("cams:data-synced", () => {
      displayAllStudents(
        document.getElementById("filterSemester")?.value || null,
      );
      updateClassStatistics(
        document.getElementById("statsSemester")?.value || null,
      );
    });
  }
});
