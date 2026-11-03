
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SLUG_TO_ROLE } from "./roles.js";
import { useRoles } from "../hooks.js";
import api, { errMsg } from "../api.js";
import "./RegisterPage.css";

const roleNames = {
  "medical-officer": "Medical Officer",
  specialist: "Specialist",
  "patient-navigator": "Patient Navigator",
  "district-admin": "District Admin",
};

function RegisterPage() {
  const { role } = useParams();

  const selectedRole = SLUG_TO_ROLE[role];
  const designation = selectedRole ? roleNames[role] : "Official";

  const { roles, error: rolesError } = useRoles();

  const [formData, setFormData] = useState({
    name: "",
    user_code: "",
    mobile: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const isAllowed = [
    "DISTRICT_ADMIN",
    "MEDICAL_OFFICER",
    "SPECIALIST",
    "NAVIGATOR",
  ].includes(selectedRole);

  const roleDefinition = roles?.[selectedRole];

  const updateField = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.password !== formData.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        role: selectedRole,
      };

      await api.post("/auth/staff/register", payload);

      setSuccess(true);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page legacy">
      <div className="register-header">
        <Link to="/" className="register-brand">
          ✚ AAROGYA DRISHTI
        </Link>

        <Link to="/" className="home-link">
          Back to Home
        </Link>
      </div>

      <div className="register-container">
        <div className="register-heading">
          <span>OFFICIAL ACCESS</span>

          <h1>{designation} Registration</h1>

          {!isAllowed ? (
            <>
              <p>
                {selectedRole === "SUPER_ADMIN"
                  ? "Super Admin uses the secure administrator login."
                  : "Please select a valid official registration page."}
              </p>

              <Link
                to={selectedRole ? `/login/${role}` : "/"}
                className="home-link"
              >
                Continue →
              </Link>
            </>
          ) : success ? (
            <div className="registration-success">
              <h2>Registration Submitted Successfully!</h2>

              <p>
                Your account is now pending administrator approval.
                You can log in after your administrator approves it.
              </p>

              <Link to={`/login/${role}`} className="home-link">
                Go to Login →
              </Link>
            </div>
          ) : (
            <>
              <p>
                Complete your details below. Your account will be reviewed
                by the appropriate administrator.
              </p>

              {rolesError && (
                <p className="form-error">{rolesError}</p>
              )}

              {!roles ? (
                <p>Loading registration fields...</p>
              ) : !roleDefinition ? (
                <p className="form-error">
                  Registration fields are unavailable for this role.
                </p>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="register-form"
                >
                  {(roleDefinition.fields || [])
                    .filter((field) =>
                      [
                        "name",
                        "user_code",
                        "mobile",
                        "password",
                        "confirm",
                      ].includes(field.name)
                    )
                    .map((field) => (
                      <div
                        key={field.name}
                        className="register-field"
                      >
                        <label>{field.label}</label>

                        <input
                          type={field.type || "text"}
                          value={formData[field.name] || ""}
                          onChange={(event) =>
                            updateField(field.name, event.target.value)
                          }
                          required
                          minLength={
                            ["password", "confirm"].includes(field.name)
                              ? 6
                              : undefined
                          }
                        />
                      </div>
                    ))}

                  {(roleDefinition.fields || [])
                    .filter(
                      (field) =>
                        ![
                          "name",
                          "user_code",
                          "mobile",
                          "password",
                          "confirm",
                        ].includes(field.name)
                    )
                    .map((field) => (
                      <div
                        key={field.name}
                        className="register-field"
                      >
                        <label>{field.label}</label>

                        {field.type === "select" ? (
                          <select
                            value={formData[field.name] || ""}
                            onChange={(event) =>
                              updateField(field.name, event.target.value)
                            }
                            required
                          >
                            <option value="">
                              Select {field.label}
                            </option>

                            {(field.options || []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || "text"}
                            value={formData[field.name] || ""}
                            onChange={(event) =>
                              updateField(field.name, event.target.value)
                            }
                            required
                          />
                        )}
                      </div>
                    ))}

                  {error && (
                    <p className="form-error">{error}</p>
                  )}

                  <button type="submit" disabled={loading}>
                    {loading
                      ? "Submitting..."
                      : "Submit Registration"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
