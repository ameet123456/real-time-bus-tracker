import { useEffect, useRef } from "react";
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

  function animateMarker(marker, newLat, newLng) {
    if (marker._animationInterval) {
      clearInterval(marker._animationInterval);
    }

    const duration = 2000;
    const frames = 60;
    const start = marker.getLatLng();

    const dLat = (newLat - start.lat) / frames;
    const dLng = (newLng - start.lng) / frames;

    let frame = 0;

    marker._animationInterval = setInterval(() => {
      if (frame >= frames) {
        clearInterval(marker._animationInterval);
        marker._animationInterval = null;
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
    { lat: 21.0000, lng: 83.7800 },
    { lat: 21.0020, lng: 83.7815 },
    { lat: 21.0040, lng: 83.7830 },
    { lat: 21.0060, lng: 83.7845 },
    { lat: 21.0080, lng: 83.7860 },
    { lat: 21.0100, lng: 83.7875 },
    { lat: 21.0120, lng: 83.7890 },
    { lat: 21.0140, lng: 83.7905 },
    { lat: 21.0160, lng: 83.7920 },
    { lat: 21.0180, lng: 83.7935 },
    { lat: 21.0200, lng: 83.7950 },
  ];

  useEffect(() => {
    // INIT MAP (ONCE)
    if (!mapRef.current) {
      mapRef.current = L.map("map");
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 20,
      }).addTo(mapRef.current);

      L.polyline(route, { color: "red", weight: 2 }).addTo(mapRef.current);
      mapRef.current.fitBounds(L.latLngBounds(route));
    }

    // INIT SOCKET (ONCE)
    socketRef.current = io("http://localhost:3001");

    socketRef.current.on("busLocations", (buses) => {
      buses.forEach(({ id, lat, lng }) => {
        if (!markersRef.current[id]) {
          markersRef.current[id] = L.marker([lat, lng], {
            icon: busIcon,
          }).addTo(mapRef.current);
        } else {
          const current = markersRef.current[id].getLatLng();

          // prevent huge wrap-around animation
          if (Math.abs(current.lat - lat) > 0.01) {
            markersRef.current[id].setLatLng([lat, lng]);
          } else {
            animateMarker(markersRef.current[id], lat, lng);
          }
        }
      });
    });

    return () => {
      socketRef.current.disconnect();
      socketRef.current = null;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return <div id="map"></div>;
}
