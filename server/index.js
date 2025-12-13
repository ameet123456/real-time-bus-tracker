const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const routeCoordinates = require("./routeData");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" }
});

let currentIndex = 0;

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

setInterval(() => {
  const data = {
    lat: routeCoordinates[currentIndex].lat,
    lng: routeCoordinates[currentIndex].lng,
    index: currentIndex
  };

  io.emit("busLocation", data);

  currentIndex++;
  if (currentIndex >= routeCoordinates.length) currentIndex = 0;

}, 2000); // 2 seconds

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
