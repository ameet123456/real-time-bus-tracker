const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const routeCoordinates = require("./routeData");
const { stat } = require("fs");

const buses = [
  { id: "BUS_1", index: 0, status: "RUNNING" },
  { id: "BUS_2", index: 3, status: "RUNNING"},
  { id: "BUS_3", index: 5, status: "RUNNING" },
];



const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

setInterval(() => {
  const busesDataArray = buses.map(bus => {
    const point = routeCoordinates[bus.index];
    if(!point) return null;
    const remainingSegments =
    routeCoordinates.length - bus.index - 1;

  const etaSeconds = Math.max(remainingSegments * 2, 0);

    const payload = {
      id: bus.id,
      lat: point.lat,
      lng: point.lng,
      index: bus.index,
      status: bus.status,
      etaSeconds,
    };

    bus.index = (bus.index + 1) % routeCoordinates.length;
    //console.log("Bus Update:", payload);
    return payload;
  }).filter(Boolean);


  io.emit("busLocations", busesDataArray);



}, 2000); // 2 seconds

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
