const APP_HOME_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export function withAppFooter({
  text,
  html,
}: {
  text: string;
  html: string;
}) {
  const footerText = [
    text.trim(),
    '',
    `Open Secret Santa: ${APP_HOME_URL}`,
  ].join('\n');

  const footerHtml = `
    ${html.trim()}
    <p style="margin-top: 16px; color: #666; font-size: 12px;">
      Open Secret Santa:
      <a href="${APP_HOME_URL}" style="color: #C41E3A; text-decoration: none;">${APP_HOME_URL}</a>
    </p>
  `;

  return {
    text: footerText,
    html: footerHtml,
  };
}

export { APP_HOME_URL };
