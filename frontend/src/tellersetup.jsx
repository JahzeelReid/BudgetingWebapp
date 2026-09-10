// import React, { useState, useEffect, useContext } from "react";
// import { useTellerConnect } from "teller-connect-react";
// import axios from "axios";
// import { useNavigate } from "react-router-dom";
// import { AuthContext } from "./AuthContext"; // Import your context

// function TellerSetup(props) {
//   const [accesstoken, setAccesstoken] = useState(null);
//   const { token } = useContext(AuthContext); // Get your JWT from context
//   const navigate = useNavigate();
//   const app_id = "app_ph83hsn3hg9ukkife2000";

//   const { open, ready } = useTellerConnect({
//     applicationId: app_id,
//     // environment: "sandbox",
//     environment: "development",
//     onSuccess: (authorization) => {
//       console.log("Teller Auth Success!");
//       setAccesstoken(authorization.accessToken);
//       // We don't call updateaccesstoken() here; the useEffect below handles it
//     },
//   });

//   // Auto-open Teller on mount
//   useEffect(() => {
//     if (ready) {
//       open();
//     }
//   }, [ready, open]);

//   // When the token is set, send it to the backend
//   useEffect(() => {
//     if (accesstoken && token) {
//       axios({
//         method: "POST",
//         url: `${props.url}/api/initialize-teller`, // More descriptive route
//         headers: {
//           Authorization: `Bearer ${token}`, // Prove who you are
//           "Content-Type": "application/json",
//         },
//         data: {
//           teller_access_token: accesstoken,
//         },
//       })
//         .then((response) => {
//           console.log("Teller linked to account!");
//           navigate("/dashboard"); // Move to the next step in your flow
//         })
//         .catch((error) => {
//           console.error("Setup Error:", error.response?.data);
//           if (error.response?.status === 401) {
//             navigate("/"); // Session expired, go home
//           }
//         });
//     }
//   }, [accesstoken, token, props.url, navigate]);

//   return (
//     <div style={{ textAlign: "center", marginTop: "50px" }}>
//       <h2>Securely Connect Your Bank</h2>
//       <p>We use Teller to sync your transactions automatically.</p>

//       <button onClick={() => open()} disabled={!ready} className="teller-btn">
//         {ready ? "Connect with Teller" : "Loading Teller..."}
//       </button>

//       <div style={{ marginTop: "20px", color: "#666" }}>
//         <p>If the window didn't open, click the button above.</p>
//         <p>You will be redirected automatically once finished.</p>
//       </div>
//     </div>
//   );
// }

// export default TellerSetup;

import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext"; // Import your context

function TellerSetup(props) {
  // Changed initial state to an empty string to control the input field
  const [accesstoken, setAccesstoken] = useState("");
  const { token } = useContext(AuthContext); // Get your JWT from context
  const navigate = useNavigate();

  // Triggered manually via button click instead of useEffect
  const handleSubmit = () => {
    if (accesstoken && token) {
      axios({
        method: "POST",
        url: `${props.url}/api/initialize-teller`, // More descriptive route
        headers: {
          Authorization: `Bearer ${token}`, // Prove who you are
          "Content-Type": "application/json",
        },
        data: {
          setup_token: accesstoken,
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
    } else {
      console.warn("Missing access token or auth token.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Securely Connect Your Bank</h2>
      <p>Enter your access token to sync your transactions automatically.</p>

      {/* Simple text field saving to accesstoken state */}
      <div>
        <input
          type="text"
          value={accesstoken}
          onChange={(e) => setAccesstoken(e.target.value)}
          placeholder="Enter access token"
          style={{
            padding: "10px",
            width: "300px",
            marginBottom: "20px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      {/* Button that triggers the Axios call */}
      <button
        onClick={handleSubmit}
        disabled={!accesstoken}
        className="teller-btn"
        style={{
          padding: "10px 20px",
          cursor: accesstoken ? "pointer" : "not-allowed",
        }}
      >
        Submit Token
      </button>
    </div>
  );
}

export default TellerSetup;
