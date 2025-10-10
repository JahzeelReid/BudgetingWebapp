import React from "react";
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
} from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Mortgage", value: 30 },
  { name: "Rent", value: 20 },
  { name: "Fun", value: 15 },
  { name: "Grocery", value: 25 },
  { name: "Bill", value: 10 },
];

const COLORS = ["#0D47A1", "#1976D2", "#42A5F5", "#64B5F6", "#90CAF9"];

function Page4(props) {
  // this page will be called on page 3 when the user clicks on an account
  // this will be the setting page that allows the user to set up envelopes for each account
  // this will only work if the account has init
  // on submit sends a post request to /api/newsettings
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
                Last Paycheck Total: <strong>$1981</strong>
              </Typography>
              <Typography>08/30/25</Typography>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card sx={{ bgcolor: "white", p: 2, height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
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

              {["Mortgage", "Rent", "Fun", "Grocery", "Bill"].map((label) => (
                <FormControlLabel
                  key={label}
                  control={<Checkbox sx={{ color: "white" }} />}
                  label={`${label} __%`}
                />
              ))}

              <Typography mt={1}>
                Custom Categories: Add(+) Delete(-)
              </Typography>
              <FormControlLabel
                control={<Checkbox sx={{ color: "white" }} />}
                label="Gas __%"
              />

              <Typography mt={2}>Total: 100%</Typography>

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
