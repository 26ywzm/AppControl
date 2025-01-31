class AppControlWidget {
    constructor(containerId) {
        this.containerId = containerId;
        this.serverUrl = 'http://localhost:3001';
        this.apps = [];
        this.init();
    }

    async init() {
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.error(`找不到容器元素: ${this.containerId}`);
            return;
        }

        // 添加样式
        this.createStyles();
        
        try {
            // 加载应用列表
            await this.loadApps();
            
            // 渲染界面
            this.render();

            // 启动状态更新
            this.startStatusRefresh();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showError('加载应用列表失败');
        }
    }

    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .app-control-widget {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
            }
            .app-card {
                background: #fff;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .app-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            .app-info {
                flex: 1;
            }
            .app-name {
                font-size: 18px;
                font-weight: bold;
                margin: 0;
            }
            .app-description {
                color: #666;
                margin: 5px 0;
            }
            .app-status {
                font-size: 14px;
                padding: 4px 8px;
                border-radius: 4px;
                margin-top: 5px;
            }
            .status-running {
                background-color: #e8f5e9;
                color: #2e7d32;
            }
            .status-stopped {
                background-color: #ffebee;
                color: #c62828;
            }
            .app-controls {
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
            }
            .btn:hover {
                opacity: 0.9;
            }
            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            .btn-start {
                background-color: #4caf50;
                color: white;
            }
            .btn-stop {
                background-color: #f44336;
                color: white;
            }
            .btn-schedule {
                background-color: #2196f3;
                color: white;
            }
            .schedule-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 1000;
            }
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999;
            }
            .schedule-form {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .form-group {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            .form-group label {
                font-weight: bold;
            }
            .form-group select,
            .form-group input {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .modal-buttons {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
        `;
        document.head.appendChild(style);
    }

    async loadApps() {
        const response = await fetch(`${this.serverUrl}/api/applications`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        this.apps = await response.json();
    }

    startStatusRefresh() {
        // 每5秒更新一次状态
        this.statusInterval = setInterval(() => {
            this.apps.forEach(app => this.updateAppStatus(app.id));
        }, 5000);
    }

    async updateAppStatus(appId) {
        try {
            const response = await fetch(`${this.serverUrl}/status/${appId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const status = await response.json();
            
            const statusElement = document.getElementById(`status-${appId}`);
            const startButton = document.getElementById(`start-${appId}`);
            const stopButton = document.getElementById(`stop-${appId}`);
            
            if (statusElement && startButton && stopButton) {
                statusElement.textContent = `状态: ${status.status === 'running' ? '运行中' : '已停止'}`;
                statusElement.className = `app-status status-${status.status}`;
                
                if (status.status === 'running') {
                    startButton.disabled = true;
                    stopButton.disabled = false;
                    statusElement.textContent += ` (运行时间: ${this.formatUptime(status.uptime)})`;
                } else {
                    startButton.disabled = false;
                    stopButton.disabled = true;
                }
            }
        } catch (error) {
            console.error(`更新应用状态失败: ${appId}`, error);
        }
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const parts = [];
        if (hours > 0) parts.push(`${hours}小时`);
        if (minutes > 0) parts.push(`${minutes}分钟`);
        parts.push(`${secs}秒`);
        
        return parts.join(' ');
    }

    async startApp(appId) {
        try {
            const response = await fetch(`${this.serverUrl}/start/${appId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            await this.updateAppStatus(appId);
        } catch (error) {
            console.error('启动应用失败:', error);
            this.showError('启动应用失败');
        }
    }

    async stopApp(appId) {
        try {
            const response = await fetch(`${this.serverUrl}/stop/${appId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            await this.updateAppStatus(appId);
        } catch (error) {
            console.error('停止应用失败:', error);
            this.showError('停止应用失败');
        }
    }

    showScheduleModal(app) {
        const modal = document.createElement('div');
        modal.className = 'schedule-modal';
        modal.innerHTML = `
            <h3>设置定时任务 - ${app.name}</h3>
            <form class="schedule-form">
                <div class="form-group">
                    <label for="schedule-action">动作</label>
                    <select id="schedule-action">
                        <option value="start">启动</option>
                        <option value="stop">停止</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="schedule-time">时间</label>
                    <input type="time" id="schedule-time" required>
                </div>
                <div class="modal-buttons">
                    <button type="button" class="btn" onclick="document.querySelector('.schedule-modal').remove();document.querySelector('.modal-overlay').remove();">取消</button>
                    <button type="submit" class="btn btn-schedule">保存</button>
                </div>
            </form>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // 处理表单提交
        modal.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const action = document.getElementById('schedule-action').value;
            const time = document.getElementById('schedule-time').value;
            
            if (!time) {
                this.showError('请选择时间');
                return;
            }

            const [hours, minutes] = time.split(':');
            const schedule = `${minutes} ${hours} * * *`; // Cron 格式

            try {
                const response = await fetch(`${this.serverUrl}/schedule`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        appId: app.id,
                        action,
                        schedule
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                modal.remove();
                overlay.remove();
                this.showSuccess('定时任务已创建');
            } catch (error) {
                console.error('创建定时任务失败:', error);
                this.showError('创建定时任务失败');
            }
        });
    }

    showError(message) {
        alert(message);
    }

    showSuccess(message) {
        alert(message);
    }

    render() {
        this.container.innerHTML = '';
        const widget = document.createElement('div');
        widget.className = 'app-control-widget';

        this.apps.forEach(app => {
            const appCard = document.createElement('div');
            appCard.className = 'app-card';
            
            // 创建一个安全的app对象副本，只包含需要的属性
            const safeApp = {
                id: app.id,
                name: app.name,
                description: app.description
            };
            
            appCard.innerHTML = `
                <div class="app-header">
                    <div class="app-info">
                        <h3 class="app-name">${app.name}</h3>
                        <div class="app-description">${app.description}</div>
                        <div id="status-${app.id}" class="app-status">状态: 检查中...</div>
                    </div>
                </div>
                <div class="app-controls">
                    <button id="start-${app.id}" class="btn btn-start" onclick="startApp('${app.id}')">启动</button>
                    <button id="stop-${app.id}" class="btn btn-stop" onclick="stopApp('${app.id}')" disabled>停止</button>
                    <button class="btn btn-schedule" data-app='${JSON.stringify(safeApp)}' onclick="showScheduleModal(this.dataset.app)">定时任务</button>
                </div>
            `;
            widget.appendChild(appCard);
        });

        this.container.appendChild(widget);

        // 初始化所有应用的状态
        this.apps.forEach(app => this.updateAppStatus(app.id));
    }

    destroy() {
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
    }
}

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppControlWidget;
} else {
    window.AppControlWidget = AppControlWidget;
}
