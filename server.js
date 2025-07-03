const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const axios = require('axios');
const { exec } = require("child_process");
const fs = require("fs");

const PORT = 3301;
const HOST = '0.0.0.0'; // Listen on all available network interfaces

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
const http = require("http");

// app.use(bodyParser.text({ type: "text/html" }));


const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Server is running, accessible via http://192.168.100.68:${PORT} (and other interfaces if present)`);
  console.log(`Printer endpoint should still target: http://192.168.100.68:${PORT}/api/printer/get-job`);
});

app.use("/api/printer", require("./routes/printRoutes"));
