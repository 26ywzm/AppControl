const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const port = 3001;

// 允许跨域请求
app.use(cors());

// 提供静态文件
app.use(express.static('public'));

// 读取应用程序配置
let applications = {};

async function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'config', 'applications.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        applications = config.applications;
        console.log('成功加载应用程序配置');
        return true;
    } catch (error) {
        console.error('加载配置文件失败:', error);
        return false;
    }
}

// 获取所有可用应用列表的接口
app.get('/api/applications', (req, res) => {
    const appList = Object.entries(applications).map(([id, app]) => ({
        id,
        name: app.name,
        description: app.description,
        icon: app.icon
    }));
    res.json(appList);
});

// 启动应用程序终结点
app.get('/start/:app', async (req, res) => {
    const appName = req.params.app;
    if (applications[appName]) {
        console.log(`尝试启动 ${appName}，命令：${applications[appName].start}`);
        exec(applications[appName].start, (error, stdout, stderr) => {
            if (error) {
                console.error(`启动 ${appName} 失败:`, error);
                res.status(500).json({ error: `启动${applications[appName].name}失败: ${error.message}` });
                return;
            }
            console.log(`${appName} 启动成功`);
            res.json({ message: `${applications[appName].name}启动成功` });
        });
    } else {
        res.status(404).json({ error: '找不到指定的应用程序' });
    }
});

// 停止应用程序终结点
app.get('/stop/:app', async (req, res) => {
    const appName = req.params.app;
    if (applications[appName]) {
        console.log(`尝试关闭 ${appName}，命令：${applications[appName].kill}`);
        exec(applications[appName].kill, (error, stdout, stderr) => {
            if (error) {
                console.error(`关闭 ${appName} 失败:`, error);
                res.status(500).json({ error: `关闭${applications[appName].name}失败: ${error.message}` });
                return;
            }
            if (stderr) {
                console.log(`关闭 ${appName} 时有警告:`, stderr);
            }
            console.log(`${appName} 已关闭`);
            res.json({ message: `${applications[appName].name}已关闭` });
        });
    } else {
        res.status(404).json({ error: '找不到指定的应用程序' });
    }
});

// 提供主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
async function startServer() {
    // 首先加载配置
    const configLoaded = await loadConfig();
    if (!configLoaded) {
        console.error('无法启动服务器：配置加载失败');
        process.exit(1);
    }

    // 启动服务器
    app.listen(port, () => {
        console.log(`服务器运行在 http://localhost:${port}`);
        console.log('可用的应用程序:', Object.keys(applications).join(', '));
    });
}

// 启动服务器
startServer();
