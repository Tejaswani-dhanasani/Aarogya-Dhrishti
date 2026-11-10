
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import VideoCall from "../components/VideoCall.jsx";
import { useAuth } from '../auth.jsx';
import api, { errMsg } from '../api.js';

function ConsultationPage() {
  const { roomName } = useParams();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/consultations/join/${encodeURIComponent(roomName || '')}`)
      .then(({ data }) => {
        if (active) setAppointment(data);
      })
      .catch((requestError) => {
        if (active) setError(errMsg(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [roomName]);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold">Patient Video Consultation</h1>
        {appointment && (
          <p className="mt-1 text-neutral-600">
            Scheduled for {new Date(appointment.scheduledAt).toLocaleString()}
          </p>
        )}
      </header>
      {loading && <p role="status">Checking consultation link...</p>}
      {error && (
        <section className="card space-y-3 p-5" role="alert">
          <p>{error}</p>
          <Link className="text-primary-700 hover:underline" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      )}
      {appointment && (
        <>
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Anyone with this private link can join the call. Only proceed with
            patient information if your organization has approved this video service.
          </p>
          <VideoCall
            roomName={appointment.roomName}
            displayName={user?.role === 'SPECIALIST' ? user.name : 'Patient'}
          />
        </>
      )}
    </main>
  );
}

export default ConsultationPage;
