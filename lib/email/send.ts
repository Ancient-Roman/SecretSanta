import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const provider = process.env.EMAIL_PROVIDER || 'gmail-smtp';

  if (provider === 'gmail-smtp') {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || process.env.EMAIL_FROM,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  } else if (provider === 'gmail-api') {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER || process.env.EMAIL_FROM,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      },
    });
  } else if (provider === 'resend') {
    // Resend is only available server-side, use nodemailer wrapper
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.dev',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  } else {
    // Console fallback
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
    });
  }

  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER || 'gmail-smtp';
  const emailFrom = process.env.EMAIL_FROM || process.env.GMAIL_USER;

  if (!emailFrom) {
    console.warn('EMAIL_FROM not set, using console transport');
  }

  const transporter = getTransporter();

  try {
    if (provider === 'console') {
      console.log(`\n--- Email Log ---`);
      console.log(`To: ${options.to}`);
      console.log(`From: ${emailFrom}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`\nText:\n${options.text}`);
      console.log(`\nHTML:\n${options.html}`);
      console.log(`--- End Email Log ---\n`);
    } else {
      await transporter.sendMail({
        from: emailFrom,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
