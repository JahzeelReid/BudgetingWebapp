import React, { use } from "react";
// import Box from "@mui/material/Box";
// import TextField from "@mui/material/TextField";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#0D47A1", "#1976D2", "#42A5F5", "#64B5F6", "#90CAF9"];

function Page4(props) {
  // this page will be called on page 3 when the user clicks on an account
  // this will be the setting page that allows the user to set up envelopes for each account
  // this will only work if the account has init
  // on submit sends a post request to /api/newsettings
  const [total, setTotal] = useState(0);
  const data = [
    { name: "Mortgage", value: 30 },
    { name: "Rent", value: 20 },
    { name: "Fun", value: 15 },
    { name: "Grocery", value: 25 },
    { name: "Bill", value: 10 },
  ];

  const categories = [
    { name: "Mortgage", value: 30 },
    { name: "Rent", value: 20 },
    { name: "Fun", value: 15 },
    { name: "Grocery", value: 25 },
    { name: "Bill", value: 10 },
  ];
  const [selectedCategories, setSelectedCategories] = useState([]);
  useEffect(() => {
    // Calculate sum of all selected category values
    // when catagories are updated
    const total = selectedCategories.reduce(
      (acc, item) => acc + (Number(item.value) || 0),
      0
    );
    setTotal(total);
  }, [selectedCategories]);

  const handleCheckboxChange = (category) => {
    setSelectedCategories((prev) => {
      const exists = prev.find((item) => item.name === category.name);
      if (exists) {
        // Remove if already selected
        return prev.filter((item) => item.name !== category.name);
      } else {
        // Add if not already selected
        return [...prev, category];
      }
    });
    // Calculate sum of all selected category values
  };

  const handleValueChange = (name, value) => {
    setSelectedCategories((prev) =>
      prev.map((item) =>
        item.name === name ? { ...item, value: parseFloat(value) || 0 } : item
      )
    );
  };

  const getValue = (name) => {
    const found = selectedCategories.find((item) => item.name === name);
    return found ? found.value : "";
  };

  const isChecked = (name) =>
    selectedCategories.some((item) => item.name === name);

  const handlesubmit = () => {
    // send post request to /api/newsettings with selectedCategories as body
    axios({
      method: "POST",
      url: `/api/newsettings`,
      data: {
        user_id: props.user_id,
        acc_id: props.acc_id,
        init: null,
        setting: selectedCategories,
        // access_token: accesstoken,
      },
    })
      .then((response) => {
        // setAccounts(response.data.accounts);
        // setLoading(false);
        // setLoginIn(true);
      })
      .catch((error) => {
        if (error.response) {
          console.log(error.response);
          console.log(error.response.status);
          console.log(error.response.headers);
          // props.changepage(2);
        }
      });
  };

  return (
    <Box
      sx={{
        bgcolor: "#607D8B",
        minHeight: "100vh",
        p: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Header */}
      <Card sx={{ width: "90%", bgcolor: "#546E7A", color: "white", mb: 4 }}>
        <CardContent>
          <Typography variant="h5" align="center">
            DashBoard
          </Typography>
          <Typography variant="subtitle1" align="center">
            Choose Your Settings
          </Typography>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <Grid container spacing={3} sx={{ width: "90%" }}>
        {/* Left Panel - Budget Settings */}
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: "#78909C", color: "white", p: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Budget: Per paycheck
              </Typography>
              <Typography>Type: Percentage / Dollar Amount</Typography>
              <Typography>Notification Type: Text</Typography>

              <TextField
                label="Average Paycheck ($)"
                variant="outlined"
                size="small"
                fullWidth
                sx={{ mt: 2, bgcolor: "white", borderRadius: 1 }}
              />

              <Button
                variant="contained"
                fullWidth
                sx={{
                  mt: 2,
                  bgcolor: "#0D47A1",
                  ":hover": { bgcolor: "#1565C0" },
                }}
              >
                Submit
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Middle Top - Paycheck Info */}
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: "#78909C", color: "white", mb: 3 }}>
            <CardContent>
              <Typography>
                Last Paycheck Total: <strong>$NULL</strong>
              </Typography>
              <Typography>NULL</Typography>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card sx={{ bgcolor: "white", p: 2, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={selectedCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Grid>

        {/* Right Panel - Categories */}
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: "#78909C", color: "white", p: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Categories:
              </Typography>

              <FormGroup>
                {categories.map((category) => (
                  <Box
                    key={category.name}
                    display="flex"
                    alignItems="center"
                    sx={{ mb: 1, gap: 1 }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isChecked(category.name)}
                          onChange={() => handleCheckboxChange(category)}
                        />
                      }
                      label={category.name}
                    />
                    {isChecked(category.name) && (
                      <TextField
                        type="number"
                        size="small"
                        label="%"
                        value={getValue(category.name)}
                        onChange={(e) =>
                          handleValueChange(category.name, e.target.value)
                        }
                        sx={{ width: 80 }}
                      />
                    )}
                  </Box>
                ))}

                <h4>Selected Data:</h4>
                <pre>{JSON.stringify(selectedCategories, null, 2)}</pre>
              </FormGroup>

              <Typography mt={2}>Total: {total}%</Typography>

              <Button
                variant="contained"
                fullWidth
                sx={{
                  mt: 2,
                  bgcolor: "#0D47A1",
                  ":hover": { bgcolor: "#1565C0" },
                }}
              >
                Submit
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Page4;
