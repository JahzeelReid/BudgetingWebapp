import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import {
  Box,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Stack,
  CircularProgress,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { AuthContext } from "./AuthContext";

// Helper function to assign distinct colors dynamically
// Features a premium palette with gold accents for dynamically generated categories
const getBucketColors = (bucketName, index) => {
  const predefined = {
    groceries: { current: "#2e7d32", goal: "#a5d6a7" },
    "tech subscriptions": { current: "#d32f2f", goal: "#ef9a9a" },
    savings: { current: "#1976d2", goal: "#90caf9" },
  };

  const normalizedName = bucketName.toLowerCase();
  if (predefined[normalizedName]) {
    return predefined[normalizedName];
  }

  // Fallback premium dark/gold palette for dynamically discovered buckets
  const fallbackPalette = [
    { current: "#d4af37", goal: "#f3e5ab" }, // Gold
    { current: "#9c27b0", goal: "#ce93d8" }, // Purple
    { current: "#ed6c02", goal: "#ffb74d" }, // Orange
    { current: "#0288d1", goal: "#81d4fa" }, // Light Blue
  ];

  return fallbackPalette[index % fallbackPalette.length];
};

export default function BucketTrackingChart({ url, accountId }) {
  // State for fetched data and dynamic UI elements
  const [financialDataset, setFinancialDataset] = useState([]);
  const [availableBuckets, setAvailableBuckets] = useState([]);
  const [selectedBuckets, setSelectedBuckets] = useState([]);
  const [timeRange, setTimeRange] = useState(6);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  // 1. Fetch data from the Flask backend on mount
  // useEffect(() => {
  //   const fetchChartData = async () => {
  //     try {
  //       // Adjust this endpoint to match your Flask routing
  //       axios({
  //         method: "POST",
  //         url: `${url}/api/bucket-records`,
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           "Content-Type": "application/json",
  //         },
  //         data: { account: accountId },
  //       })
  //         .then(() => {
  //           const rawData = response.data;

  //           // Convert the string dates from the backend into JS Date objects
  //           const formattedData = rawData.map((item) => ({
  //             ...item,
  //             date: new Date(item.date),
  //           }));

  //           setFinancialDataset(formattedData);

  //           // 2. Dynamically extract bucket names from the keys
  //           const bucketSet = new Set();
  //           formattedData.forEach((row) => {
  //             Object.keys(row).forEach((key) => {
  //               if (key.endsWith("_current")) {
  //                 // Strip "_current" to get the base bucket name
  //                 bucketSet.add(key.replace("_current", ""));
  //               }
  //             });
  //           });

  //           const extractedBuckets = Array.from(bucketSet);
  //           setAvailableBuckets(extractedBuckets);

  //           // Default to selecting the first available bucket if data exists
  //           if (extractedBuckets.length > 0) {
  //             setSelectedBuckets([extractedBuckets[0]]);
  //           }
  //         })
  //         .catch((err) => {
  //           console.error("Error updating buckets", err);
  //         });
  //     } catch (error) {
  //       console.error("Failed to fetch chart data:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchChartData();
  // }, []); // Empty dependency array ensures this runs once on mount
  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Await the axios call directly instead of using .then()
        const response = await axios({
          method: "POST",
          url: `${url}/api/bucket-records`,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: { account: accountId },
        });

        // Now 'response' is defined and safe to use
        const rawData = response.data;

        // Convert the string dates from the backend into JS Date objects
        const formattedData = rawData.map((item) => ({
          ...item,
          date: new Date(item.date),
        }));

        setFinancialDataset(formattedData);

        // Dynamically extract bucket names from the keys
        const bucketSet = new Set();
        formattedData.forEach((row) => {
          Object.keys(row).forEach((key) => {
            if (key.endsWith("_current")) {
              bucketSet.add(key.replace("_current", ""));
            }
          });
        });

        const extractedBuckets = Array.from(bucketSet);
        setAvailableBuckets(extractedBuckets);

        if (extractedBuckets.length > 0) {
          setSelectedBuckets([extractedBuckets[0]]);
        }
      } catch (error) {
        console.error("Failed to fetch chart data:", error);
      } finally {
        // This now correctly waits for the axios call to finish or fail
        setLoading(false);
      }
    };

    // Ensure we only run this if url and token are available
    if (url && token) {
      fetchChartData();
    }
  }, [url, accountId, token]); // Add props to the dependency array

  // Handlers
  const handleBucketChange = (event) => {
    const { value } = event.target;
    setSelectedBuckets(typeof value === "string" ? value.split(",") : value);
  };

  const handleTimeChange = (event) => {
    setTimeRange(event.target.value);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: 4,
          bgcolor: "#1e1e1e",
          borderRadius: 2,
        }}
      >
        <CircularProgress sx={{ color: "#d4af37" }} />
      </Box>
    );
  }

  // Date Filtering Logic
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - timeRange);

  const filteredDataset = financialDataset.filter(
    (dataPoint) => dataPoint.date >= cutoffDate,
  );

  // Series Generation with connectNulls
  const chartSeries = selectedBuckets.flatMap((bucket, index) => {
    const colors = getBucketColors(bucket, index);

    // Format the label for display (e.g., "groceries" -> "Groceries")
    const formattedLabel = bucket.charAt(0).toUpperCase() + bucket.slice(1);

    return [
      {
        dataKey: `${bucket}_current`,
        label: `${formattedLabel} (Actual)`,
        color: colors.current,
        // area: true,
        connectNulls: true,
      },
      {
        dataKey: `${bucket}_goal`,
        label: `${formattedLabel} (Goal)`,
        color: colors.goal,
        connectNulls: true,
      },
    ];
  });

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1000,
        p: 3,
        bgcolor: "#1a1a1a", // Matte background
        borderRadius: 2,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header & Controls Section */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          mb: 4,
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ color: "#d4af37", fontWeight: 600 }}>
          Bucket Performance
        </Typography>

        <Stack direction="row" spacing={2}>
          {/* Timeframe Dropdown */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="time-select-label" sx={{ color: "#b0b0b0" }}>
              Timeframe
            </InputLabel>
            <Select
              labelId="time-select-label"
              value={timeRange}
              label="Timeframe"
              onChange={handleTimeChange}
              sx={{
                color: "#fff",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "#333" },
              }}
            >
              <MenuItem value={3}>Last 3 Months</MenuItem>
              <MenuItem value={6}>Last 6 Months</MenuItem>
              <MenuItem value={12}>Last 12 Months</MenuItem>
            </Select>
          </FormControl>

          {/* Buckets Dropdown */}
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="bucket-select-label" sx={{ color: "#b0b0b0" }}>
              Select Buckets
            </InputLabel>
            <Select
              labelId="bucket-select-label"
              multiple
              value={selectedBuckets}
              onChange={handleBucketChange}
              input={<OutlinedInput label="Select Buckets" />}
              renderValue={(selected) => selected.join(", ")}
              sx={{
                color: "#fff",
                ".MuiOutlinedInput-notchedOutline": { borderColor: "#333" },
              }}
            >
              {availableBuckets.map((bucketName) => (
                <MenuItem key={bucketName} value={bucketName}>
                  <Checkbox
                    checked={selectedBuckets.indexOf(bucketName) > -1}
                  />
                  <ListItemText
                    primary={
                      bucketName.charAt(0).toUpperCase() + bucketName.slice(1)
                    }
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Chart Section */}
      <Box sx={{ width: "100%" }}>
        <LineChart
          height={400}
          dataset={filteredDataset}
          xAxis={[
            {
              dataKey: "date",
              scaleType: "time",
              valueFormatter: (date) =>
                date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              tickLabelStyle: { fill: "#b0b0b0" },
            },
          ]}
          yAxis={[{ tickLabelStyle: { fill: "#b0b0b0" } }]}
          series={chartSeries}
          margin={{ top: 20, bottom: 30, left: 50, right: 150 }}
          sx={{
            "& .MuiChartsLegend-series text": { fill: "#fff !important" },
          }}
        />
      </Box>
    </Box>
  );
}
