import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Users,
  XCircle,
  RefreshCw,
} from 'lucide-react';

import api, { errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';

const ROLE_LABELS = {
  DISTRICT_ADMIN: 'District Admin',
  MEDICAL_OFFICER: 'Medical Officer',
  SPECIALIST: 'Specialist',
  NAVIGATOR: 'Patient Navigator',
};

const STATUS_LABELS = {
  PENDING: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export default function OfficialAccountManager() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [officials, setOfficials] = useState([]);
  const [loadingOfficials, setLoadingOfficials] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadOfficials = useCallback(async () => {
    setLoadingOfficials(true);
    setLoadError('');

    try {
      const { data } = await api.get('/admin/officials');
      setOfficials(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(errMsg(error));
    } finally {
      setLoadingOfficials(false);
    }
  }, []);

  useEffect(() => {
    loadOfficials();
  }, [loadOfficials]);

  const handleApprove = async (official) => {
    const confirmed = window.confirm(
      `Approve ${official.name}'s account?`
    );

    if (!confirmed) return;

    setBusyId(official.id);
    setActionError('');
    setSuccess('');

    try {
      await api.patch(`/admin/officials/${official.id}/approval`, {
        status: 'APPROVED',
      });

      setSuccess(`${official.name}'s account has been approved.`);
      await loadOfficials();
    } catch (error) {
      setActionError(errMsg(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (official) => {
    const reason = rejectionReason.trim();

    if (!reason) {
      setActionError('Please enter a reason for rejection.');
      return;
    }

    setBusyId(official.id);
    setActionError('');
    setSuccess('');

    try {
      await api.patch(`/admin/officials/${official.id}/approval`, {
        status: 'REJECTED',
        rejection_reason: reason,
      });

      setSuccess(`${official.name}'s registration has been rejected.`);
      setRejectingId(null);
      setRejectionReason('');

      await loadOfficials();
    } catch (error) {
      setActionError(errMsg(error));
    } finally {
      setBusyId(null);
    }
  };

  const openRejectForm = (official) => {
    setRejectingId(official.id);
    setRejectionReason('');
    setActionError('');
    setSuccess('');
  };

  const cancelReject = () => {
    setRejectingId(null);
    setRejectionReason('');
    setActionError('');
  };

  const pendingCount = officials.filter(
    (official) => official.approval_status === 'PENDING'
  ).length;

  const getStatusClass = (status) => {
    if (status === 'APPROVED') {
      return 'bg-success-50 text-success-700';
    }

    if (status === 'REJECTED') {
      return 'bg-error-50 text-error-700';
    }

    return 'bg-amber-50 text-amber-700';
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary-700">
            {isSuperAdmin ? 'Super Admin' : 'District Admin'}
          </p>

          <h1 className="text-xl font-bold">
            Official Approval Management
          </h1>
        </div>

        <Link to="/dashboard" className="btn-outline">
          Back to dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <section className="card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-100 text-primary-700">
                <ShieldCheck />
              </span>

              <div>
                <h2 className="text-lg font-bold">
                  Registration Requests
                </h2>

                <p className="text-sm text-neutral-500">
                  Review and approve official registrations.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-outline flex items-center gap-2"
              onClick={loadOfficials}
              disabled={loadingOfficials}
            >
              <RefreshCw
                size={16}
                className={loadingOfficials ? 'animate-spin' : ''}
              />
              Refresh
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">
                Total Accounts
              </p>
              <p className="mt-1 text-2xl font-bold">
                {officials.length}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-sm text-amber-700">
                Pending Approval
              </p>
              <p className="mt-1 text-2xl font-bold text-amber-700">
                {pendingCount}
              </p>
            </div>

            <div className="rounded-xl bg-success-50 p-4">
              <p className="text-sm text-success-700">
                Approved
              </p>
              <p className="mt-1 text-2xl font-bold text-success-700">
                {
                  officials.filter(
                    (official) =>
                      official.approval_status === 'APPROVED'
                  ).length
                }
              </p>
            </div>
          </div>
        </section>

        {actionError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"
          >
            <AlertCircle size={18} />
            {actionError}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl bg-success-50 p-3 text-sm text-success-700"
          >
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <section className="card">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary-100 text-secondary-700">
              <Users />
            </span>

            <div>
              <h2 className="text-lg font-bold">
                Managed Officials
              </h2>

              <p className="text-sm text-neutral-500">
                {officials.length} account
                {officials.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {loadingOfficials ? (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-neutral-500"
            >
              <Loader2 size={16} className="animate-spin" />
              Loading officials…
            </p>
          ) : loadError ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-error-700">
                {loadError}
              </p>

              <button
                type="button"
                className="btn-outline"
                onClick={loadOfficials}
              >
                Try again
              </button>
            </div>
          ) : officials.length === 0 ? (
            <p className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">
              No registration requests found.
            </p>
          ) : (
            <div className="space-y-4">
              {officials.map((official) => {
                const isPending =
                  official.approval_status === 'PENDING';

                const isBusy = busyId === official.id;

                return (
                  <article
                    key={official.id}
                    className="rounded-xl border border-neutral-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {official.name}
                        </h3>

                        <p className="text-sm text-neutral-500">
                          {ROLE_LABELS[official.role] ||
                            official.role}
                          {' · '}
                          {official.user_code}
                        </p>

                        <p className="mt-2 text-xs text-neutral-500">
                          {official.profile?.district ||
                            'District not recorded'}
                          {' · '}
                          {official.mobile}
                        </p>

                        {official.email && (
                          <p className="mt-1 text-xs text-neutral-500">
                            {official.email}
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                          official.approval_status
                        )}`}
                      >
                        {STATUS_LABELS[
                          official.approval_status
                        ] || official.approval_status}
                      </span>
                    </div>

                    {official.approval_status === 'REJECTED' &&
                      official.rejection_reason && (
                        <p className="mt-3 rounded-lg bg-error-50 p-3 text-sm text-error-700">
                          <strong>Rejection reason:</strong>{' '}
                          {official.rejection_reason}
                        </p>
                      )}

                    {official.approval_status === 'APPROVED' && (
                      <p className="mt-3 text-xs text-success-700">
                        Approved on:{' '}
                        {official.approved_at
                          ? new Date(
                              official.approved_at
                            ).toLocaleString()
                          : 'Date not available'}
                      </p>
                    )}

                    {isPending && (
                      <div className="mt-4 space-y-3">
                        {rejectingId === official.id ? (
                          <div className="space-y-3 rounded-xl bg-neutral-50 p-3">
                            <label
                              className="label"
                              htmlFor={`reject-reason-${official.id}`}
                            >
                              Reason for rejection
                            </label>

                            <textarea
                              id={`reject-reason-${official.id}`}
                              className="input min-h-24 w-full"
                              placeholder="Enter the reason for rejecting this registration..."
                              value={rejectionReason}
                              onChange={(event) =>
                                setRejectionReason(
                                  event.target.value
                                )
                              }
                              required
                            />

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn"
                                disabled={
                                  isBusy ||
                                  !rejectionReason.trim()
                                }
                                onClick={() =>
                                  handleReject(official)
                                }
                              >
                                {isBusy ? (
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <XCircle size={16} />
                                )}
                                Confirm Reject
                              </button>

                              <button
                                type="button"
                                className="btn-outline"
                                onClick={cancelReject}
                                disabled={isBusy}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn flex items-center gap-2"
                              onClick={() =>
                                handleApprove(official)
                              }
                              disabled={isBusy}
                            >
                              {isBusy ? (
                                <Loader2
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <CheckCircle2 size={16} />
                              )}
                              Approve
                            </button>

                            <button
                              type="button"
                              className="btn-outline flex items-center gap-2"
                              onClick={() =>
                                openRejectForm(official)
                              }
                              disabled={isBusy}
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}