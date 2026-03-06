/**
 * PDF Generation using Cloudflare Browser Rendering API
 * Use this in Cloudflare Workers instead of pdf.js (which uses Playwright)
 *
 * Environment variables required in wrangler.toml:
 * - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
 * - CLOUDFLARE_API_TOKEN: API token with Browser Rendering permission
 */

/**
 * Convert mm to pixels at 96 DPI (standard screen DPI)
 * @param {number} mm - Millimeters
 * @returns {number} Pixels
 */
function mmToPixels(mm) {
  return mm * 3.78; // 1 inch = 25.4mm, 1 inch = 96 pixels at 96 DPI
}

/**
 * Generate PDF from HTML using Cloudflare Browser Rendering API
 * Worker-safe: No binary dependencies, pure API call
 *
 * @param {string} html - HTML content to convert to PDF
 * @param {Object} options - Configuration options
 * @param {string} options.accountId - Cloudflare Account ID (from env.CLOUDFLARE_ACCOUNT_ID)
 * @param {string} options.apiToken - Cloudflare API Token (from env.CLOUDFLARE_API_TOKEN)
 * @param {string} options.format - PDF format: 'a4' (default), 'letter', 'legal'
 * @param {Object} options.margin - Margins in mm: { top, bottom, left, right } (default: 6/8mm)
 * @param {boolean} options.printBackground - Include background graphics (default: true)
 * @returns {Promise<Object>} { success, buffer?, error? }
 */
export async function generatePdfFromHtml(html, options = {}) {
  const {
    accountId,
    apiToken,
    format = "a4",
    margin = {
      top: 6,
      bottom: 6,
      left: 8,
      right: 8,
    },
    printBackground = true,
  } = options;

  // Validate required credentials
  if (!accountId || !apiToken) {
    return {
      success: false,
      error:
        "Missing Cloudflare credentials. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.",
    };
  }

  // Validate HTML
  if (!html || typeof html !== "string") {
    return {
      success: false,
      error: "HTML content is required and must be a string.",
    };
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser/render`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html,
          output_format: "pdf",
          pdf_options: {
            format,
            margin: {
              top: mmToPixels(margin.top),
              bottom: mmToPixels(margin.bottom),
              left: mmToPixels(margin.left),
              right: mmToPixels(margin.right),
            },
            print_background: printBackground,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage =
        errorData.errors?.[0]?.message ||
        errorData.error_chain?.[0]?.message ||
        response.statusText;
      return {
        success: false,
        error: `Browser Rendering API error: ${errorMessage}`,
      };
    }

    const buffer = await response.arrayBuffer();

    return {
      success: true,
      buffer,
    };
  } catch (error) {
    return {
      success: false,
      error: `PDF generation failed: ${error.message}`,
    };
  }
}

/**
 * Generate PDF and return as HTTP Response
 * Perfect for Worker fetch handler
 *
 * @param {string} html - HTML content to convert to PDF
 * @param {string} filename - Filename for download (e.g., "resume.pdf")
 * @param {Object} env - Cloudflare Worker environment object
 * @param {Object} options - Additional PDF options (margin, format, etc.)
 * @returns {Promise<Response>} HTTP response with PDF as attachment
 */
export async function generatePdfResponse(html, filename, env, options = {}) {
  const result = await generatePdfFromHtml(html, {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    ...options,
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(result.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

/**
 * Generate PDF and save to R2 (Cloudflare's object storage)
 * Useful for Worker environment where file system isn't available
 *
 * @param {string} html - HTML content to convert to PDF
 * @param {string} filename - Filename for R2 storage (e.g., "resumes/user123.pdf")
 * @param {Object} env - Cloudflare Worker environment
 * @param {Object} bucket - R2 bucket object (from env binding)
 * @param {Object} options - PDF options
 * @returns {Promise<Object>} { success, url?, error? }
 */
export async function generatePdfToR2(html, filename, env, bucket, options = {}) {
  const pdfResult = await generatePdfFromHtml(html, {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    ...options,
  });

  if (!pdfResult.success) {
    return pdfResult;
  }

  try {
    // Upload to R2
    await bucket.put(filename, pdfResult.buffer, {
      httpMetadata: {
        contentType: "application/pdf",
        contentDisposition: `attachment; filename="${filename}"`,
      },
    });

    return {
      success: true,
      filename,
      message: `PDF saved to R2: ${filename}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `R2 upload failed: ${error.message}`,
    };
  }
}

/**
 * Generate PDF and return as base64 (useful for email or data transfer)
 *
 * @param {string} html - HTML content to convert to PDF
 * @param {Object} env - Cloudflare Worker environment
 * @param {Object} options - PDF options
 * @returns {Promise<Object>} { success, base64?, error? }
 */
export async function generatePdfBase64(html, env, options = {}) {
  const result = await generatePdfFromHtml(html, {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    ...options,
  });

  if (!result.success) {
    return result;
  }

  try {
    // Convert ArrayBuffer to base64
    const uint8Array = new Uint8Array(result.buffer);
    const binaryString = String.fromCharCode.apply(null, uint8Array);
    const base64 = btoa(binaryString);

    return {
      success: true,
      base64,
    };
  } catch (error) {
    return {
      success: false,
      error: `Base64 encoding failed: ${error.message}`,
    };
  }
}
