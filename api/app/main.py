from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title='Sumit & Puja Wedding API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['https://wedding.skdev.one'],
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PATCH', 'OPTIONS'],
    allow_headers=['Content-Type'],
)


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}
