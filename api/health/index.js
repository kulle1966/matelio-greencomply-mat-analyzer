module.exports = async function (context, req) {
    context.log('Health check requested');
    
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            status: 'healthy',
            service: 'Matelio GreenComply Material Analyzer API',
            version: '3.0.0',
            timestamp: new Date().toISOString()
        })
    };
};
