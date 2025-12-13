# Real-Time Bus Tracker (V1)

A real-time bus tracking application built to understand how live location systems work using
Socket.IO, Leaflet, and React.

This project focuses on **core real-time concepts**, not production features.

---

## 🚀 Features (V1)

- Real-time location updates using Socket.IO
- Interactive map using Leaflet
- Smooth animated bus movement
- Auto-fit route on load
- Auto-follow camera
- Custom bus marker icon
- Simulated GPS route (backend-driven)

---

## 🧠 Architecture Overview

### Backend (Node.js + Socket.IO)
- Emits bus location updates every 2 seconds
- Uses a predefined list of latitude–longitude points
- Acts as the single source of truth for bus position

### Frontend (React + Leaflet)
- Listens for real-time location events
- Displays the bus on an interactive map
- Smoothly animates marker movement
- Automatically follows the bus location

---

## 🔁 Data Flow

