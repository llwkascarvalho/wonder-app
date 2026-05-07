from fastapi import FastAPI

app = FastAPI(
    title="Wonder - API Gateway",
    description="Ponto de entrada único para todos os microsserviços.",
    version="1.0.0"
)

@app.get("/health", tags=["Infraestrutura"])
def health_check():
    return {"status": "ok", "service": "gateway"}