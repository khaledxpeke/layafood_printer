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

// Middleware to log all incoming requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`);
  });
  next();
});

const http = require("http");

// app.use(bodyParser.text({ type: "text/html" }));


const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});

app.use("/api/printer", require("./routes/printRoutes"));
