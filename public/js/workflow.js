let workflowId = null;
let workflow = null;
let actions = [];
let actionCounter = 0;

const actionConfigs = {
  ai_process: {
    icon: '🤖', label: 'AI Xử lý',
    fields: [
      { key: 'prompt', type: 'textarea', label: 'Prompt / Nội dung', default: 'Xử lý văn bản sau: {{input}}' },
      { key: 'task', type: 'select', label: 'Tác vụ', default: 'general',
        options: [
          { value: 'general', label: 'Tổng quát' },
          { value: 'summarize', label: 'Tóm tắt' },
          { value: 'translate', label: 'Dịch thuật' }
        ]
      }
    ]
  },
  send_email: {
    icon: '📧', label: 'Gửi Email',
    fields: [
      { key: 'to', type: 'text', label: 'Người nhận', default: 'user@example.com' },
      { key: 'subject', type: 'text', label: 'Tiêu đề', default: 'Kết quả từ AutoFlow AI' },
      { key: 'body', type: 'textarea', label: 'Nội dung', default: 'Kết quả xử lý:\n\n{{action_0_output}}' }
    ]
  },
  webhook_call: {
    icon: '🌐', label: 'Gọi Webhook',
    fields: [
      { key: 'url', type: 'text', label: 'Webhook URL', default: 'https://example.com/hook' },
      { key: 'method', type: 'select', label: 'Phương thức', default: 'POST',
        options: [{ value: 'POST', label: 'POST' }, { value: 'GET', label: 'GET' }]
      }
    ]
  },
  transform: {
    icon: '🔄', label: 'Biến đổi dữ liệu',
    fields: [
      { key: 'template', type: 'textarea', label: 'Template (dùng {{key}})', default: '{\n  "result": "{{action_0_output}}",\n  "timestamp": "{{now}}"\n}' }
    ]
  },
  condition: {
    icon: '🔀', label: 'Điều kiện',
    fields: [
      { key: 'field', type: 'text', label: 'Tên biến', default: 'action_0_output' },
      { key: 'operator', type: 'select', label: 'Toán tử', default: 'contains',
        options: [
          { value: 'equals', label: 'Bằng' },
          { value: 'contains', label: 'Chứa' },
          { value: 'exists', label: 'Tồn tại' }
        ]
      },
      { key: 'value', type: 'text', label: 'Giá trị so sánh', default: 'thành công' }
    ]
  },
  log: {
    icon: '📝', label: 'Ghi log',
    fields: [
      { key: 'message', type: 'textarea', label: 'Nội dung log', default: 'Workflow chạy lúc {{now}}' }
    ]
  }
};

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  return res.json();
}

async function loadWorkflow() {
  const params = new URLSearchParams(window.location.search);
  workflowId = params.get('id');
  if (!workflowId) {
    document.getElementById('wfTitle').textContent = 'Workflow mới';
    document.getElementById('wfMeta').textContent = 'Tạo các bước và lưu lại';
    return;
  }
  const workflows = await api('/api/workflows');
  workflow = workflows.find(w => w.id === workflowId);
  if (!workflow) {
    document.getElementById('wfTitle').textContent = 'Không tìm thấy workflow';
    return;
  }
  document.getElementById('wfTitle').textContent = `✏️ ${workflow.name}`;
  const triggerLabel = { manual: '👆 Thủ công', schedule: '⏰ Lịch', webhook: '🔗 Webhook' };
  document.getElementById('wfMeta').textContent =
    `${triggerLabel[workflow.trigger?.type] || '👆 Thủ công'} · ${workflow.runs || 0} lần chạy` +
    (workflow.lastRun ? ` · Lần cuối: ${new Date(workflow.lastRun).toLocaleString('vi-VN')}` : '');

  if (workflow.actions && workflow.actions.length > 0) {
    actions = workflow.actions.map((a, i) => ({ ...a, _id: i + 1 }));
    actionCounter = actions.length;
    renderCanvas();
  }
}

function addAction(type) {
  const config = actionConfigs[type];
  if (!config) return;
  actionCounter++;
  const action = { _id: actionCounter, type };
  if (config.fields) {
    action.config = {};
    config.fields.forEach(f => { action.config[f.key] = f.default || ''; });
  } else {
    action.config = {};
  }
  actions.push(action);
  renderCanvas();
}

function removeAction(id) {
  actions = actions.filter(a => a._id !== id);
  renderCanvas();
}

function updateActionConfig(id, key, value) {
  const action = actions.find(a => a._id === id);
  if (action) {
    if (!action.config) action.config = {};
    action.config[key] = value;
  }
}

function renderCanvas() {
  const container = document.getElementById('canvasSteps');
  const placeholder = document.getElementById('canvasPlaceholder');

  if (actions.length === 0) {
    placeholder.style.display = 'flex';
    container.innerHTML = '';
    return;
  }
  placeholder.style.display = 'none';

  container.innerHTML = actions.map((a, idx) => {
    const config = actionConfigs[a.type];
    const fieldsHtml = config?.fields?.map(f => {
      const val = a.config?.[f.key] || '';
      if (f.type === 'select') {
        const opts = f.options?.map(o =>
          `<option value="${o.value}" ${val === o.value ? 'selected' : ''}>${o.label}</option>`
        ).join('');
        return `<label style="font-size:10px;color:var(--text2);display:block;margin-bottom:2px;">${f.label}</label>
                <select onchange="updateActionConfig(${a._id},'${f.key}',this.value)">${opts}</select>`;
      } else if (f.type === 'textarea') {
        return `<label style="font-size:10px;color:var(--text2);display:block;margin-bottom:2px;">${f.label}</label>
                <textarea onchange="updateActionConfig(${a._id},'${f.key}',this.value)">${val}</textarea>`;
      }
      return `<label style="font-size:10px;color:var(--text2);display:block;margin-bottom:2px;">${f.label}</label>
              <input type="text" value="${val}" onchange="updateActionConfig(${a._id},'${f.key}',this.value)">`;
    }).join('');

    return `
      ${idx > 0 ? '<div class="step-connector">⬇</div>' : ''}
      <div class="canvas-step">
        <div class="step-header">
          <span>${config?.icon || '❓'}</span>
          <span class="step-title">${config?.label || a.type} #${idx + 1}</span>
          <span class="step-remove" onclick="removeAction(${a._id})">✕</span>
        </div>
        <div class="step-config">${fieldsHtml || '<div style="font-size:11px;color:var(--text3);">Không cần cấu hình</div>'}</div>
      </div>`;
  }).join('');
}

async function saveWorkflow() {
  const wfData = {
    name: workflow?.name || 'Workflow mới',
    description: workflow?.description || '',
    trigger: workflow?.trigger || { type: 'manual' },
    status: workflow?.status || 'active',
    actions: actions.map(a => ({ type: a.type, config: a.config }))
  };

  let result;
  if (workflowId) {
    result = await api(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(wfData)
    });
  } else {
    result = await api('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(wfData)
    });
  }

  if (result.id) {
    workflowId = result.id;
    workflow = result;
    document.getElementById('wfTitle').textContent = `✏️ ${result.name}`;
    if (!window.location.search.includes('id=')) {
      window.history.replaceState(null, '', `/workflow.html?id=${result.id}`);
    }
    showToast('✅ Đã lưu!');
  } else {
    showToast('❌ Lỗi lưu!');
  }
}

async function runWorkflow() {
  if (!workflowId && actions.length === 0) {
    showToast('⚠️ Thêm ít nhất 1 hành động trước khi chạy');
    return;
  }

  if (!workflowId) {
    await saveWorkflow();
  }

  const payloadText = document.getElementById('testPayload').value.trim();
  let payload = {};
  try { if (payloadText) payload = JSON.parse(payloadText); } catch { payload = { text: payloadText }; }

  const outputPanel = document.getElementById('outputPanel');
  const outputContent = document.getElementById('outputContent');
  outputPanel.style.display = 'block';
  outputContent.innerHTML = '<div style="color:var(--text2);font-size:13px;">🔄 Đang chạy workflow...</div>';

  try {
    const result = await api(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
      body: JSON.stringify({ payload })
    });

    outputContent.innerHTML = `
      <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;">
        <span class="badge ${result.status === 'success' ? 'badge-active' : 'badge-error'}">
          ${result.status === 'success' ? '✅ Thành công' : '⚠️ Có lỗi'}
        </span>
        <span style="font-size:11px;color:var(--text2);">Run ID: ${result.runId?.substring(0, 8)}...</span>
      </div>
      <div class="run-log">
        ${result.log?.map(l => `
          <div class="log-entry">
            <span class="log-time">${new Date(l.time).toLocaleTimeString('vi-VN')}</span>
            <span class="log-step">${l.step}</span>
            <span class="log-msg">${l.message || ''}</span>
          </div>
        `).join('') || ''}
      </div>
      ${result.context ? `
        <div style="margin-top:12px;">
          <div style="font-size:11px;color:var(--text2);margin-bottom:4px;">📦 Context output:</div>
          <div class="card" style="padding:12px;font-size:11px;white-space:pre-wrap;word-break:break-word;">
            ${JSON.stringify(result.context, null, 2)}
          </div>
        </div>
      ` : ''}
    `;
  } catch (err) {
    outputContent.innerHTML = `<div style="color:var(--accent2);font-size:13px;">❌ Lỗi: ${err.message}</div>`;
  }

  outputPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showToast(msg) {
  const div = document.createElement('div');
  div.textContent = msg;
  div.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;font-size:12px;z-index:200;animation:fadeUp 0.3s ease;';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

loadWorkflow();
