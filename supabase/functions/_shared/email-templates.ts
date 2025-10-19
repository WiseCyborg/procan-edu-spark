interface TemplateData {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Load and render an email template with variable substitution
 * @param templateName - Name of the template file (without .html extension)
 * @param data - Object containing template variables
 * @returns Rendered HTML string
 */
export async function loadEmailTemplate(
  templateName: string,
  data: TemplateData
): Promise<string> {
  try {
    // Read the template file
    const templatePath = `../../email-templates/${templateName}.html`;
    let html = await Deno.readTextFile(new URL(templatePath, import.meta.url));

    // Replace all template variables (both {{ .Variable }} and {{.Variable}} formats)
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        // Handle both spaced and non-spaced template syntax
        const spacedRegex = new RegExp(`\\{\\{\\s*\\.${key}\\s*\\}\\}`, 'g');
        html = html.replace(spacedRegex, String(value));
      }
    }

    // Handle conditionals ({{ if .Variable }} ... {{ end }})
    html = handleConditionals(html, data);

    // Clean up any remaining unreplaced variables (optional - for debugging)
    const remainingVars = html.match(/\{\{[^}]+\}\}/g);
    if (remainingVars) {
      console.warn(`Template ${templateName} has unreplaced variables:`, remainingVars);
    }

    return html;
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    throw new Error(`Template ${templateName}.html not found or could not be read`);
  }
}

/**
 * Handle conditional blocks in templates
 * Supports: {{ if .Variable }} content {{ end }}
 */
function handleConditionals(html: string, data: TemplateData): string {
  const conditionalRegex = /\{\{\s*if\s+\.(\w+)\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g;

  return html.replace(conditionalRegex, (match, varName, content) => {
    const value = data[varName];
    // Show content if variable is truthy
    return value ? content : '';
  });
}

/**
 * Get email HTML with fallback
 * If template loading fails, returns a basic fallback HTML
 */
export async function getEmailHTMLWithFallback(
  templateName: string,
  data: TemplateData
): Promise<string> {
  try {
    return await loadEmailTemplate(templateName, data);
  } catch (error) {
    console.error(`Using fallback for ${templateName}:`, error);

    // Return basic fallback HTML
    const message = data.message || data.Message || 'You have a notification from ProCann Edu.';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h1 style="color: #2A7F3F; margin-bottom: 20px;">ProCann Edu</h1>
          <p style="color: #4a4a4a; line-height: 1.6;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">This is an automated email from ProCann Edu.</p>
        </div>
      </body>
      </html>
    `;
  }
}
