
import React, { useEffect, useState } from "react";
import "./FollowUp.css";

function FollowUp() {
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem("ad_token");

        if (!token) {
          throw new Error("Please login again.");
        }

        const response = await fetch(
          "http://localhost:5000/api/followups/patients",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load patients");
        }

        setPatients(data.patients || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((patient) =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="followup-page">
      <div className="followup-header">
        <div>
          <h1>Patient Follow-up</h1>
          <p>Manage and monitor your district patients</p>
        </div>
      </div>

      <div className="followup-stats">
        <div className="stat-card">
          <h3>Total Patients</h3>
          <h2>{patients.length}</h2>
        </div>

        <div className="stat-card">
          <h3>Follow-ups Completed</h3>
          <h2>0</h2>
        </div>

        <div className="stat-card">
          <h3>Upcoming Follow-ups</h3>
          <h2>0</h2>
        </div>
      </div>

      <div className="patient-section">
        <h2>My District Patients</h2>

        <input
          type="text"
          placeholder="Search patient by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="patient-search"
        />

        {loading && <p>Loading patients...</p>}

        {!loading && error && (
          <p className="error-message">{error}</p>
        )}

        {!loading && !error && filteredPatients.length === 0 && (
          <div className="empty-patients">
            <h3>No Patients Found</h3>
            <p>Patients from your district will appear here.</p>
          </div>
        )}

        {!loading && !error && filteredPatients.map((patient) => (
          <div className="patient-card" key={patient.id}>
            <h3>{patient.name}</h3>
            <p>Age: {patient.age} | Gender: {patient.gender}</p>
            <p>Village: {patient.village || "Not available"}</p>
            <p>Mobile: {patient.mobile}</p>
            <p>Health Worker: {patient.worker_name || "Not available"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FollowUp;
