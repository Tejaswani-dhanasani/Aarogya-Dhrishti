
import { useState } from "react";
import { Link } from "react-router-dom";
import "./SpecialistConsultation.css";

const sampleReferrals = [
  {
    id: "REF-2001",
    patientId: "AD-1001",
    patientName: "Sample Patient One",
    age: 42,
    gender: "Female",
    district: "Demo District",
    referredBy: "Medical Officer",
    reason: "Persistent mouth ulcer and pain",
    referralDate: "30 Oct 2026",
    status: "Pending Consultation",
  },
  {
    id: "REF-2002",
    patientId: "AD-1002",
    patientName: "Sample Patient Two",
    age: 51,
    gender: "Male",
    district: "Demo District",
    referredBy: "Medical Officer",
    reason: "White patch and difficulty swallowing",
    referralDate: "30 Oct 2026",
    status: "Pending Consultation",
  },
];

function SpecialistConsultation() {
  const [referrals, setReferrals] = useState(sampleReferrals);
  const [selected, setSelected] = useState(sampleReferrals[0]);
  const [consultationType, setConsultationType] = useState("Teleconsultation");
  const [notes, setNotes] = useState("");
  const [recommendation, setRecommendation] = useState(
    "Further Clinical Evaluation"
  );
  const [status, setStatus] = useState("Consultation Completed");

  const handleSubmit = (event) => {
    event.preventDefault();

    const updated = referrals.map((item) =>
      item.id === selected.id ? { ...item, status } : item
    );

    setReferrals(updated);
    setSelected({ ...selected, status });

    alert("Consultation saved in this demo!");
    setNotes("");
  };

  return (
    <div className="specialist-page legacy">
      <header className="specialist-header">
        <div>
          <span className="specialist-brand">SEHAT · HEALTH FOR EVERY VILLAGE</span>
          <h1>Specialist Consultation</h1>
          <p>Review referred cases and document consultation outcomes.</p>
        </div>
        <Link to="/dashboard" className="specialist-home-link">Back to Dashboard</Link>
      </header>

      <main className="specialist-container">
        <section className="specialist-stats">
          <article>
            <span>Total Referrals</span>
            <h2>{referrals.length}</h2>
          </article>
          <article>
            <span>Pending Consultation</span>
            <h2>
              {referrals.filter(
                (item) => item.status === "Pending Consultation"
              ).length}
            </h2>
          </article>
          <article>
            <span>Completed</span>
            <h2>
              {referrals.filter(
                (item) => item.status === "Consultation Completed"
              ).length}
            </h2>
          </article>
        </section>

        <div className="specialist-layout">
          <section className="referral-list">
            <h2>Referral Queue</h2>
            <p>Select a referred patient.</p>

            {referrals.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`referral-card ${
                  selected.id === item.id ? "selected" : ""
                }`}
                onClick={() => {
                  setSelected(item);
                  setNotes("");
                }}
              >
                <strong>{item.patientName}</strong>
                <span>{item.patientId}</span>
                <small>{item.id} · {item.referralDate}</small>
                <em>{item.status}</em>
              </button>
            ))}
          </section>

          <section className="consultation-details">
            <div className="consultation-title">
              <div>
                <span className="specialist-brand">REFERRAL DETAILS</span>
                <h2>{selected.patientName}</h2>
                <p>{selected.id}</p>
              </div>
              <span className="consultation-status">{selected.status}</span>
            </div>

            <div className="specialist-info">
              <h3>Patient Information</h3>
              <div className="specialist-info-grid">
                <p><strong>Patient ID:</strong> {selected.patientId}</p>
                <p><strong>Age:</strong> {selected.age}</p>
                <p><strong>Gender:</strong> {selected.gender}</p>
                <p><strong>District:</strong> {selected.district}</p>
                <p><strong>Referred By:</strong> {selected.referredBy}</p>
                <p><strong>Referral Date:</strong> {selected.referralDate}</p>
              </div>
            </div>

            <div className="referral-reason">
              <h3>Referral Information</h3>
              <p>{selected.reason}</p>
              <small>
                This is referral information, not a confirmed diagnosis.
              </small>
            </div>

            <form className="consultation-form" onSubmit={handleSubmit}>
              <h3>Consultation Record</h3>

              <label htmlFor="consultationType">Consultation Type</label>
              <select
                id="consultationType"
                value={consultationType}
                onChange={(e) => setConsultationType(e.target.value)}
              >
                <option>Teleconsultation</option>
                <option>In-person Consultation</option>
              </select>

              <label htmlFor="notes">Specialist Notes</label>
              <textarea
                id="notes"
                rows="5"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter consultation observations and recommendations..."
                required
              />

              <label htmlFor="recommendation">Recommendation</label>
              <select
                id="recommendation"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
              >
                <option>Further Clinical Evaluation</option>
                <option>Diagnostic Investigation Recommended</option>
                <option>In-person Specialist Assessment</option>
                <option>Routine Follow-up</option>
              </select>

              <label htmlFor="status">Consultation Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option>Consultation Completed</option>
                <option>Follow-up Required</option>
                <option>Awaiting Patient</option>
              </select>

              <button type="submit">Save Consultation</button>
            </form>

            <p className="specialist-disclaimer">
              Consultation records should be completed by an authorized
              specialist. Screening flags and referral reasons do not
              independently establish a diagnosis.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default SpecialistConsultation;
