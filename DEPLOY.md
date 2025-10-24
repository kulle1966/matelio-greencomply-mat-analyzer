# 🚀 Deployment Guide

## Manuelle Deployment-Anleitung

Das Projekt wird manuell via Azure Functions Core Tools deployed. Dies ist zuverlässiger als GitHub Actions für Azure Functions v4.

### 📋 Voraussetzungen

- Azure Functions Core Tools v4 installiert
- Azure CLI installiert und eingeloggt (`az login`)
- Node.js 20 oder höher

### 🔧 API Deployment

```bash
# 1. Ins API-Verzeichnis wechseln
cd api

# 2. Dependencies installieren (falls noch nicht geschehen)
npm install

# 3. Deployen mit Remote Build
func azure functionapp publish matelio-greencomply-api --build remote
```

**Deployment dauert ca. 30-45 Sekunden.**

✅ Nach erfolgreichem Deployment:
- API verfügbar unter: https://matelio-greencomply-api.azurewebsites.net
- Health Check: https://matelio-greencomply-api.azurewebsites.net/api/health

### 🌐 Web-UI Deployment

```bash
# 1. Ins Root-Verzeichnis wechseln
cd C:\DEV\Matelio_ki_showcase\matelio-material-analyzer

# 2. Deployment Token setzen
$env:SWA_CLI_DEPLOYMENT_TOKEN='9d7f89192fc8c618bab554b184d357e503bd50d45c231741f40d59b9bf9ca18603-ee55755e-d188-40f7-b22f-2dcf665ee8b60030901001a17503'

# 3. Web-UI deployen
swa deploy ./web --deployment-token $env:SWA_CLI_DEPLOYMENT_TOKEN --env production
```

**Deployment dauert ca. 20-30 Sekunden.**

✅ Nach erfolgreichem Deployment:
- Web-UI verfügbar unter: https://purple-bay-001a17503.3.azurestaticapps.net

### 🔄 Komplettes Deployment (API + Web)

PowerShell Script für beide Deployments:

```powershell
# API deployen
cd C:\DEV\Matelio_ki_showcase\matelio-material-analyzer\api
func azure functionapp publish matelio-greencomply-api --build remote

# Web-UI deployen
cd ..
$env:SWA_CLI_DEPLOYMENT_TOKEN='9d7f89192fc8c618bab554b184d357e503bd50d45c231741f40d59b9bf9ca18603-ee55755e-d188-40f7-b22f-2dcf665ee8b60030901001a17503'
swa deploy ./web --deployment-token $env:SWA_CLI_DEPLOYMENT_TOKEN --env production
```

### 🧪 Post-Deployment Tests

```powershell
# API Health Check
Invoke-RestMethod -Uri "https://matelio-greencomply-api.azurewebsites.net/api/health"

# Material Analysis Test
$body = @{ productName = "Fahrrad" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://matelio-greencomply-api.azurewebsites.net/api/analyzeMaterial" -Method Post -Body $body -ContentType "application/json"

# Web-UI Check
Start-Process "https://purple-bay-001a17503.3.azurestaticapps.net"
```

### 📝 Notizen

- **Kein GitHub Actions**: Manuelles Deployment ist für dieses Projekt stabiler
- **Remote Build**: Azure führt `npm install` auf dem Server aus
- **Deployment Token**: Für Static Web App aus Azure Portal geholt
- **CORS**: Bereits in `host.json` und API-Code konfiguriert

### 🔐 Secrets Management

**Deployment Token erneuern (falls nötig):**

```bash
az staticwebapp secrets list --name matelio-greencomply-web --resource-group matelio-greencomply-rg --query "properties.apiKey" -o tsv
```

### ⚠️ Troubleshooting

**Problem**: "Unable to find project root"
- **Lösung**: Sicherstellen, dass Sie im korrekten Verzeichnis sind (`api/` für Function App)

**Problem**: Static Web App Deployment schlägt fehl
- **Lösung**: Token erneuern mit obigem Befehl

**Problem**: API gibt 500 Error
- **Lösung**: Logs prüfen mit `az monitor app-insights query --app matelio-greencomply-api ...`

### 📊 Monitoring

Application Insights Dashboard:
https://portal.azure.com → Resource Groups → matelio-greencomply-rg → matelio-greencomply-api → Application Insights
