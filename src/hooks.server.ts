import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.searchParams.has('dl')) {
    // If this is a PDF file request, force download
    if (event.url.pathname.endsWith('.pdf')) {
      const response = await resolve(event);
      const filename = event.url.pathname.split('/').pop();
      
      return new Response(response.body, {
        ...response,
        headers: {
          ...response.headers,
          'Content-Disposition': `attachment; filename="${filename}"`,
        }
      });
    }
    
    // Otherwise, redirect to the PDF with the download header
    const slug = event.params.slug || 'main';
    const pdfName = slug === 'main' ? 
      'morgan-williams.pdf' : 
      `morgan-williams.${slug}.pdf`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': `/${pdfName}?dl`,
      }
    });
  }

  return resolve(event);
};