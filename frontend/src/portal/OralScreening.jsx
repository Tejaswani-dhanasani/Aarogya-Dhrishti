
import { useState } from "react";
import { Link } from "react-router-dom";
import "./OralScreening.css";

const symptomOptions = [
  "Mouth ulcer",
  "White patch",
  "Red patch",
  "Difficulty swallowing",
  "Persistent mouth pain",
  "Difficulty opening mouth",
  "Lump or swelling",
  "Other"
];

function OralScreening() {
  const [formData, setFormData] = useState({
    patientId: "",
    symptoms: [],
    symptomDuration: "",
    additionalNotes: "",
    image: null
  });

  const [imagePreview, setImagePreview] = useState("");
  const [imageStatus, setImageStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  }

  function handleSymptomChange(event) {
    const { value, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      symptoms: checked
        ? [...previous.symptoms, value]
        : previous.symptoms.filter((symptom) => symptom !== value)
    }));
  }

  function handleImageChange(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setFormData((previous) => ({
      ...previous,
      image: file
    }));

    setImagePreview(URL.createObjectURL(file));
    setImageStatus("Image uploaded. Quality review is pending.");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!formData.image) {
      alert("Please upload an oral image.");
      return;
    }

    const screeningRecord = {
      patientId: formData.patientId,
      symptoms: formData.symptoms,
      symptomDuration: formData.symptomDuration,
      additionalNotes: formData.additionalNotes,
      imageName: formData.image.name,
      submittedAt: new Date().toISOString(),
      reviewStatus: "Pending clinical review"
    };

    console.log("Screening record:", screeningRecord);

    setSubmitted(true);
  }

  function resetForm() {
    setFormData({
      patientId: "",
      symptoms: [],
      symptomDuration: "",
      additionalNotes: "",
      image: null
    });

    setImagePreview("");
    setImageStatus("");
    setSubmitted(false);
  }

  return (
    <div className="screening-page legacy">

      <header className="screening-header">
        <Link to="/" className="screening-brand">
          ✚ AAROGYA DRISHTI
        </Link>

        <Link to="/patients" className="screening-back">
          Patient Management
        </Link>
      </header>

      <main className="screening-container">

        <div className="screening-heading">
          <div>
            <span>SCREENING MANAGEMENT</span>
            <h1>Oral Health Screening</h1>
            <p>
              Record patient-reported symptoms and upload an oral
              image for quality assessment and clinical review.
            </p>
          </div>

          <div className="screening-status">
            Screening Module
          </div>
        </div>

        {submitted ? (
          <div className="screening-success">
            <div className="success-icon">✓</div>

            <h2>Screening Record Submitted</h2>

            <p>
              The screening record for Patient ID{" "}
              <strong>{formData.patientId}</strong> has been
              submitted for clinical review.
            </p>

            <span className="pending-status">
              Pending clinical review
            </span>

            <button onClick={resetForm}>
              Create Another Screening
            </button>
          </div>
        ) : (
          <form
            className="screening-form"
            onSubmit={handleSubmit}
          >

            {/* Patient Information */}

            <section className="screening-section">
              <div className="section-heading">
                <span>01</span>
                <div>
                  <h2>Patient Information</h2>
                  <p>Identify the registered patient.</p>
                </div>
              </div>

              <div className="screening-field">
                <label>Patient ID *</label>
                <input
                  type="text"
                  name="patientId"
                  value={formData.patientId}
                  onChange={handleChange}
                  placeholder="Example: AD-10001"
                  required
                />
              </div>
            </section>

            {/* Symptoms */}

            <section className="screening-section">
              <div className="section-heading">
                <span>02</span>
                <div>
                  <h2>Symptoms Information</h2>
                  <p>Select the symptoms reported by the patient.</p>
                </div>
              </div>

              <div className="symptom-grid">
                {symptomOptions.map((symptom) => (
                  <label
                    className="symptom-option"
                    key={symptom}
                  >
                    <input
                      type="checkbox"
                      value={symptom}
                      checked={formData.symptoms.includes(symptom)}
                      onChange={handleSymptomChange}
                    />

                    {symptom}
                  </label>
                ))}
              </div>

              <div className="screening-field duration-field">
                <label>Duration of Symptoms</label>

                <select
                  name="symptomDuration"
                  value={formData.symptomDuration}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select duration</option>
                  <option value="Less than 2 weeks">
                    Less than 2 weeks
                  </option>
                  <option value="2–4 weeks">2–4 weeks</option>
                  <option value="1–3 months">1–3 months</option>
                  <option value="More than 3 months">
                    More than 3 months
                  </option>
                  <option value="Not sure">Not sure</option>
                </select>
              </div>

              <div className="screening-field notes-field">
                <label>Additional Notes</label>

                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleChange}
                  placeholder="Enter relevant information reported by the patient..."
                  rows="4"
                />
              </div>
            </section>

            {/* Image Upload */}

            <section className="screening-section">
              <div className="section-heading">
                <span>03</span>
                <div>
                  <h2>Oral Image Upload</h2>
                  <p>
                    Upload an image for quality assessment and
                    authorized clinical review.
                  </p>
                </div>
              </div>

              <div className="upload-area">
                <div className="upload-icon">📷</div>

                <h3>Upload Oral Image</h3>

                <p>Supported image formats: JPG, JPEG and PNG.</p>
                <p>Maximum file size: 5 MB.</p>

                <input
                  id="oral-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                />

                <label
                  htmlFor="oral-image"
                  className="upload-button"
                >
                  Choose Image
                </label>
              </div>

              {imagePreview && (
                <div className="image-preview">
                  <h3>Image Preview</h3>

                  <img
                    src={imagePreview}
                    alt="Uploaded screening preview"
                  />

                  <p>{formData.image?.name}</p>
                </div>
              )}

              {imageStatus && (
                <div className="image-status">
                  {imageStatus}
                </div>
              )}
            </section>

            {/* Review Notice */}

            <section className="clinical-notice">
              <strong>Clinical Review Notice</strong>

              <p>
                Image upload does not establish a diagnosis.
                Any AI-assisted flagging must be reviewed by
                a qualified healthcare professional.
              </p>
            </section>

            <div className="screening-actions">
              <button
                type="button"
                className="screening-reset"
                onClick={resetForm}
              >
                Clear Form
              </button>

              <button
                type="submit"
                className="screening-submit"
              >
                Submit for Clinical Review →
              </button>
            </div>

          </form>
        )}

      </main>
    </div>
  );
}

export default OralScreening;
