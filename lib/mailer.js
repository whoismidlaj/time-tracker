import nodemailer from 'nodemailer';
import getDb from '../db/database.js';

async function getSMTPConfig() {
  const db = await getDb();
  const res = await db.query("SELECT value FROM app_settings WHERE key = 'smtp_config'");
  if (res.rowCount === 0) return null;
  try {
    return JSON.parse(res.rows[0].value);
  } catch (e) {
    return null;
  }
}

export async function sendEmail({ to, subject, html, text }) {
  const config = await getSMTPConfig();
  
  if (!config || !config.host || !config.user) {
    console.error('--- MAILER ERROR: SMTP NOT CONFIGURED ---');
    console.log(`To: ${to}\nSubject: ${subject}\nContent: ${text || html}`);
    throw new Error('Mailing system is not configured by administrator.');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: parseInt(config.port) || 587,
    secure: parseInt(config.port) === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: config.from || '"TimeTrack" <noreply@example.com>',
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (err) {
    console.error('--- MAILER ERROR ---', err);
    throw err;
  }
}

export async function sendResetEmail(to, resetUrl) {
  return sendEmail({
    to,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 48px; height: 48px; background-color: #f3f4f6; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px;">🔒</span>
          </div>
        </div>
        <h2 style="color: #111827; margin-bottom: 8px; text-align: center;">Reset your password</h2>
        <p style="color: #4b5563; line-height: 1.5; margin-bottom: 24px; text-align: center;">Click the button below to safely reset your password and get back to tracking your time.</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Reset Password</a>
        </div>
        <p style="color: #9ca3af; font-size: 11px; text-align: center; border-top: 1px solid #f3f4f6; padding-top: 20px;">If you did not request this, please ignore this email. This link will expire in 1 hour.</p>
      </div>
    `,
    text: `Reset your password at: ${resetUrl}`
  });
}

export async function sendWelcomeEmail(to) {
  return sendEmail({
    to,
    subject: 'Welcome to TimeTrack!',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="width: 48px; height: 48px; background-color: #f3f4f6; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center;">
             <span style="font-size: 24px;">⏱️</span>
          </div>
        </div>
        <h2 style="color: #111827; margin-bottom: 8px; text-align: center;">Welcome to TimeTrack</h2>
        <p style="color: #4b5563; line-height: 1.5; margin-bottom: 24px; text-align: center;">Your account has been successfully created. We're excited to help you manage your time easily and efficiently.</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="display: inline-block; background-color: #111827; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Start Tracking</a>
        </div>
      </div>
    `,
    text: `Welcome to TimeTrack! Your account is ready.`
  });
}
