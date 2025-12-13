import { useEffect, useRef } from "react";
import L from "leaflet";
import { io } from "socket.io-client";
import "../map.css";


const busIcon = L.icon({
  iconUrl: "   https://cdn-icons-png.flaticon.com/512/416/416739.png ",
  iconSize: [45, 45],
  iconAnchor: [22, 22],
});

export default function MapView() {
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  
  function animateMarker(marker, newLat, newLng) {
    const duration = 2000; // backend emits every 2 seconds
    const frames = 90;
    const deltaLat = (newLat - marker.getLatLng().lat) / frames;
    const deltaLng = (newLng - marker.getLatLng().lng) / frames;

    let frame = 0;
    const interval = setInterval(() => {
      if (frame >= frames) {
        clearInterval(interval);
      } else {
        marker.setLatLng([
          marker.getLatLng().lat + deltaLat,
          marker.getLatLng().lng + deltaLng,
        ]);
        frame++;
      }
    }, duration / frames);
  }

  // Full route for auto-fit
  const route = [
    { lat: 21.06015373710102, lng: 83.77703056727637 },
  { lat: 21.08511624338818, lng: 83.74312714584656 },
  { lat: 21.106538388633783, lng: 83.67542291053581 },
  { lat: 21.151353749220416, lng: 83.63620940267835 },
  { lat: 21.19352052594749, lng: 83.58604437727973 },
  { lat: 21.207024528879508, lng: 83.5948762479485 },
  { lat: 21.233040954464297, lng: 83.57897888074471 },
  { lat: 21.261357415713213, lng: 83.57862560591796 },
  { lat: 21.279134737156657, lng: 83.59381642346825 },
  { lat: 21.293958984747743, lng: 83.59334391536851 },
  { lat: 21.281971754506696, lng: 83.61301488086644 },
  { lat: 21.277457505297683, lng: 83.62139464608867 },
  { lat: 21.27654182177785, lng: 83.62484025832792 },
  ];

  
  useEffect(() => {
    mapRef.current = L.map("map").setView([21.049640, 83.797035], 13);

    const bounds = L.latLngBounds(route);
    mapRef.current.fitBounds(bounds);

    // Fix sizing after render
    setTimeout(() => {
      mapRef.current.invalidateSize();
    }, 100);

    // Add OpenStreetMap layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 20,
    }).addTo(mapRef.current);


    L.polyline(route, {
  color: "red",
  weight: 2
}).addTo(mapRef.current);

    // Connect to backend
    const socket = io("http://localhost:3001");

    socket.on("busLocation", (data) => {
      const { lat, lng } = data;

      // Auto-follow camera
      mapRef.current.panTo([lat, lng], { animate: true });

      // Create or animate bus marker
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { icon: busIcon }).addTo(
          mapRef.current
        );
      } else {
        animateMarker(markerRef.current, lat, lng);
      }
    });

    return () => {
      socket.disconnect();
      mapRef.current.remove();
    };
  }, []);

  return <div id="map"></div>;
}
