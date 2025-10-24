// API Configuration
const API_URL = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
    ? 'http://localhost:7071/api' 
    : '/api'; // Für Azure Static Web App mit API

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
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            displayResults(data);
        } else {
            throw new Error(data.error || 'Analyse fehlgeschlagen');
        }

    } catch (err) {
        console.error('Error:', err);
        showError(`Fehler bei der Analyse: ${err.message}`);
    } finally {
        hideLoading();
        analyzeBtn.disabled = false;
    }
}

function displayResults(data) {
    const { productName, analysis, metadata } = data;
    
    // Product Title
    document.getElementById('productTitle').textContent = `📦 ${productName}`;

    // Summary with Environmental Data
    const { totalComponents, totalPercentage, uniqueMaterials, materials } = analysis.summary;
    const env = analysis.environmental || {};
    
    document.getElementById('summaryContent').innerHTML = `
        <div class="summary-grid">
            <div class="summary-item">
                <div class="label">Komponenten</div>
                <div class="value">${totalComponents}</div>
            </div>
            <div class="summary-item">
                <div class="label">Materialabdeckung</div>
                <div class="value">${totalPercentage}%</div>
            </div>
            <div class="summary-item">
                <div class="label">Einzigartige Materialien</div>
                <div class="value">${uniqueMaterials}</div>
            </div>
        </div>
        <div class="environmental-summary" style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #0369a1;">🌍 Umweltbewertung</h4>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="label">Ø CO₂</div>
                    <div class="value">${env.totalCO2Estimate || 0} kg/kg</div>
                </div>
                <div class="summary-item">
                    <div class="label">Recyclingfähigkeit</div>
                    <div class="value">${env.recyclabilityScore || 0}%</div>
                </div>
                <div class="summary-item">
                    <div class="label">Nachhaltigkeit</div>
                    <div class="value">${getSustainabilityBadge(env.sustainabilityRating)}</div>
                </div>
            </div>
            ${env.keyConcerns && env.keyConcerns.length > 0 ? `
                <div style="margin-top: 10px;">
                    <strong>⚠️ Bedenken:</strong> ${env.keyConcerns.join(', ')}
                </div>
            ` : ''}
        </div>
        <div class="materials-list" style="margin-top: 15px;">
            ${materials.map(m => `<span class="material-tag">${m}</span>`).join('')}
        </div>
    `;

    // Components with detailed environmental impact
    document.getElementById('componentsContent').innerHTML = analysis.components
        .map(comp => {
            const impact = comp.environmental_impact || {};
            return `
            <div class="component-card">
                <h4>${comp.name}</h4>
                ${comp.reasoning ? `<p style="color: #666; margin-bottom: 10px; font-size: 0.9em;">${comp.reasoning}</p>` : ''}
                
                <div class="component-details">
                    <div class="component-detail">
                        <strong>Anteil:</strong> ${comp.percentage}%
                    </div>
                    <div class="component-detail">
                        <strong>CO₂:</strong> ${impact.co2_range || 'n/a'}
                    </div>
                    <div class="component-detail">
                        <strong>Recycling:</strong> ${getRecyclabilityBadge(impact.recyclability)} ${impact.recyclability_percentage ? `(${impact.recyclability_percentage}%)` : ''}
                    </div>
                    <div class="component-detail">
                        <strong>Toxizität:</strong> ${getToxicityBadge(impact.toxicity)}
                    </div>
                </div>
                
                ${comp.production_method ? `
                    <div style="margin-top: 10px; padding: 8px; background: #fef3c7; border-radius: 5px; font-size: 0.85em;">
                        <strong>🏭 Produktion:</strong> ${comp.production_method}
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
        'schlecht': '🔴 Schlecht'
    };
    return badges[rating] || '⚪ Unbekannt';
}

function getRecyclabilityBadge(level) {
    const badges = {
        'hoch': '♻️ Hoch',
        'mittel': '🔄 Mittel',
        'niedrig': '⚠️ Niedrig'
    };
    return badges[level] || '❓';
}

function getToxicityBadge(level) {
    const badges = {
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
