import bcrypt
from datetime import datetime, timedelta
from typing import Optional
import uuid

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Profile, UserRole, AppRole

# ---------------------------------------------------------------------------
# Password hashing (direct bcrypt for Python 3.13 / bcrypt 5.x compatibility)
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_bytes = plain.encode("utf-8")[:72]
        hashed_bytes = hashed.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------
bearer_scheme = HTTPBearer()

def create_token(user_id: uuid.UUID, role: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expiry_minutes)
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ---------------------------------------------------------------------------
# FastAPI dependency – current authenticated user
# ---------------------------------------------------------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Profile:
    payload = decode_token(credentials.credentials)
    user_id = uuid.UUID(payload["sub"])
    user = db.get(Profile, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(required: AppRole):
    """Factory: returns a dependency that checks the caller's role."""
    def _dep(
        current_user: Profile = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Profile:
        has = db.query(UserRole).filter(
            UserRole.user_id == current_user.id,
            UserRole.role == required,
        ).first()
        if not has:
            raise HTTPException(status_code=403, detail=f"Requires role: {required.value}")
        return current_user
    return _dep


require_student  = require_role(AppRole.student)
require_lecturer = require_role(AppRole.lecturer)
