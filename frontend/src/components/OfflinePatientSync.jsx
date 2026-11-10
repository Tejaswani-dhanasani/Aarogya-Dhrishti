import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Cloud, CloudOff, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import {
  deleteQueuedPatient,
  getQueuedPatients,
  updateQueuedPatient
} from '../offlinePatientQueue.js';

function OfflinePatientSync({ workerId, onSynced }) {
  const [records, setRecords] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    const queued = await getQueuedPatients(workerId);
    setRecords(queued.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    setLoading(false);
    return queued;
  }, [workerId]);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    setError('');

    try {
      const queued = await refresh();
      let syncedAny = false;
      for (const record of queued) {
        if (record.status === 'needs-review' && !record.allowDuplicate) continue;

        const formData = new FormData();
        Object.entries(record.patient).forEach(([key, value]) => {
          if (key === 'picture') {
            if (value) formData.append('picture', value, value.name || 'patient-photo');
          } else if (key === 'symptoms' || key === 'habits') {
            formData.append(key, JSON.stringify(value || []));
          } else {
            formData.append(key, value ?? '');
          }
        });
        formData.append('client_id', record.clientId);
        if (record.allowDuplicate) formData.append('allow_duplicate', 'true');

        try {
          await api.post('/patients', formData, {
            headers: { 'Idempotency-Key': record.clientId }
          });
          await deleteQueuedPatient(record.clientId, workerId);
          syncedAny = true;
        } catch (requestError) {
          const candidates = requestError.response?.data?.duplicateCandidates;
          await updateQueuedPatient(record.clientId, workerId, {
            status: candidates ? 'needs-review' : 'failed',
            duplicateCandidates: candidates || [],
            lastError: errMsg(requestError)
          });
        }
      }

      await refresh();
      if (syncedAny) onSynced?.();
    } catch (storageError) {
      console.error('Offline patient sync failed:', storageError);
      setError('Unable to access the offline patient queue on this device.');
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [onSynced, refresh, workerId]);

  useEffect(() => {
    refresh().then((queued) => {
      if (navigator.onLine && queued.length) syncNow();
    }).catch((storageError) => {
      console.error('Unable to load offline patient queue:', storageError);
      setError('Unable to access the offline patient queue on this device.');
      setLoading(false);
    });

    const handleOnline = () => {
      setOnline(true);
      syncNow();
    };
    const handleOffline = () => setOnline(false);
    const handleQueueUpdated = () => {
      refresh().then((queued) => {
        if (navigator.onLine && queued.length) syncNow();
      }).catch((storageError) => {
        console.error('Unable to refresh offline patient queue:', storageError);
        setError('Unable to access the offline patient queue on this device.');
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('patient-queue-updated', handleQueueUpdated);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('patient-queue-updated', handleQueueUpdated);
    };
  }, [refresh, syncNow]);

  const allowDuplicateAndSync = async (record) => {
    await updateQueuedPatient(record.clientId, workerId, {
      allowDuplicate: true,
      status: 'pending'
    });
    await syncNow();
  };

  const discardRecord = async (record) => {
    if (!window.confirm(`Delete the unsynced record for ${record.patient.name} from this device?`)) return;
    await deleteQueuedPatient(record.clientId, workerId);
    await refresh();
  };

  if (loading || (!records.length && !error)) return null;

  return (
    <section className="card mb-5 space-y-4 border border-warning-200" aria-label="Offline patient synchronization">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {online ? <Cloud size={18} className="text-success-700" /> : <CloudOff size={18} className="text-warning-700" />}
          <div>
            <h2 className="font-semibold">Offline patient records ({records.length})</h2>
            <p className="text-xs text-neutral-600">
              {online ? 'Connection available' : 'Offline — records will sync when connection returns'}
            </p>
          </div>
        </div>
        <button className="btn" type="button" disabled={!online || syncing} onClick={syncNow}>
          {syncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Sync now
        </button>
      </header>

      <p className="rounded-lg bg-warning-50 p-3 text-xs text-warning-900">
        These patient details and photos are stored unencrypted in this browser on this device. Use offline mode only on a protected, non-shared device, and sync then clear records as soon as possible.
      </p>

      {error && <p className="text-sm text-error-700" role="alert">{error}</p>}
      {records.map((record) => (
        <article className="rounded-xl border border-neutral-200 p-4" key={record.clientId}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{record.patient.name}</h3>
              <p className="text-sm text-neutral-600">
                {record.patient.mobile} · saved {new Date(record.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
                <AlertCircle size={13} />
                {record.status === 'needs-review'
                  ? 'Possible duplicate — review before syncing'
                  : record.lastError || 'Waiting to sync'}
              </p>
            </div>
            <button
              className="rounded-lg p-2 text-neutral-500 hover:bg-error-50 hover:text-error-700"
              type="button"
              aria-label={`Delete unsynced record for ${record.patient.name}`}
              onClick={() => discardRecord(record)}
            >
              <Trash2 size={17} />
            </button>
          </div>
          {record.status === 'needs-review' && record.duplicateCandidates?.length > 0 && (
            <div className="mt-3 rounded-lg bg-warning-50 p-3 text-sm text-warning-900">
              <p className="font-semibold">Matching records</p>
              <ul className="mt-1 list-inside list-disc">
                {record.duplicateCandidates.map((candidate) => (
                  <li key={candidate.id}>{candidate.name} · #{candidate.id} · {candidate.mobile}</li>
                ))}
              </ul>
              <button
                className="btn mt-3"
                type="button"
                disabled={!online || syncing}
                onClick={() => allowDuplicateAndSync(record)}
              >
                Sync as a separate patient
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

export default OfflinePatientSync;
