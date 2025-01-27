const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3001;

// 启用 CORS，允许所有来源的请求
app.use(cors());

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 读取应用程序配置
async function loadApplications() {
    try {
        const configPath = path.join(__dirname, 'config', 'applications.json');
        const data = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(data);
        return config.applications;
    } catch (error) {
        console.error('加载应用程序配置失败:', error);
        return {};
    }
}

// 获取应用程序列表的 API
app.get('/api/applications', async (req, res) => {
    try {
        const applications = await loadApplications();
        // 转换为前端需要的格式
        const appList = Object.entries(applications).map(([id, app]) => ({
            id,
            name: app.name,
            description: app.description,
            icon: app.icon
        }));
        console.log('发送应用列表:', appList); // 添加日志
        res.json(appList);
    } catch (error) {
        console.error('获取应用程序列表失败:', error);
        res.status(500).json({ error: '获取应用程序列表失败' });
    }
});

// 启动应用程序
app.get('/start/:app', async (req, res) => {
    try {
        const applications = await loadApplications();
        const appName = req.params.app;
        console.log('尝试启动应用:', appName); // 添加日志
        
        if (applications[appName]) {
            exec(applications[appName].start, (error, stdout, stderr) => {
                if (error) {
                    console.error(`启动${appName}失败:`, error);
                    res.status(500).json({ error: `启动${applications[appName].name}失败` });
                    return;
                }
                console.log(`${appName}启动成功`); // 添加日志
                res.json({ message: `${applications[appName].name}启动成功` });
            });
        } else {
            res.status(404).json({ error: '找不到指定的应用程序' });
        }
    } catch (error) {
        console.error('启动应用程序时发生错误:', error);
        res.status(500).json({ error: '启动应用程序时发生错误' });
    }
});

// 停止应用程序
app.get('/stop/:app', async (req, res) => {
    try {
        const applications = await loadApplications();
        const appName = req.params.app;
        console.log('尝试停止应用:', appName); // 添加日志
        
        if (applications[appName]) {
            exec(applications[appName].kill, (error, stdout, stderr) => {
                if (error) {
                    console.error(`关闭${appName}失败:`, error);
                    res.status(500).json({ error: `关闭${applications[appName].name}失败` });
                    return;
                }
                console.log(`${appName}已关闭`); // 添加日志
                res.json({ message: `${applications[appName].name}已关闭` });
            });
        } else {
            res.status(404).json({ error: '找不到指定的应用程序' });
        }
    } catch (error) {
        console.error('停止应用程序时发生错误:', error);
        res.status(500).json({ error: '停止应用程序时发生错误' });
    }
});

// 测试端点
app.get('/test', (req, res) => {
    res.json({ message: '服务器正常运行' });
});

// 启动服务器
app.listen(port, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${port}`);
    console.log(`本地访问: http://localhost:${port}`);
    console.log(`局域网访问: http://${require('os').networkInterfaces()['以太网']?.[0]?.address || 'YOUR_IP_ADDRESS'}:${port}`);
});
