document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop();

  if (
    currentPage === "index.html" ||
    currentPage === "" ||
    currentPage === "index-updated.html"
  ) {
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

    try {
      if (selectedRole === "teacher") {
        await loginTeacher(username, password);
      } else if (selectedRole === "student") {
        await loginStudent(username, password);
      }
    } catch (error) {
      showError(error.message);
    }
  });

  async function loginTeacher(username, password) {
    const TEACHER_EMAIL = "teacher";
    const TEACHER_PASSWORD = "teacher";
    if (username === TEACHER_EMAIL && password === TEACHER_PASSWORD) {
      const mockTeacher = {
        _id: "teacher_001",
        username: "teacher",
        email: "teacher@cams.local",
        role: "teacher",
      };

      const mockProfile = {
        _id: "teacher_profile_001",
        userId: mockTeacher._id,
        employeeId: "EMP001",
        name: "Teacher",
        email: "teacher@cams.local",
        department: "General",
        subjects: ["Mathematics", "Science"],
        classes: ["A", "B", "C"],
      };

      const mockToken = btoa(
        JSON.stringify({ userId: mockTeacher._id, role: "teacher" }),
      );
      apiClient.setToken(mockToken);

      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          role: "teacher",
          userId: mockTeacher._id,
          username: mockTeacher.username,
          profile: mockProfile,
        }),
      );
      window.location.href = "teacher.html";
    } else {
      const response = await apiClient.login(username, password);

      if (response.user.role !== "teacher") {
        throw new Error("Invalid role. Only teachers can login here.");
      }

      apiClient.setToken(response.token);
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          role: "teacher",
          userId: response.user._id,
          username: response.user.username,
          profile: response.profile,
        }),
      );
      window.location.href = "teacher.html";
    }
  }

  async function loginStudent(username, password) {
    const STUDENT_EMAIL = "student";
    const STUDENT_PASSWORD = "student";

    if (username === STUDENT_EMAIL && password === STUDENT_PASSWORD) {
      const mockStudent = {
        _id: "student_001",
        username: "student",
        email: "student@cams.local",
        role: "student",
      };
      const mockProfile = {
        _id: "student_profile_001",
        userId: mockStudent._id,
        studentId: "S001",
        name: "Student",
        email: "student@cams.local",
        semester: 1,
        classes: ["A", "B"],
      };
      const mockToken = btoa(
        JSON.stringify({ userId: mockStudent._id, role: "student" }),
      );
      apiClient.setToken(mockToken);
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          role: "student",
          userId: mockStudent._id,
          username: mockStudent.username,
          studentId: mockProfile._id,
          profile: mockProfile,
        }),
      );
      window.location.href = "student.html";
    } else {
      const response = await apiClient.login(username, password);

      if (response.user.role !== "student") {
        throw new Error("Invalid role. Only students can login here.");
      }

      apiClient.setToken(response.token);
      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          role: "student",
          userId: response.user._id,
          username: response.user.username,
          studentId: response.profile._id,
          profile: response.profile,
        }),
      );
      window.location.href = "student.html";
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 3000);
  }
}
