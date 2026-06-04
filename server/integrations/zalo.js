class ZaloIntegration {
  constructor(env) {
    this.env = env;
    this.ready = env.ZALO_OA_TOKEN && env.ZALO_OA_TOKEN !== 'your_zalo_token';
  }

  async sendMessage({ userId, message }) {
    if (!this.ready) {
      return { success: false, message: 'Zalo OA chưa cấu hình token' };
    }
    console.log(`💬 [ZALO] Send to ${userId}: ${message.substring(0, 50)}...`);
    return { success: true, userId, messageLength: message.length };
  }
}

module.exports = ZaloIntegration;
