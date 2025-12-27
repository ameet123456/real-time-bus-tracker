const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const routes = require("./routes");
const busStops = require("./busStops");

const buses = [
  {
    id: "BUS_1",
    routeId: "R1",
    index: 0,
    status: "RUNNING",
    stopTimer: 0,
    lastStopIndex: null,
  },
  {
    id: "BUS_2",
    routeId: "R1",
    index: 3,
    status: "RUNNING",
    stopTimer: 0,
    lastStopIndex: null,
  },
  {
    id: "BUS_3",
    routeId: "R2",
    index: 5,
    status: "RUNNING",
    stopTimer: 0,
    lastStopIndex: null,
  },
];

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("joinRoute", (routeId) => {
    if (!routes[routeId]) {
      console.error(`Invalid routeId: ${routeId}`);
      return;
    }
    const roomName = `route:${routeId}`;
    socket.join(roomName);
    console.log(`Client ${socket.id} joined room: ${roomName}`);

    socket.emit("routeInfo", {
      routeId,
      coordinates: routes[routeId].coordinates,
    });

    const snapshotData = buses
      .filter((bus) => bus.routeId === routeId)
      .map((bus) => {
        const route = routes[bus.routeId];
        const point = route.coordinates[bus.index];
        if (!point) return null;

        const nextStop = busStops.find((s) => s.index > bus.index);
        const etaSeconds = nextStop ? (nextStop.index - bus.index) * 2 : 0;

        return {
          id: bus.id,
          lat: point.lat,
          lng: point.lng,
          index: bus.index,
          status: bus.status,
          stopName: null,
          etaSeconds,
        };
      })
      .filter(Boolean);

    socket.emit("routeSnapshot", snapshotData);
  });
  socket.on("leaveRoute", (routeId) => {
    const roomName = `route:${routeId}`;
    socket.leave(roomName);
    console.log(`Client ${socket.id} left room: ${roomName}`);
  });
});

setInterval(() => {
  const busesDataArray = buses
    .map((bus) => {
      const stop = busStops.find(
        (s) => s.index === bus.index && bus.lastStopIndex !== s.index
      );

      if (stop && bus.status === "RUNNING") {
        bus.status = "STOPPED";
        bus.stopTimer = 6;
        bus.lastStopIndex = stop.index;
        console.log(`🛑 ${bus.id} STOPPED at ${stop.name}`);
      }

      if (bus.status === "STOPPED") {
        bus.stopTimer--;
        if (bus.stopTimer <= 0) {
          bus.status = "RUNNING";
        }
      } else {
        bus.index++;

        const route = routes[bus.routeId];

        if (bus.index >= route.coordinates.length) {
          bus.index = 0;
          bus.lastStopIndex = null;
        }
      }

      const route = routes[bus.routeId];
      const point = route.coordinates[bus.index];
      if (!point) return null;

      const nextStop = busStops.find((s) => s.index > bus.index);
      const etaSeconds = nextStop ? (nextStop.index - bus.index) * 2 : 0;

      return {
        id: bus.id,
        lat: point.lat,
        lng: point.lng,
        index: bus.index,
        status: bus.status,
        stopName: stop ? stop.name : null,
        etaSeconds,
      };
    })
    .filter(Boolean);
  busesDataArray.forEach((busData) => {
    const bus = buses.find((b) => b.id === busData.id);
    if (!bus) return;

    const roomName = `route:${bus.routeId}`;
    io.to(roomName).emit("busLocationUpdate", busData);
  });
}, 2000);

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
