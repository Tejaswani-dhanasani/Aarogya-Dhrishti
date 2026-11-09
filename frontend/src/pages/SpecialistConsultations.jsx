
import { useEffect, useState } from "react";

function SpecialistConsultations() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({
    patientId: "",
    scheduledAt: "",
    reason: ""
  });

  const [message, setMessage] = useState("");
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  async function loadData() {
    try {
      const [patientResponse, appointmentResponse] =
        await Promise.all([
          fetch("/api/patients", { headers }),
          fetch("/api/consultations", { headers })
        ]);

      if (!patientResponse.ok || !appointmentResponse.ok) {
        throw new Error("Unable to load dashboard data.");
      }

      const patientData = await patientResponse.json();
      const appointmentData = await appointmentResponse.json();

      setPatients(patientData);
      setAppointments(appointmentData);

    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function scheduleConsultation(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers,
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Scheduling failed.");
      }

      setMessage("Consultation scheduled successfully!");

      setForm({
        patientId: "",
        scheduledAt: "",
        reason: ""
      });

      await loadData();

    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="consultation-page">
      <h2>Specialist Consultation Management</h2>
      <p>Schedule and manage patient video consultations.</p>

      <form
        className="consultation-form"
        onSubmit={scheduleConsultation}
      >
        <h3>Schedule New Consultation</h3>

        <label>Select Patient</label>

        <select
          name="patientId"
          value={form.patientId}
          onChange={handleChange}
          required
        >
          <option value="">Choose a patient</option>

          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.full_name} — {patient.id}
            </option>
          ))}
        </select>

        <label>Appointment Date and Time</label>

        <input
          type="datetime-local"
          name="scheduledAt"
          value={form.scheduledAt}
          onChange={handleChange}
          min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)}
          required
        />

        <label>Consultation Reason</label>

        <textarea
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Enter consultation reason"
        />

        <button type="submit">
          Schedule Consultation
        </button>

        {message && <p>{message}</p>}
      </form>

      <h3>Scheduled Consultations</h3>

      <div className="appointment-list">
        {appointments.map((appointment) => (
          <div className="appointment-card" key={appointment.id}>
            <h4>Patient ID: {appointment.patient_id}</h4>

            <p>
              Date: {new Date(appointment.scheduled_at).toLocaleString()}
            </p>

            <p>Reason: {appointment.reason || "Not specified"}</p>
            <p>Status: {appointment.status}</p>

            <a
              href={`/specialist-consultation/${appointment.room_name}`}
            >
              Open Consultation
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpecialistConsultations;
