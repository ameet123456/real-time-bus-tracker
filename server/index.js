const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const routeCoordinates = require("./routeData");

const buses = [
  { id: "BUS_1", index: 0 },
  { id: "BUS_2", index: 2 },
  { id: "BUS_3", index: 4 },
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
    bus.index = (bus.index + 1) % routeCoordinates.length;
    return {
      id: bus.id,
      lat: point.lat,
      lng: point.lng,
      index: bus.index
    };
  });

  console.log(busesDataArray)

  io.emit("busLocations", busesDataArray);



}, 2000); // 2 seconds

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
