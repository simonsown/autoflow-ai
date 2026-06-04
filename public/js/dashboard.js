async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  return res.json();
}

async function loadStats() {
  try {
    const stats = await api('/api/stats');
    document.getElementById('statWorkflows').textContent = stats.totalWorkflows || 0;
    document.getElementById('statActive').textContent = stats.activeWorkflows || 0;
    document.getElementById('statRuns').textContent = stats.totalRuns || 0;
    document.getElementById('statModels').textContent = stats.modelsAvailable || 0;
  } catch {}
}

async function loadWorkflows() {
  const list = document.getElementById('workflowList');
  list.innerHTML = '<div class="text-center" style="padding:40px;color:var(--text3);font-size:13px;">Đang tải...</div>';
  try {
    const workflows = await api('/api/workflows');
    const filter = document.getElementById('statusFilter').value;

    const filtered = filter === 'all' ? workflows : workflows.filter(w => w.status === filter);

    if (filtered.length === 0) {
      list.innerHTML = `<div class="text-center" style="padding:40px;color:var(--text3);font-size:13px;">
        Chưa có luồng nào. <a href="#" onclick="showNewWorkflowModal();return false;">Tạo luồng đầu tiên</a>
      </div>`;
      return;
    }

    const triggerLabels = {
      manual: '👆 Thủ công',
      schedule: '⏰ Lịch',
      webhook: '🔗 Webhook'
    };
    const statusBadges = {
      active: '<span class="badge badge-active">Đang chạy</span>',
      paused: '<span class="badge badge-paused">Tạm dừng</span>',
    };

    list.innerHTML = filtered.map(w => `
      <div class="card workflow-item" onclick="openWorkflow('${w.id}')">
        <div class="workflow-info">
          <div class="workflow-name">${w.name}</div>
          <div class="workflow-meta">
            <span>Chạy ${w.runs || 0} lần</span>
            <span>${w.lastRun ? 'Gần nhất: ' + new Date(w.lastRun).toLocaleDateString('vi-VN') : 'Chưa chạy'}</span>
          </div>
        </div>
        <span class="workflow-trigger">${triggerLabels[w.trigger?.type] || '👆 Thủ công'}</span>
        ${statusBadges[w.status] || ''}
        <button class="btn btn-danger" style="padding:4px 10px;font-size:10px;" onclick="event.stopPropagation();deleteWorkflow('${w.id}')">Xóa</button>
      </div>
    `).join('');
  } catch (err) {
    list.innerHTML = `<div class="text-center" style="padding:40px;color:var(--accent2);font-size:13px;">Lỗi tải dữ liệu: ${err.message}</div>`;
  }
}

function openWorkflow(id) {
  window.location.href = `/workflow.html?id=${id}`;
}

async function deleteWorkflow(id) {
  if (!confirm('Xóa luồng này?')) return;
  await api(`/api/workflows/${id}`, { method: 'DELETE' });
  loadWorkflows();
  loadStats();
}

function showNewWorkflowModal() {
  document.getElementById('newWorkflowModal').classList.add('show');
  document.getElementById('wfName').value = '';
  document.getElementById('wfDesc').value = '';
  document.getElementById('wfTrigger').value = 'manual';
  document.getElementById('cronGroup').style.display = 'none';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.getElementById('wfTrigger').addEventListener('change', function() {
  document.getElementById('cronGroup').style.display = this.value === 'schedule' ? 'block' : 'none';
});

async function createWorkflow() {
  const name = document.getElementById('wfName').value.trim();
  if (!name) { alert('Nhập tên luồng!'); return; }

  const trigger = {
    type: document.getElementById('wfTrigger').value
  };
  if (trigger.type === 'schedule') {
    trigger.cron = document.getElementById('wfCron').value.trim() || '0 9 * * *';
  }

  const wf = await api('/api/workflows', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description: document.getElementById('wfDesc').value.trim(),
      trigger,
      status: 'active',
      actions: []
    })
  });

  closeModal('newWorkflowModal');
  if (wf.id) {
    window.location.href = `/workflow.html?id=${wf.id}`;
  } else {
    loadWorkflows();
    loadStats();
  }
}

loadStats();
loadWorkflows();
