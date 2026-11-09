
import { JitsiMeeting } from "@jitsi/react-sdk";

function VideoCall({ roomName, displayName }) {
  return (
    <div style={{ height: "600px", width: "100%" }}>
      <JitsiMeeting
        domain="meet.jit.si"
        roomName={roomName}
        userInfo={{
          displayName: displayName,
        }}
        getIFrameRef={(iframeRef) => {
          iframeRef.style.height = "600px";
          iframeRef.style.width = "100%";
        }}
      />
    </div>
  );
}

export default VideoCall;
