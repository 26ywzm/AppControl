#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const schedule = require('node-schedule');

// 配置日志记录器
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

// 在开发环境下同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// 确保资源路径在打包后也能正确访问
const getAssetPath = (relativePath) => {
    const basePath = process.pkg 
        ? path.dirname(process.execPath)
        : __dirname;
    return path.join(basePath, relativePath);
};

const app = express();
const port = 3001;

// 存储运行中的进程和定时任务
const runningProcesses = new Map();
const scheduledTasks = new Map();

// 启用 CORS
app.use(cors());

// 解析 JSON 请求体
app.use(express.json());

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
        logger.error('获取应用列表失败:', error);
        res.status(500).json({ error: '获取应用程序列表失败' });
    }
});

// 获取应用状态
app.get('/status/:appId', async (req, res) => {
    const { appId } = req.params;
    
    try {
        const processInfo = runningProcesses.get(appId);
        if (!processInfo) {
            return res.json({ status: 'stopped' });
        }

        const { startTime, name } = processInfo;
        const uptime = Date.now() - startTime.getTime();

        res.json({
            status: 'running',
            name,
            startTime: startTime.toISOString(),
            uptime: Math.floor(uptime / 1000) // 转换为秒
        });
    } catch (error) {
        logger.error(`获取应用状态失败:`, error);
        res.status(500).json({ error: '获取应用状态失败' });
    }
});

// 启动应用
app.get('/start/:appId', async (req, res) => {
    const { appId } = req.params;
    
    try {
        const apps = await loadApplications();
        const app = apps.find(a => a.id === appId);
        
        if (!app) {
            logger.warn(`尝试启动未知应用: ${appId}`);
            return res.status(404).json({ error: '找不到指定的应用程序' });
        }

        // 如果进程已经在运行，直接返回成功
        if (runningProcesses.has(appId)) {
            return res.json({ message: `${app.name} 已经在运行` });
        }

        const process = spawn(app.startCommand, [], {
            shell: true,
            detached: true,
            stdio: 'pipe' // 捕获输出用于日志
        });

        // 记录进程输出
        process.stdout.on('data', (data) => {
            logger.info(`[${app.name}] 输出: ${data}`);
        });
        process.stderr.on('data', (data) => {
            logger.error(`[${app.name}] 错误: ${data}`);
        });

        // 记录进程状态
        runningProcesses.set(appId, {
            process,
            startTime: new Date(),
            name: app.name
        });

        // 解除父进程对子进程的引用
        process.unref();

        logger.info(`已启动应用: ${app.name}`);
        res.json({ message: `已启动 ${app.name}` });
    } catch (error) {
        logger.error(`启动应用程序失败:`, error);
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
        const processInfo = runningProcesses.get(appId);
        if (processInfo) {
            try {
                processInfo.process.kill();
                logger.info(`已终止进程: ${app.name}`);
            } catch (e) {
                logger.warn(`关闭进程时出现警告: ${e.message}`);
            }
            runningProcesses.delete(appId);
        }

        // 执行 killCommand 来确保进程被终止
        exec(app.killCommand, (error, stdout, stderr) => {
            if (error) {
                logger.warn(`执行关闭命令时出现警告:`, error.message);
            }
            res.json({ message: `已关闭 ${app.name}` });
        });
    } catch (error) {
        logger.error(`停止应用程序失败:`, error);
        res.status(500).json({ error: '停止应用程序失败' });
    }
});

// 创建定时任务
app.post('/schedule', async (req, res) => {
    const { appId, action, schedule: scheduleConfig } = req.body;
    
    try {
        const apps = await loadApplications();
        const app = apps.find(a => a.id === appId);
        
        if (!app) {
            return res.status(404).json({ error: '找不到指定的应用程序' });
        }

        // 取消现有的定时任务
        if (scheduledTasks.has(appId)) {
            scheduledTasks.get(appId).cancel();
            logger.info(`已取消应用 ${app.name} 的现有定时任务`);
        }

        // 创建新的定时任务
        const job = schedule.scheduleJob(scheduleConfig, async function() {
            logger.info(`执行定时任务: ${action} ${app.name}`);
            if (action === 'start' && !runningProcesses.has(appId)) {
                try {
                    const process = spawn(app.startCommand, [], {
                        shell: true,
                        detached: true,
                        stdio: 'pipe'
                    });
                    runningProcesses.set(appId, {
                        process,
                        startTime: new Date(),
                        name: app.name
                    });
                    process.unref();
                    logger.info(`定时任务成功启动应用: ${app.name}`);
                } catch (error) {
                    logger.error(`定时任务启动应用失败: ${app.name}`, error);
                }
            } else if (action === 'stop' && runningProcesses.has(appId)) {
                try {
                    const processInfo = runningProcesses.get(appId);
                    processInfo.process.kill();
                    runningProcesses.delete(appId);
                    exec(app.killCommand);
                    logger.info(`定时任务成功停止应用: ${app.name}`);
                } catch (error) {
                    logger.error(`定时任务停止应用失败: ${app.name}`, error);
                }
            }
        });

        scheduledTasks.set(appId, job);
        
        logger.info(`已为应用 ${app.name} 创建定时任务: ${action} at ${scheduleConfig}`);
        res.json({ message: `已创建定时任务` });
    } catch (error) {
        logger.error(`创建定时任务失败:`, error);
        res.status(500).json({ error: '创建定时任务失败' });
    }
});

// 加载应用配置
async function loadApplications() {
    try {
        const configPath = getAssetPath('config/applications.json');
        const data = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(data);
        return config.applications;
    } catch (error) {
        logger.error('读取应用配置失败:', error);
        throw error;
    }
}

// 优雅关闭
function gracefulShutdown() {
    logger.info('正在关闭服务器...');

    // 结束所有运行中的进程
    for (const [appId, processInfo] of runningProcesses.entries()) {
        try {
            processInfo.process.kill();
            logger.info(`已关闭进程: ${processInfo.name}`);
        } catch (error) {
            logger.error(`关闭进程 ${processInfo.name} 时出现警告: ${error.message}`);
        }
    }

    // 取消所有定时任务
    for (const [appId, job] of scheduledTasks.entries()) {
        job.cancel();
        logger.info(`已取消定时任务: ${appId}`);
    }

    process.exit(0);
}

// 监听进程终止信号
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// 启动服务器
app.listen(port, () => {
    logger.info(`服务器已启动，监听端口 ${port}`);
});
