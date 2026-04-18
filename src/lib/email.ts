import nodemailer from 'nodemailer';

type EmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getEmailConfig(): EmailConfig {
  const host = process.env.EMAIL_SERVER_HOST;
  const port = Number(process.env.EMAIL_SERVER_PORT || '587');
  const secure = process.env.EMAIL_SERVER_SECURE === 'true';
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error('Email server is not configured. Set EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, and EMAIL_FROM.');
  }

  return { host, port, secure, user, pass, from };
}

function createTransporter() {
  const config = getEmailConfig();

  return {
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    }),
    from: config.from,
  };
}

export async function sendVerificationEmail(params: {
  to: string;
  verificationUrl: string;
}) {
  const { transporter, from } = createTransporter();

  await transporter.sendMail({
    from,
    to: params.to,
    subject: 'Verify your email',
    text: `Please verify your email by opening this link: ${params.verificationUrl}`,
    html: `<p>Please verify your email by clicking this link:</p><p><a href="${params.verificationUrl}">${params.verificationUrl}</a></p>`,
  });
}
