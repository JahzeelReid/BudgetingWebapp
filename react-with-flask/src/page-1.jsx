import React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useState, useEffect, useRef } from "react";

function Page1(props) {
  // this component will be the first page of the budgeting web app
  // this component will contain the login page functionality
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserID] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [response, setResponse] = useState(null);

  const handlelogin = () => {
    // on click send post request to backend with username and password
    // will receive back a user id
    // pass user id back to app.jsx
    axios({
      method: "POST",
      url: `/login`,
      data: {
        // auth: accesstoken,
        username: username,
        password: password,
      },
    })
      .then((response) => {
        setResponse(response.data);
        props.returnUsername(username); // Call the parent's function
        props.returnId(response.user_id)
        // setLoginIn(true);
      })
      .catch((error) => {
        if (error.response) {
          alert("incorrect login")
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
    
  };
  const handlesignup = () => {
    // on click send post request to backend with username and password
    // will receive back a user id
    // pass user id back to app.jsx
    axios({
      method: "POST",
      url: `/signup`,
      data: {
        // auth: accesstoken,
        username: username,
        password: password,
      },
    })
      .then((response) => {
        setResponse(response.data);
        alert("login added, welcome ;)")
        // setLoginIn(true);
      })
      .catch((error) => {
        if (error.response) {
          alert("username not available");
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
    props.passValueUp(username); // Call the parent's function
  };

  return (
    <div>
      <Box
        component="section"
        sx={{
          width: 500,
          height: 600,
          borderRadius: 1,
          bgcolor: "#00cca0ff",
          "&:hover": {
            bgcolor: "#00cca078",
          },
        }}
      >
        This box contains the username and password
        <TextField
          label="Username"
          variant="outlined"
          onChange={(e) => setUsername(e.target.value)}
        />
        <TextField
          label="Password"
          variant="outlined"
          onChange={(e) => setPassword(e.target.value)}
        />
        <p>page-1.jsx username = {username}</p>
        <button onClick={handlelogin}>Submit</button>
        <button onClick={handlesignup}>Sign up</button>
      </Box>

      <h1>Welcome to Page 1</h1>
      <p>This is the first page of your budgeting web app.</p>
    </div>
  );
}

export default Page1;
