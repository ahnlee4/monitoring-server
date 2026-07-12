FROM python:3.12-slim AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY frontend ./frontend

FROM base AS test

COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY tests ./tests

CMD ["python", "-m", "pytest", "-q", "tests"]

FROM base AS runtime

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
