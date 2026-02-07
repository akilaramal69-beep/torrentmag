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
            const response = await fetch(`/api/files/${taskId}`);
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

        console.log('Sending magnet:', magnet);
        addBtn.disabled = true;
        addBtn.textContent = 'Adding...';

        try {
            const response = await fetch('/api/magnet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ magnet })
            });

            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            addBtn.disabled = false;
            addBtn.textContent = 'Add Magnet';

            if (data.error === 'CAPTCHA_REQUIRED') {
                captchaContainer.classList.remove('hidden');
                localStorage.setItem('pending_magnet', magnet);

                alert('CAPTCHA required. Please resolve the challenge displayed below.');

                console.log('CAPTCHA Data:', data.data);
                let captchaUrl = data.data.url || (data.data.details && data.data.details.url);

                if (!captchaUrl && Array.isArray(data.data.details)) {
                    const detailWithUrl = data.data.details.find(d => d.url);
                    if (detailWithUrl) captchaUrl = detailWithUrl.url;
                }

                if (captchaUrl) {
                    captchaFrameContainer.innerHTML = `<iframe src="${captchaUrl}" width="100%" height="450px" frameborder="0"></iframe>`;
                } else {
                    captchaFrameContainer.innerHTML = `<p>No direct CAPTCHA URL found. Please check logs/console for details on how to solve.</p>`;
                    console.warn('Could not extract CAPTCHA URL from:', data.data);
                }

            } else if (data.success) {
                tasks.push({ id: data.task.task.id, status: 'started', name: data.task.task.name });
                localStorage.setItem('pikpak_tasks', JSON.stringify(tasks));
                renderTasks();
                magnetInput.value = '';
                setTimeout(() => checkTaskStatus(data.task.task.id), 2000);
            } else {
                alert('Failed to add magnet: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Fetch error:', error);
            addBtn.disabled = false;
            addBtn.textContent = 'Add Magnet';
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
