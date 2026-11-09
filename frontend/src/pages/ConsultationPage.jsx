
import VideoCall from "../components/VideoCall.jsx";

function ConsultationPage() {
  return (
    <div>
      <h2>Patient Video Consultation</h2>

      <VideoCall
        roomName="aarogya-consult-101"
        displayName="Patient"
      />
    </div>
  );
}

export default ConsultationPage;
