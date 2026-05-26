"""
مهام رصد المخالفات المجدولة (Celery Beat)
تعمل ليلاً لتحديث درجات المخاطر ورصد الأنماط
"""
from app.tasks.worker import celery_app


@celery_app.task(name="app.tasks.monitoring_tasks.run_nightly_monitoring")
def run_nightly_monitoring():
    """
    يعمل ليلاً لتحديث درجات مخاطر جميع المحامين النشطين
    ورصد الأنماط المثيرة للقلق.
    """
    import asyncio
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy import select
    from app.config import settings
    from app.models.lawyer import Lawyer
    from app.models.complaint import Complaint
    from app.ai.analyzers.risk_scorer import compute_lawyer_risk_score

    async def _run():
        engine = create_async_engine(settings.DATABASE_URL)
        session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with session_factory() as session:
            result = await session.execute(
                select(Lawyer).where(Lawyer.is_struck_off == False)
            )
            lawyers = result.scalars().all()

            updated_count = 0
            high_risk_count = 0

            for lawyer in lawyers:
                comp_result = await session.execute(
                    select(Complaint).where(Complaint.respondent_lawyer_id == lawyer.id)
                )
                complaints = comp_result.scalars().all()

                if not complaints:
                    continue

                complaint_history = [
                    {
                        "date": str(c.filing_date.date()) if c.filing_date else None,
                        "violation_type": c.violation_type,
                        "severity": c.severity,
                        "outcome": c.status,
                    }
                    for c in complaints
                ]

                try:
                    risk_data = await compute_lawyer_risk_score(
                        {"license_number": lawyer.license_number, "status": "active"},
                        complaint_history,
                        [],
                    )
                    lawyer.risk_score = risk_data.get("risk_score", lawyer.risk_score)
                    lawyer.recidivism_flag = risk_data.get("risk_level") in ["high", "critical"]

                    if float(lawyer.risk_score) > 70:
                        high_risk_count += 1

                    updated_count += 1
                except Exception:
                    pass

            await session.commit()
            return {"updated": updated_count, "high_risk": high_risk_count}

    return asyncio.run(_run())
