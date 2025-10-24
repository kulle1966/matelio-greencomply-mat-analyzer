// API Configuration
const API_URL = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
    ? 'http://localhost:7071/api' 
    : 'https://matelio-greencomply-api.azurewebsites.net/api'; // Azure Function App URL

// Elements
const productInput = document.getElementById('productName');
const analyzeBtn = document.getElementById('analyzeBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const results = document.getElementById('results');

// Event Listeners
productInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        analyzeProduct();
    }
});

function setExample(productName) {
    productInput.value = productName;
    productInput.focus();
}

async function analyzeProduct() {
    const productName = productInput.value.trim();
    
    if (!productName) {
        showError('Bitte gib einen Produktnamen ein.');
        return;
    }

    // UI State
    hideError();
    hideResults();
    showLoading();
    analyzeBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/analyzeMaterial`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productName })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API Error: ${response.status}`);
        }

        const data = await response.json();

        // Check if response has error field
        if (data.error) {
            throw new Error(data.error);
        }

        // Display results (new API format doesn't have 'success' field)
        displayResults(data);

    } catch (err) {
        console.error('Error:', err);
        showError(`Fehler bei der Analyse: ${err.message}`);
    } finally {
        hideLoading();
        analyzeBtn.disabled = false;
    }
}

function displayResults(data) {
    // New API v4 structure: { productName, components[], summary, environmental_assessment, metadata }
    const { productName, components, summary, environmental_assessment: env } = data;
    
    // Product Title
    document.getElementById('productTitle').textContent = `📦 ${productName}`;

    // Summary with Environmental Data
    document.getElementById('summaryContent').innerHTML = `
        <div class="summary-grid">
            <div class="summary-item">
                <div class="label">Komponenten</div>
                <div class="value">${summary.total_materials}</div>
            </div>
            <div class="summary-item">
                <div class="label">Gesamt CO₂</div>
                <div class="value">${env.overall_co2_footprint_kg.toFixed(2)} kg</div>
            </div>
            <div class="summary-item">
                <div class="label">Analysiert</div>
                <div class="value">${new Date(summary.analysis_timestamp).toLocaleTimeString('de-DE')}</div>
            </div>
        </div>
        <div class="environmental-summary" style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #0369a1;">🌍 Umweltbewertung</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="label">Ø CO₂ pro kg</div>
                    <div class="value">${env.average_co2_per_kg.toFixed(2)} kg</div>
                </div>
                <div class="summary-item">
                    <div class="label">Recyclingfähigkeit</div>
                    <div class="value">${env.average_recyclability.toFixed(1)}%</div>
                </div>
                <div class="summary-item">
                    <div class="label">Nachhaltigkeit</div>
                    <div class="value">${getSustainabilityBadge(env.sustainability_rating)}</div>
                </div>
            </div>
            ${env.key_concerns && env.key_concerns.length > 0 ? `
                <div style="margin-top: 10px;">
                    <strong>⚠️ Bedenken:</strong> ${env.key_concerns.join(', ')}
                </div>
            ` : ''}
        </div>
        <div class="materials-list" style="margin-top: 15px;">
            ${components.map(c => `<span class="material-tag">${c.name}</span>`).join('')}
        </div>
    `;

    // Components with detailed environmental impact
    document.getElementById('componentsContent').innerHTML = components
        .map(comp => {
            const impact = comp.environmental_impact;
            return `
            <div class="component-card">
                <h4>${comp.name} <span style="color: #666; font-weight: normal;">(${comp.percentage}%)</span></h4>
                ${comp.reasoning ? `<p style="color: #666; margin-bottom: 10px; font-size: 0.9em;">${comp.reasoning}</p>` : ''}
                
                <div class="component-details">
                    <div class="component-detail">
                        <strong>CO₂:</strong> ${impact.co2_footprint.absolute_kg.toFixed(3)} kg (${impact.co2_footprint.assessment})
                    </div>
                    <div class="component-detail">
                        <strong>CO₂/kg:</strong> ${impact.co2_footprint.per_kg.toFixed(2)} kg
                    </div>
                    <div class="component-detail">
                        <strong>Recycling:</strong> ${getRecyclabilityBadge(impact.recyclability.rating)} (${impact.recyclability.percentage}%)
                    </div>
                    <div class="component-detail">
                        <strong>Toxizität:</strong> ${getToxicityBadge(impact.toxicity.level)}
                    </div>
                </div>
                
                ${impact.production_method ? `
                    <div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 5px; font-size: 0.85em;">
                        <strong>🏭 Produktion:</strong> ${impact.production_method}
                    </div>
                ` : ''}
            </div>
        `}).join('');

    showResults();
}

function getSustainabilityBadge(rating) {
    const badges = {
        'gut': '🟢 Gut',
        'mittel': '🟡 Mittel',
        'verbesserungswürdig': '🔴 Verbesserungswürdig',
        'schlecht': '🔴 Schlecht'
    };
    return badges[rating] || '⚪ Unbekannt';
}

function getRecyclabilityBadge(level) {
    const badges = {
        'gut': '♻️ Gut',
        'hoch': '♻️ Gut',
        'mittel': '🔄 Mittel',
        'niedrig': '⚠️ Niedrig',
        'schlecht': '⚠️ Schlecht'
    };
    return badges[level] || '❓';
}

function getToxicityBadge(level) {
    const badges = {
        'niedrig': '✅ Niedrig',
        'keine': '✅ Keine',
        'gering': '🟢 Gering',
        'mittel': '🟡 Mittel',
        'hoch': '🔴 Hoch'
    };
    return badges[level] || '❓';
}

function showLoading() {
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

function showError(message) {
    error.textContent = message;
    error.classList.remove('hidden');
}

function hideError() {
    error.classList.add('hidden');
}

function showResults() {
    results.classList.remove('hidden');
}

function hideResults() {
    results.classList.add('hidden');
}

// Test API connectivity on load
window.addEventListener('load', async () => {
    try {
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
            console.log('✅ API is reachable');
        }
    } catch (err) {
        console.warn('⚠️ API might not be available:', err.message);
    }
});
