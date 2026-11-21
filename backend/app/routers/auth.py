import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.database import get_db
from app.models import Profile, UserRole, Lecturer, Student, AppCredential, AppRole
from app.schemas import RegisterRequest, LoginRequest, AuthResponse
from app.security import hash_password, verify_password, create_token

router = APIRouter()


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=AuthResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    try:
        # Duplicate email check
        existing = db.query(Profile).filter(Profile.email == req.email).first()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        user_id = uuid.uuid4()
        now = datetime.utcnow().isoformat()

        # 1. Profile
        profile = Profile(
            id=user_id,
            email=req.email,
            full_name=req.full_name,
            created_at=now,
            updated_at=now,
        )
        db.add(profile)
        db.flush()  # Flush profile so FKs in dependent tables are satisfied

        # 2. Role
        app_role = AppRole(req.role)
        db.add(UserRole(user_id=user_id, role=app_role))

        # 3. Role-specific sub-record
        if app_role == AppRole.lecturer:
            db.add(Lecturer(
                id=user_id,
                title="Dr.",
                department=req.department or "Department of Software Engineering",
                specialization="",
                office_location="",
                consultation_info="",
                created_at=now,
            ))
        else:
            db.add(Student(
                id=user_id,
                matric_no=req.matric_no or "",
                programme=req.programme or "",
                year_of_study=1,
                created_at=now,
            ))

        # 4. Credential (BCrypt hash)
        db.add(AppCredential(
            user_id=user_id,
            password_hash=hash_password(req.password),
            created_at=now,
        ))

        db.commit()

        token = create_token(user_id, req.role)
        return AuthResponse(
            token=token,
            user_id=user_id,
            role=req.role,
            full_name=req.full_name,
            email=req.email,
        )

    except HTTPException:
        raise
    except OperationalError as oe:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to PostgreSQL. Please check DB_URL in backend/.env"
        ) from oe
    except SQLAlchemyError as se:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Database constraint error: {str(se.__cause__ or se)}"
        ) from se
    except Exception as ex:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(ex)) from ex


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    try:
        profile = db.query(Profile).filter(Profile.email == req.email).first()
        if not profile:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        cred = db.query(AppCredential).filter(AppCredential.user_id == profile.id).first()
        if not cred or not verify_password(req.password, cred.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Determine primary role
        role_row = db.query(UserRole).filter(UserRole.user_id == profile.id).first()
        role = role_row.role.value if role_row else "student"

        token = create_token(profile.id, role)
        return AuthResponse(
            token=token,
            user_id=profile.id,
            role=role,
            full_name=profile.full_name,
            email=profile.email,
        )
    except HTTPException:
        raise
    except OperationalError as oe:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to PostgreSQL. Please check DB_URL in backend/.env"
        ) from oe
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex)) from ex
