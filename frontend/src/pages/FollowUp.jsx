import { useEffect, useState } from 'react';
import api, { errMsg } from '../api.js';
import './FollowUp.css';

function FollowUp() {
  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    completedFollowUps: 0,
    upcomingFollowUps: 0
  });
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    health_status: '',
    remarks: '',
    followup_date: '',
    next_followup_date: ''
  });
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPatients = async () => {
    const { data } = await api.get('/followups/patients');
    setPatients(data.patients);
    setStats(data.stats);
    setSelectedPatientId((current) =>
      data.patients.some((patient) => String(patient.id) === current)
        ? current
        : String(data.patients[0]?.id || '')
    );
  };

  useEffect(() => {
    loadPatients()
      .catch((requestError) => setError(errMsg(requestError)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPatientId) {
      setHistory([]);
      return;
    }

    let active = true;
    setLoadingHistory(true);
    api.get(`/followups/patients/${selectedPatientId}/history`)
      .then(({ data }) => {
        if (active) {
          setHistory(data);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(errMsg(requestError));
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => { active = false; };
  }, [selectedPatientId]);

  const filteredPatients = patients.filter((patient) =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedPatient = patients.find(
    (patient) => String(patient.id) === selectedPatientId
  );

  const saveFollowUp = async (event) => {
    event.preventDefault();
    if (!selectedPatientId) return;

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post(`/followups/patients/${selectedPatientId}`, form);
      setForm({
        health_status: '',
        remarks: '',
        followup_date: '',
        next_followup_date: ''
      });
      await loadPatients();
      const { data } = await api.get(
        `/followups/patients/${selectedPatientId}/history`
      );
      setHistory(data);
      setMessage('Follow-up saved successfully.');
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="followup-page">
      <header className="followup-header">
        <div>
          <h1>Patient Follow-up</h1>
          <p>Record follow-ups and monitor patients in your district.</p>
        </div>
      </header>

      <section className="followup-stats" aria-label="Follow-up summary">
        <div className="stat-card">
          <h3>District Patients</h3>
          <h2>{stats.totalPatients}</h2>
        </div>
        <div className="stat-card">
          <h3>Completed Follow-ups</h3>
          <h2>{stats.completedFollowUps}</h2>
        </div>
        <div className="stat-card">
          <h3>Patients with Upcoming Follow-ups</h3>
          <h2>{stats.upcomingFollowUps}</h2>
        </div>
      </section>

      <section className="patient-section">
        <h2>My District Patients</h2>
        <label className="sr-only" htmlFor="patient-search">Search patients</label>
        <input
          id="patient-search"
          type="search"
          placeholder="Search patient by name..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="patient-search"
        />

        {loading && <p>Loading patients...</p>}
        {!loading && error && <p className="error-message" role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

        {!loading && !error && filteredPatients.length === 0 && (
          <div className="empty-patients">
            <h3>No Patients Found</h3>
            <p>Patients from your district will appear here.</p>
          </div>
        )}

        {!loading && filteredPatients.length > 0 && (
          <div className="followup-layout">
            <div className="followup-patient-list">
              {filteredPatients.map((patient) => (
                <button
                  type="button"
                  className={`patient-card${String(patient.id) === selectedPatientId ? ' selected' : ''}`}
                  key={patient.id}
                  onClick={() => {
                    setSelectedPatientId(String(patient.id));
                    setMessage('');
                  }}
                >
                  <strong>{patient.name}</strong>
                  <span>Age: {patient.age} | Gender: {patient.gender}</span>
                  <span>Village: {patient.village || 'Not available'}</span>
                  <span>Next follow-up: {patient.next_followup_date || 'Not scheduled'}</span>
                </button>
              ))}
            </div>

            {selectedPatient && (
              <div className="followup-details">
                <h2>Follow-up for {selectedPatient.name}</h2>
                <form onSubmit={saveFollowUp} className="followup-form">
                  <label htmlFor="health-status">Health status</label>
                  <textarea
                    id="health-status"
                    required
                    maxLength={2000}
                    value={form.health_status}
                    onChange={(event) => setForm({ ...form, health_status: event.target.value })}
                  />
                  <label htmlFor="followup-remarks">Remarks (optional)</label>
                  <textarea
                    id="followup-remarks"
                    maxLength={4000}
                    value={form.remarks}
                    onChange={(event) => setForm({ ...form, remarks: event.target.value })}
                  />
                  <label htmlFor="followup-date">Follow-up date (optional)</label>
                  <input
                    id="followup-date"
                    type="date"
                    value={form.followup_date}
                    onChange={(event) => setForm({ ...form, followup_date: event.target.value })}
                  />
                  <label htmlFor="next-followup-date">Next follow-up date (optional)</label>
                  <input
                    id="next-followup-date"
                    type="date"
                    value={form.next_followup_date}
                    onChange={(event) => setForm({ ...form, next_followup_date: event.target.value })}
                  />
                  <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save follow-up'}
                  </button>
                </form>

                <h3>Follow-up history</h3>
                {loadingHistory && <p>Loading history...</p>}
                {!loadingHistory && history.length === 0 && <p>No follow-ups recorded yet.</p>}
                {!loadingHistory && history.map((item) => (
                  <article className="followup-history-item" key={item.id}>
                    <strong>{item.followup_date}</strong>
                    <p>{item.health_status}</p>
                    {item.remarks && <p>{item.remarks}</p>}
                    {item.next_followup_date && (
                      <small>Next follow-up: {item.next_followup_date}</small>
                    )}
                    <small>Recorded by {item.navigator_name}</small>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default FollowUp;
