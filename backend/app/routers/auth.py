import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError, SQLAlchemyError

from app.database import get_db
from app.models import Profile, UserRole, Lecturer, Student, AppCredential, AppRole
from app.schemas import RegisterRequest, LoginRequest, AuthResponse
from app.security import hash_password, verify_password, create_token, get_current_user

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


# ---------------------------------------------------------------------------
# GET /api/auth/me  (current user full profile)
# ---------------------------------------------------------------------------
@router.get("/me")
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    role_row = db.query(UserRole).filter(UserRole.user_id == current_user.id).first()
    role = role_row.role.value if role_row else "student"

    res = {
        "id": str(current_user.id),
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone or "+60 12 345 6789",
        "avatar_url": current_user.avatar_url,
        "role": role,
    }

    if role == "lecturer":
        lec = db.query(Lecturer).filter(Lecturer.id == current_user.id).first()
        if lec:
            res.update({
                "title": lec.title,
                "department": lec.department,
                "specialization": lec.specialization,
                "office_location": lec.office_location,
                "consultation_info": lec.consultation_info,
            })
    else:
        stud = db.query(Student).filter(Student.id == current_user.id).first()
        if stud:
            res.update({
                "matric_no": stud.matric_no,
                "programme": stud.programme,
                "year_of_study": stud.year_of_study,
            })

    return res


# ---------------------------------------------------------------------------
# PATCH /api/auth/me  (update profile)
# ---------------------------------------------------------------------------
@router.patch("/me")
def update_my_profile(
    req: dict,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    if "full_name" in req and req["full_name"]:
        current_user.full_name = req["full_name"].strip()
    if "phone" in req:
        current_user.phone = req["phone"].strip() if req["phone"] else None

    role_row = db.query(UserRole).filter(UserRole.user_id == current_user.id).first()
    role = role_row.role.value if role_row else "student"

    if role == "lecturer":
        lec = db.query(Lecturer).filter(Lecturer.id == current_user.id).first()
        if lec:
            if "title" in req and req["title"]:
                lec.title = req["title"].strip()
            if "department" in req:
                lec.department = req["department"].strip()
            if "specialization" in req:
                lec.specialization = req["specialization"].strip()
            if "office_location" in req:
                lec.office_location = req["office_location"].strip()
            if "consultation_info" in req:
                lec.consultation_info = req["consultation_info"].strip()
    else:
        stud = db.query(Student).filter(Student.id == current_user.id).first()
        if stud:
            if "matric_no" in req:
                stud.matric_no = req["matric_no"].strip()
            if "programme" in req:
                stud.programme = req["programme"].strip()
            if "year_of_study" in req and req["year_of_study"]:
                try:
                    stud.year_of_study = int(req["year_of_study"])
                except ValueError:
                    pass

    db.commit()
    return get_my_profile(db=db, current_user=current_user)
