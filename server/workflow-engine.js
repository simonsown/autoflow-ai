const { v4: uuidv4 } = require('uuid');

class WorkflowEngine {
  constructor(aiRouter, env) {
    this.aiRouter = aiRouter;
    this.env = env;
  }

  async execute(workflow, payload = {}) {
    const log = [];
    const runId = uuidv4();
    log.push({ time: new Date().toISOString(), step: 'start', message: `Run ${runId} bắt đầu` });

    let context = { ...payload };

    for (const [index, action] of workflow.actions.entries()) {
      try {
        const result = await this.executeAction(action, context, log);
        context[`action_${index}_output`] = result;
        log.push({
          time: new Date().toISOString(),
          step: `action_${index}`,
          action: action.type,
          status: 'success',
          message: `✅ ${action.type} hoàn thành`
        });
      } catch (err) {
        log.push({
          time: new Date().toISOString(),
          step: `action_${index}`,
          action: action.type,
          status: 'error',
          message: `❌ ${action.type} thất bại: ${err.message}`
        });
      }
    }

    log.push({ time: new Date().toISOString(), step: 'end', message: `Run ${runId} hoàn thành` });

    return {
      runId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: log.some(l => l.status === 'error') ? 'completed_with_errors' : 'success',
      log,
      context
    };
  }

  async executeAction(action, context, log) {
    switch (action.type) {
      case 'ai_process':
        return this.actionAI(action, context);
      case 'send_email':
        return this.actionEmail(action, context);
      case 'webhook_call':
        return this.actionWebhook(action, context);
      case 'log':
        return this.actionLog(action, context);
      case 'condition':
        return this.actionCondition(action, context);
      case 'transform':
        return this.actionTransform(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async actionAI(action, context) {
    const prompt = this.interpolate(action.config.prompt || '', context);
    const task = action.config.task || 'general';
    return this.aiRouter.process(prompt, task);
  }

  async actionEmail(action, context) {
    const { to, subject, body } = action.config;
    const resolvedTo = this.interpolate(to || '', context);
    const resolvedSubject = this.interpolate(subject || 'AutoFlow AI Notification', context);
    const resolvedBody = this.interpolate(body || '', context);
    logEntry(`📧 Gửi email đến ${resolvedTo}: ${resolvedSubject}`);
    return { to: resolvedTo, subject: resolvedSubject, body: resolvedBody, sent: true };
  }

  async actionWebhook(action, context) {
    const { url, method = 'POST', headers = {} } = action.config;
    const resolvedUrl = this.interpolate(url || '', context);
    logEntry(`🌐 Gọi webhook: ${method} ${resolvedUrl}`);
    try {
      const res = await fetch(resolvedUrl, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(context)
      });
      return { status: res.status, ok: res.ok, body: await res.text().catch(() => '') };
    } catch (err) {
      return { error: err.message };
    }
  }

  actionLog(action, context) {
    const message = this.interpolate(action.config.message || '', context);
    console.log(`[AutoFlow Log] ${message}`);
    return { message };
  }

  actionCondition(action, context) {
    const { field, operator, value } = action.config;
    const actual = context[field];
    let matched = false;
    switch (operator) {
      case 'equals': matched = actual == value; break;
      case 'contains': matched = String(actual).includes(value); break;
      case 'gt': matched = Number(actual) > Number(value); break;
      case 'lt': matched = Number(actual) < Number(value); break;
      case 'exists': matched = actual !== undefined; break;
      default: matched = false;
    }
    return { field, operator, value, actual, matched };
  }

  actionTransform(action, context) {
    const { template } = action.config;
    const result = this.interpolate(template || '', context);
    let parsed;
    try { parsed = JSON.parse(result); } catch { parsed = result; }
    return parsed;
  }

  interpolate(str, context) {
    return str.replace(/\{\{(.+?)\}\}/g, (_, key) => {
      const trimmed = key.trim();
      if (trimmed === 'now') return new Date().toISOString();
      if (trimmed === 'uuid') return uuidv4();
      const keys = trimmed.split('.');
      let val = context;
      for (const k of keys) {
        if (val?.[k] !== undefined) val = val[k];
        else return `{{${trimmed}}}`;
      }
      return String(val ?? `{{${trimmed}}}`);
    });
  }
}

function logEntry(msg) {
  console.log(`[WorkflowEngine] ${msg}`);
}

module.exports = WorkflowEngine;
