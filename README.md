# Matelio Material Analyzer

🔬 KI-gestützte Materialanalyse für Produkte

## Projektstruktur

```
matelio-material-analyzer/
├── api/                    # Azure Functions Backend
│   ├── analyzeMaterial/
│   ├── health/
│   └── options/
├── web/                    # Static Web App Frontend
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .github/workflows/      # CI/CD Pipeline
└── README.md
```

## Features

- ✅ REST API für Materialanalyse
- ✅ Web-UI zum Testen
- ✅ Azure OpenAI Integration
- ✅ CORS-Support
- ✅ Automatisches GitHub-Deployment

## Setup

### Voraussetzungen
- Azure Account
- Azure OpenAI API Key
- Node.js 22+

### Lokal starten

**API:**
```bash
cd api
npm install
npm start
```

**Web UI:**
```bash
cd web
# Öffne index.html im Browser oder nutze einen lokalen Server
python -m http.server 8000
```

## Deployment

Push zu GitHub → Automatisches Deployment via GitHub Actions

### Manuelle Deployment-Schritte
1. Resource Group erstellen
2. Function App erstellen
3. Static Web App erstellen
4. GitHub Actions konfigurieren

## API Endpoints

- `POST /api/analyze-material` - Materialanalyse durchführen
- `GET /api/health` - Health Check
- `OPTIONS /api/*` - CORS Preflight

### Beispiel-Request

```bash
curl -X POST https://your-api.azurewebsites.net/api/analyze-material \
  -H "Content-Type: application/json" \
  -d '{"productName": "Fahrrad"}'
```

## Lizenz

MIT License
