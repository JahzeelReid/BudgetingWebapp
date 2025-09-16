import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Page1 from "./page-1";

import "./App.css";
// import SimpleTellerConnect from './Tellerbasic'
// import TellerConnectClass from './Tellercomp'
// import { TellerConnect } from 'teller-connect-react';
import { useTellerConnect } from "teller-connect-react";

function App() {
  const [logged_in, setLoginIn] = useState(false);
  const [page, setPage] = useState(1);
  const [user_id, setUserID] = useState("");
  //   const [token, setToken] = useState();
  const [username, setUsername] = useState("");
  const [value, setvalue] = useState("");
  const app_id = "app_ph83hsn3hg9ukkife2000";
  const [response, setResponse] = useState(null);
  console.log("username Before open:", username);
  const usernameRef = useRef(username);

  const handleValueFromChild = (value) => {
    setUsername(value); // Update parent's state
    console.log("Value received from child:", value);
  };

  useEffect(() => {
    usernameRef.current = username; // update ref whenever state changes
  }, [username]);

  const { open, ready } = useTellerConnect({
    applicationId: app_id,
    environment: "sandbox",
    onSuccess: (authorization) => {
      // Save your access token here
      console.log("Sandbox Access Token:", authorization.accessToken);
      console.log("username at onSuccess:", username);
      getclientlist(authorization, usernameRef.current);
      // send to api
      // token = authorization.accessToken;
      // setToken(authorization.accessToken)
    },
  });

  useEffect(() => {
    pullallusers();
  }, [logged_in]);

  function getclientlist(accesstoken, uname) {
    console.log("sending uname param:", uname);
    console.log("sending to backend:", {
      auth: accesstoken,
      user: uname,
      password: "password",
    });

    axios({
      method: "POST",
      url: `/api/newuser`,
      data: {
        auth: accesstoken,
        user: uname,
        password: "password",
      },
    })
      .then((response) => {
        setResponse(response.data);
        // setLoginIn(true);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
  }

  function pullallusers() {
    axios({
      method: "GET",
      url: `/api/getusers`,
    })
      .then((response) => {
        setResponse(response.data);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
  }
  const toggleState = () => {
    setLoginIn((prev) => !prev);
  };

  return (
    <>
      <div>
        <Page1 passValueUp={handleValueFromChild} />
      </div>
      <h1>app.jsx username = {username}</h1>
      {/* {logged_in ? (
        <div>
          <h1>Here we go again</h1>
          <p>{username}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>token</th>
              </tr>
            </thead>
            <tbody>
              {response &&
                response?.users?.map((user, index) => (
                  <tr key={index}>
                    <td>{user.id}</td>
                    <td>{user.username}</td>
                    <td>
                      <table>
                        <thead>
                          <tr>
                            <th>digits</th>
                            <th>balance</th>
                          </tr>
                        </thead>
                        <tbody></tbody>
                        {user.account.map((acc, index) => (
                          <tr key={index}>
                            <td>{acc.lastfour}</td>
                            <td>{acc.balance}</td>
                          </tr>
                        ))}
                      </table>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <p>{username}</p>
          <input onChange={(e) => setUsername(e.target.value)} />
          <button
            onClick={() => {
              setvalue(username);
              console.log(value);
              open();
            }}
            disabled={!ready}
          >
            Connect a bank account
          </button>
          
        </div>
      )} 
      */}
      <button onClick={toggleState}>Toggle</button>
      <div className="card"></div>
    </>
  );
}

export default App;
