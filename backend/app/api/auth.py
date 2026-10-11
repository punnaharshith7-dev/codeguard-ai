import hashlib
import secrets
import smtplib
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.schemas import LoginRequest, RegisterRequest, ResetConfirmRequest, ResetRequest, UserResponse
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.models.entities import User
from app.services.mailer import send_password_reset

router = APIRouter(prefix="/auth", tags=["auth"])


async def github_identity(access_token: str, db: Session) -> User:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    async with httpx.AsyncClient(timeout=12) as client:
        profile_response = await client.get("https://api.github.com/user", headers=headers)
        profile_response.raise_for_status()
        profile = profile_response.json()
        email = profile.get("email")
        if not email:
            emails_response = await client.get("https://api.github.com/user/emails", headers=headers)
            emails_response.raise_for_status()
            emails = emails_response.json()
            email = next((item["email"] for item in emails if item.get("primary") and item.get("verified")), None)
    if not email:
        raise HTTPException(status_code=400, detail="A verified GitHub email is required")
    email = email.lower()
    github_id = str(profile["id"])
    user = db.query(User).filter(User.github_id == github_id).first() or db.query(User).filter(func.lower(User.email) == email).first()
    if user is None:
        user = User(email=email, username=profile.get("login", email.split("@")[0])[:80], avatar_url=profile.get("avatar_url"), github_id=github_id)
        db.add(user)
    else:
        user.github_id = github_id
        user.avatar_url = profile.get("avatar_url") or user.avatar_url
        if not user.username:
            user.username = profile.get("login", email.split("@")[0])[:80]
    db.commit()
    db.refresh(user)
    return user


def set_session(response: Response, user: User) -> None:
    response.set_cookie(
        settings.cookie_name,
        create_access_token(user.id),
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        max_age=settings.access_token_minutes * 60,
        path="/",
    )


def public_user(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, username=user.username, avatar_url=user.avatar_url)


@router.post("/register", response_model=UserResponse, status_code=201)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, username=payload.username.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    set_session(response, user)
    return public_user(user)


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    set_session(response, user)
    return public_user(user)


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(settings.cookie_name, path="/", httponly=True, secure=settings.cookie_secure, samesite="lax")


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return public_user(user)


@router.post("/github/exchange")
async def github_exchange(request: Request, db: Session = Depends(get_db)):
    authorization = request.headers.get("authorization", "")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="GitHub authorization is required")
    try:
        user = await github_identity(authorization.removeprefix("Bearer ").strip(), db)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=401, detail="GitHub authorization could not be verified") from exc
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": public_user(user)}


@router.post("/password/forgot", status_code=202)
def forgot_password(payload: ResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if user:
        token = secrets.token_urlsafe(36)
        user.reset_token_hash = hashlib.sha256(token.encode()).hexdigest()
        user.reset_expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
        db.commit()
        try:
            send_password_reset(user.email, token)
        except (OSError, smtplib.SMTPException):
            # The same response is returned to avoid leaking whether an account exists.
            pass
    return {"message": "If the account exists, password reset instructions will be sent."}


@router.post("/password/reset", status_code=204)
def reset_password(payload: ResetConfirmRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    user = db.query(User).filter(User.reset_token_hash == token_hash).first()
    expires_at = user.reset_expires_at if user else None
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if not user or not expires_at or expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")
    user.password_hash = hash_password(payload.password)
    user.reset_token_hash = None
    user.reset_expires_at = None
    db.commit()



