from celery import Celery
from app.config import settings

celery_app = Celery(
    "lawyer_complaints",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Riyadh",
    enable_utc=True,
    beat_schedule={
        "nightly-risk-monitoring": {
            "task": "app.tasks.monitoring_tasks.run_nightly_monitoring",
            "schedule": 86400.0,  # Every 24 hours
        },
    },
)
