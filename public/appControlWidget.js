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
        
        try {
            // 加载应用列表
            await this.loadApplications();
            
            // 渲染界面
            this.render();
        } catch (error) {
            console.error('初始化失败:', error);
            this.container.innerHTML = '<div class="app-widget-error">加载应用列表失败</div>';
        }
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
                    transition: all 0.2s;
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
                    padding: 5px 10px;
                    border-radius: 4px;
                }
                .app-widget-status.success {
                    background-color: #e8f5e9;
                    color: #2e7d32;
                }
                .app-widget-status.error {
                    background-color: #ffebee;
                    color: #c62828;
                }
                .app-widget-error {
                    color: #f44336;
                    text-align: center;
                    padding: 20px;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 从服务器加载应用列表
    async loadApplications() {
        try {
            console.log('正在从服务器加载应用列表...');
            const response = await fetch(`${this.serverUrl}/api/applications`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('加载到的应用列表:', data);
            this.apps = data;
        } catch (error) {
            console.error('加载应用程序列表失败:', error);
            throw error;
        }
    }

    // 渲染界面
    render() {
        if (!this.apps || this.apps.length === 0) {
            this.container.innerHTML = '<div class="app-widget-error">没有可用的应用程序</div>';
            return;
        }

        this.container.innerHTML = '';
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'app-widget';

        this.apps.forEach(app => {
            const appElement = document.createElement('div');
            appElement.className = 'app-widget-item';
            
            // 创建应用标题
            const header = document.createElement('div');
            header.className = 'app-widget-header';
            header.innerHTML = `<h3 class="app-widget-title">${app.name}</h3>`;
            
            // 创建描述
            const description = document.createElement('div');
            description.className = 'app-widget-description';
            description.textContent = app.description || '';
            
            // 创建控制按钮
            const controls = document.createElement('div');
            controls.className = 'app-widget-controls';
            
            const startButton = document.createElement('button');
            startButton.className = 'app-widget-btn start';
            startButton.textContent = `启动${app.name}`;
            startButton.addEventListener('click', () => this.controlApp(app.id, 'start'));
            
            const stopButton = document.createElement('button');
            stopButton.className = 'app-widget-btn stop';
            stopButton.textContent = `关闭${app.name}`;
            stopButton.addEventListener('click', () => this.controlApp(app.id, 'stop'));
            
            controls.appendChild(startButton);
            controls.appendChild(stopButton);
            
            // 创建状态显示
            const status = document.createElement('div');
            status.id = `${app.id}-status`;
            status.className = 'app-widget-status';
            
            // 组装所有元素
            appElement.appendChild(header);
            appElement.appendChild(description);
            appElement.appendChild(controls);
            appElement.appendChild(status);
            
            widgetContainer.appendChild(appElement);
        });

        this.container.appendChild(widgetContainer);
        console.log('界面渲染完成');
    }

    // 控制应用程序
    async controlApp(appId, action) {
        console.log(`正在${action === 'start' ? '启动' : '关闭'}应用:`, appId);
        const statusElement = document.getElementById(`${appId}-status`);
        statusElement.className = 'app-widget-status';
        statusElement.textContent = `正在${action === 'start' ? '启动' : '关闭'}...`;

        try {
            const response = await fetch(`${this.serverUrl}/${action}/${appId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('服务器响应:', data);
            statusElement.textContent = data.message || data.error;
            statusElement.className = `app-widget-status ${data.error ? 'error' : 'success'}`;
        } catch (error) {
            console.error('控制应用程序时发生错误:', error);
            statusElement.textContent = '操作失败，请检查网络连接';
            statusElement.className = 'app-widget-status error';
        }
    }
}
