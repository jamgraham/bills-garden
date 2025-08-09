// Global variables
let schedules = [];
let zones = [];
let currentEditId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    Promise.all([loadZones(), loadSchedules()]).then(() => {
        populateZoneSelectors();
    });
    updateStatus();
    setInterval(updateStatus, 5000); // Update status every 5 seconds
});

// API Functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const maybeText = await response.text();
            try {
                const parsed = JSON.parse(maybeText);
                throw new Error(parsed.error || maybeText || `HTTP ${response.status}`);
            } catch (_) {
                throw new Error(maybeText || `HTTP ${response.status}`);
            }
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        showToast('Error: ' + error.message, 'error');
        throw error;
    }
}

// Zones
async function loadZones() {
    try {
        zones = await apiCall('/zones');
        populateZoneSelectors();
        renderZonesList();
    } catch (error) {
        console.error('Failed to load zones:', error);
    }
}

function populateZoneSelectors() {
    const zoneSelect = document.getElementById('zoneSelect');
    const scheduleZone = document.getElementById('scheduleZone');
    const editScheduleZone = document.getElementById('editScheduleZone');

    // Only allow GPIO 17 zone
    const gpio17Zones = zones.filter(z => parseInt(z.gpio_pin) === 17);
    const list = gpio17Zones.length ? gpio17Zones : zones; // fallback if absent

    const optionsHtml = list.map(z => `<option value="${z.id}">${z.name} (GPIO ${z.gpio_pin}${z.voltage ? ', ' + z.voltage : ''})</option>`).join('');

    if (zoneSelect) zoneSelect.innerHTML = optionsHtml;
    if (scheduleZone) scheduleZone.innerHTML = optionsHtml;
    if (editScheduleZone) editScheduleZone.innerHTML = optionsHtml;
}

function renderZonesList() {
    const container = document.getElementById('zonesList');
    if (!container) return;

    if (!zones.length) {
        container.innerHTML = '<p>No zones yet. Add one below.</p>';
        return;
    }

    container.innerHTML = zones.map(z => `
        <div class="zone-row" style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div><strong>${z.name}</strong> — GPIO ${z.gpio_pin}${z.voltage ? ' · ' + z.voltage : ''}</div>
            <div class="zone-actions" style="display:flex; gap:8px;">
                <button class="btn btn-danger" onclick="deleteZone(${z.id})"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteZone(zoneId) {
    if (!zoneId) return;
    if (!confirm('Delete this zone? This cannot be undone.')) return;
    try {
        await apiCall(`/zones/${zoneId}`, { method: 'DELETE' });
        showToast('Zone deleted', 'success');
        await loadZones();
        populateZoneSelectors();
    } catch (err) {
        // Error already toasted by apiCall; keep UI responsive
    }
}

function showZonesModal() {
    document.getElementById('zonesModal').classList.add('show');
}
function hideZonesModal() {
    document.getElementById('zonesModal').classList.remove('show');
    document.getElementById('addZoneForm').reset();
}

document.getElementById('addZoneForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = {
        name: document.getElementById('zoneName').value,
        gpio_pin: parseInt(document.getElementById('gpioPin').value),
        voltage: document.getElementById('zoneVoltage').value
    };
    try {
        await apiCall('/zones', { method: 'POST', body: JSON.stringify(formData) });
        showToast('Zone added', 'success');
        await loadZones();
        populateZoneSelectors();
        // keep modal open so user can add more
    } catch (err) {}
});

// Load schedules from server
async function loadSchedules() {
    try {
        schedules = await apiCall('/schedule');
        renderSchedules();
    } catch (error) {
        console.error('Failed to load schedules:', error);
    }
}

// Render schedules in the grid
function renderSchedules() {
    const grid = document.getElementById('schedulesGrid');
    
    if (schedules.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock" style="font-size: 48px; color: #ccc; margin-bottom: 20px;"></i>
                <h3>No schedules yet</h3>
                <p>Create your first watering schedule to get started.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = schedules.map(schedule => {
        const zone = zones.find(z => z.id === schedule.zone_id);
        const zoneLabel = zone ? `${zone.name} (GPIO ${zone.gpio_pin})` : `Zone ${schedule.zone_id}`;
        return `
        <div class="schedule-card ${schedule.enabled ? 'enabled' : 'disabled'}">
            <div class="schedule-header">
                <div>
                    <div class="schedule-name">${schedule.name}</div>
                    <div class="schedule-status ${schedule.enabled ? 'enabled' : 'disabled'}">
                        ${schedule.enabled ? 'Active' : 'Disabled'}
                    </div>
                </div>
            </div>
            <div class="schedule-details">
                <div class="detail-item">
                    <div class="detail-label">Zone</div>
                    <div class="detail-value">${zoneLabel}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Interval</div>
                    <div class="detail-value">${formatInterval(schedule.interval_minutes)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Duration</div>
                    <div class="detail-value">${schedule.duration_seconds}s</div>
                </div>
            </div>
            <div class="schedule-actions">
                <button class="btn btn-secondary" onclick="editSchedule(${schedule.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-primary" onclick="testSchedule(${schedule.id})">
                    <i class="fas fa-play"></i> Test
                </button>
            </div>
        </div>`;
    }).join('');
}

// Format interval for display
function formatInterval(minutes) {
    if (minutes < 60) {
        return `${minutes} min`;
    } else if (minutes === 60) {
        return '1 hour';
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours} hours`;
        } else {
            return `${hours}h ${remainingMinutes}m`;
        }
    }
}

// Activate pin immediately
async function activatePin() {
    const duration = parseInt(document.getElementById('duration').value);
    const zoneId = parseInt(document.getElementById('zoneSelect').value);
    
    if (duration < 1 || duration > 300) {
        showToast('Duration must be between 1 and 300 seconds', 'error');
        return;
    }
    if (!zoneId) {
        showToast('Please select a zone', 'error');
        return;
    }
    
    try {
        await apiCall('/pin/activate', {
            method: 'POST',
            body: JSON.stringify({ duration_seconds: duration, zone_id: zoneId })
        });
        showToast(`Activated zone for ${duration} seconds`, 'success');
    } catch (error) {
        console.error('Failed to activate pin:', error);
    }
}

// Test a schedule (activate pin with schedule duration)
async function testSchedule(scheduleId) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    try {
        await apiCall('/pin/activate', {
            method: 'POST',
            body: JSON.stringify({ duration_seconds: schedule.duration_seconds, zone_id: schedule.zone_id })
        });
        showToast(`Tested schedule: ${schedule.name} (${schedule.duration_seconds}s)`, 'success');
    } catch (error) {
        console.error('Failed to test schedule:', error);
    }
}

// Modal functions
function showAddScheduleModal() {
    document.getElementById('addScheduleModal').classList.add('show');
    document.getElementById('scheduleName').focus();
    populateZoneSelectors();
}

function hideAddScheduleModal() {
    document.getElementById('addScheduleModal').classList.remove('show');
    document.getElementById('addScheduleForm').reset();
}

function showEditScheduleModal(scheduleId) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    currentEditId = scheduleId;
    document.getElementById('editScheduleId').value = scheduleId;
    document.getElementById('editScheduleName').value = schedule.name;
    document.getElementById('editIntervalMinutes').value = schedule.interval_minutes;
    document.getElementById('editScheduleDuration').value = schedule.duration_seconds;
    document.getElementById('editScheduleEnabled').checked = schedule.enabled;
    populateZoneSelectors();
    // If schedule's zone is not GPIO 17, fallback to first available (GPIO 17)
    const editSelect = document.getElementById('editScheduleZone');
    if ([...editSelect.options].some(o => parseInt(o.value) === schedule.zone_id)) {
        editSelect.value = schedule.zone_id;
    } else if (editSelect.options.length > 0) {
        editSelect.value = editSelect.options[0].value;
    }
    
    document.getElementById('editScheduleModal').classList.add('show');
}

function hideEditScheduleModal() {
    document.getElementById('editScheduleModal').classList.remove('show');
    currentEditId = null;
}

function editSchedule(scheduleId) {
    showEditScheduleModal(scheduleId);
}

// Form submissions
document.getElementById('addScheduleForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('scheduleName').value,
        zone_id: parseInt(document.getElementById('scheduleZone').value),
        interval_minutes: parseInt(document.getElementById('intervalMinutes').value),
        duration_seconds: parseInt(document.getElementById('scheduleDuration').value),
        enabled: document.getElementById('scheduleEnabled').checked
    };
    
    try {
        await apiCall('/schedule', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        hideAddScheduleModal();
        await loadSchedules();
        showToast('Schedule created successfully', 'success');
    } catch (error) {
        console.error('Failed to create schedule:', error);
    }
});


document.getElementById('editScheduleForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentEditId) return;
    
    const formData = {
        name: document.getElementById('editScheduleName').value,
        zone_id: parseInt(document.getElementById('editScheduleZone').value),
        interval_minutes: parseInt(document.getElementById('editIntervalMinutes').value),
        duration_seconds: parseInt(document.getElementById('editScheduleDuration').value),
        enabled: document.getElementById('editScheduleEnabled').checked
    };
    
    try {
        await apiCall(`/schedule/${currentEditId}`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });
        
        hideEditScheduleModal();
        await loadSchedules();
        showToast('Schedule updated successfully', 'success');
    } catch (error) {
        console.error('Failed to update schedule:', error);
    }
});

// Delete schedule
async function deleteSchedule() {
    if (!currentEditId) return;
    
    if (!confirm('Are you sure you want to delete this schedule?')) {
        return;
    }
    
    try {
        await apiCall(`/schedule/${currentEditId}`, {
            method: 'DELETE'
        });
        
        hideEditScheduleModal();
        await loadSchedules();
        showToast('Schedule deleted successfully', 'success');
    } catch (error) {
        console.error('Failed to delete schedule:', error);
    }
}

// Update system status
async function updateStatus() {
    try {
        const status = await apiCall('/status');
        
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        
        if (status.scheduler_running) {
            statusDot.style.background = '#4CAF50';
            statusText.textContent = `System Online (${status.active_jobs} active jobs)`;
        } else {
            statusDot.style.background = '#f44336';
            statusText.textContent = 'System Offline';
        }
        
        // Update pin state indicator
        if (status.pin_state) {
            statusDot.style.animation = 'pulse 0.5s infinite';
        } else {
            statusDot.style.animation = 'pulse 2s infinite';
        }
    } catch (error) {
        console.error('Failed to update status:', error);
        document.getElementById('statusDot').style.background = '#f44336';
        document.getElementById('statusText').textContent = 'Connection Error';
    }
}

// Toast notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        hideAddScheduleModal();
        hideEditScheduleModal();
        hideZonesModal();
    }
    
    // Ctrl/Cmd + N to add new schedule
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showAddScheduleModal();
    }
});

// Click outside modal to close
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        hideAddScheduleModal();
        hideEditScheduleModal();
        hideZonesModal();
    }
});

// Input validation
document.getElementById('duration').addEventListener('input', function() {
    const value = parseInt(this.value);
    if (value < 1) this.value = 1;
    if (value > 300) this.value = 300;
});

document.getElementById('intervalMinutes').addEventListener('input', function() {
    const value = parseInt(this.value);
    if (value < 1) this.value = 1;
    if (value > 1440) this.value = 1440;
});

document.getElementById('scheduleDuration').addEventListener('input', function() {
    const value = parseInt(this.value);
    if (value < 1) this.value = 1;
    if (value > 300) this.value = 300;
});

document.getElementById('editIntervalMinutes').addEventListener('input', function() {
    const value = parseInt(this.value);
    if (value < 1) this.value = 1;
    if (value > 1440) this.value = 1440;
});

document.getElementById('editScheduleDuration').addEventListener('input', function() {
    const value = parseInt(this.value);
    if (value < 1) this.value = 1;
    if (value > 300) this.value = 300;
}); 