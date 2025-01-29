#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// 确保资源路径在打包后也能正确访问
const getAssetPath = (relativePath) => {
  const basePath = process.pkg 
    ? path.dirname(process.execPath)
    : __dirname;
  return path.join(basePath, relativePath);
};

const app = express();
const port = 3001;

// 存储运行中的进程
const runningProcesses = new Map();

// 启用 CORS
app.use(cors());

// 提供静态文件
app.use(express.static(getAssetPath('public')));

// 测试端点
app.get('/test', (req, res) => {
    res.json({ status: 'ok' });
});

// 获取应用列表
app.get('/api/applications', async (req, res) => {
    try {
        const appList = await loadApplications();
        res.json(appList);
    } catch (error) {
        console.error('获取应用列表失败:', error);
        res.status(500).json({ error: '获取应用程序列表失败' });
    }
});

// 启动应用
app.get('/start/:appId', async (req, res) => {
    const { appId } = req.params;
    
    try {
        const apps = await loadApplications();
        const app = apps.find(a => a.id === appId);
        
        if (!app) {
            return res.status(404).json({ error: '找不到指定的应用程序' });
        }

        // 如果进程已经在运行，直接返回成功
        if (runningProcesses.has(appId)) {
            return res.json({ message: `${app.name} 已经在运行` });
        }

        // 使用 spawn 而不是 exec
        const process = spawn(app.startCommand, [], {
            shell: true,
            detached: true,
            stdio: 'ignore'
        });

        // 将进程与应用ID关联
        runningProcesses.set(appId, process);

        // 解除父进程对子进程的引用
        process.unref();

        res.json({ message: `已启动 ${app.name}` });
    } catch (error) {
        console.error(`启动应用程序失败:`, error);
        res.status(500).json({ error: '启动应用程序失败' });
    }
});

// 停止应用
app.get('/stop/:appId', async (req, res) => {
    const { appId } = req.params;
    
    try {
        const apps = await loadApplications();
        const app = apps.find(a => a.id === appId);
        
        if (!app) {
            return res.status(404).json({ error: '找不到指定的应用程序' });
        }

        // 如果有关联的进程，先尝试结束它
        const process = runningProcesses.get(appId);
        if (process) {
            try {
                process.kill();
            } catch (e) {
                console.log(`关闭进程时出现警告: ${e.message}`);
            }
            runningProcesses.delete(appId);
        }

        // 执行 killCommand 来确保进程被终止
        exec(app.killCommand, (error, stdout, stderr) => {
            if (error) {
                console.log(`执行关闭命令时出现警告:`, error.message);
            }
            res.json({ message: `已关闭 ${app.name}` });
        });
    } catch (error) {
        console.error(`停止应用程序失败:`, error);
        res.status(500).json({ error: '停止应用程序失败' });
    }
});

// 加载应用配置
async function loadApplications() {
    try {
        const configPath = getAssetPath(path.join('config', 'applications.json'));
        const data = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(data);
        return config.applications;
    } catch (error) {
        console.error('读取应用配置失败:', error);
        throw error;
    }
}

async function loadApplicationConfig(appName) {
    const appList = await loadApplications();
    return appList[appName];
}

// 优雅关闭
function gracefulShutdown() {
    console.log('\n正在关闭服务器...');
    
    // 结束所有运行中的进程
    for (const [appId, process] of runningProcesses.entries()) {
        try {
            process.kill();
            console.log(`已关闭进程: ${appId}`);
        } catch (error) {
            console.log(`关闭进程 ${appId} 时出现警告: ${error.message}`);
        }
    }
    
    process.exit(0);
}

// 监听进程终止信号
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// 启动服务器
app.listen(port, '0.0.0.0', () => {
    console.log(`服务器运行在 http://0.0.0.0:${port}`);
    
    // 显示所有可用的网络地址
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    
    console.log('\n可用的访问地址:');
    console.log('本机访问: http://localhost:' + port);
    
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // 跳过内部 IPv6 地址和非 IPv4 地址
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`局域网访问 (${name}): http://${net.address}:${port}`);
            }
        }
    }
});
