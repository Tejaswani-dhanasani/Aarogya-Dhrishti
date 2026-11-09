import { useState } from "react";

function SpecialOfficerAppointments() {
  const [formData, setFormData] = useState({
    patientId: "",
    specialistId: "",
    navigatorId: "",
    appointmentDate: "",
  });

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    console.log("Appointment details:", formData);

    alert("Appointment details ready to submit!");
  };

  return (
    <div className="appointment-page">
      <h2>Create Specialist Appointment</h2>

      <form onSubmit={handleSubmit}>
        <label>Patient ID</label>
        <input
          name="patientId"
          value={formData.patientId}
          onChange={handleChange}
          required
        />

        <label>Specialist ID</label>
        <input
          name="specialistId"
          value={formData.specialistId}
          onChange={handleChange}
          required
        />

        <label>Navigator ID</label>
        <input
          name="navigatorId"
          value={formData.navigatorId}
          onChange={handleChange}
          required
        />

        <label>Appointment Date and Time</label>
        <input
          type="datetime-local"
          name="appointmentDate"
          value={formData.appointmentDate}
          onChange={handleChange}
          required
        />

        <button type="submit">
          Create Appointment
        </button>
      </form>
    </div>
  );
}

export default SpecialOfficerAppointments;