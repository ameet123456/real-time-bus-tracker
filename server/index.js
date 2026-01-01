const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const routes = require("./routes");
const busStops = require("./busStops");
const { distanceBetween } = require("./utils/distance");

const MOVE_DURATION = 2000; // ms per segment
const STOP_DURATION = 6000; // ms at stop

Object.values(routes).forEach((route) => {
  let total = 0;
  const cumulative = [0];

  for (let i = 1; i < route.coordinates.length; i++) {
    const d = distanceBetween(route.coordinates[i - 1], route.coordinates[i]);
    total += d;
    cumulative.push(Math.round(total));
  }

  route.totalDistance = Math.round(total); // meters
  route.cumulativeDistances = cumulative;
  //   console.log(
  //   route.id,
  //   route.cumulativeDistances,
  //   route.totalDistance
  // );
});

const buses = [
  {
    id: "BUS_1",
    routeId: "R1",
    index: 0,
    state: "MOVING",
    stateUntil: Date.now() + MOVE_DURATION,

    lastIndex: null,
    lastMoveTimestamp: null,

    speedSamples: [],
    speed: 0, // meters/sec
  },
  {
    id: "BUS_2",
    routeId: "R1",
    index: 3,
    state: "MOVING",
    stateUntil: Date.now() + MOVE_DURATION,

    lastIndex: null,
    lastMoveTimestamp: null,

    speedSamples: [],
    speed: 0,
  },
  {
    id: "BUS_3",
    routeId: "R2",
    index: 5,
    state: "MOVING",
    stateUntil: Date.now() + MOVE_DURATION,

    lastIndex: null,
    lastMoveTimestamp: null,

    speedSamples: [],
    speed: 0,
  },
];

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("pauseBus", (busId) => {
    const bus = buses.find((b) => b.id === busId);
    if (!bus) return;

    bus.state = "PAUSED";
    bus.stateUntil = Infinity;

    console.log(`⏸ ${bus.id} PAUSED`);
  });

  socket.on("resumeBus", (busId) => {
    const bus = buses.find((b) => b.id === busId);
    if (!bus) return;

    bus.state = "MOVING";
    bus.stateUntil = Date.now() + MOVE_DURATION;

    console.log(`▶️ ${bus.id} RESUMED`);
  });

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

        return {
          id: bus.id,
          routeId: bus.routeId,
          lat: point.lat,
          lng: point.lng,
          index: bus.index,
          state: bus.state,
          progress: route.cumulativeDistances[bus.index]
            ? Math.round(
                (route.cumulativeDistances[bus.index] / route.totalDistance) *
                  100
              )
            : 0,
          timestamp: Date.now(),
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
  const now = Date.now();
  buses.forEach((bus) => {
    if (bus.state === "PAUSED") return;
    if (now < bus.stateUntil) return;
    const route = routes[bus.routeId];
    const stop = busStops.find((s) => s.index === bus.index);

    if (bus.state === "MOVING") {
      if (stop) {
        bus.state = "STOPPED";
        bus.stateUntil = now + STOP_DURATION;
        console.log(`🛑 ${bus.id} STOPPED at ${stop.name}`);
      } else {
        bus.index++;
        if (bus.index >= route.coordinates.length) bus.index = 0;
        bus.stateUntil = now + MOVE_DURATION;
      }
    } else if (bus.state === "STOPPED") {
      bus.index++;
      if (bus.index >= route.coordinates.length) bus.index = 0;

      bus.state = "MOVING";
      bus.stateUntil = now + MOVE_DURATION;
    }
  });

  buses.forEach((bus) => {
    const route = routes[bus.routeId];
    const point = route.coordinates[bus.index];
    if (!point) return;

    const nowTs = Date.now();
    let instantSpeed = 0;

    // speed derivation
    if (
      bus.lastIndex !== null &&
      bus.index !== bus.lastIndex &&
      bus.state === "MOVING"
    ) {
      const prevPoint = route.coordinates[bus.lastIndex];
      const currPoint = point;

      const dist = distanceBetween(prevPoint, currPoint); // meters
      const timeDiff = (nowTs - bus.lastMoveTimestamp) / 1000; // seconds

      if (timeDiff > 0) {
        instantSpeed = dist / timeDiff; // m/s
      }
    }

    if (bus.lastIndex === null) {
      // first ever movement baseline
      bus.lastIndex = bus.index;
      bus.lastMoveTimestamp = nowTs;
    } else if (bus.index !== bus.lastIndex) {
      bus.lastIndex = bus.index;
      bus.lastMoveTimestamp = nowTs;
    }

    bus.speedSamples.push(instantSpeed);
    if (bus.speedSamples.length > 5) bus.speedSamples.shift();

    bus.speed =
      bus.speedSamples.length === 0
        ? 0
        : bus.speedSamples.reduce((a, b) => a + b, 0) / bus.speedSamples.length;

    if (bus.state !== "MOVING") bus.speed = 0;

    const coveredDistance = route.cumulativeDistances[bus.index];
    const remainingDistance = route.totalDistance - coveredDistance;

    const progressPercent = Math.round(
      (coveredDistance / route.totalDistance) * 100
    );

    let etaSeconds = null;

    if (bus.speed > 0 && bus.state === "MOVING") {
      etaSeconds = Math.round(remainingDistance / bus.speed);
    }

    console.log(
      `[${bus.id}]`,
      `state=${bus.state}`,
      `speed=${(bus.speed * 3.6).toFixed(2)} km/h`,
      `progress=${progressPercent}%`,
      `eta=${etaSeconds}s`
    );

    io.to(`route:${bus.routeId}`).emit("busLocationUpdate", {
      id: bus.id,
      routeId: bus.routeId,

      lat: point.lat,
      lng: point.lng,
      index: bus.index,
      state: bus.state,

      coveredDistance,
      remainingDistance,
      totalDistance: route.totalDistance,

      progressPercent: progressPercent, // ✅ MATCH FRONTEND
      etaSeconds,

      speedMps: Number(bus.speed.toFixed(2)),
      speedKmph: Number((bus.speed * 3.6).toFixed(1)),

      timestamp: Date.now(),
    });
  });
}, 500);

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
