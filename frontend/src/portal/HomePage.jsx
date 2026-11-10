
import { Link } from "react-router-dom";
import "./HomePage.css";

const features = [
  {
    icon: "👤",
    title: "Patient Registration",
    description:
      "Register patients, collect consent and maintain their screening records."
  },
  {
    icon: "📷",
    title: "Oral Screening",
    description:
      "Capture and upload oral images along with relevant symptoms."
  },
  {
    icon: "🤖",
    title: "AI-Assisted Screening",
    description:
      "Provide AI-assisted image flagging to support clinical review."
  },
  {
    icon: "🩺",
    title: "Medical Officer Review",
    description:
      "Enable medical officers to review screening information and record decisions."
  },
  {
    icon: "🏥",
    title: "Specialist Consultation",
    description:
      "Support specialist referrals and teleconsultation."
  },
  {
    icon: "📋",
    title: "Patient Follow-up",
    description:
      "Track diagnostic reports, treatment progress and follow-up activities."
  }
];

const staffRoles = [
  {
    title: "Medical Officer",
    description: "Register for District Admin approval, review patient screenings and manage clinical decisions.",
    role: "medical-officer"
  },
  {
    title: "Specialist",
    description: "Register for District Admin approval, review referrals and provide specialist consultations.",
    role: "specialist"
  },
  {
    title: "Patient Navigator",
    description: "Register for District Admin approval, coordinate referrals and follow-up activities.",
    role: "patient-navigator"
  },
  {
    title: "District Admin",
    description: "Register for immediate access to district-level activities and platform reports.",
    role: "district-admin"
  }
];

function HomePage() {
  return (
    <div className="homepage legacy">

      {/* Navigation */}
      <nav className="navbar">
        <Link to="/" className="brand">
          <span className="brand-icon">✚</span>
          SEHAT · HEALTH FOR EVERY VILLAGE
        </Link>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#staff">Staff Access</a>
        </div>

      </nav>

      {/* Hero Section */}
      <section className="hero" id="home">
        <div className="hero-content">
          <span className="hero-tag">
            DIGITAL HEALTHCARE PLATFORM
          </span>

          <h1>
            AAROGYA <span>DRISHTI</span>
          </h1>

          <h2>
            AI-Assisted Oral Cancer Early Detection,
            Telemedicine and Patient Care Platform
          </h2>

          <p>
            An integrated digital healthcare platform designed
            to support oral health screening, clinical review,
            specialist consultation and patient follow-up.
          </p>

          <div className="hero-buttons">
            <a href="#features" className="primary-btn">
              Explore Platform →
            </a>

            <a href="#staff" className="secondary-btn">
              Staff Access
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="health-circle">
            <span>✚</span>
            <h3>Digital Healthcare</h3>
            <p>Screening • Review • Care</p>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="section about-section" id="about">
        <span className="section-label">ABOUT THE PROJECT</span>
        <h2>Healthcare Support Through Technology</h2>

        <p>
          Sehat aims to connect patients, healthcare
          workers, medical officers, specialists and administrators
          through a unified digital platform. It supports the
          screening and referral process while keeping clinical
          decisions with qualified healthcare professionals.
        </p>
      </section>

      {/* Features */}
      <section className="section features-section" id="features">
        <span className="section-label">PLATFORM FEATURES</span>
        <h2>One Platform. Connected Healthcare.</h2>

        <div className="feature-grid">
          {features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="section workflow-section" id="workflow">
        <span className="section-label">HOW IT WORKS</span>
        <h2>Platform Workflow</h2>

        <div className="workflow-list">
          {[
            "Patient Registration",
            "Oral Image Screening",
            "AI-Assisted Flagging",
            "Medical Officer Review",
            "Specialist Referral",
            "Patient Follow-up"
          ].map((step, index) => (
            <div className="workflow-step" key={index}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Staff Access */}
      <section className="section staff-section" id="staff">
        <span className="section-label">STAFF PORTAL</span>
        <h2>Official Access</h2>

        <p className="section-description">
          Medical Officers, Specialists and Navigators need District Admin approval.
          District Admin accounts are active immediately after registration.
        </p>

        <div className="staff-grid">
          {staffRoles.map((staff) => (
            <div className="staff-card" key={staff.role}>
              <h3>{staff.title}</h3>
              <p>{staff.description}</p>

              <div className="staff-actions">
                <Link to={`/login/${staff.role}`}>
                  Login
                </Link>
                <Link to={`/register/${staff.role}`}>
                  Register
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <h3>SEHAT</h3>
        <p>Health for Every Village</p>
        <p>
          AI-Assisted Oral Healthcare Screening and Patient Care Platform
        </p>
        <p>© 2026 Sehat | Project Demonstration</p>
      </footer>

    </div>
  );
}

export default HomePage;
