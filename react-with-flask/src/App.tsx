import { useState, useEffect } from 'react'
import axios from "axios";

import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
// import SimpleTellerConnect from './Tellerbasic'
// import TellerConnectClass from './Tellercomp'
// import { TellerConnect } from 'teller-connect-react';
import { useTellerConnect } from 'teller-connect-react';

function App() {
  const [count, setCount] = useState(0)
  const [currentTime, setCurrentTime] = useState(0);
  const [logged_in, setLoginIn] = useState(false)
  const [token, setToken] = useState();
  const [username, setUsername] = useState("");
  const app_id = "app_ph83hsn3hg9ukkife2000";
  const [response, setResponse] = useState();
  

  const { open, ready } = useTellerConnect({
    applicationId: app_id,
    environment: "sandbox",
    onSuccess: (authorization) => {
      // Save your access token here
      console.log("Sandbox Access Token:", authorization.accessToken);
      getclientlist(authorization)
      pullallusers()
      // send to api
      // token = authorization.accessToken;
      // setToken(authorization.accessToken)

    },
  });

  useEffect(() => {
    fetch('/api/time').then(res => res.json()).then(data => {
      setCurrentTime(data.time);
    });
  }, []);

  function getclientlist(accesstoken: any) {
    axios({
      method: "POST",
      url: `/api/newuser`,
      data: {
        auth: accesstoken,
        user: username,
        password: "password"
      },
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




  return (
    <>
      <div>
        
      </div>
      <h1>Test values</h1>
      {logged_in ? <div>
        <h1>Here we go again</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>token</th>
            </tr>
          </thead>
          <tbody>
            response.map()
          </tbody>
        </table>


      
        </div>
      
      : <div>
        
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
        {/* <SimpleTellerConnect/> */}
        {/* <TellerConnectClass/> */}
    
        <input onChange={(e) => setUsername(e.target.value)}/>
        <button onClick={() => open()} disabled={!ready}>
          Connect a bank account
        </button> 
        {/* <p>Access values: {token} </p> */}

        </div>}
      <div className="card">
        
        

      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
