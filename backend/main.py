from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, lecturers, appointments, notifications
from app.database import engine, Base

app = FastAPI(
    title="UMAppoint API",
    description="Appointment booking system for UM lecturers and students",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS – allow the Vite dev server and any deployed frontend
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(auth.router,         prefix="/api/auth",       tags=["Auth"])
app.include_router(lecturers.router,    prefix="/api/lecturers",  tags=["Lecturers"])
app.include_router(appointments.router, prefix="/api",             tags=["Appointments"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])


@app.get("/", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def root():
    return {"status": "ok", "message": "UMAppoint API is running"}
