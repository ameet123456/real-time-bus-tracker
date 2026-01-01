import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { io } from "socket.io-client";
import "../map.css";

const busIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/416/416739.png",
  iconSize: [45, 45],
  iconAnchor: [22, 22],
});

export default function MapView() {
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const socketRef = useRef(null);
  const selectedBusRef = useRef(null);
  const routeLineRef = useRef(null);

  const [busesData, setBusesData] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [currentRoute, setCurrentRoute] = useState("R2");

  useEffect(() => {
    selectedBusRef.current = selectedBusId;
  }, [selectedBusId]);

  function animateMarker(marker, newLat, newLng) {
    if (marker._interval) {
      clearInterval(marker._interval);
    }

    const duration = 500;
    const frames = 60;
    const start = marker.getLatLng();

    const dLat = (newLat - start.lat) / frames;
    const dLng = (newLng - start.lng) / frames;

    let frame = 0;

    marker._interval = setInterval(() => {
      if (frame >= frames) {
        clearInterval(marker._interval);
      } else {
        marker.setLatLng([start.lat + dLat * frame, start.lng + dLng * frame]);
        frame++;
      }
    }, duration / frames);
  }

  useEffect(() => {
    // INIT MAP (once)
    if (!mapRef.current) {
      mapRef.current = L.map("map");
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
      }).addTo(mapRef.current);
    }

    socketRef.current = io("http://localhost:3001");

    socketRef.current.emit("joinRoute", currentRoute);
    socketRef.current.on("routeInfo", (route) => {
      if (routeLineRef.current) {
        mapRef.current.removeLayer(routeLineRef.current);
      }

      routeLineRef.current = L.polyline(route.coordinates, {
        color: "red",
        weight: 2,
      }).addTo(mapRef.current);

      mapRef.current.fitBounds(L.latLngBounds(route.coordinates));
    });

    socketRef.current.on("routeSnapshot", (buses) => {
      // console.log("ROUTE SNAPSHOT RECEIVED:", buses.map(b => b.id));

      setBusesData(buses);

      buses.forEach((bus) => {
        const { id, lat, lng, state } = bus;
        if (!markersRef.current[id]) {
          markersRef.current[id] = L.marker([lat, lng], {
            icon: busIcon,
          })
            .addTo(mapRef.current)
            .on("click", () => setSelectedBusId(id))
            .bindPopup(id);
        }

        const popupText =
          state === "STOPPED" ? `${id}<br/>STOPPED` : `${id}<br/>MOVING`;

        markersRef.current[id].setPopupContent(popupText);
      });
    });

    socketRef.current.on("busLocationUpdate", (bus) => {

console.log(
  "UI:",
  bus.id,
  {
    speedKmph: bus.speedKmph,
    speedMps: bus.speedMps,
    progress: bus.progressPercent,
    eta: bus.etaSeconds,
    state: bus.state,
    time: new Date(bus.timestamp).toLocaleTimeString(),
  }
);

      setBusesData((prev) => {
        const exists = prev.find((b) => b.id === bus.id);

        if (exists) {
          return prev.map((b) => (b.id === bus.id ? bus : b));
        } else {
          return [...prev, bus];
        }
      });

      const { id, lat, lng, state, etaSeconds, stopName } = bus;

      if (!markersRef.current[id]) {
        markersRef.current[id] = L.marker([lat, lng], {
          icon: busIcon,
        })
          .addTo(mapRef.current)
          .on("click", () => setSelectedBusId(id))
          .bindPopup(id);
      }

      const popupText =
        state === "STOPPED" ? `${id}<br/>STOPPED` : `${id}<br/>MOVING`;

      markersRef.current[id].setPopupContent(popupText);

      markersRef.current[id].setLatLng([lat, lng]);

      if (state === "MOVING") {
        animateMarker(markersRef.current[id], lat, lng);
      }

      if (id === selectedBusRef.current && state === "MOVING") {
        mapRef.current.panTo([lat, lng], { animate: true, duration: 1 });
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  function switchRoute(newRoute) {
    if (newRoute === currentRoute) return;

    // 1️⃣ Leave old route
    socketRef.current.emit("leaveRoute", currentRoute);

    // 2️⃣ Clear frontend state
    setBusesData([]);
    setSelectedBusId(null);

    Object.values(markersRef.current).forEach((marker) => {
      mapRef.current.removeLayer(marker);
    });
    markersRef.current = {};

    // 3️⃣ Join new route
    socketRef.current.emit("joinRoute", newRoute);
    setCurrentRoute(newRoute);
  }

  return (
    <>
      <button onClick={() => switchRoute("R1")}>Route R1</button>
      <button onClick={() => switchRoute("R2")}>Route R2</button>

      <div id="map"></div>

      <div className="bus-panel">
        <h3>Active Buses</h3>
        {busesData.map((bus) => (
          
          <div
            key={bus.id}
            className={`bus-item ${bus.state === "STOPPED" ? "stopped" : ""}`}
          >
            <strong>{bus.id}</strong>

            <div>Route: {bus.routeId}</div>
            <div>State: {bus.state}</div>

            <div>
              Progress: {bus.progressPercentPercentPercent}%
              <div style={{ background: "#333", height: 6, marginTop: 4 }}>
                <div
                  style={{
                    width: `${bus.progressPercentPercentPercent}%`,
                    height: "100%",
                    background: "#4caf50",
                  }}
                />
              </div>
            </div>

            <div>
              ETA: {bus.etaSeconds === null ? "Paused" : `${bus.etaSeconds}s`}
            </div>

            <div>
              Last update: {new Date(bus.timestamp).toLocaleTimeString()}
            </div>
<div>
  Speed: {bus.speedKmph === 0 ? "Stopped" : `${bus.speedKmph} km/h`}
</div>

            <button
              onClick={() => socketRef.current.emit("pauseBus", bus.id)}
              disabled={bus.state === "PAUSED"}
            >
              Pause
            </button>

            <button
              onClick={() => socketRef.current.emit("resumeBus", bus.id)}
              disabled={bus.state !== "PAUSED"}
            >
              Resume
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
