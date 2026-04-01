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
      from: config.from || '"Time Tracker" <noreply@example.com>',
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
