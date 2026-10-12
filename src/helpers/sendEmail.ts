import nodemailer from "nodemailer";
import config from "../config";
export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string,
  attachments?: EmailAttachment[],
) => {
  const user = config.emailSender.email;
  const pass = (config.emailSender.app_pass || "").replace(/\s+/g, "");

  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });
  // Email options
  const mailOptions = {
    from: `"Dermaine Support" <${user}>`,
    to,
    subject,
    html,
    text,
    attachments,
  };
  await transporter.sendMail(mailOptions);
};

export default sendEmail;
