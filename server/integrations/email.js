class EmailIntegration {
  constructor(env) {
    this.env = env;
    this.transport = null;
    if (env.SMTP_USER && env.SMTP_USER !== 'your_email@gmail.com') {
      this.ready = true;
      console.log('📧 Email integration ready');
    } else {
      this.ready = false;
    }
  }

  async send({ to, subject, body }) {
    if (!this.ready) {
      return { success: false, message: 'Email chưa được cấu hình. Set SMTP_USER và SMTP_PASS trong .env' };
    }
    // Trong thực tế dùng nodemailer, demo trả về mock
    console.log(`📧 [EMAIL] To: ${to} | Subject: ${subject}`);
    return { success: true, to, subject, bodyLength: body.length };
  }
}

module.exports = EmailIntegration;
