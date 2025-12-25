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

  const [busesData, setBusesData] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  useEffect(() => {
    selectedBusRef.current = selectedBusId;
  }, [selectedBusId]);

function animateMarker(marker, newLat, newLng) {
  if (marker._interval) {
    clearInterval(marker._interval);
  }

  const duration = 1800;
  const frames = 60;
  const start = marker.getLatLng();

  const dLat = (newLat - start.lat) / frames;
  const dLng = (newLng - start.lng) / frames;

  let frame = 0;

  marker._interval = setInterval(() => {
    if (frame >= frames) {
      clearInterval(marker._interval);
    } else {
      marker.setLatLng([
        start.lat + dLat * frame,
        start.lng + dLng * frame,
      ]);
      frame++;
    }
  }, duration / frames);
}



  const route = [
    { lat: 21.0, lng: 83.78 },
    { lat: 21.002, lng: 83.7815 },
    { lat: 21.004, lng: 83.783 },
    { lat: 21.006, lng: 83.7845 },
    { lat: 21.008, lng: 83.786 },
    { lat: 21.01, lng: 83.7875 },
    { lat: 21.012, lng: 83.789 },
    { lat: 21.014, lng: 83.7905 },
    { lat: 21.016, lng: 83.792 },
    { lat: 21.018, lng: 83.7935 },
    { lat: 21.02, lng: 83.795 },
  ];

  useEffect(() => {
    // INIT MAP (once)
    if (!mapRef.current) {
      mapRef.current = L.map("map");
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
      }).addTo(mapRef.current);

      L.polyline(route, { color: "red", weight: 2 }).addTo(mapRef.current);
      mapRef.current.fitBounds(L.latLngBounds(route));
    }

    // INIT SOCKET (once)
    socketRef.current = io("http://localhost:3001");
socketRef.current.emit("joinRoute", "R2");


socketRef.current.on("busLocationUpdate", (bus) => {
  setBusesData((prev) => {
    const exists = prev.find((b) => b.id === bus.id);

    if (exists) {
      return prev.map((b) => (b.id === bus.id ? bus : b));
    } else {
      return [...prev, bus];
    }
  });

  const { id, lat, lng, status, etaSeconds, stopName } = bus;

  if (!markersRef.current[id]) {
    markersRef.current[id] = L.marker([lat, lng], {
      icon: busIcon,
    })
      .addTo(mapRef.current)
      .on("click", () => setSelectedBusId(id))
      .bindPopup(id);
  }

  const popupText =
    status === "STOPPED"
      ? `${id}<br/>STOPPED at ${stopName}<br/>Departing in ${etaSeconds}s`
      : `${id}<br/>ETA to next stop: ${etaSeconds}s`;

  markersRef.current[id].setPopupContent(popupText);

  if (status === "RUNNING") {
    animateMarker(markersRef.current[id], lat, lng);
  }

  if (id === selectedBusRef.current && status === "RUNNING") {
    mapRef.current.panTo([lat, lng], { animate: true, duration: 1 });
  }
});


    return () => {
      socketRef.current.disconnect();
    };
  }, []); // intentional

  return (
    <>
      <div id="map"></div>

      <div className="bus-panel">
        <h3>Active Buses</h3>
        {busesData.map((bus) => (
          <div
            key={bus.id}
            className={`bus-item ${bus.status === "STOPPED" ? "stopped" : ""}`}
          >
            <strong>{bus.id}</strong>

            <div>Status: {bus.status}</div>

            {bus.status === "STOPPED" && (
              <>
                <div>At: {bus.stopName}</div>
                <div>Departing in: {bus.etaSeconds}s</div>
              </>
            )}

            {bus.status === "RUNNING" && (
              <div>ETA to next stop: {bus.etaSeconds}s</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
