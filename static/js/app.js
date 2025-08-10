// Global variables
let schedules = [];
let zones = [];
let statusInterval;

// Launch Screen Management
function initLaunchScreen() {
    const launchScreen = document.getElementById('launchScreen');
    const mainContent = document.getElementById('mainContent');
    
    // Show launch screen initially
    launchScreen.style.display = 'flex';
    mainContent.classList.add('hidden');
    
    // After 1 second, start the transition
    setTimeout(() => {
        // Slide up the launch screen
        launchScreen.classList.add('slide-up');
        
        // After animation completes, show main content
        setTimeout(() => {
            launchScreen.style.display = 'none';
            mainContent.classList.remove('hidden');
            mainContent.classList.add('visible');
            
            // Load data after main content is visible
            loadInitialData();
        }, 800); // Match the CSS transition duration
    }, 1000);
}

// Load initial data
function loadInitialData() {
    loadZones();
    loadSchedules();
    startStatusUpdates();
}

// Zone Management
function loadZones() {
    fetch('/api/zones')
        .then(response => response.json())
        .then(data => {
            zones = data;
            renderZones();
            populateZoneDropdowns();
        })
        .catch(error => {
            console.error('Error loading zones:', error);
            showToast('Error loading zones', 'error');
        });
}

function renderZones() {
    const zonesList = document.getElementById('zonesList');
    if (!zonesList) return;
    
    if (zones.length === 0) {
        zonesList.innerHTML = '<div class="empty-state"><h3>No zones configured</h3><p>Add your first zone to get started</p></div>';
        return;
    }
    
    zonesList.innerHTML = zones.map(zone => `
        <div class="zone-row">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${zone.name}</strong> - GPIO ${zone.gpio_pin}
                    ${zone.voltage ? `(${zone.voltage})` : ''}
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="editZone(${zone.id})" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteZone(${zone.id})" class="btn btn-danger" style="padding: 6px 12px; font-size: 0.8rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function populateZoneDropdowns() {
    // Filter zones to only show GPIO 17 and 18
    const availableZones = zones.filter(zone => zone.gpio_pin === 17 || zone.gpio_pin === 18);
    
    // If no GPIO 17 or 18 zones exist, show all zones as fallback
    const zonesToShow = availableZones.length > 0 ? availableZones : zones;
    
    const zoneSelect = document.getElementById('zoneSelect');
    const scheduleZone = document.getElementById('scheduleZone');
    const editScheduleZone = document.getElementById('editScheduleZone');
    
    const zoneOptions = zonesToShow.map(zone => 
        `<option value="${zone.id}">${zone.name} (GPIO ${zone.gpio_pin})</option>`
    ).join('');
    
    if (zoneSelect) {
        zoneSelect.innerHTML = '<option value="">Select Zone</option>' + zoneOptions;
    }
    if (scheduleZone) {
        scheduleZone.innerHTML = '<option value="">Select Zone</option>' + zoneOptions;
    }
    if (editScheduleZone) {
        editScheduleZone.innerHTML = '<option value="">Select Zone</option>' + zoneOptions;
    }
}

function showZonesModal() {
    document.getElementById('zonesModal').classList.add('show');
}

function hideZonesModal() {
    document.getElementById('zonesModal').classList.remove('show');
}

function deleteZone(zoneId) {
    if (!confirm('Are you sure you want to delete this zone? This action cannot be undone.')) {
        return;
    }
    
    fetch(`/api/zones/${zoneId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Zone deleted successfully', 'success');
            loadZones();
        } else {
            showToast(data.error || 'Failed to delete zone', 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting zone:', error);
        showToast('Error deleting zone', 'error');
    });
}

// Schedule Management
function loadSchedules() {
    fetch('/api/schedule')
        .then(response => response.json())
        .then(data => {
            schedules = data;
            renderSchedules();
        })
        .catch(error => {
            console.error('Error loading schedules:', error);
            showToast('Error loading schedules', 'error');
        });
}

function renderSchedules() {
    const schedulesGrid = document.getElementById('schedulesGrid');
    if (!schedulesGrid) return;
    
    if (schedules.length === 0) {
        schedulesGrid.innerHTML = '<div class="empty-state"><h3>No schedules configured</h3><p>Create your first watering schedule to get started</p></div>';
        return;
    }
    
    schedulesGrid.innerHTML = schedules.map(schedule => {
        const zone = zones.find(z => z.id === schedule.zone_id);
        const zoneName = zone ? zone.name : 'Unknown Zone';
        
        return `
            <div class="schedule-card ${schedule.enabled ? 'enabled' : 'disabled'}">
                <div class="schedule-header">
                    <div>
                        <div class="schedule-name">${schedule.name}</div>
                        <div class="schedule-status ${schedule.enabled ? 'enabled' : 'disabled'}">
                            ${schedule.enabled ? 'Active' : 'Inactive'}
                        </div>
                    </div>
                </div>
                <div class="schedule-details">
                    <div class="detail-item">
                        <div class="detail-label">Zone</div>
                        <div class="detail-value">${zoneName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Interval</div>
                        <div class="detail-value">${schedule.interval_minutes}m</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Duration</div>
                        <div class="detail-value">${schedule.duration_seconds}s</div>
                    </div>
                </div>
                <div class="schedule-actions">
                    <button onclick="editSchedule(${schedule.id})" class="btn btn-secondary">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="toggleSchedule(${schedule.id}, ${!schedule.enabled})" class="btn ${schedule.enabled ? 'btn-danger' : 'btn-success'}">
                        <i class="fas fa-${schedule.enabled ? 'pause' : 'play'}"></i> ${schedule.enabled ? 'Disable' : 'Enable'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function showAddScheduleModal() {
    document.getElementById('addScheduleModal').classList.add('show');
}

function hideAddScheduleModal() {
    document.getElementById('addScheduleModal').classList.remove('show');
    document.getElementById('addScheduleForm').reset();
}

function showEditScheduleModal() {
    document.getElementById('editScheduleModal').classList.add('show');
}

function hideEditScheduleModal() {
    document.getElementById('editScheduleModal').classList.remove('show');
}

function editSchedule(scheduleId) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    document.getElementById('editScheduleId').value = schedule.id;
    document.getElementById('editScheduleName').value = schedule.name;
    document.getElementById('editScheduleZone').value = schedule.zone_id;
    document.getElementById('editIntervalMinutes').value = schedule.interval_minutes;
    document.getElementById('editScheduleDuration').value = schedule.duration_seconds;
    document.getElementById('editScheduleEnabled').checked = schedule.enabled;
    
    showEditScheduleModal();
}

function deleteSchedule() {
    const scheduleId = document.getElementById('editScheduleId').value;
    if (!confirm('Are you sure you want to delete this schedule?')) {
        return;
    }
    
    fetch(`/api/schedule/${scheduleId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Schedule deleted successfully', 'success');
            hideEditScheduleModal();
            loadSchedules();
        } else {
            showToast(data.error || 'Failed to delete schedule', 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting schedule:', error);
        showToast('Error deleting schedule', 'error');
    });
}

function toggleSchedule(scheduleId, enabled) {
    fetch(`/api/schedule/${scheduleId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: enabled })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`Schedule ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
            loadSchedules();
        } else {
            showToast(data.error || 'Failed to update schedule', 'error');
        }
    })
    .catch(error => {
        console.error('Error updating schedule:', error);
        showToast('Error updating schedule', 'error');
    });
}

// Quick Control
function activatePin() {
    const zoneId = document.getElementById('zoneSelect').value;
    const duration = document.getElementById('duration').value;
    
    if (!zoneId) {
        showToast('Please select a zone', 'error');
        return;
    }
    
    if (!duration || duration < 1 || duration > 300) {
        showToast('Please enter a valid duration (1-300 seconds)', 'error');
        return;
    }
    
    fetch('/api/pin/activate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            zone_id: parseInt(zoneId),
            duration_seconds: parseInt(duration)
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`Activated zone for ${duration} seconds`, 'success');
            document.getElementById('zoneSelect').value = '';
            document.getElementById('duration').value = '30';
        } else {
            showToast(data.error || 'Failed to activate zone', 'error');
        }
    })
    .catch(error => {
        console.error('Error activating pin:', error);
        showToast('Error activating zone', 'error');
    });
}

// Status Updates
function startStatusUpdates() {
    statusInterval = setInterval(updateStatus, 5000);
    updateStatus(); // Initial update
}

function updateStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            const statusDot = document.getElementById('statusDot');
            const statusText = document.getElementById('statusText');
            
            if (data.system_online) {
                statusDot.style.background = '#4CAF50';
                statusText.textContent = 'System Online';
            } else {
                statusDot.style.background = '#f44336';
                statusText.textContent = 'System Offline';
            }
        })
        .catch(error => {
            console.error('Error updating status:', error);
            const statusDot = document.getElementById('statusDot');
            const statusText = document.getElementById('statusText');
            statusDot.style.background = '#f44336';
            statusText.textContent = 'Connection Error';
        });
}

// Toast Notifications
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize launch screen
    initLaunchScreen();
    
    // Zone form submission
    document.getElementById('addZoneForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('zoneName').value,
            gpio_pin: parseInt(document.getElementById('gpioPin').value),
            voltage: document.getElementById('zoneVoltage').value || null
        };
        
        fetch('/api/zones', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Zone added successfully', 'success');
                document.getElementById('addZoneForm').reset();
                loadZones();
            } else {
                showToast(data.error || 'Failed to add zone', 'error');
            }
        })
        .catch(error => {
            console.error('Error adding zone:', error);
            showToast('Error adding zone', 'error');
        });
    });
    
    // Add schedule form submission
    document.getElementById('addScheduleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('scheduleName').value,
            zone_id: parseInt(document.getElementById('scheduleZone').value),
            interval_minutes: parseInt(document.getElementById('intervalMinutes').value),
            duration_seconds: parseInt(document.getElementById('scheduleDuration').value),
            enabled: document.getElementById('scheduleEnabled').checked
        };
        
        fetch('/api/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Schedule created successfully', 'success');
                hideAddScheduleModal();
                loadSchedules();
            } else {
                showToast(data.error || 'Failed to create schedule', 'error');
            }
        })
        .catch(error => {
            console.error('Error creating schedule:', error);
            showToast('Error creating schedule', 'error');
        });
    });
    
    // Edit schedule form submission
    document.getElementById('editScheduleForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const scheduleId = document.getElementById('editScheduleId').value;
        const formData = {
            name: document.getElementById('editScheduleName').value,
            zone_id: parseInt(document.getElementById('editScheduleZone').value),
            interval_minutes: parseInt(document.getElementById('editIntervalMinutes').value),
            duration_seconds: parseInt(document.getElementById('editScheduleDuration').value),
            enabled: document.getElementById('editScheduleEnabled').checked
        };
        
        fetch(`/api/schedule/${scheduleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('Schedule updated successfully', 'success');
                hideEditScheduleModal();
                loadSchedules();
            } else {
                showToast(data.error || 'Failed to update schedule', 'error');
            }
        })
        .catch(error => {
            console.error('Error updating schedule:', error);
            showToast('Error updating schedule', 'error');
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
}); 