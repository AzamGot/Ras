from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.routers import auth, complaints, ai, investigations, indictments, disciplinary, lawyers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (development only; use alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="منصة نظر الشكاوى ضد المحامين",
    description="نظام متكامل لاستقبال ونظر الشكاوى والبلاغات ضد المحامين في المملكة العربية السعودية",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(complaints.router, prefix="/api/v1")
app.include_router(investigations.router, prefix="/api/v1")
app.include_router(indictments.router, prefix="/api/v1")
app.include_router(disciplinary.router, prefix="/api/v1")
app.include_router(lawyers.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "lawyer-complaints-platform"}
