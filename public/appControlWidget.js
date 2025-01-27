class AppControlWidget {
    constructor(options = {}) {
        this.serverUrl = options.serverUrl || 'http://localhost:3001';
        this.container = null;
        this.apps = [];
    }

    // 初始化小部件
    async init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`找不到容器元素: ${containerId}`);
            return;
        }

        // 添加样式
        this.addStyles();
        
        // 加载应用列表
        await this.loadApplications();
        
        // 渲染界面
        this.render();
    }

    // 添加样式
    addStyles() {
        if (!document.getElementById('app-control-widget-style')) {
            const style = document.createElement('style');
            style.id = 'app-control-widget-style';
            style.textContent = `
                .app-widget {
                    font-family: Arial, sans-serif;
                    background-color: #f5f5f5;
                    border-radius: 8px;
                    padding: 15px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .app-widget-item {
                    background-color: white;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .app-widget-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                }
                .app-widget-title {
                    margin: 0;
                    font-size: 16px;
                    font-weight: bold;
                }
                .app-widget-description {
                    color: #666;
                    font-size: 14px;
                    margin: 5px 0;
                }
                .app-widget-controls {
                    display: flex;
                    gap: 10px;
                    margin-top: 10px;
                }
                .app-widget-btn {
                    padding: 8px 15px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: opacity 0.2s;
                }
                .app-widget-btn:hover {
                    opacity: 0.9;
                }
                .app-widget-btn.start {
                    background-color: #4CAF50;
                    color: white;
                }
                .app-widget-btn.stop {
                    background-color: #f44336;
                    color: white;
                }
                .app-widget-status {
                    margin-top: 8px;
                    font-size: 14px;
                    color: #666;
                }
                .app-widget-error {
                    color: #f44336;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 从服务器加载应用列表
    async loadApplications() {
        try {
            const response = await fetch(`${this.serverUrl}/api/applications`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.apps = await response.json();
        } catch (error) {
            console.error('加载应用程序列表失败:', error);
            this.container.innerHTML = '<div class="app-widget-error">加载应用程序列表失败</div>';
        }
    }

    // 渲染界面
    render() {
        this.container.innerHTML = '';
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'app-widget';

        this.apps.forEach(app => {
            const appElement = document.createElement('div');
            appElement.className = 'app-widget-item';
            appElement.innerHTML = `
                <div class="app-widget-header">
                    <h3 class="app-widget-title">${app.name}</h3>
                </div>
                <div class="app-widget-description">${app.description || ''}</div>
                <div class="app-widget-controls">
                    <button class="app-widget-btn start" onclick="appWidget.controlApp('${app.id}', 'start')">
                        启动${app.name}
                    </button>
                    <button class="app-widget-btn stop" onclick="appWidget.controlApp('${app.id}', 'stop')">
                        关闭${app.name}
                    </button>
                </div>
                <div id="${app.id}-status" class="app-widget-status"></div>
            `;
            widgetContainer.appendChild(appElement);
        });

        this.container.appendChild(widgetContainer);
    }

    // 控制应用程序
    async controlApp(appId, action) {
        const statusElement = document.getElementById(`${appId}-status`);
        try {
            const response = await fetch(`${this.serverUrl}/${action}/${appId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            statusElement.textContent = data.message || data.error;
            statusElement.className = 'app-widget-status';
        } catch (error) {
            statusElement.textContent = '控制应用程序时发生错误';
            statusElement.className = 'app-widget-status app-widget-error';
            console.error('控制应用程序时发生错误:', error);
        }
    }
}
