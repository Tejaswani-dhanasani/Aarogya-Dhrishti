import { Link } from "react-router-dom";
import "./ComingSoon.css";

// Placeholder for modules that are linked from the dashboard but not built yet.
function ComingSoon({ title }) {
  return (
    <div className="soon-page legacy">
      <div className="soon-card">
        <span className="soon-icon">✚</span>
        <h1>{title}</h1>
        <p>This module is coming soon.</p>
        <div className="soon-actions">
          <Link to="/dashboard">Back to Dashboard</Link>
          <Link to="/">Home</Link>
        </div>
      </div>
    </div>
  );
}

export default ComingSoon;
