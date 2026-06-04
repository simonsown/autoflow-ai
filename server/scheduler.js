const cron = require('node-cron');

class Scheduler {
  constructor(workflowEngine) {
    this.workflowEngine = workflowEngine;
    this.jobs = new Map();
  }

  start() {
    console.log('⏰ Scheduler started');
  }

  register(workflow) {
    this.unregister(workflow.id);
    if (workflow.trigger.type !== 'schedule' || !workflow.trigger.cron) return;
    if (!cron.validate(workflow.trigger.cron)) {
      console.warn(`[Scheduler] Invalid cron expression for ${workflow.name}: ${workflow.trigger.cron}`);
      return;
    }
    const job = cron.schedule(workflow.trigger.cron, async () => {
      logEntry(`⏰ Running scheduled workflow: ${workflow.name}`);
      await this.workflowEngine.execute(workflow, { trigger: 'schedule', timestamp: new Date().toISOString() });
    });
    this.jobs.set(workflow.id, job);
    logEntry(`📅 Registered: ${workflow.name} (${workflow.trigger.cron})`);
  }

  unregister(id) {
    if (this.jobs.has(id)) {
      this.jobs.get(id).stop();
      this.jobs.delete(id);
    }
  }

  stopAll() {
    for (const [id, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    console.log('⏰ Scheduler stopped');
  }
}

function logEntry(msg) {
  console.log(`[Scheduler] ${msg}`);
}

module.exports = Scheduler;
