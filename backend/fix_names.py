"""Run once to fix garbled Arabic names: docker exec ras-backend-1 python /app/fix_names.py"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import os

engine = create_async_engine(os.environ["DATABASE_URL"])
Session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

NAMES = [
    ("admin@ras.sa",        "مدير النظام"),
    ("investigator@ras.sa", "محقق المخالفات"),
    ("prosecutor@ras.sa",   "المدعي العام"),
    ("committee1@ras.sa",   "عضو لجنة التأديب"),
    ("chair@ras.sa",        "رئيس لجنة التأديب"),
    ("executor@ras.sa",     "منفذ القرارات"),
    ("complainant@ras.sa",  "مقدم الشكوى"),
]

async def main():
    async with Session() as db:
        for email, name in NAMES:
            await db.execute(
                text("UPDATE users SET full_name_ar = :n WHERE email = :e"),
                {"n": name, "e": email},
            )
        await db.commit()
        rows = await db.execute(text("SELECT email, role, full_name_ar FROM users ORDER BY created_at"))
        print(f"{'Email':<30} {'Role':<20} {'Name'}")
        print("-" * 70)
        for row in rows.fetchall():
            print(f"{row[0]:<30} {row[1]:<20} {row[2]}")

asyncio.run(main())
