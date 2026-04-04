FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml README.md alembic.ini ./
COPY alembic ./alembic
COPY app ./app

RUN pip install --upgrade pip && \
    pip install -e .[dev]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
