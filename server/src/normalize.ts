/**
 * normalize.ts
 * Utility to convert Webex HTML to Teams-compatible Markdown/JSON.
 */

export function normalizeWebexToTeams(html: string): string {
  if (!html) return '';

  let normalized = html;

  // 1. Basic Formatting
  normalized = normalized.replace(/<b>(.*?)<\/b>/g, '**$1**');
  normalized = normalized.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
  normalized = normalized.replace(/<i>(.*?)<\/i>/g, '*$1*');
  normalized = normalized.replace(/<em>(.*?)<\/em>/g, '*$1*');
  normalized = normalized.replace(/<u>(.*?)<\/u>/g, '$1'); // Teams MD doesn't natively support underline well

  // 2. Links
  normalized = normalized.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)');

  // 3. Line Breaks
  normalized = normalized.replace(/<br\s*\/?>/g, '\n');
  normalized = normalized.replace(/<\/p>/g, '\n');
  normalized = normalized.replace(/<p>/g, '');

  // 4. Mentions (Webex <spark-mention>)
  // Webex: <spark-mention data-object-type="person" data-object-id="PERSON_ID">NAME</spark-mention>
  // Teams: <at id="0">NAME</at> (Requires mentions array in message body)
  // For now, we'll convert to bold text as a fallback if we don't have the full mentions mapping
  normalized = normalized.replace(/<spark-mention.*?>(.*?)<\/spark-mention>/g, '@**$1**');

  // 5. Clean up any remaining HTML tags
  normalized = normalized.replace(/<[^>]*>?/gm, '');

  return normalized.trim();
}

export function formatTeamsMigrationMessage(webexMsg: any) {
  const content = normalizeWebexToTeams(webexMsg.html || webexMsg.text);
  
  return {
    body: {
      contentType: 'html', // Even though it's markdown-ish, Teams migration API often takes HTML-wrapped MD or literal HTML
      content: content 
    },
    createdDateTime: webexMsg.created,
    from: {
      user: {
        id: webexMsg.personEmail, // Fallback to email if we don't have the Graph User ID yet
        displayName: webexMsg.personEmail.split('@')[0]
      }
    }
  };
}
