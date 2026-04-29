from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
import uuid
from ..models.user import UserLogin, TokenResponse, UserOut
from ..auth import hash_password, verify_password, create_token, get_current_user
from ..database import get_db

router = APIRouter(tags=["auth"])


def _user_out(doc: dict) -> UserOut:
    return UserOut(
        id=doc["_id"],
        name=doc["name"],
        email=doc["email"],
        role=doc["role"],
        is_active=doc["is_active"],
        created_at=doc["created_at"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db=Depends(get_db)):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Conta desativada")
    token = create_token(user["_id"], user["email"], user["role"])
    return TokenResponse(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return _user_out(user)
