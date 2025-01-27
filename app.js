const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3001;

// 启用更详细的 CORS 配置
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// 添加请求日志中间件
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${req.ip}`);
    next();
});

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
    const applications = await loadApplications();
    const appName = req.params.app;
    if (applications[appName]) {
        exec(applications[appName].start, (error, stdout, stderr) => {
            if (error) {
                console.error(`启动${appName}失败:`, error);
                res.status(500).json({ error: `启动${applications[appName].name}失败` });
                return;
            }
            res.json({ message: `${applications[appName].name}启动成功` });
        });
    } else {
        res.status(404).json({ error: '找不到指定的应用程序' });
    }
});

// 停止应用程序
app.get('/stop/:app', async (req, res) => {
    const applications = await loadApplications();
    const appName = req.params.app;
    if (applications[appName]) {
        exec(applications[appName].kill, (error, stdout, stderr) => {
            if (error) {
                console.error(`关闭${appName}失败:`, error);
                res.status(500).json({ error: `关闭${applications[appName].name}失败` });
                return;
            }
            res.json({ message: `${applications[appName].name}已关闭` });
        });
    } else {
        res.status(404).json({ error: '找不到指定的应用程序' });
    }
});

// 添加一个测试端点
app.get('/test', (req, res) => {
    res.json({ message: '服务器正常运行' });
});

// 监听所有网络接口
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`\n服务器启动成功！`);
    console.log(`时间: ${new Date().toISOString()}`);
    console.log(`\n可用的网络接口:`);
    
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`- 接口 ${name}: http://${net.address}:${port}`);
            }
        }
    }
    
    console.log(`\n请确保防火墙已允许端口 ${port}`);
    console.log(`测试链接: http://localhost:${port}/test`);
});

// 添加错误处理
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`\n错误: 端口 ${port} 已被占用`);
        console.log('请确保没有其他程序正在使用此端口，或者修改 port 变量使用其他端口');
    } else {
        console.error('服务器错误:', error);
    }
});
