import { useEffect, useState } from 'react';
import { X, Phone, MapPin, Droplet, Fingerprint, Pill, History, ShieldCheck, Info, Pencil, Archive } from 'lucide-react';
import api, { API_URL, errMsg } from '../api.js';
import { initials, riskOf, fmtDate, formatPatientId } from '../utils.js';
import { useLang } from '../lang.jsx';

const Row = ({ icon: Icon, label, children }) => (
  <div className="flex gap-3">
    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500"><Icon size={16} /></span>
    <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p><div className="text-sm text-neutral-800">{children || '—'}</div></div>
  </div>
);

// Slide-in panel with the complete patient record (health-card style).
export default function PatientDrawer({ patient: p, onClose, canManage = false, onEdit, onArchive }) {
  const { t } = useLang();
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (!p?.id) {
      setReports([]);
      return undefined;
    }
    let active = true;
    setReports([]);
    setReportsLoading(true);
    setReportsError('');
    api.get(`/prescriptions/patients/${p.id}`)
      .then(({ data }) => {
        if (active) setReports(data.reports);
      })
      .catch((error) => {
        if (active) setReportsError(errMsg(error));
      })
      .finally(() => {
        if (active) setReportsLoading(false);
      });
    return () => { active = false; };
  }, [p?.id]);
  if (!p) return null;
  const risk = riskOf(p);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-neutral-900/50" onClick={onClose} aria-hidden />
      <aside className="relative flex h-full w-full max-w-md animate-slide-in-right flex-col bg-white shadow-2xl" role="dialog" aria-label={t('details')}>
        <header className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">{t('details')}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-neutral-100" aria-label={t('close')}><X size={18} /></button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="flex items-center gap-4">
            {p.picture_path
              ? <img src={`${API_URL}${p.picture_path}`} alt="" className="h-20 w-20 rounded-2xl object-cover ring-1 ring-neutral-200" />
              : <span className="grid h-20 w-20 place-items-center rounded-2xl bg-primary-100 text-2xl font-bold text-primary-700">{initials(p.name)}</span>}
            <div>
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="font-mono text-sm text-primary-700">{formatPatientId(p.id)}</p>
              <p className="text-sm text-neutral-500">{p.age} yrs · {p.gender}</p>
              <p className="mt-1 text-xs text-neutral-400">Added {fmtDate(p.created_at)} by {p.worker_name}</p>
            </div>
          </div>

          <div className={`rounded-2xl p-4 ${risk.cls}`}>
            <p className="flex items-center gap-2 text-sm font-bold capitalize"><span className={`h-2.5 w-2.5 rounded-full ${risk.dot}`} />{t('priority')}: {t(risk.level)}</p>
            <p className="mt-1 flex items-start gap-1.5 text-xs opacity-80"><Info size={13} className="mt-0.5 shrink-0" />{t('priorityNote')}</p>
          </div>

          <div className="space-y-4">
            <Row icon={Phone} label="Mobile">{p.mobile}</Row>
            <Row icon={MapPin} label="Village">{p.village}</Row>
            <Row icon={Fingerprint} label="ABHA number"><span className="font-mono tracking-wider">{p.abha_number && p.abha_number.replace(/^(\d{2})(\d{4})(\d{4})(\d{4})$/, '$1-$2-$3-$4')}</span></Row>
            <Row icon={Droplet} label="Blood group">{p.blood_group}</Row>
          </div>

          <section>
            <h4 className="mb-2 text-sm font-semibold">Symptoms</h4>
            {p.symptoms.length ? (
              <ul className="space-y-2">{p.symptoms.map((s, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm ring-1 ring-neutral-200"><span>{s.name}</span><span className="text-neutral-500">{s.duration || '—'}</span></li>
              ))}</ul>
            ) : <p className="text-sm text-neutral-500">None recorded</p>}
          </section>

          <section>
            <h4 className="mb-2 text-sm font-semibold">Tobacco and habits</h4>
            <p className="mb-2 text-sm">Tobacco: <b>{p.tobacco}</b></p>
            {p.habits.length ? (
              <ul className="space-y-2">{p.habits.map((h, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm ring-1 ring-neutral-200"><span>{h.habit}</span><span className="text-neutral-500">{h.duration || '—'}</span></li>
              ))}</ul>
            ) : <p className="text-sm text-neutral-500">No habits recorded</p>}
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><Pill size={16} /> Clinical reports and prescriptions</h4>
            {reportsLoading && <p className="text-sm text-neutral-500">Loading clinical reports...</p>}
            {reportsError && <p className="text-sm text-error-700" role="alert">{reportsError}</p>}
            {!reportsLoading && !reportsError && !reports.length && (
              <p className="text-sm text-neutral-500">No clinical reports recorded.</p>
            )}
            <div className="space-y-3">
              {reports.map((report) => (
                <article className="rounded-xl border border-neutral-200 p-3" key={report.id}>
                  <p className="font-mono text-xs font-semibold text-primary-700">
                    {report.report_code}{report.prescription_code ? ` · ${report.prescription_code}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-neutral-600">
                    {report.severity === 'SERIOUS' ? 'Serious' : 'Non-serious'} · {report.clinician_name} · {fmtDate(report.created_at)}
                  </p>
                  {report.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{report.notes}</p>}
                  {report.medicines.length ? (
                    <ul className="mt-2 divide-y divide-neutral-100">
                      {report.medicines.map((medicine) => (
                        <li className="py-2 text-sm" key={medicine.id}>
                          <p className="font-medium">{medicine.name} · Quantity: {medicine.quantity} {medicine.unit}</p>
                          <p className="text-xs text-neutral-600">{medicine.dosage} · {medicine.frequency} · {medicine.duration}</p>
                          {medicine.instructions && <p className="text-xs text-neutral-600">{medicine.instructions}</p>}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-2 text-sm text-neutral-500">No medicines recorded.</p>}
                </article>
              ))}
            </div>
          </section>

          <div className="space-y-4">
            <Row icon={History} label="Previous health problems">{p.previous_health}</Row>
            <Row icon={Pill} label="Current medications">{p.medications}</Row>
            <Row icon={ShieldCheck} label="Consent">{p.consent ? 'Given by patient' : 'Not recorded'}</Row>
          </div>
        </div>
        {canManage && (
          <footer className="flex gap-3 border-t p-4">
            <button type="button" className="btn flex-1" onClick={() => onEdit?.(p)}>
              <Pencil size={16} />Edit patient
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-error-200 px-4 py-2 font-semibold text-error-700 hover:bg-error-50"
              onClick={() => onArchive?.(p)}
            >
              <Archive size={16} />Archive
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
