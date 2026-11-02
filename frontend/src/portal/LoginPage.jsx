import { useState } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../auth.jsx";
import { SLUG_TO_ROLE } from "./roles.js";
import "./LoginPage.css";

const roleNames = {
  "super-admin": "Super Admin",
  "medical-officer": "Medical Officer",
  specialist: "Specialist",
  "patient-navigator": "Patient Navigator",
  "district-admin": "District Admin"
};

function LoginPage() {
  const { role } = useParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const backendRole = SLUG_TO_ROLE[role];
  const designation = roleNames[role] || "Staff";

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    setError("");

    if (!loginId.trim() || !password) {
      setError("Please enter your Login ID and Password");
      return;
    }

    setBusy(true);
    try {
      const { data } = role === "super-admin"
        ? await api.post("/auth/super-admin-login", {
            adminId: loginId.trim(),
            password
          })
        : await api.post("/auth/staff/login", {
            role: backendRole,
            user_code: loginId.trim(),
            password
          });
      login(data);
      navigate("/dashboard");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  // Unknown role in the URL (for example a health worker typing /login/health-worker)
  if (!backendRole) {
    return (
      <div className="login-page legacy">
        <div className="login-left">
          <h1>AAROGYA DRISHTI</h1>
          <h2>Staff Portal</h2>
          <p>This portal is for Super Admins, District Admins, Medical Officers, Specialists and Patient Navigators.</p>
          <Link to="/" className="back-home">← Back to Homepage</Link>
        </div>
        <div className="login-right">
          <div className="login-card">
            <span className="login-label">STAFF PORTAL</span>
            <h2>Role not available</h2>
            <p>Health Workers log in from the main login page.</p>
            <p className="register-text"><Link to="/login">Go to main login</Link></p>
            <p className="register-text"><Link to="/portal">Choose a staff role</Link></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page legacy">

      <div className="login-left">
        <h1>AAROGYA DRISHTI</h1>

        <h2>Welcome to Digital Healthcare</h2>

        <p>
          An integrated platform supporting oral health
          screening, clinical review, specialist consultation
          and patient care.
        </p>

        <Link to="/" className="back-home">
          ← Back to Homepage
        </Link>
      </div>

      <div className="login-right">
        <div className="login-card">

          <span className="login-label">STAFF PORTAL</span>

          <h2>{designation} Login</h2>

          <p>Enter your authorized account details.</p>

          {location.state?.registered && (
            <p className="login-success">Registered successfully. Please login.</p>
          )}

          <form onSubmit={handleLogin}>

            <label>Login ID</label>
            <input
              type="text"
              placeholder="Enter your Login ID"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Login to Dashboard"}
            </button>

          </form>

          {role !== "super-admin" && (
          <p className="register-text">
            Official accounts are created by the District Admin or Super Admin.
          </p>
          )}

        </div>
      </div>

    </div>
  );
}

export default LoginPage;
