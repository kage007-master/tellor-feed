"use client";

const https = require("https");
const agent = new https.Agent({
  rejectUnauthorized: false,
});

export const socket = require("socket.io-client")("https://95.217.47.46:3000", {
  agent: agent,
  transports: ["websocket"],
});
