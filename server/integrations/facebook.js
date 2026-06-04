class FacebookIntegration {
  constructor(env) {
    this.env = env;
    this.ready = env.FACEBOOK_PAGE_TOKEN && env.FACEBOOK_PAGE_TOKEN !== 'your_fb_token';
  }

  async postToPage({ pageId, message }) {
    if (!this.ready) {
      return { success: false, message: 'Facebook chưa cấu hình token' };
    }
    console.log(`📱 [FACEBOOK] Post to page ${pageId}: ${message.substring(0, 50)}...`);
    return { success: true, pageId, messageLength: message.length };
  }
}

module.exports = FacebookIntegration;
