module.exports = async function (context, req) {
    context.log('Material analysis request received');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: corsHeaders,
            body: ''
        };
        return;
    }

    try {
        const body = req.body;
        
        if (!body || !body.productName) {
            context.res = {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Missing productName in request body' 
                })
            };
            return;
        }

        const productName = body.productName.trim();
        const apiKey = process.env.AZURE_OPENAI_API_KEY;

        if (!apiKey) {
            throw new Error('AZURE_OPENAI_API_KEY not configured');
        }

        // Azure OpenAI API Call
        const endpoint = 'https://thinkai-aff6f5f8-aif.services.ai.azure.com/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: `Du bist Experte für technische Materialanalyse. Analysiere Produkte nach ISO 14040/14044.

Antworte NUR mit einem JSON-Array von Materialien. Jedes Material MUSS diese Felder haben:
- name (mit technischer Spezifikation, z.B. "PA66 GF30 (UL94 V-0)")
- percentage (Anteil in %, Summe = 100)
- reasoning (Verwendungszweck, Produktionsverfahren, CO₂-Werte)
- co2_per_kg (durchschnittlicher CO₂-Wert)
- co2_range (Spanne z.B. "5-7 kg/kg")
- recyclability ("hoch"/"mittel"/"niedrig")
- recyclability_percentage (0-100)
- toxicity ("keine"/"gering"/"mittel"/"hoch")
- production_method (Fertigungsverfahren)

BEISPIEL:
[
  {
    "name": "PA66 GF30 (UL94 V-0)",
    "percentage": 30.0,
    "reasoning": "Haupt-Isolierkörper; spritzgegossen, glasfaserverstärkt. CO₂ ~5–7 kg/kg",
    "co2_per_kg": 6.0,
    "co2_range": "5-7 kg/kg",
    "recyclability": "mittel",
    "recyclability_percentage": 70,
    "toxicity": "gering",
    "production_method": "Spritzguss"
  }
]`
                    },
                    {
                        role: 'user',
                        content: `Analysiere: "${productName}". Gib NUR das JSON-Array mit allen Pflichtfeldern zurück. Summe percentage = 100%.`
                    }
                ],
                max_tokens: 3000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        let aiResponse = data.choices[0].message.content.trim();
        aiResponse = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        // Parse the array directly
        let components = JSON.parse(aiResponse);
        
        // If it's wrapped in an object, extract the array
        if (!Array.isArray(components)) {
            components = components.components || components.materials || [];
        }
        
        // Transform flat structure to nested environmental_impact
        components = components.map(comp => ({
            name: comp.name,
            percentage: comp.percentage,
            reasoning: comp.reasoning,
            environmental_impact: {
                co2_per_kg: comp.co2_per_kg || 0,
                co2_range: comp.co2_range || "0-0 kg/kg",
                recyclability: comp.recyclability || "unbekannt",
                recyclability_percentage: comp.recyclability_percentage || 0,
                toxicity: comp.toxicity || "unbekannt"
            },
            production_method: comp.production_method || "Nicht spezifiziert"
        }));
        
        // Calculate overall assessment
        const totalPercentage = components.reduce((sum, comp) => sum + (comp.percentage || 0), 0);
        const avgRecyclability = components.reduce((sum, comp) => sum + (comp.environmental_impact.recyclability_percentage || 0), 0) / components.length;
        const avgCO2 = components.reduce((sum, comp) => sum + (comp.environmental_impact.co2_per_kg * comp.percentage / 100), 0);
        
        const allMaterials = components.map(c => c.name);
        
        // Determine sustainability rating
        let sustainabilityRating = 'gut';
        if (avgCO2 > 5 || avgRecyclability < 50) sustainabilityRating = 'mittel';
        if (avgCO2 > 10 || avgRecyclability < 30) sustainabilityRating = 'schlecht';
        
        const keyConcerns = [];
        if (avgCO2 > 5) keyConcerns.push('Hoher CO₂-Fußabdruck');
        if (avgRecyclability < 60) keyConcerns.push('Eingeschränkte Recyclingfähigkeit');
        const highToxicity = components.filter(c => c.environmental_impact.toxicity === 'hoch' || c.environmental_impact.toxicity === 'mittel');
        if (highToxicity.length > 0) keyConcerns.push(`Toxische Materialien: ${highToxicity.map(c => c.name).join(', ')}`);

        context.res = {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                productName: productName,
                analysis: {
                    components: components,
                    summary: {
                        totalComponents: components.length,
                        totalPercentage: Math.round(totalPercentage * 10) / 10,
                        uniqueMaterials: allMaterials.length,
                        materials: allMaterials
                    },
                    environmental: {
                        totalCO2Estimate: Math.round(avgCO2 * 10) / 10,
                        recyclabilityScore: Math.round(avgRecyclability),
                        sustainabilityRating: sustainabilityRating,
                        keyConcerns: keyConcerns
                    }
                },
                metadata: {
                    analysisTimestamp: new Date().toISOString(),
                    version: '3.0.0'
                }
            })
        };

    } catch (error) {
        context.log.error('Error:', error);
        context.res = {
            status: 500,
            headers: corsHeaders,
            body: JSON.stringify({ 
                success: false, 
                error: error.message 
            })
        };
    }
};
