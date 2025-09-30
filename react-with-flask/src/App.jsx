import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Page1 from "./page-1";
// Page1 handles Sign ins and ups
import Page2 from "./page-2";
// Page2 only runs teller connect
import Page3 from "./page-3";
// page3 is our main page

import "./App.css";
import { useTellerConnect } from "teller-connect-react";

function App() {
  const [page, setPage] = useState(1);
  // we need page to mark which components to render
  const [user_id, setUserID] = useState();
  // const [username, setUsername] = useState("");
  // const [value, setvalue] = useState("");
  const app_id = "app_ph83hsn3hg9ukkife2000";
  const [response, setResponse] = useState(null);
  // console.log("username Before open:", username);
  // const usernameRef = useRef(username);

  const handleUsernameFromPage1 = (value) => {
    setUsername(value); // Update parent's state
    console.log("Value received from child:", value);
  };

  const changepage = (value) => {
    setPage(value);
  };

  const handleIdFromPage1 = (value) => {
    setUserID(value); // Update parent's state
    console.log("Value received from child:", value);
  };

  // useEffect(() => {
  //   usernameRef.current = username; // update ref whenever state changes
  // }, [username]);

  useEffect(() => {
    // if user id changes call the back end and query for an access token
    // if there is not an access token run open()
    axios({
      method: "POST",
      url: `/api/checkinit`,
      data: {
        user_id: user_id,
      },
    })
      .then((response) => {
        setResponse(response.data);
        if (response.data.accesstoken === false) {
          setPage(2);
          // page 2 should open
          // open();
          // because we need to connect this account to teller
        } else {
          setPage(3);
          //
        }
        // setLoginIn(true);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
        }
      });
  }, [user_id]);

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

  // useEffect(() => {
  //   pullallusers();
  // }, [logged_in]);

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

  const toggleState = () => {
    setLoginIn((prev) => !prev);
  };
  if (page == 1) {
    return (
      <div>
        <p>userId is {user_id}</p>
        <p> this should change after i sign in</p>
        {/* <p>Ig username too: {username} </p> */}
        <Page1
          returnUsername={handleUsernameFromPage1}
          returnId={handleIdFromPage1}
          changepage={changepage}
        />
      </div>
    );
  } else if (page == 2) {
    return (
      <div>
        <p>userId is {user_id}</p>
        <p> this should persist on page 2</p>
        <Page2 changepage={changepage} user_id={user_id} />
      </div>
    );
  } else if (page == 3) {
    return (
      <div>
        <Page3 changepage={changepage} user_id={user_id} />
      </div>
    );
  } else {
    return (
      <>
        {/* <h1>app.jsx username = {username}</h1> */}
        <h1>Unauth Page</h1>
        <button onClick={toggleState}>Toggle</button>
        <div className="card"></div>
      </>
    );
  }
}

export default App;
