const { app } = require('@azure/functions');

// Health Check Endpoint
app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'health',
    handler: async (request, context) => {
        context.log('Health check requested');

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            jsonBody: {
                status: 'healthy',
                service: 'Matelio GreenComply Material Analyzer API',
                version: '4.0.0',
                timestamp: new Date().toISOString()
            }
        };
    }
});

// CORS Preflight Handler
app.http('options', {
    methods: ['OPTIONS'],
    authLevel: 'anonymous',
    route: '{*any}',
    handler: async (request, context) => {
        context.log('CORS preflight request');

        return {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        };
    }
});

// Material Analysis Endpoint
app.http('analyzeMaterial', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'analyzeMaterial',
    handler: async (request, context) => {
        context.log('Material analysis requested');

        // Handle OPTIONS (CORS Preflight)
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400'
                }
            };
        }

        try {
            // Parse request body
            const body = await request.json();
            const productName = body.productName;

            if (!productName || productName.trim() === '') {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    jsonBody: {
                        error: 'Product name is required',
                        message: 'Please provide a valid product name'
                    }
                };
            }

            context.log(`Analyzing product: ${productName}`);

            // Azure OpenAI Configuration
            const apiKey = process.env.AZURE_OPENAI_API_KEY;
            const endpoint = 'https://thinkai-aff6f5f8-aif.services.ai.azure.com/openai/deployments/gpt-4.1-mini/chat/completions?api-version=2024-08-01-preview';

            if (!apiKey) {
                throw new Error('AZURE_OPENAI_API_KEY not configured');
            }

            // Prompt for GPT-4
            const systemPrompt = `Du bist ein Experte für Materialanalyse und Produktzusammensetzung mit Fokus auf Umweltbewertung und Nachhaltigkeit nach ISO 14040/14044.

Analysiere das angegebene Produkt und gib eine detaillierte Aufschlüsselung seiner Materialien in folgendem JSON-Array-Format zurück:

[
  {
    "name": "Materialname",
    "percentage": 45.5,
    "reasoning": "Erklärung warum dieses Material verwendet wird",
    "co2_per_kg": 2.3,
    "co2_range": "niedrig|mittel|hoch",
    "recyclability": "gut|mittel|schlecht",
    "recyclability_percentage": 85,
    "toxicity": "niedrig|mittel|hoch",
    "production_method": "Herstellungsverfahren"
  }
]

WICHTIG:
- Alle Felder müssen ausgefüllt sein
- percentage muss eine Zahl sein
- co2_per_kg in kg CO2 pro kg Material
- Antworte NUR mit dem JSON-Array, kein zusätzlicher Text`;

            const userPrompt = `Analysiere folgendes Produkt: ${productName}`;

            // Call Azure OpenAI
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 2000
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                context.error(`Azure OpenAI error: ${response.status} - ${errorText}`);
                throw new Error(`Azure OpenAI API error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;

            context.log('Raw GPT response:', content);

            // Parse JSON response
            let materials;
            try {
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    materials = JSON.parse(jsonMatch[0]);
                } else {
                    materials = JSON.parse(content);
                }
            } catch (parseError) {
                context.error('JSON parse error:', parseError);
                throw new Error('Failed to parse AI response as JSON');
            }

            // Transform flat structure to nested structure with environmental_impact
            const transformedMaterials = materials.map(material => ({
                name: material.name,
                percentage: material.percentage,
                reasoning: material.reasoning,
                environmental_impact: {
                    co2_footprint: {
                        absolute_kg: (material.percentage / 100) * material.co2_per_kg,
                        per_kg: material.co2_per_kg,
                        percentage_of_total: 0, // Will be calculated below
                        assessment: material.co2_range
                    },
                    recyclability: {
                        rating: material.recyclability,
                        percentage: material.recyclability_percentage,
                        infrastructure_available: material.recyclability === 'gut'
                    },
                    toxicity: {
                        level: material.toxicity,
                        health_concerns: material.toxicity !== 'niedrig' ? ['Potenzielle Gesundheitsrisiken'] : []
                    },
                    production_method: material.production_method
                }
            }));

            // Calculate total CO2
            const totalCO2 = transformedMaterials.reduce((sum, m) => 
                sum + m.environmental_impact.co2_footprint.absolute_kg, 0
            );

            // Update CO2 percentages
            transformedMaterials.forEach(material => {
                material.environmental_impact.co2_footprint.percentage_of_total = 
                    (material.environmental_impact.co2_footprint.absolute_kg / totalCO2) * 100;
            });

            // Calculate overall assessment
            const avgCO2PerKg = transformedMaterials.reduce((sum, m) => 
                sum + (m.percentage / 100) * m.environmental_impact.co2_footprint.per_kg, 0
            );

            const avgRecyclability = transformedMaterials.reduce((sum, m) => 
                sum + (m.percentage / 100) * m.environmental_impact.recyclability.percentage, 0
            );

            const highToxicityMaterials = transformedMaterials.filter(m => 
                m.environmental_impact.toxicity.level === 'hoch'
            );

            const sustainabilityRating = avgCO2PerKg < 3 && avgRecyclability > 70 && highToxicityMaterials.length === 0
                ? 'gut'
                : avgCO2PerKg < 6 && avgRecyclability > 50
                ? 'mittel'
                : 'verbesserungswürdig';

            const concerns = [];
            if (avgCO2PerKg > 5) concerns.push('Hoher CO2-Fußabdruck');
            if (avgRecyclability < 50) concerns.push('Niedrige Recyclingfähigkeit');
            if (highToxicityMaterials.length > 0) concerns.push('Toxische Materialien enthalten');

            // Build response
            const result = {
                productName: productName,
                components: transformedMaterials,
                summary: {
                    total_materials: transformedMaterials.length,
                    analysis_timestamp: new Date().toISOString(),
                    confidence_level: 'high'
                },
                environmental_assessment: {
                    overall_co2_footprint_kg: totalCO2,
                    average_co2_per_kg: avgCO2PerKg,
                    average_recyclability: avgRecyclability,
                    sustainability_rating: sustainabilityRating,
                    key_concerns: concerns
                },
                metadata: {
                    api_version: '4.0.0',
                    standards_compliance: ['ISO 14040', 'ISO 14044'],
                    analysis_method: 'AI-powered lifecycle assessment'
                }
            };

            context.log('Analysis completed successfully');

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: result
            };

        } catch (error) {
            context.error('Error in analyzeMaterial:', error);

            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                jsonBody: {
                    error: 'Internal server error',
                    message: error.message,
                    timestamp: new Date().toISOString()
                }
            };
        }
    }
});
