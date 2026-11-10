
import { useState } from "react";
import { Link } from "react-router-dom";
import "./MedicalOfficerReview.css";

const sampleRecords = [
  {
    id: "SCR-1001",
    patientId: "AD-1001",
    patientName: "Sample Patient One",
    age: 42,
    gender: "Female",
    district: "Demo District",
    symptoms: ["Mouth ulcer", "Persistent mouth pain"],
    duration: "More than 2 weeks",
    notes: "Patient reported persistent discomfort.",
    submittedOn: "30 Oct 2026",
    status: "Pending Review",
  },
  {
    id: "SCR-1002",
    patientId: "AD-1002",
    patientName: "Sample Patient Two",
    age: 51,
    gender: "Male",
    district: "Demo District",
    symptoms: ["White patch", "Difficulty swallowing"],
    duration: "1–2 weeks",
    notes: "Patient requested clinical evaluation.",
    submittedOn: "30 Oct 2026",
    status: "Pending Review",
  },
];

function MedicalOfficerReview() {
  const [records, setRecords] = useState(sampleRecords);
  const [selectedRecord, setSelectedRecord] = useState(sampleRecords[0]);
  const [observations, setObservations] = useState("");
  const [decision, setDecision] = useState("Needs Further Evaluation");
  const [referral, setReferral] = useState("No");
  const [reviewStatus, setReviewStatus] = useState("Reviewed");

  const handleReviewSubmit = (event) => {
    event.preventDefault();

    const updatedRecords = records.map((record) =>
      record.id === selectedRecord.id
        ? { ...record, status: reviewStatus }
        : record
    );

    setRecords(updatedRecords);
    setSelectedRecord({
      ...selectedRecord,
      status: reviewStatus,
    });

    alert("Clinical review saved in this demo!");
    setObservations("");
  };

  return (
    <div className="review-page legacy">
      <header className="review-header">
        <div>
          <p className="review-label">SEHAT · HEALTH FOR EVERY VILLAGE</p>
          <h1>Medical Officer Review</h1>
          <p>Review submitted oral screening records.</p>
        </div>

        <Link to="/dashboard" className="review-home-link">
          Back to Dashboard
        </Link>
      </header>

      <main className="review-container">
        <section className="review-stats">
          <div className="review-stat-card">
            <span>Total Records</span>
            <h2>{records.length}</h2>
          </div>

          <div className="review-stat-card">
            <span>Pending Review</span>
            <h2>
              {records.filter(
                (record) => record.status === "Pending Review"
              ).length}
            </h2>
          </div>

          <div className="review-stat-card">
            <span>Reviewed</span>
            <h2>
              {records.filter(
                (record) => record.status === "Reviewed"
              ).length}
            </h2>
          </div>
        </section>

        <div className="review-layout">
          <section className="record-list">
            <h2>Screening Records</h2>
            <p className="section-description">
              Select a record to review.
            </p>

            {records.map((record) => (
              <button
                key={record.id}
                className={`record-card ${
                  selectedRecord.id === record.id ? "active" : ""
                }`}
                onClick={() => {
                  setSelectedRecord(record);
                  setObservations("");
                }}
              >
                <div className="record-card-top">
                  <strong>{record.patientName}</strong>
                  <span
                    className={`status-tag ${
                      record.status === "Reviewed" ? "completed" : ""
                    }`}
                  >
                    {record.status}
                  </span>
                </div>

                <p>{record.patientId}</p>
                <small>{record.submittedOn}</small>
              </button>
            ))}
          </section>

          <section className="record-details">
            <div className="details-heading">
              <div>
                <p className="review-label">SELECTED RECORD</p>
                <h2>{selectedRecord.patientName}</h2>
                <p>{selectedRecord.id}</p>
              </div>
              <span className="details-status">
                {selectedRecord.status}
              </span>
            </div>

            <div className="patient-information">
              <h3>Patient Information</h3>

              <div className="information-grid">
                <p><strong>Patient ID:</strong> {selectedRecord.patientId}</p>
                <p><strong>Age:</strong> {selectedRecord.age}</p>
                <p><strong>Gender:</strong> {selectedRecord.gender}</p>
                <p><strong>District:</strong> {selectedRecord.district}</p>
                <p><strong>Submitted:</strong> {selectedRecord.submittedOn}</p>
                <p><strong>Duration:</strong> {selectedRecord.duration}</p>
              </div>
            </div>

            <div className="screening-information">
              <h3>Screening Information</h3>

              <p className="field-caption">Reported Symptoms</p>
              <div className="symptom-tags">
                {selectedRecord.symptoms.map((symptom) => (
                  <span key={symptom}>{symptom}</span>
                ))}
              </div>

              <p className="field-caption">Additional Notes</p>
              <p className="patient-notes">
                {selectedRecord.notes || "No additional notes."}
              </p>

              <p className="field-caption">Oral Image</p>
              <div className="image-placeholder">
                No image attached to this demo record.
              </div>
            </div>

            <form className="clinical-review-form" onSubmit={handleReviewSubmit}>
              <h3>Clinical Review</h3>

              <label htmlFor="observations">
                Clinical Observations
              </label>
              <textarea
                id="observations"
                rows="4"
                placeholder="Enter observations from the clinical examination..."
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                required
              />

              <label htmlFor="decision">
                Clinical Decision
              </label>
              <select
                id="decision"
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
              >
                <option>Needs Further Evaluation</option>
                <option>Specialist Consultation Recommended</option>
                <option>Follow-up Recommended</option>
                <option>Clinical Review Completed</option>
              </select>

              <label htmlFor="referral">
                Specialist Referral
              </label>
              <select
                id="referral"
                value={referral}
                onChange={(event) => setReferral(event.target.value)}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>

              <label htmlFor="reviewStatus">
                Review Status
              </label>
              <select
                id="reviewStatus"
                value={reviewStatus}
                onChange={(event) => setReviewStatus(event.target.value)}
              >
                <option value="Reviewed">Reviewed</option>
                <option value="Pending Review">Pending Review</option>
              </select>

              <button type="submit" className="save-review-button">
                Save Clinical Review
              </button>
            </form>

            <p className="clinical-disclaimer">
              This page records a qualified medical officer's review.
              The screening information and any AI flag are not a diagnosis.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default MedicalOfficerReview;
