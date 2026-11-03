import { Link, useParams } from "react-router-dom";
import { SLUG_TO_ROLE } from "./roles.js";
import "./RegisterPage.css";

const roleNames = {
  "medical-officer": "Medical Officer",
  specialist: "Specialist",
  "patient-navigator": "Patient Navigator",
  "district-admin": "District Admin",
};

function RegisterPage() {
  const { role } = useParams();
  const designation = SLUG_TO_ROLE[role] ? roleNames[role] : "Official";

  return (
    <div className="register-page legacy">
      <div className="register-header">
        <Link to="/" className="register-brand">✚ AAROGYA DRISHTI</Link>
        <Link to="/" className="home-link">Back to Home</Link>
      </div>
      <div className="register-container">
        <div className="register-heading">
          <span>OFFICIAL ACCESS</span>
          <h1>{designation} accounts are created by an administrator</h1>
          <p>
            Officials cannot self-register. District Admins create Medical Officer,
            Specialist and Navigator accounts. The Super Admin creates District
            Admin accounts. Health Workers can register from the main site.
          </p>
          <p>
            {SLUG_TO_ROLE[role] ? (
              <Link to={`/login/${role}`} className="home-link">Continue to official login →</Link>
            ) : (
              <Link to="/login" className="home-link">Go to Health Worker login →</Link>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
