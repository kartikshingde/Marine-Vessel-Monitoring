# 🚢 Marine Vessel Monitoring System

This project is a **full-stack web application** built to monitor marine vessels in real time.  
It focuses on practical implementation of real-time systems using modern web technologies.

The system allows **Managers** to monitor the entire fleet and **Captains** to manage and report data for their assigned vessels.

This project was built as part of my learning in full-stack development and real-time systems, with more focus on hands-on implementation than only theory.

---

## 📌 Project Overview

The **Marine Vessel Monitoring System** provides:

- Live vessel tracking on an interactive map  
- Real-time sensor data updates  
- Noon report submission and history  
- Weather information based on vessel location  
- Role-based dashboards (Manager / Captain)  

Real-time updates are handled using **Socket.IO**, and continuous sensor data is processed using **RabbitMQ**.

---

##  Key Features

- JWT-based authentication
- Role-based access control
- Real-time vessel position updates
- Live sensor monitoring
- Noon report management
- Weather data integration
- REST APIs with real-time events

---

##  Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- React-Leaflet
- Socket.IO Client
- Axios
- Lucide React Icons

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- Socket.IO
- RabbitMQ
- JWT Authentication

---

## 📦 Prerequisites

Make sure the following are installed on your system:

- **Node.js** (v18 or higher)
- **MongoDB**
- **RabbitMQ**
- **Git**

---

## 📥 Setup Instructions

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/kartikshingde/Marine-Vessel-Monitoring.git
cd Marine-Vessel-Monitoring
⚙️ Environment Configuration
Backend .env
Create a .env file inside the backend folder:

env
Copy code
MONGODB_URI=mongodb://127.0.0.1:27017/vessel_monitoring
JWT_SECRET=your_jwt_secret
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Weather API (Get free key from openweathermap.org)
OPENWEATHER_API_KEY=
Frontend .env
Create a .env file inside the frontend folder:

env
Copy code
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
📦 Install Dependencies
Backend
bash
Copy code
cd backend
npm install
Frontend
bash
Copy code
cd ../frontend
npm install
▶️ Running the Application
Start MongoDB
bash
Copy code
mongod
(or ensure MongoDB service is running)

Start RabbitMQ
bash
Copy code
sudo systemctl start rabbitmq-server
(Optional RabbitMQ UI)

makefile
Copy code
http://localhost:15672
Username: guest
Password: guest
Start Backend Server
bash
Copy code
cd backend
npm run dev
Expected output:

arduino
Copy code
MongoDB Connected
Server running on port 5000
Socket.IO ready
Start Frontend Server
bash
Copy code
cd frontend
npm run dev
Open in browser:

arduino
Copy code
http://localhost:5173
(Optional) Start Sensor Simulator
To simulate real-time sensor data:

bash
Copy code
cd backend
node simulator/sensorPublisher.js
This sends continuous sensor readings using RabbitMQ.

📂 Project Structure (Simplified)
bash
Copy code
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
│   │   ├── components/   # UI components
│   │   ├── context/      # Auth context
│   │   ├── utils/        # Axios & Socket setup
│   │   └── App.jsx
│
└── README.md
👥 User Roles
Manager
View all vessels

Assign captains

Monitor fleet sensor data

View all noon reports

Captain
View assigned vessel

Submit noon reports

Track vessel position

Monitor real-time sensors

🧪 Testing Real-Time Features
Open two browser windows

Login as Manager in one and Captain in the other

Start the sensor simulator

Observe live updates without page refresh

Update vessel position and see instant map movement

🛠 Common Issues
MongoDB connection issue
Check MONGODB_URI

Ensure MongoDB is running

RabbitMQ error
bash
Copy code
rabbitmqctl status
Port already in use
bash
Copy code
lsof -ti:5000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
🚀 Future Scope
Vessel route tracking

Analytics dashboard

Notifications & alerts

Docker support

Cloud deployment

Mobile-friendly UI

👤 Author
Kartik Shingde
GitHub: https://github.com/kartikshingde

📄 License
This project is developed for academic and learning purposes.