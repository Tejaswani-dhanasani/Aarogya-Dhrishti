import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api.js";
import "./PatientManagement.css";

function PatientManagement() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/patients");
      setPatients(data);
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const today = new Date().toDateString();
  const registeredToday = patients.filter(
    (patient) => new Date(patient.created_at).toDateString() === today,
  ).length;
  const consented = patients.filter((patient) => patient.consent).length;

  return (
    <div className="patient-page legacy">
      <header className="patient-header">
        <Link to="/dashboard" className="patient-brand">
          + AAROGYA DRISHTI
        </Link>
        <Link to="/dashboard" className="patient-home">
          Back to Dashboard
        </Link>
      </header>

      <main className="patient-container">
        <div className="patient-title">
          <div>
            <span>PATIENT MANAGEMENT</span>
            <h1>Patient Records</h1>
            <p>Records submitted by health workers.</p>
          </div>
        </div>

        <div className="patient-stats">
          <div className="patient-stat-card">
            <span>Total Patients</span>
            <h2>{patients.length}</h2>
          </div>
          <div className="patient-stat-card">
            <span>Registered Today</span>
            <h2>{registeredToday}</h2>
          </div>
          <div className="patient-stat-card">
            <span>Consent Recorded</span>
            <h2>{consented}</h2>
          </div>
        </div>

        <section className="patient-table-section">
          <h2>Registered Patients</h2>

          {loading ? (
            <p role="status">Loading patient records…</p>
          ) : error ? (
            <div role="alert">
              <p>{error}</p>
              <button type="button" onClick={loadPatients}>
                Try again
              </button>
            </div>
          ) : patients.length === 0 ? (
            <div className="empty-patients">
              <span>👥</span>
              <h3>No Patient Records Yet</h3>
              <p>Patient records submitted by health workers will appear here.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Patient ID</th>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Village</th>
                    <th>Health Worker</th>
                    <th>Registration Date</th>
                    <th>Consent</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr key={patient.id}>
                      <td>AD-{patient.id}</td>
                      <td>{patient.name}</td>
                      <td>{patient.age}</td>
                      <td>{patient.gender}</td>
                      <td>{patient.village || "—"}</td>
                      <td>{patient.worker_name}</td>
                      <td>
                        {new Date(patient.created_at).toLocaleDateString()}
                      </td>
                      <td>{patient.consent ? "Recorded" : "Not recorded"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default PatientManagement;
