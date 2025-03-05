document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard.html')) loadProfile();
    if (window.location.pathname.includes('admin.html')) loadAdmin();
});

function loadProfile() {
    fetch('/auth/profile')
        .then(res => res.json())
        .then(data => {
            document.getElementById('profile').innerHTML = `
                <h2><i class="fas fa-user"></i> Profile</h2>
                <p>Username: ${data.username}</p>
                <p>Credits: ${data.credits}</p>
                <p>Past Scans: ${data.documents.map(d => d.filename).join(', ')}</p>
            `;
            fetch('/scan/user-analytics')
                .then(res => res.json())
                .then(analytics => {
                    document.getElementById('userAnalytics').innerHTML = `
                        <p>Top Topics: ${analytics.topTopics.map(t => t[0]).join(', ')}</p>
                    `;
                    document.getElementById('dailyScans').textContent = analytics.dailyScans;
                    document.getElementById('scanProgress').style.width = `${(analytics.dailyScans / 20) * 100}%`;
                });
        })
        .catch(err => console.error('Error loading profile:', err));
}

function requestCredits() {
    const credits = prompt('How many credits to request?');
    fetch('/credits/request', { 
        method: 'POST', 
        body: JSON.stringify({ credits }), 
        headers: { 'Content-Type': 'application/json' } 
    })
        .then(() => alert('Request sent'));
}

function exportHistory() {
    fetch('/auth/profile')
        .then(res => res.json())
        .then(data => {
            const text = data.documents.map(d => `${d.filename} - ${d.timestamp}`).join('\n');
            const blob = new Blob([text], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'scan_history.txt';
            link.click();
        });
}

function loadAdmin() {
    fetch('/admin/analytics')
        .then(res => res.json())
        .then(data => {
            const analyticsTable = document.getElementById('analytics');
            analyticsTable.innerHTML = `
                <tr>
                    <th>Top Users</th>
                    <th>Top Topics</th>
                    <th>Daily Scans</th>
                    <th>Credit Usage Stats</th>
                </tr>
                ${data.users.map((u, i) => `
                    <tr>
                        <td>${u.username} (${u.scans} scans, ${u.credits} credits)</td>
                        <td>${data.topTopics[i] ? data.topTopics[i][0] : ''}</td>
                        <td>${data.dailyScans[i] ? `${data.dailyScans[i].user_id}: ${data.dailyScans[i].scan_count} on ${data.dailyScans[i].scan_date}` : ''}</td>
                        <td>${data.creditStats[i] ? `${data.creditStats[i].username}: ${data.creditStats[i].requests} requests, ${data.creditStats[i].total_credits} credits` : ''}</td>
                    </tr>
                `).join('')}
            `;
        });
    fetch('/credits/admin/requests')
        .then(res => res.json())
        .then(requests => {
            document.getElementById('requests').innerHTML = requests.map(r => `
                <p>${r.username} requests ${r.credits} credits 
                <button onclick="approveRequest(${r.id}, true)">Approve</button>
                <button onclick="approveRequest(${r.id}, false)">Deny</button></p>
            `).join('');
        });
}

function approveRequest(id, approve) {
    fetch('/credits/admin/approve', { 
        method: 'POST', 
        body: JSON.stringify({ requestId: id, approve }), 
        headers: { 'Content-Type': 'application/json' } 
    })
        .then(() => loadAdmin());
}

document.getElementById('uploadForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const matchesDiv = document.getElementById('matches');
    matchesDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Scanning...</p>';
    const formData = new FormData(e.target);
    fetch('/scan/upload', { 
        method: 'POST', 
        body: formData,
        credentials: 'include'
    })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            loadProfile();
            return fetch(`/scan/matches/${data.docId}`, { credentials: 'include' });
        })
        .then(res => res.json())
        .then(matches => {
            matchesDiv.innerHTML = matches.length > 0 
                ? `<h2><i class="fas fa-search"></i> Matches</h2><ul>${matches.map(m => `<li>${m.filename} - ${(m.similarity * 100).toFixed(2)}% (${m.source}) <button onclick="downloadFile('${m.filename}')"><i class="fas fa-download"></i> Download</button></li>`).join('')}</ul>`
                : '<p>No matching documents found with 50% or more similarity.</p>';
        })
        .catch(err => {
            matchesDiv.innerHTML = `<p>Error: ${err.message}</p>`;
            alert('Upload or matching failed: ' + err);
        });
});

document.getElementById('adjustCreditsForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const credits = formData.get('credits');
    fetch('/credits/admin/adjust-credits', {
        method: 'POST',
        body: JSON.stringify({ username, credits }),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => res.text())
        .then(msg => alert(msg))
        .then(() => loadAdmin())
        .catch(err => alert('Adjustment failed: ' + err));
});

document.getElementById('adminUploadForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    fetch('/scan/admin/upload-to-uploads', {
        method: 'POST',
        body: formData,
        credentials: 'include'
    })
        .then(res => res.text())
        .then(msg => alert(msg))
        .catch(err => alert('Upload failed: ' + err));
});

function downloadFile(filename) {
    window.location.href = `/scan/download/${filename}`;
}