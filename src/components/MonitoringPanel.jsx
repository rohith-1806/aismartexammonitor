import React from "react";

function MonitoringPanel({
  cameraStatus = "Active",
  faceStatus = "Detected",
  browserStatus = "Focused",
  warningCount = 0,
  faceWarningCount = 0,
  multipleFacesCount = 0,
  tabSwitchCount = 0,
  phoneDetectedCount = 0
}) {
  const getCameraColor = () => (cameraStatus === "Active" ? "text-green-600 font-semibold" : "text-red-600 font-semibold");
  const getFaceColor = () => {
    if (faceStatus === "Detected") return "text-green-600 font-semibold";
    if (faceStatus === "Absent") return "text-amber-600 font-semibold";
    return "text-red-600 font-semibold";
  };
  const getBrowserColor = () => (browserStatus === "Focused" ? "text-green-600 font-semibold" : "text-red-600 font-semibold");

  const totalWarnings = warningCount;

  return (
    <div className="mt-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
      <h3 className="text-lg font-bold mb-4">Monitoring Status</h3>

      <div className="space-y-3">
        <p>
          Camera: <span className={getCameraColor()}>{cameraStatus}</span>
        </p>

        <p>
          Face: <span className={getFaceColor()}>{faceStatus}</span>
        </p>

        <p>
          Browser: <span className={getBrowserColor()}>{browserStatus}</span>
        </p>

        <hr className="border-outline-variant" />

        <p>Face Absences: <strong>{faceWarningCount}</strong></p>

        <p>Multiple Faces: <strong>{multipleFacesCount}</strong></p>

        <p>Tab Switches: <strong>{tabSwitchCount}</strong></p>

        <p className="text-red-600">Phone Detected: <strong>{phoneDetectedCount}</strong></p>

        <p className="font-bold text-red-600 pt-2 border-t border-outline-variant">
          Total Warnings : {totalWarnings}
        </p>
      </div>
    </div>
  );
}

export default MonitoringPanel;

