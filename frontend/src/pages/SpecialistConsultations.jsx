import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { formatPatientId } from '../utils.js';

function SpecialistConsultations() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState({});
  const [form, setForm] = useState({
    patientId: '',
    scheduledAt: '',
    reason: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    const [{ data: patientRows }, { data: appointmentRows }] = await Promise.all([
      api.get('/consultations/patients'),
      api.get('/consultations')
    ]);
    setPatients(patientRows);
    setAppointments(appointmentRows);
    setNotes(Object.fromEntries(
      appointmentRows.map((appointment) => [
        String(appointment.id),
        appointment.specialist_notes || ''
      ])
    ));
  }, []);

  useEffect(() => {
    loadData()
      .catch((requestError) => setError(errMsg(requestError)))
      .finally(() => setLoading(false));
  }, [loadData]);

  const scheduleConsultation = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const { data } = await api.post('/consultations', form);
      setInviteUrl(`${window.location.origin}${data.patientJoinUrl}`);
      setForm({ patientId: '', scheduledAt: '', reason: '' });
      await loadData();
      setMessage('Consultation scheduled successfully.');
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setSaving(false);
    }
  };

  const copyInviteUrl = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyMessage('Patient invite link copied.');
    } catch {
      setCopyMessage('Copy was blocked by the browser. Select and copy the link below.');
    }
  };

  const updateConsultation = async (appointment, status) => {
    const id = String(appointment.id);
    setSavingId(id);
    setError('');
    setMessage('');
    try {
      const { data } = await api.patch(`/consultations/${id}`, {
        status,
        specialistNotes: notes[id] || ''
      });
      setAppointments((current) => current.map((item) =>
        String(item.id) === id ? { ...item, ...data.appointment } : item
      ));
      setMessage('Consultation updated successfully.');
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setSavingId('');
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Specialist consultations</h1>
        <p className="mt-1 text-neutral-600">Schedule and manage consultations for patients in your district.</p>
        <Link className="mt-3 inline-block text-primary-700 hover:underline" to="/dashboard">
          Back to dashboard
        </Link>
      </header>

      {error && <p className="rounded-lg bg-error-50 p-3 text-error-700" role="alert">{error}</p>}
      {message && <p className="rounded-lg bg-success-50 p-3 text-success-700" role="status">{message}</p>}
      {inviteUrl && (
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Patient invite link</h2>
          <p className="text-sm text-neutral-600">
            Share this private link with the patient. Anyone who has it can join the call.
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              className="input min-w-0 flex-1"
              aria-label="Patient invite link"
              readOnly
              value={inviteUrl}
              onFocus={(event) => event.target.select()}
            />
            <button className="btn" type="button" onClick={copyInviteUrl}>
              Copy invite link
            </button>
          </div>
          {copyMessage && <p role="status">{copyMessage}</p>}
          <a
            className="inline-block text-primary-700 hover:underline"
            href={inviteUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open patient invite
          </a>
        </section>
      )}

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Schedule a consultation</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={scheduleConsultation}>
          <label className="grid gap-1">
            <span className="label">Patient</span>
            <select
              className="input"
              value={form.patientId}
              onChange={(event) => setForm({ ...form, patientId: event.target.value })}
              required
            >
              <option value="">Choose a patient</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name} — {formatPatientId(patient.id)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="label">Appointment date and time</span>
            <input
              className="input"
              type="datetime-local"
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16)}
              value={form.scheduledAt}
              onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
              required
            />
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="label">Reason (optional)</span>
            <textarea
              className="input min-h-24"
              maxLength={2000}
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </label>
          <button className="btn md:col-span-2 md:justify-self-start" type="submit" disabled={saving || loading}>
            {saving ? 'Scheduling...' : 'Schedule consultation'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your scheduled consultations</h2>
        {loading && <p>Loading consultations...</p>}
        {!loading && appointments.length === 0 && (
          <p className="card p-5 text-neutral-600">No consultations have been scheduled.</p>
        )}
        {appointments.map((appointment) => {
          const id = String(appointment.id);
          const isSaving = savingId === id;
          return (
            <article className="card space-y-4 p-5" key={id}>
              <div>
                <h3 className="font-semibold">{appointment.patient_name}</h3>
                <p className="text-sm text-neutral-600">
                  Age {appointment.patient_age} · {appointment.patient_gender} · Patient {formatPatientId(appointment.patient_id)}
                </p>
                <p className="mt-1 text-sm">
                  {new Date(appointment.scheduled_at).toLocaleString()} · {appointment.status}
                </p>
                {appointment.reason && <p className="mt-2">{appointment.reason}</p>}
              </div>
              <label className="grid gap-1">
                <span className="label">Specialist notes</span>
                <textarea
                  className="input min-h-20"
                  maxLength={4000}
                  value={notes[id] || ''}
                  onChange={(event) => setNotes((current) => ({
                    ...current,
                    [id]: event.target.value
                  }))}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn"
                  type="button"
                  disabled={isSaving}
                  onClick={() => updateConsultation(appointment, appointment.status)}
                >
                  {isSaving ? 'Saving...' : 'Save notes'}
                </button>
                {appointment.status === 'SCHEDULED' && (
                  <>
                    <button
                      className="btn"
                      type="button"
                      disabled={isSaving}
                      onClick={() => updateConsultation(appointment, 'COMPLETED')}
                    >
                      Mark completed
                    </button>
                    <button
                      className="rounded-xl border border-neutral-300 px-4 py-2 font-semibold text-neutral-700"
                      type="button"
                      disabled={isSaving}
                      onClick={() => updateConsultation(appointment, 'CANCELLED')}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {appointment.status === 'SCHEDULED' && (
                  <>
                    <Link
                      className="self-center text-primary-700 hover:underline"
                      to={`/patient-consultation/${appointment.room_name}`}
                    >
                      Join video consultation
                    </Link>
                    <button
                      className="self-center text-primary-700 hover:underline"
                      type="button"
                      onClick={() => {
                        setInviteUrl(`${window.location.origin}/patient-consultation/${appointment.room_name}`);
                        setCopyMessage('');
                      }}
                    >
                      Show patient invite link
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

export default SpecialistConsultations;
