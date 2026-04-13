import React, { useState, useEffect, useContext } from "react";
import { useTellerConnect } from "teller-connect-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext"; // Import your context

function TellerSetup(props) {
  const [accesstoken, setAccesstoken] = useState(null);
  const { token } = useContext(AuthContext); // Get your JWT from context
  const navigate = useNavigate();
  const app_id = "app_ph83hsn3hg9ukkife2000";

  const { open, ready } = useTellerConnect({
    applicationId: app_id,
    // environment: "sandbox",
    environment: "development",
    onSuccess: (authorization) => {
      console.log("Teller Auth Success!");
      setAccesstoken(authorization.accessToken);
      // We don't call updateaccesstoken() here; the useEffect below handles it
    },
  });

  // Auto-open Teller on mount
  useEffect(() => {
    if (ready) {
      open();
    }
  }, [ready, open]);

  // When the token is set, send it to the backend
  useEffect(() => {
    if (accesstoken && token) {
      axios({
        method: "POST",
        url: `${props.url}/api/initialize-teller`, // More descriptive route
        headers: {
          Authorization: `Bearer ${token}`, // Prove who you are
          "Content-Type": "application/json",
        },
        data: {
          teller_access_token: accesstoken,
        },
      })
        .then((response) => {
          console.log("Teller linked to account!");
          navigate("/dashboard"); // Move to the next step in your flow
        })
        .catch((error) => {
          console.error("Setup Error:", error.response?.data);
          if (error.response?.status === 401) {
            navigate("/"); // Session expired, go home
          }
        });
    }
  }, [accesstoken, token, props.url, navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Securely Connect Your Bank</h2>
      <p>We use Teller to sync your transactions automatically.</p>

      <button onClick={() => open()} disabled={!ready} className="teller-btn">
        {ready ? "Connect with Teller" : "Loading Teller..."}
      </button>

      <div style={{ marginTop: "20px", color: "#666" }}>
        <p>If the window didn't open, click the button above.</p>
        <p>You will be redirected automatically once finished.</p>
      </div>
    </div>
  );
}

export default TellerSetup;
