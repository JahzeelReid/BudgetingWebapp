// import React from "react";
// import Box from "@mui/material/Box";
// import TextField from "@mui/material/TextField";
// import { useState, useEffect, useRef } from "react";
// import { useTellerConnect } from "teller-connect-react";
// import axios from "axios";

// function tellerSetup(props) {
//   // this component follows page the login page
//   // if the user has not linked their teller
//   // should host teller connect and run open() on start up
//   // should send the new access code to the db
//   // props.user_id
//   const [accesstoken, setAccesstoken] = useState();
//   const app_id = "app_ph83hsn3hg9ukkife2000";

//   const { open, ready } = useTellerConnect({
//     applicationId: app_id,
//     environment: "sandbox",
//     onSuccess: (authorization) => {
//       // Save your access token here
//       console.log("Sandbox Access Token:", authorization.accessToken);
//       console.log("user_id at onSuccess:", props.user_id);
//       // getclientlist(authorization, usernameRef.current);
//       setAccesstoken(authorization.accessToken);
//       updateaccesstoken();

//       // send to api
//       // token = authorization.accessToken;
//       // setToken(authorization.accessToken)
//     },
//   });

//   function updateaccesstoken() {
//     if (accesstoken) {
//       axios({
//         method: "POST",
//         url: `${props.url}/api/login`,
//         data: {
//           user_id: props.user_id,
//           access_token: accesstoken,
//         },
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       })
//         .then((response) => {
//           // setResponse(response.data);
//           //   props.changepage(3);
//           // setLoginIn(true);
//         })
//         .catch((error) => {
//           if (error.response) {
//             console.log(error.response);
//             console.log(error.response.status);
//             console.log(error.response.headers);
//           }
//         });
//     }
//   }

//   useEffect(() => {
//     open();
//     //Runs only on the first render
//   }, []);

//   useEffect(() => {
//     updateaccesstoken();
//   }, [accesstoken]);

//   return (
//     <>
//       <div>
//         <p>Click this button if teller connect doesn show up</p>
//         <button onClick={() => open()} disabled={!ready}>
//           Connect with Teller
//         </button>
//       </div>
//       <div>
//         <p>After you link your account we will redirect you</p>
//         <p>to the user list page</p>
//         <p>if you are not redirected please click the button below</p>
//         {/* <button onClick={() => updateaccesstoken()}>Continue</button> */}
//       </div>
//     </>
//   );
// }

// export default tellerSetup;

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
