import React from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import { useState, useEffect, useRef } from "react";

import axios from "axios";

function Page3(props) {
  const [response, setResponse] = useState(null);

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

  // useEffect(() => {
  //   pullallusers();
  // }, []);

  return (
    <div>
      <div>
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

      <h1>Page 3</h1>
      <p>Welcome to Page 3 of the Budgeting Webapp.</p>
    </div>
  );
}

export default Page3;
