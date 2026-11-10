import { useMemo, useState } from 'react';
import { Search, Users, ChevronRight, Loader2, Fingerprint, FileText } from 'lucide-react';
import { API_URL } from '../api.js';
import { initials, riskOf, fmtDate, formatPatientId } from '../utils.js';
import { useLang } from '../lang.jsx';
import PatientDrawer from './PatientDrawer.jsx';
import PatientForm from './PatientForm.jsx';
import api, { errMsg } from '../api.js';

export function Avatar({ p, size = 'h-11 w-11' }) {
  return p.picture_path
    ? <img src={`${API_URL}${p.picture_path}`} alt="" className={`${size} shrink-0 rounded-xl object-cover`} />
    : <span className={`grid ${size} shrink-0 place-items-center rounded-xl bg-primary-100 text-sm font-bold text-primary-700`}>{initials(p.name)}</span>;
}

export function RiskIndicator({ p }) {
  const { t } = useLang();
  const r = riskOf(p);
  return <span className={`pill ${r.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />{t(r.level)}</span>;
}

// Searchable patient list. Pass `limit` to show only the latest few (used on the overview).
export default function PatientList({ rows, loading, error, limit, compact = false, canManage = false, onChanged }) {
  const { t } = useLang();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState('');

  const archivePatient = async (patient) => {
    if (!window.confirm(`Archive ${patient.name}'s record? It will be hidden from your patient list, but retained for clinical history.`)) return;
    setActionError('');
    try {
      await api.delete(`/patients/${patient.id}`);
      setOpen(null);
      onChanged?.();
    } catch (requestError) {
      setActionError(errMsg(requestError));
    }
  };

  const shown = useMemo(() => {
    let list = rows || [];
    if (!compact) {
      const s = q.trim().toLowerCase();
      if (s) list = list.filter((p) => [p.name, p.mobile, p.abha_number, p.village].some((v) => (v || '').toLowerCase().includes(s)));
      if (filter !== 'all') list = list.filter((p) => riskOf(p).level === filter);
    }
    return limit ? list.slice(0, limit) : list;
  }, [rows, q, filter, limit, compact]);

  if (error) return <p className="card text-error-700">{error}</p>;
  if (loading) return <p className="card flex items-center gap-2 text-neutral-500"><Loader2 className="animate-spin" size={16} />Loading…</p>;
  if (editing) {
    return (
      <PatientForm
        initialPatient={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChanged?.();
        }}
      />
    );
  }
  if (!rows?.length) {
    return (
      <div className="card py-14 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-neutral-100 text-neutral-400"><Users /></span>
        <p className="mt-4 font-semibold">{t('noPatients')}</p>
        <p className="text-sm text-neutral-500">{t('noPatientsT')}</p>
      </div>
    );
  }

  return (
    <div>
      {!compact && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input className="input pl-10" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex gap-1.5 rounded-xl bg-white p-1 ring-1 ring-neutral-200">
            {['all', 'high', 'medium', 'low'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${filter === f ? 'bg-primary-600 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}>{t(f)}</button>
            ))}
          </div>
        </div>
      )}

      <div className="card divide-y divide-neutral-100 p-0">
        {shown.map((p) => (
          <button key={p.id} onClick={() => setOpen(p)} className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition first:rounded-t-2xl last:rounded-b-2xl hover:bg-neutral-50">
            <Avatar p={p} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="truncate text-sm text-neutral-500">{formatPatientId(p.id)} · {p.age} yrs · {p.gender}{p.village ? ` · ${p.village}` : ''} · {p.mobile}</p>
              {!compact && p.symptoms.length > 0 && <p className="mt-0.5 truncate text-xs text-neutral-400">{p.symptoms.map((s) => s.name).join(', ')}</p>}
              {p.has_clinical_report && <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary-700"><FileText size={12} />Clinical report available</p>}
            </div>
            <div className="hidden text-right sm:block">
              {p.abha_number && <p className="mb-1 flex items-center justify-end gap-1 text-xs text-primary-700"><Fingerprint size={13} />ABHA</p>}
              <p className="text-xs text-neutral-400">{fmtDate(p.created_at)}</p>
            </div>
            <RiskIndicator p={p} />
            <ChevronRight size={18} className="text-neutral-300" />
          </button>
        ))}
        {!shown.length && <p className="p-8 text-center text-sm text-neutral-500">No matching patients.</p>}
      </div>
      {actionError && <p className="mt-3 text-sm text-error-700" role="alert">{actionError}</p>}
      <PatientDrawer
        patient={open}
        onClose={() => setOpen(null)}
        canManage={canManage}
        onEdit={(patient) => {
          setOpen(null);
          setEditing(patient);
        }}
        onArchive={archivePatient}
      />
    </div>
  );
}
