const API_BASE_URL = "http://localhost:5000/api";

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem("token");
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem("token", token);
  }

  getToken() {
    return localStorage.getItem("token");
  }

  clearToken() {
    localStorage.removeItem("token");
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          window.location.href = "index.html";
        }
        const error = await response.json();
        throw new Error(error.error || "Request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  login(username, password) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  verifyToken() {
    return this.request("/auth/verify", { method: "GET" });
  }

  getCurrentUser() {
    return this.request("/auth/me", { method: "GET" });
  }

  getAllStudents(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/students?${params}`, { method: "GET" });
  }

  getStudent(id) {
    return this.request(`/students/${id}`, { method: "GET" });
  }

  createStudent(studentData) {
    return this.request("/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  }

  updateStudent(id, studentData) {
    return this.request(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(studentData),
    });
  }

  deleteStudent(id) {
    return this.request(`/students/${id}`, { method: "DELETE" });
  }

  getStudentsByClass(className) {
    return this.request(`/students/class/${className}`, { method: "GET" });
  }

  getStudentsBySemester(semester) {
    return this.request(`/students/semester/${semester}`, { method: "GET" });
  }

  markAttendance(attendanceData) {
    return this.request("/attendance/mark", {
      method: "POST",
      body: JSON.stringify(attendanceData),
    });
  }

  getStudentAttendance(studentId, filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/attendance/student/${studentId}?${params}`, {
      method: "GET",
    });
  }

  getClassAttendanceByDate(className, date) {
    return this.request(`/attendance/class/${className}/date/${date}`, {
      method: "GET",
    });
  }

  getStudentAttendanceStats(studentId) {
    return this.request(`/attendance/stats/student/${studentId}`, {
      method: "GET",
    });
  }

  getClassAttendanceStats(className) {
    return this.request(`/attendance/stats/class/${className}`, {
      method: "GET",
    });
  }

  updateAttendance(id, attendanceData) {
    return this.request(`/attendance/${id}`, {
      method: "PUT",
      body: JSON.stringify(attendanceData),
    });
  }

  deleteAttendance(id) {
    return this.request(`/attendance/${id}`, { method: "DELETE" });
  }

  bulkMarkAttendance(bulkData) {
    return this.request("/attendance/bulk/mark-class", {
      method: "POST",
      body: JSON.stringify(bulkData),
    });
  }

  getAllTeachers(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/teachers?${params}`, { method: "GET" });
  }

  getTeacher(id) {
    return this.request(`/teachers/${id}`, { method: "GET" });
  }

  getCurrentTeacher() {
    return this.request("/teachers/profile/me", { method: "GET" });
  }

  getTeachersByDepartment(department) {
    return this.request(`/teachers/department/${department}`, {
      method: "GET",
    });
  }
}

const apiClient = new APIClient();
