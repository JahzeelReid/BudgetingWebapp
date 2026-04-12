import React, { useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function SyncLoading(props) {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    const checkSyncStatus = () => {
      axios({
        method: "GET",
        url: `${props.url}/api/sync-status`,
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (response.data.status === "complete") {
            navigate("/dashboard");
          } else {
            // Check again in 2 seconds
            setTimeout(checkSyncStatus, 2000);
          }
        })
        .catch(
          (error) => alert("Error checking sync status: " + error.message),
          // navigate("/")
        );
    };

    checkSyncStatus();
  }, [navigate, props.url]);

  return (
    <div className="loading-container">
      <h2>Analyzing your spending...</h2>
      <div className="spinner"></div>
      <p>We're looking back 3 months to categorize your history.</p>
      <button className="sync-button" onClick={() => checkSyncStatus()}>
        Retry
      </button>
    </div>
  );
}
