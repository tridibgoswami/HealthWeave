FROM python:3.11-slim

WORKDIR /app

# System deps: libmagic1 for python-magic (file type detection), gcc for C extensions
RUN apt-get update && apt-get install -y \
    libmagic1 \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# PORT is injected by DigitalOcean App Platform
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
