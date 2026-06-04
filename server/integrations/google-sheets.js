class GoogleSheetsIntegration {
  constructor(env) {
    this.env = env;
    this.ready = env.GOOGLE_SHEETS_API_KEY && env.GOOGLE_SHEETS_API_KEY !== 'your_gsheets_key';
  }

  async appendRow({ spreadsheetId, range, values }) {
    if (!this.ready) {
      return { success: false, message: 'Google Sheets chưa cấu hình API key' };
    }
    console.log(`📊 [SHEETS] Append to ${spreadsheetId}/${range}:`, values);
    return { success: true, spreadsheetId, range, rows: values.length };
  }
}

module.exports = GoogleSheetsIntegration;
