class AuthService {
  constructor(apiBaseUrl = "https://am-b.onrender.com/api") {
    this.apiBaseUrl = apiBaseUrl;
    this.token = localStorage.getItem("authToken");
    this.currentUser = JSON.parse(localStorage.getItem("currentUser")) || null;
    this.tokenExpiry = localStorage.getItem("tokenExpiry");
  }

  isTokenValid() {
    if (!this.token || !this.tokenExpiry) return false;
    return Date.now() < parseInt(this.tokenExpiry);
  }

  async signup(userData) {
    try {
      if (!userData.email || !userData.password || !userData.name) {
        return {
          success: false,
          message: "Email, password, and name are required",
        };
      }

      const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message:
            data.message || data.error || `Signup failed (${response.status})`,
        };
      }

      if (data.token) {
        const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("tokenExpiry", expiryTime.toString());
        this.token = data.token;
        this.tokenExpiry = expiryTime.toString();
      }

      if (data.user) {
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        this.currentUser = data.user;
      }

      return {
        success: true,
        message: "Signup successful!",
        user: data.user,
        token: data.token,
      };
    } catch (error) {
      console.error("Signup error:", error);
      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }

  async login(email, password) {
    try {
      if (!email || !password) {
        return {
          success: false,
          message: "Email and password are required",
        };
      }

      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message:
            data.message || data.error || `Login failed (${response.status})`,
        };
      }

      if (data.token) {
        const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("tokenExpiry", expiryTime.toString());
        this.token = data.token;
        this.tokenExpiry = expiryTime.toString();
      }

      if (data.user) {
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        this.currentUser = data.user;
      }

      return {
        success: true,
        message: "Login successful!",
        user: data.user,
        token: data.token,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: `Connection error: ${error.message}`,
      };
    }
  }

  logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiry");
    localStorage.removeItem("currentUser");
    this.token = null;
    this.currentUser = null;
  }

  isAuthenticated() {
    return !!this.currentUser && (!!this.token || this.currentUser.isDemo);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getToken() {
    return this.token;
  }

  setToken(token) {
    if (token) {
      localStorage.setItem("authToken", token);
      localStorage.setItem("token", token);
      this.token = token;
    }
  }

  getAuthHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };
  }

  async verifyToken() {
    if (!this.token) {
      return { success: false, authenticated: false };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/verify`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logout();
        return { success: false, authenticated: false };
      }

      if (data.user) {
        localStorage.setItem("currentUser", JSON.stringify(data.user));
        this.currentUser = data.user;
      }

      return {
        success: true,
        authenticated: true,
        user: data.user,
      };
    } catch (error) {
      this.logout();
      return {
        success: false,
        authenticated: false,
        error: error.message,
      };
    }
  }
}

const authService = new AuthService();
