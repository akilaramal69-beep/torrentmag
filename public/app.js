document.addEventListener('DOMContentLoaded', () => {
    const magnetInput = document.getElementById('magnet-input');
    const addBtn = document.getElementById('add-btn');
    const fileList = document.getElementById('file-list');
    const captchaContainer = document.getElementById('captcha-container');
    const captchaInput = document.getElementById('captcha-input');
    const submitCaptchaBtn = document.getElementById('submit-captcha');

    // Load tasks from local storage
    let tasks = JSON.parse(localStorage.getItem('pikpak_tasks')) || [];

    function renderTasks() {
        fileList.innerHTML = '';
        tasks.forEach(task => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <span>${task.name || 'New Task'}</span>
                <span>${task.status || 'Pending'}</span>
            `;
            fileList.appendChild(div);
        });
    }

    async function checkTaskStatus(taskId) {
        try {
            const response = await fetch(\`/api/files/\${taskId}\`);
            const data = await response.json();
             if (data.error === 'CAPTCHA_REQUIRED') {
                captchaContainer.classList.remove('hidden');
                return;
            }
            if (data.success) {
                const taskIndex = tasks.findIndex(t => t.id === taskId);
                if (taskIndex > -1) {
                    tasks[taskIndex].status = data.data.phase;
                    tasks[taskIndex].name = data.data.name;
                    localStorage.setItem('pikpak_tasks', JSON.stringify(tasks));
                    renderTasks();
                }
            }
        } catch (error) {
            console.error('Error checking task status:', error);
        }
    }

    addBtn.addEventListener('click', async () => {
        const magnet = magnetInput.value.trim();
        if (!magnet) return alert('Please enter a magnet link');

        try {
            const response = await fetch('/api/magnet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ magnet })
            });

            const data = await response.json();

            if (data.error === 'CAPTCHA_REQUIRED') {
                captchaContainer.classList.remove('hidden');
                // Temporarily store the magnet to retry after captcha
                localStorage.setItem('pending_magnet', magnet);
            } else if (data.success) {
                tasks.push({ id: data.task.task.id, status: 'started', name: data.task.task.name });
                localStorage.setItem('pikpak_tasks', JSON.stringify(tasks));
                renderTasks();
                magnetInput.value = '';
                // Start polling for status
                setTimeout(() => checkTaskStatus(data.task.task.id), 2000);
            } else {
                alert('Failed to add magnet: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });

    submitCaptchaBtn.addEventListener('click', async () => {
        const token = captchaInput.value.trim();
        if (!token) return alert('Please enter CAPTCHA token');

        try {
            const response = await fetch('/api/captcha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });
            const data = await response.json();
            
            if (data.success) {
                captchaContainer.classList.add('hidden');
                alert('Captcha solved! calculated. Retrying pending action...');
                
                const pendingMagnet = localStorage.getItem('pending_magnet');
                 if (pendingMagnet) {
                     // Retry adding the magnet
                     addBtn.click();
                     localStorage.removeItem('pending_magnet');
                 }
            } else {
                alert('Failed to submit CAPTCHA: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
             alert('Error: ' + error.message);
        }
    });

    renderTasks();
    // Poll all tasks periodically
    setInterval(() => {
        tasks.forEach(task => {
            if (task.status !== 'PHASE_TYPE_COMPLETE') {
                checkTaskStatus(task.id);
            }
        });
    }, 5000);
});
