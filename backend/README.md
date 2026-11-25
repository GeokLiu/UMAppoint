# UMAppoint – FastAPI Backend

Python 3.11+ · FastAPI · SQLAlchemy · PostgreSQL (Supabase)

---

## Quick start

```powershell
# 1. Enter the backend directory
cd c:\Ying\WIA2006\UMAppoint\backend

# 2. Create a virtual environment
python -m venv venv
venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and fill in environment variables
copy .env.example .env
# Edit .env – set DB_URL with your real Supabase DB password and JWT_SECRET

# 5. (One-time) Run the SQL migration in Supabase SQL Editor:
#    paste contents of src/main/resources/db/V2__app_credentials.sql

# 6. Start the server
uvicorn main:app --reload --port 8000
```

API available at: **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

## Endpoints

| Step | Method | Path | Role | Description |
|------|--------|------|------|-------------|
| 1 | POST | `/api/auth/register` | Public | Register + JWT |
| 1 | POST | `/api/auth/login` | Public | Login + JWT |
| 2 | GET | `/api/lecturers` | Any | Search (`?search=&department=`) |
| 2 | GET | `/api/lecturers/{id}/slots` | Any | Future slots |
| 3 | POST | `/api/appointments` | STUDENT | Book (pessimistic lock) |
| 3 | GET | `/api/appointments` | STUDENT | Own appointments |
| 4 | GET | `/api/lecturer/appointments` | LECTURER | Incoming (`?status=PENDING`) |
| 4 | PATCH | `/api/appointments/{id}/status` | LECTURER | Approve / Reject |
