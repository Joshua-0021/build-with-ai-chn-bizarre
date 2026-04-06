# 🌿 PachApp — Waste Recycling Reward System

PachApp is a mobile application that encourages household waste recycling. A team called **Green Army** collects waste from houses, verifies it using AI (Google Vertex AI), and assigns reward points. Users accumulate points and can redeem them through a QR-based system.

## 🏗️ Architecture

```
pachapp/
├── backend/          # Python FastAPI REST API
│   └── app/
│       ├── core/     # Config, Database, Security (JWT)
│       ├── modules/  # Auth, Users, GreenArmy, QR
│       ├── shared/   # AI Service, Points Calculator
│       └── main.py   # Entry point
├── frontend/         # React Native (Expo) Mobile App
│   ├── screens/      # Login, Dashboard, Redeem, Scanner
│   ├── contexts/     # Auth state management
│   ├── services/     # API client layer
│   └── constants/    # Theme, API config
└── README.md
```

## ⚡ Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Frontend       | React Native (Expo SDK 54)          |
| Backend        | Python FastAPI                      |
| Database       | MongoDB (Motor async driver)        |
| Authentication | JWT (python-jose + bcrypt)          |
| AI             | Google Vertex AI (Gemini 2.0 Flash) |
| QR Code        | react-native-qrcode-svg + expo-camera |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+) — [nodejs.org](https://nodejs.org)
- **Python** (3.10+) — [python.org](https://python.org)
- **MongoDB** — [mongodb.com](https://mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas) free tier
- **Expo CLI** — installed automatically via npx

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file (already created with defaults)
# Edit .env to change configuration if needed

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. View the interactive API docs at `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies (already done during project creation)
npm install

# Start Expo development server
npx expo start
```

Then:
- Press `w` to open in web browser
- Press `a` to open on Android emulator
- Scan the QR code with Expo Go on your phone

### 3. Connect Frontend to Backend

Edit `frontend/constants/api.ts` and set `API_BASE_URL`:

```typescript
// For web browser testing:
export const API_BASE_URL = 'http://localhost:8000';

// For Android emulator:
export const API_BASE_URL = 'http://10.0.2.2:8000';

// For physical device (use your computer's IP):
export const API_BASE_URL = 'http://192.168.x.x:8000';
```

---

## 🧪 Demo Mode

By default, the app runs in **demo mode** (`DEMO_MODE=True` in `.env`). In this mode:
- AI waste classification returns **randomized mock data** instead of calling Google Vertex AI
- No Google Cloud credentials are needed
- The app is fully functional for testing all features

To use real AI classification, set `DEMO_MODE=False` and configure your Google Cloud credentials.

---

## 🔄 User Flows

### Household User Flow:
1. **Register** with a House ID and password (role: "Household")
2. **Login** → See dashboard with total points
3. Points are added when Green Army classifies your waste
4. **Redeem points** → Enter amount → Get QR code
5. Show QR code to Green Army for physical redemption

### Green Army Flow:
1. **Register** with a Worker ID (role: "Green Army")
2. **Login** → See classification form
3. Enter household's House ID
4. Take photo / upload image of collected waste
5. AI classifies the waste → Points calculated and assigned
6. **Scan QR codes** from users to complete point redemption

---

## 📡 API Endpoints

| Method | Endpoint                    | Description                          | Auth    |
|--------|-----------------------------|--------------------------------------|---------|
| POST   | `/api/v1/auth/register`     | Register new account                 | Public  |
| POST   | `/api/v1/auth/login`        | Login, returns JWT                   | Public  |
| GET    | `/api/v1/users/dashboard`   | User dashboard + history             | User    |
| POST   | `/api/v1/users/redeem`      | Redeem points, generate QR           | User    |
| GET    | `/api/v1/users/redemptions` | Redemption history                   | User    |
| POST   | `/api/v1/greenarmy/classify`| Upload image for AI classification   | GreenArmy |
| GET    | `/api/v1/greenarmy/transactions` | Worker submission history       | GreenArmy |
| POST   | `/api/v1/qr/validate`       | Validate and redeem QR code          | GreenArmy |
| GET    | `/api/v1/points-config`     | Get waste-to-points mapping          | Public  |

---

## 🧮 Point System

| Waste Type | Points per Unit |
|------------|----------------|
| Plastic    | 0.01           |
| Metal      | 0.02           |
| Paper      | 0.005          |
| Glass      | 0.015          |
| Organic    | 0.003          |
| E-Waste    | 0.05           |
| Textile    | 0.008          |

**Formula**: `total_points = Σ (quantity × point_value)`

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=pachapp
JWT_SECRET=your-secret-key-change-in-production
DEMO_MODE=True
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1
VERTEX_AI_MODEL=gemini-2.0-flash
```

---

## 📱 Production Deployment

### Backend
- Use `gunicorn` with `uvicorn` workers for production
- Set `DEMO_MODE=False` and configure GCP credentials
- Use a strong `JWT_SECRET`
- Use MongoDB Atlas or a managed MongoDB instance

### Frontend
- Run `npx expo prebuild` to generate native projects
- Build with `eas build` for distribution via app stores

---

## 📄 License

MIT
