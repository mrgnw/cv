/**
 * Browser-based PDF generation using native print dialog
 * No server needed - user prints to PDF directly from their browser
 */

/**
 * Prepare HTML for printing and trigger print dialog
 * @param {string} html - HTML content to print
 * @param {string} filename - Suggested filename for the PDF
 */
export function downloadPdfViaPrint(html, filename = "resume.pdf") {
  if (typeof document === "undefined") {
    throw new Error("downloadPdfViaPrint can only be used in the browser");
  }

  // Create a new window for printing
  const printWindow = window.open("", "_blank");

  // Write the HTML to the new window
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${filename}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              margin: 6mm 8mm;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);

  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
    // Optionally close after print dialog closes (user can prevent)
    // setTimeout(() => printWindow.close(), 250);
  };
}

/**
 * Create a printable iframe and trigger print dialog
 * Better UX - doesn't open new window
 * @param {string} html - HTML content to print
 * @param {string} filename - Suggested filename for the PDF
 */
export function downloadPdfViaIframe(html, filename = "resume.pdf") {
  if (typeof document === "undefined") {
    throw new Error("downloadPdfViaIframe can only be used in the browser");
  }

  // Create hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

  // Write HTML to iframe
  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${filename}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              margin: 6mm 8mm;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Trigger print after content loads
  iframe.onload = function () {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Remove iframe after a short delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
}

/**
 * Recommended: Show preview in iframe, user clicks print button
 * Most reliable and user-friendly approach
 * @param {string} html - HTML content
 * @returns {Object} { showPrintDialog }
 */
export function createPrintablePreview(html) {
  return {
    showPrintDialog() {
      if (typeof window === "undefined") {
        throw new Error("createPrintablePreview can only be used in the browser");
      }

      const printWindow = window.open("", "_blank");
      printWindow.document.write(html);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 250);
    },
  };
}
