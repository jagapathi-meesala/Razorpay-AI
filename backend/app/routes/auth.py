from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app import models, schemas, auth
from backend.app.services.audit import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

from sqlalchemy import func

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    clean_identifier = login_data.username.strip().lower()
    clean_password = login_data.password.strip()

    # Allow login using either username OR email (case-insensitive)
    user = db.query(models.User).filter(
        (func.lower(models.User.username) == clean_identifier) | 
        (func.lower(models.User.email) == clean_identifier)
    ).first()

    if not user or not auth.verify_password(clean_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if a specific role is demanded (e.g. ADMIN)
    if login_data.require_role and login_data.require_role.upper() == "ADMIN" and user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this account."
        )

    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    
    # Audit log
    log_audit_event(
        db=db,
        actor=user.username,
        action="USER_LOGIN",
        entity="user",
        entity_id=str(user.id),
        reason=f"Successful authentication via login endpoint (Role: {user.role})"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@router.post("/admin-login", response_model=schemas.Token)
def admin_login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    clean_identifier = login_data.username.strip().lower()
    clean_password = login_data.password.strip()

    # Query user by username or email (case-insensitive)
    user = db.query(models.User).filter(
        (func.lower(models.User.username) == clean_identifier) | 
        (func.lower(models.User.email) == clean_identifier)
    ).first()

    if not user or not auth.verify_password(clean_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin email/username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # STRICT REQUIREMENT 3 & 5: Check actual database role
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this account."
        )

    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}
    )

    # Log specific ADMIN_LOGIN audit trail event
    log_audit_event(
        db=db,
        actor=user.username,
        action="ADMIN_LOGIN",
        entity="user",
        entity_id=str(user.id),
        reason="Successful authentication via Admin Login portal"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@router.post("/register", response_model=schemas.UserResponse)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    clean_username = user_data.username.strip()
    clean_email = user_data.email.strip().lower()
    clean_password = user_data.password.strip()
    
    # DEFAULT PUBLIC REGISTRATION ROLE = ANALYST
    # Public users are NEVER allowed to self-register as ADMIN.
    assigned_role = "ANALYST"

    if not clean_username or not clean_email or not clean_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All fields (username, email, password) are required."
        )

    # Check case-insensitive duplicate username or email
    existing_user = db.query(models.User).filter(
        (func.lower(models.User.username) == clean_username.lower()) | 
        (func.lower(models.User.email) == clean_email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The username or email is already registered. Please sign in or use different credentials.",
        )
        
    hashed_pwd = auth.hash_password(clean_password)
    db_user = models.User(
        username=clean_username,
        email=clean_email,
        hashed_password=hashed_pwd,
        role=assigned_role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Audit log
    log_audit_event(
        db=db,
        actor=clean_username,
        action="USER_REGISTER",
        entity="user",
        entity_id=str(db_user.id),
        new_state={"username": db_user.username, "role": db_user.role},
        reason="Public registration completed with default ANALYST role"
    )
    
    return db_user

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.get("/users", response_model=list[schemas.UserResponse], dependencies=[Depends(auth.is_admin)])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@router.put("/users/{user_id}/role", response_model=schemas.UserResponse, dependencies=[Depends(auth.is_admin)])
def update_user_role(
    user_id: int,
    role_update: schemas.UserRoleUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    target_role = role_update.role.strip().upper()
    if target_role not in ["ADMIN", "ANALYST", "VIEWER"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified. Role must be ADMIN, ANALYST, or VIEWER."
        )

    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    previous_role = target_user.role
    target_user.role = target_role
    db.commit()
    db.refresh(target_user)

    log_audit_event(
        db=db,
        actor=current_user.username,
        action="USER_ROLE_CHANGE",
        entity="user",
        entity_id=str(target_user.id),
        previous_state={"role": previous_role},
        new_state={"role": target_role},
        reason=f"Role changed from {previous_role} to {target_role} by Admin {current_user.username}"
    )

    return target_user
