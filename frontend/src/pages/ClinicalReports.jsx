import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { formatPatientId } from '../utils.js';

const emptyMedicine = () => ({
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
  quantity: '',
  unit: '',
  instructions: ''
});

function ClinicalReports() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [severity, setSeverity] = useState('NON_SERIOUS');
  const [notes, setNotes] = useState('');
  const [medicines, setMedicines] = useState([emptyMedicine()]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const reportRequestId = useRef(0);

  const loadReports = useCallback(async (selectedPatientId) => {
    const requestId = ++reportRequestId.current;
    if (!selectedPatientId) {
      setReports([]);
      setLoadingReports(false);
      return;
    }
    setLoadingReports(true);
    try {
      const { data } = await api.get(`/prescriptions/patients/${selectedPatientId}`);
      if (requestId === reportRequestId.current) {
        setReports(data.reports);
        setError('');
      }
    } catch (requestError) {
      if (requestId === reportRequestId.current) {
        setError(errMsg(requestError));
        setReports([]);
      }
    } finally {
      if (requestId === reportRequestId.current) setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    api.get('/prescriptions/patients')
      .then(({ data }) => setPatients(data))
      .catch((requestError) => setError(errMsg(requestError)))
      .finally(() => setLoading(false));
  }, []);

  const selectPatient = (value) => {
    setPatientId(value);
    setMessage('');
    setError('');
    setReports([]);
    loadReports(value);
  };

  const updateMedicine = (index, field, value) => {
    setMedicines((current) => current.map((medicine, itemIndex) =>
      itemIndex === index ? { ...medicine, [field]: value } : medicine
    ));
  };

  const saveReport = async (event) => {
    event.preventDefault();
    if (!patientId) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        severity,
        notes,
        medicines: severity === 'NON_SERIOUS'
          ? medicines.filter((medicine) => Object.values(medicine).some((value) => value.trim()))
          : []
      };
      await api.post(`/prescriptions/patients/${patientId}`, payload);
      setMessage('Clinical report saved and shared with the Health Worker.');
      setNotes('');
      setMedicines([emptyMedicine()]);
      await loadReports(patientId);
    } catch (requestError) {
      setError(errMsg(requestError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">Clinical reports and prescriptions</h1>
        <p className="mt-1 text-neutral-600">
          Record your assessment and, for clinician-designated non-serious conditions, enter any medicines and quantities.
        </p>
        <Link className="mt-3 inline-block text-primary-700 hover:underline" to="/dashboard">
          Back to dashboard
        </Link>
      </header>

      <p className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-900">
        This form does not recommend medicines or assess severity. A Medical Officer or Specialist must enter the clinical assessment and all prescription details. Reports are visible in the patient record to the owning Health Worker.
      </p>
      {error && <p className="rounded-lg bg-error-50 p-3 text-error-700" role="alert">{error}</p>}
      {message && <p className="rounded-lg bg-success-50 p-3 text-success-700" role="status">{message}</p>}

      <form className="card space-y-5 p-6" onSubmit={saveReport}>
        <h2 className="text-lg font-semibold">Create clinical report</h2>
        <label className="grid gap-1">
          <span className="label">Patient</span>
          <select className="input" value={patientId} onChange={(event) => selectPatient(event.target.value)} required disabled={loading}>
            <option value="">Choose a patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {formatPatientId(patient.id)} — {patient.name} · {patient.age} yrs · {patient.village || 'Village not recorded'}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid gap-2">
          <legend className="label">Clinician-assessed condition severity</legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="severity" value="NON_SERIOUS" checked={severity === 'NON_SERIOUS'} onChange={() => setSeverity('NON_SERIOUS')} />
            Non-serious
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name="severity" value="SERIOUS" checked={severity === 'SERIOUS'} onChange={() => setSeverity('SERIOUS')} />
            Serious
          </label>
        </fieldset>

        {severity === 'SERIOUS' ? (
          <p className="rounded-lg bg-warning-50 p-3 text-sm text-warning-900">
            Medication entries are disabled for reports marked serious. Follow your clinical protocol for care and referral.
          </p>
        ) : (
          <section className="space-y-4 rounded-xl border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold">Prescription medicines</h3>
                <p className="text-xs text-neutral-600">Enter only medicines selected by the clinician.</p>
              </div>
              <button
                type="button"
                className="btn"
                disabled={medicines.length >= 20}
                onClick={() => setMedicines((current) => [...current, emptyMedicine()])}
              >
                <Plus size={16} /> Add medicine
              </button>
            </div>
            {medicines.map((medicine, index) => (
              <fieldset key={index} className="grid gap-3 rounded-lg bg-neutral-50 p-4 sm:grid-cols-2">
                <legend className="px-1 text-sm font-medium">Medicine {index + 1}</legend>
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-sm">Medicine name</span>
                  <input className="input" maxLength={150} value={medicine.name} onChange={(event) => updateMedicine(index, 'name', event.target.value)} />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm">Dosage</span>
                  <input className="input" maxLength={100} placeholder="Clinician-entered dosage" value={medicine.dosage} onChange={(event) => updateMedicine(index, 'dosage', event.target.value)} />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm">Frequency</span>
                  <input className="input" maxLength={100} placeholder="Clinician-entered frequency" value={medicine.frequency} onChange={(event) => updateMedicine(index, 'frequency', event.target.value)} />
                </label>
                <label className="grid gap-1">
                  <span className="text-sm">Duration</span>
                  <input className="input" maxLength={100} placeholder="Clinician-entered duration" value={medicine.duration} onChange={(event) => updateMedicine(index, 'duration', event.target.value)} />
                </label>
                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <label className="grid gap-1">
                    <span className="text-sm">Quantity</span>
                    <input className="input" type="number" min="0.01" step="0.01" value={medicine.quantity} onChange={(event) => updateMedicine(index, 'quantity', event.target.value)} />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-sm">Unit</span>
                    <input className="input" maxLength={30} placeholder="tablets, ml..." value={medicine.unit} onChange={(event) => updateMedicine(index, 'unit', event.target.value)} />
                  </label>
                </div>
                <label className="grid gap-1 sm:col-span-2">
                  <span className="text-sm">Instructions (optional)</span>
                  <input className="input" maxLength={500} value={medicine.instructions} onChange={(event) => updateMedicine(index, 'instructions', event.target.value)} />
                </label>
                {medicines.length > 1 && (
                  <button
                    className="inline-flex items-center gap-2 justify-self-start text-sm text-error-700 hover:underline sm:col-span-2"
                    type="button"
                    onClick={() => setMedicines((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 size={15} /> Remove medicine
                  </button>
                )}
              </fieldset>
            ))}
          </section>
        )}

        <label className="grid gap-1">
          <span className="label">Clinical notes</span>
          <textarea className="input min-h-24" maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button className="btn" type="submit" disabled={!patientId || saving}>
          {saving ? 'Saving report...' : 'Save clinical report'}
        </button>
      </form>

      {patientId && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Patient report history</h2>
          {loadingReports && <p className="text-neutral-600">Loading reports...</p>}
          {!loadingReports && reports.length === 0 && <p className="card p-5 text-neutral-600">No clinical reports have been saved for this patient.</p>}
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </section>
      )}
    </main>
  );
}

function ReportCard({ report }) {
  return (
    <article className="card space-y-3 p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{report.report_code}{report.prescription_code ? ` · ${report.prescription_code}` : ''}</h3>
          <p className="text-sm text-neutral-600">
            {report.severity === 'SERIOUS' ? 'Serious' : 'Non-serious'} · {report.clinician_name} · {new Date(report.created_at).toLocaleString()}
          </p>
        </div>
      </header>
      {report.notes && <p className="whitespace-pre-wrap text-sm">{report.notes}</p>}
      {report.medicines.length > 0 ? (
        <ul className="divide-y divide-neutral-100">
          {report.medicines.map((medicine) => (
            <li className="space-y-1 py-3 text-sm" key={medicine.id}>
              <p className="font-semibold">{medicine.name} · Quantity: {medicine.quantity} {medicine.unit}</p>
              <p className="text-neutral-700">{medicine.dosage} · {medicine.frequency} · {medicine.duration}</p>
              {medicine.instructions && <p className="text-neutral-600">{medicine.instructions}</p>}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-neutral-600">No medicines recorded.</p>}
    </article>
  );
}

export default ClinicalReports;
