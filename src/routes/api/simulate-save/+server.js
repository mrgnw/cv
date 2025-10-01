import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
    return json({
        message: 'Simulate-save endpoint is working',
        method: 'GET'
    });
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const body = await request.json();
        
        console.log('Simulate-save endpoint received:', body);
        
        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Return a successful response
        return json({
            success: true,
            message: 'Simulated save completed successfully',
            receivedData: body,
            simulatedFilename: 'test-cv.json',
            simulatedSlug: 'test-cv',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Simulate-save error:', error);
        
        return json({
            success: false,
            error: 'Failed to process simulated save',
            details: error.message
        }, { status: 500 });
    }
}