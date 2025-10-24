# 🚀 Deployment Guide - Matelio GreenComply Material Analyzer

## Schritt 1: GitHub Repository erstellen

```bash
cd C:\DEV\Matelio_ki_showcase\matelio-material-analyzer

# Git initialisieren (falls noch nicht geschehen)
git init
git add .
git commit -m "Initial commit: Matelio GreenComply Material Analyzer v3.0.0"

# Remote hinzufügen
git remote add origin https://github.com/DEIN-USERNAME/matelio-greencomply.git
git branch -M main
git push -u origin main
```

## Schritt 2: Azure Resources erstellen

### Azure CLI Login
```bash
az login
az account set --subscription "DEINE-SUBSCRIPTION-ID"
```

### Resource Group erstellen
```bash
az group create \
  --name matelio-greencomply-rg \
  --location westeurope
```

### Function App erstellen
```bash
# Storage Account
az storage account create \
  --name mateliostorage123 \
  --resource-group matelio-greencomply-rg \
  --location westeurope \
  --sku Standard_LRS

# Function App
az functionapp create \
  --resource-group matelio-greencomply-rg \
  --consumption-plan-location westeurope \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name matelio-greencomply-api \
  --storage-account mateliostorage123 \
  --os-type Linux
```

### Static Web App erstellen
```bash
az staticwebapp create \
  --name matelio-greencomply-web \
  --resource-group matelio-greencomply-rg \
  --location westeurope \
  --source https://github.com/DEIN-USERNAME/matelio-greencomply \
  --branch main \
  --app-location "/web" \
  --login-with-github
```

## Schritt 3: Secrets konfigurieren

### Azure Function App Settings
```bash
az functionapp config appsettings set \
  --name matelio-greencomply-api \
  --resource-group matelio-greencomply-rg \
  --settings \
    "AZURE_OPENAI_API_KEY=DEIN-API-KEY-HIER" \
    "FUNCTIONS_WORKER_RUNTIME=node"
```

### CORS aktivieren
```bash
az functionapp cors add \
  --name matelio-greencomply-api \
  --resource-group matelio-greencomply-rg \
  --allowed-origins "*"
```

## Schritt 4: GitHub Secrets hinzufügen

### Function App Publish Profile holen
```bash
az functionapp deployment list-publishing-profiles \
  --name matelio-greencomply-api \
  --resource-group matelio-greencomply-rg \
  --xml
```

Kopiere die Ausgabe und füge sie als **GitHub Secret** hinzu:
- Gehe zu: GitHub Repo → Settings → Secrets and variables → Actions
- Name: `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
- Value: [XML-Ausgabe von oben]

### Static Web App Token holen
```bash
az staticwebapp secrets list \
  --name matelio-greencomply-web \
  --resource-group matelio-greencomply-rg \
  --query "properties.apiKey" -o tsv
```

Als GitHub Secret hinzufügen:
- Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
- Value: [Token von oben]

## Schritt 5: Deployen

### Automatisch via GitHub Actions
```bash
git push origin main
```
→ GitHub Actions startet automatisch und deployed API + Web UI

### Manuell deployen (Alternative)

**API:**
```bash
cd api
func azure functionapp publish matelio-greencomply-api
```

**Web:**
```bash
az staticwebapp deploy \
  --name matelio-greencomply-web \
  --resource-group matelio-greencomply-rg \
  --source ./web
```

## Schritt 6: URLs abrufen

### Function App URL
```bash
echo "https://matelio-greencomply-api.azurewebsites.net"
```

### Static Web App URL
```bash
az staticwebapp show \
  --name matelio-greencomply-web \
  --resource-group matelio-greencomply-rg \
  --query "defaultHostname" -o tsv
```

## Schritt 7: Testen

```bash
# Health Check
curl https://matelio-greencomply-api.azurewebsites.net/api/health

# Material Analyse
curl -X POST https://matelio-greencomply-api.azurewebsites.net/api/analyzeMaterial \
  -H "Content-Type: application/json" \
  -d '{"productName": "Hauptschalter 32A 13kW"}'
```

## 🔧 Troubleshooting

### Function App startet nicht
```bash
# Logs anschauen
az functionapp log tail \
  --name matelio-greencomply-api \
  --resource-group matelio-greencomply-rg

# App neu starten
az functionapp restart \
  --name matelio-greencomply-api \
  --resource-group matelio-greencomply-rg
```

### CORS Fehler
```bash
# CORS Einstellungen prüfen
az functionapp cors show \
  --name matelio-greencomply-api \
  --resource-group matelio-greencomply-rg
```

### API Key fehlt
```bash
# Settings prüfen
az functionapp config appsettings list \
  --name matelio-greencomply-api \
  --resource-group matelio-greencomply-rg
```

## 📊 Monitoring

### Application Insights aktivieren
```bash
az monitor app-insights component create \
  --app matelio-greencomply-insights \
  --location westeurope \
  --resource-group matelio-greencomply-rg

# Instrumentation Key holen und als App Setting setzen
az functionapp config appsettings set \
  --name matelio-greencomply-api \
  --resource-group matelio-greencomply-rg \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$(az monitor app-insights component show --app matelio-greencomply-insights -g matelio-greencomply-rg --query instrumentationKey -o tsv)"
```

## 🗑️ Aufräumen (Resources löschen)

```bash
az group delete \
  --name matelio-greencomply-rg \
  --yes --no-wait
```

## ✅ Checkliste

- [ ] GitHub Repository erstellt
- [ ] Azure Resources deployed
- [ ] Secrets konfiguriert (API Key, Publish Profile)
- [ ] GitHub Actions Workflow läuft
- [ ] CORS aktiviert
- [ ] Health Check erfolgreich
- [ ] Material-Analyse funktioniert
- [ ] Web UI erreichbar
- [ ] Monitoring aktiviert (optional)

## 🎉 Fertig!

Deine API ist jetzt live unter:
- **API**: `https://matelio-greencomply-api.azurewebsites.net/api`
- **Web**: `https://[deine-static-web-app].azurestaticapps.net`
