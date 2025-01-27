class AppController {
    constructor(serverUrl = 'http://localhost:3001') {
        this.serverUrl = serverUrl;
    }

    // 创建控制按钮
    createControl(appName, containerId, labels = {
        start: '启动',
        stop: '关闭',
        title: ''
    }) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`找不到容器元素: ${containerId}`);
            return;
        }

        const controlDiv = document.createElement('div');
        controlDiv.className = 'app-control';
        controlDiv.innerHTML = `
            <h2>${labels.title || appName}</h2>
            <div class="button-group">
                <button class="start-btn" onclick="appController.controlApp('${appName}', 'start')">${labels.start}</button>
                <button class="stop-btn" onclick="appController.controlApp('${appName}', 'stop')">${labels.stop}</button>
            </div>
            <div id="${appName}-status" class="status"></div>
        `;

        // 添加样式
        if (!document.getElementById('app-controller-style')) {
            const style = document.createElement('style');
            style.id = 'app-controller-style';
            style.textContent = `
                .app-control {
                    background-color: white;
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .button-group {
                    display: flex;
                    gap: 10px;
                }
                .start-btn, .stop-btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.3s;
                }
                .start-btn {
                    background-color: #4CAF50;
                    color: white;
                }
                .stop-btn {
                    background-color: #f44336;
                    color: white;
                }
                .start-btn:hover, .stop-btn:hover {
                    opacity: 0.9;
                }
                .status {
                    margin-top: 10px;
                    color: #666;
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(controlDiv);
    }

    // 控制应用程序
    async controlApp(app, action) {
        try {
            const response = await fetch(`${this.serverUrl}/${action}/${app}`);
            const data = await response.json();
            document.getElementById(`${app}-status`).textContent = data.message || data.error;
        } catch (error) {
            document.getElementById(`${app}-status`).textContent = '控制应用程序时发生错误';
            console.error('控制应用程序时发生错误:', error);
        }
    }
}
