from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
DATABASE_URL = "sqlite:///./planner.db"
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database Setup
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

# Pydantic Models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str
    user_id: str
    email: str

class SignupResponse(BaseModel):
    message: str
    user_id: str
    email: str

# FastAPI App
app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper Functions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return check_password_hash(hashed_password, plain_password)

def get_password_hash(password: str) -> str:
    return generate_password_hash(password)

# Routes
@app.get("/")
def read_root():
    return {"message": "Market Planner API is running"}

@app.post("/api/signup", response_model=SignupResponse)
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Create a new user account"""
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate password strength
        if len(request.password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters"
            )
        
        # Create new user with hashed password
        user_id = f"user_{int(datetime.utcnow().timestamp())}"
        hashed_password = get_password_hash(request.password)
        
        new_user = User(
            id=user_id,
            email=request.email,
            password_hash=hashed_password
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return SignupResponse(
            message="User created successfully",
            user_id=new_user.id,
            email=new_user.email
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        print(f"Signup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Signup failed"
        )

@app.post("/api/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token"""
    try:
        # Find user by email
        user = db.query(User).filter(User.email == request.email).first()
        
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            data={"sub": user.id, "email": user.email},
            expires_delta=access_token_expires
        )
        
        return TokenResponse(
            token=token,
            user_id=user.id,
            email=user.email
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@app.post("/api/verify-token")
def verify_token(token: dict, db: Session = Depends(get_db)):
    """Verify JWT token"""
    try:
        payload = jwt.decode(token.get("token"), SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return {"valid": True, "user_id": user_id}
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)



# Backend uses:

# FastAPI → API server
# SQLAlchemy → ORM (database mapping)
# SQLite → Stores data in planner.db
# Werkzeug → Password hashing
# JWT → Authentication token
# ✅ 2. How Database Works (planner.db)
# DATABASE_URL = "sqlite:///./planner.db"

# This line means:

# SQLite database

# Store file as planner.db

# In current backend folder

# SQLAlchemy setup
# engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
# SessionLocal = sessionmaker(...)
# Base = declarative_base()


# This creates:

# engine → database connection

# SessionLocal → used for reading/writing

# Base → used to define tables

# ✅ 3. User Table Creation
# class User(Base):
#     __tablename__ = "users"
    
#     id = Column(String, primary_key=True)
#     email = Column(String, unique=True, index=True)
#     password_hash = Column(String)
#     created_at = Column(DateTime, default=datetime.utcnow)


# This becomes a SQL table like:

# id	email	password_hash	created_at
# user_12334	test@mail	pbkdf2:sha256:600000$...	timestamp
# Then:
# Base.metadata.create_all(bind=engine)


# This creates the database file planner.db and creates the users table inside it.

# ✅ 4. Password Hashing (Encryption)
# Why we hash?

# Storing plain passwords is dangerous.
# Instead, we store a hashed (unreadable) version.

# You use:

# generate_password_hash(password)


# This produces something like:

# pbkdf2:sha256:100000$afsfs23$0d9a2349879...

# This is NOT reversible.

# Meaning backend cannot get original password even if it wants to.

# To check password during login:

# check_password_hash(hashed_password, plain_password)


# This matches user input against the stored hash.

# ✅ 5. How Signup Works
# API: /api/signup

# When user signs up:

# Check if email already exists

# Check password length

# Create unique user_id:

# user_id = f"user_{int(datetime.utcnow().timestamp())}"


# Hash the password

# hashed_password = get_password_hash(request.password)


# Store in database

# db.add(new_user)
# db.commit()

# ✔ After signup, database planner.db will contain:
# id: user_1732802949
# email: example@gmail.com
# password_hash: pbkdf2:sha256:....

# ✅ 6. How Login Works
# API: /api/login

# Steps:

# Look up user by email

# Compare password with hash:

# verify_password(request.password, user.password_hash)


# If match → generate JWT token:

# token = create_access_token({...})


# Token contains:

# user.id

# user.email

# exp expiry time

# ✅ 7. How JWT Token is Created
# jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


# Token example:

# eyJhbGciOiJIUzI1NiIsInR5cCI...


# This JWT contains encoded:

# {
#   "sub": "user_1732802949",
#   "email": "example@gmail.com",
#   "exp": 1732804749
# }


# JWT is stored on frontend (usually localStorage).

# ✅ 8. Token Verification

# API: /api/verify-token

# Steps:

# Decode token:

# jwt.decode(token, SECRET_KEY)


# If valid → return user_id

# If expired → return error

# If invalid → return error

# ⚙ How the entire flow works:
# Step 1 → User Signup

# Frontend → /api/signup POST
# Backend stores details in planner.db

# Step 2 → User Login

# Frontend → /api/login POST
# Backend sends back JWT token

# Step 3 → Use JWT for protected APIs

# Frontend sends:

# Authorization: Bearer <token>


# Backend verifies it → gives data

# 🔐 Summary (Simple Explanation)
# ✔ Passwords are hashed

# Not reversible, stored as cryptographic hash

# ✔ Database is SQLite

# Stored in file planner.db
# Users table contains id, email, password_hash

# ✔ JWT used for auth

# Used to keep user logged in for 30 minutes

# ✔ FastAPI serves APIs

# Frontend uses these APIs for signup/login
