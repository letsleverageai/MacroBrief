# syntax=docker/dockerfile:1
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 TZ=Europe/London
RUN apt-get update && apt-get install -y --no-install-recommends tzdata ca-certificates && rm -rf /var/lib/apt/lists/* \
 && useradd -m -u 10001 app
WORKDIR /app
COPY pyproject.toml ./
COPY macrobrief ./macrobrief
RUN pip install -e ".[markets,llm,postgres,email]"
COPY config.yaml ./
RUN mkdir -p data out && chown -R app:app /app
USER app
EXPOSE 8000
HEALTHCHECK --interval=60s --timeout=5s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status==200 else 1)"
CMD ["python", "-m", "macrobrief.server"]
