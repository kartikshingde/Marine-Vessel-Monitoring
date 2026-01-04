# 🚢 Marine Vessel Monitoring System

---

##  Overview

The Marine Vessel Monitoring System allows managers and captains to monitor vessel operations in real time.

Main use cases:
- Track vessel position on a live map
- Monitor sensor data such as speed, fuel, and engine temperature
- Submit and view daily noon reports
- Fetch weather data for vessel locations
- Get instant updates without page refresh

Real-time updates are handled using Socket.IO, and sensor data is processed using RabbitMQ.

---

## * Features

- JWT-based authentication
- Role-based access (Manager / Captain)
- Real-time vessel position updates
- Live sensor monitoring
- Noon report submission and history
- Weather data integration
- REST APIs with real-time events

---

## 🧱 Tech Stack

Frontend:
- React (Vite)
- Tailwind CSS
- React-Leaflet
- Socket.IO Client
- Axios

Backend:
- Node.js
- Express.js
- MongoDB (Mongoose)
- Socket.IO
- RabbitMQ (Docker)
- JWT Authentication

---

## 📦 Prerequisites

Make sure the following are installed:

- Node.js (v18 or higher)
- MongoDB
- Docker
- Git

---

## 📥 Setup

Clone the repository:

$ git clone https://github.com/kartikshingde/Marine-Vessel-Monitoring.git  
$ cd Marine-Vessel-Monitoring

---

## ⚙️ Environment Variables

Backend (backend/.env):

MONGODB_URI=mongodb://127.0.0.1:27017/vessel_monitoring  
JWT_SECRET=your_jwt_secret  
NODE_ENV=development  
CLIENT_URL=http://localhost:5173  

OPENWEATHER_API_KEY=

Frontend (frontend/.env):

VITE_API_URL=http://localhost:5000/api  
VITE_SOCKET_URL=http://localhost:5000

---

## 📦 Install Dependencies

Backend:

$ cd backend  
$ npm install  

Frontend:

$ cd ../frontend  
$ npm install  

---

## ▶️ Running the Application

### Start MongoDB

$ mongod  

(or ensure MongoDB service is running)

---

### Start RabbitMQ (Docker)

RabbitMQ is run using Docker.

If the container already exists:

$ docker start rabbitmq

If running RabbitMQ for the first time, create the container once:

$ docker run -d \
  --hostname rabbitmq \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

RabbitMQ Management UI (optional):  
http://localhost:15672  
Username: guest  
Password: guest  

---

### Start Backend Server

$ cd backend  
$ npm run dev  

Expected logs:
MongoDB Connected  
Server running on port 5000  
Socket.IO ready  

---

### Start Frontend Server

$ cd frontend  
$ npm run dev  

Open in browser:  
http://localhost:5173

---

## (Optional) Sensor Simulator

To simulate live vessel sensor data:

$ cd backend  
$ node simulator/sensorPublisher.js  

This publishes continuous sensor readings using RabbitMQ.

---

## 📂 Project Structure

Marine-Vessel-Monitoring/
├── backend/
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── middleware/   # Authentication & roles
│   │   └── services/     # RabbitMQ consumer
│   ├── simulator/        # Sensor simulator
│   └── app.js
│
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components (with Socket.IO)
│   │   ├── context/      # Auth context
│   │   ├── utils/        # Axios & socket setup
│   │   └── App.jsx
│
└── README.md

---

## 👥 User Roles

Manager:
- View all vessels
- Assign captains
- Monitor fleet sensor data
- View noon reports

Captain:
- View assigned vessel
- Submit noon reports
- Track vessel position
- Monitor live sensors

---

## 🧪 Testing Real-Time Features

1. Open two browser windows  
2. Login as Manager in one and Captain in another  
3. Start the sensor simulator  
4. Observe live updates  
5. Update vessel position and see instant map movement  



## 👤 Author

Kartik Shingde  
GitHub: https://github.com/kartikshingde

---

## 📄 License

This project is developed for learning purposes.
