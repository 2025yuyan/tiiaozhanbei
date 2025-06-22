const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middlewares
app.use(cors({
    origin: '*', // 允许所有来源的跨域请求
    methods: ['GET', 'POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // 用于解析JSON格式的请求体

// --- 内存数据存储 ---
// 警告: 这些数据不是持久的。在Serverless环境中，每次服务调用都可能是一个新的实例，内存会重置。
// 真实应用请使用Vercel Postgres等数据库。
const tokens = new Set();
const medicineRemindList = [
    { id: 1, time: "08:00", name: "降压药", status: "待服用" }
];
const discussList = [
    { id: 1, user: "张阿姨", content: "最近睡眠质量不太好..." }
];
const newsList = [
    { id: 1, title: "如何健康饮食", content: "..." }
];
const userProfile = {
    id: 1,
    name: "李大爷",
    phone: "138****8888"
};
// --- 数据存储结束 ---

const AI_DIAGNOSIS_KEY = process.env.AI_DIAGNOSIS_KEY;
const AI_ASK_KEY = process.env.AI_ASK_KEY;

// --- 辅助函数 ---
function checkToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return false;
    const token = authHeader.replace("Bearer ", "");
    return tokens.has(token);
}

function extractText(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (data && data.choices && data.choices.length > 0 && data.choices[0].text) {
            return data.choices[0].text.replace(/\\n/g, '\n').trim();
        }
    } catch (e) {
        console.error("解析AI响应JSON失败:", e);
    }
    return "";
}

// --- 路由 ---

// 认证
app.post('/auth/send-code', (req, res) => {
    res.json({ code: 0, msg: "验证码已发送" });
});

app.post('/auth/login-phone', (req, res) => {
    const token = uuidv4();
    tokens.add(token);
    res.json({ code: 0, msg: "登录成功", token, user: { id: 1, name: "李大爷" } });
});

app.post('/auth/login-account', (req, res) => {
    const token = uuidv4();
    tokens.add(token);
    res.json({ code: 0, msg: "登录成功", token, user: { id: 1, name: "李大爷" } });
});

app.post('/auth/guest-login', (req, res) => {
    const token = uuidv4();
    tokens.add(token);
    res.json({ code: 0, msg: "登录成功", token, user: { id: 0, name: "体验用户" } });
});

app.post('/auth/forgot-password', (req, res) => {
    res.json({ code: 0, msg: "新密码已发送到手机" });
});

// 用户
app.get('/user/profile', (req, res) => {
    res.json({ code: 0, user: userProfile });
});

// 健康数据
app.get('/health/home', (req, res) => {
    res.json({
        code: 0,
        data: {
            heartRate: 72,
            bloodPressure: "120/80",
            sleep: 7.5,
            sleepQuality: 15,
            medicineRemind: [
                { time: "08:00", name: "降压药", status: "待服用" },
                { time: "12:00", name: "糖尿病药", status: "已服用" }
            ],
            trend: {
                dates: ["05-20", "05-21", "05-22"],
                heartRate: [74, 73, 72]
            }
        }
    });
});

app.get('/health/records', (req, res) => {
    res.json({
        code: 0,
        records: [
            { type: "history", title: "健康历史记录", desc: "..." },
            { type: "report", title: "医院检查报告", desc: "..." },
            { type: "doctor", title: "医生诊疗记录", desc: "..." }
        ]
    });
});

// 用药提醒
app.get('/medicine/remind', (req, res) => {
    res.json({ code: 0, remindList: medicineRemindList });
});
app.post('/medicine/remind', (req, res) => {
    res.json({ code: 0, msg: "保存成功" });
});
app.delete('/medicine/remind', (req, res) => {
    res.json({ code: 0, msg: "删除成功" });
});

// 社区
app.get('/community/news', (req, res) => {
    res.json({ code: 0, news: newsList });
});
app.get('/community/discuss', (req, res) => {
    res.json({ code: 0, discuss: discussList });
});
app.post('/community/discuss', (req, res) => {
    res.json({ code: 0, msg: "发布成功" });
});

// AI 接口
app.post('/ai/diagnosis', async (req, res) => {
    const { symptoms } = req.body;
    if (!symptoms) {
        return res.status(400).json({ code: 400, msg: '症状是必填项' });
    }
    if (!AI_DIAGNOSIS_KEY) {
        return res.status(500).json({ code: 500, msg: '服务端未配置智能诊断的AI API KEY' });
    }

    try {
        const response = await fetch("https://jiutian.10086.cn/largemodel/api/v2/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_DIAGNOSIS_KEY}`
            },
            body: JSON.stringify({
                model: "jiutian-lan",
                prompt: `根据症状："${symptoms}"，请给出初步的健康建议和可能的原因。`,
                max_tokens: 200
            })
        });

        const responseText = await response.text();
        if (!response.ok) {
            console.error('AI API 错误:', response.status, responseText);
            return res.status(500).json({ code: 500, msg: '智能诊断服务异常' });
        }

        const diagnosis = extractText(responseText);
        res.json({ code: 0, diagnosis });

    } catch (error) {
        console.error("调用AI诊断API时出错:", error);
        res.status(500).json({ code: 500, msg: "智能诊断服务异常" });
    }
});

app.post('/ai/ask', async (req, res) => {
    const { question } = req.body;
    if (!question) {
        return res.status(400).json({ code: 400, msg: '问题是必填项' });
    }
    if (!AI_ASK_KEY) {
        return res.status(500).json({ code: 500, msg: '服务端未配置AI问答的AI API KEY' });
    }

    try {
        const response = await fetch("https://jiutian.10086.cn/largemodel/api/v2/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_ASK_KEY}`
            },
            body: JSON.stringify({
                model: "jiutian-lan",
                prompt: question,
                max_tokens: 200
            })
        });
        
        const responseText = await response.text();
        if (!response.ok) {
            console.error('AI API 错误:', response.status, responseText);
            return res.status(500).json({ code: 500, msg: 'AI服务异常' });
        }
        
        const answer = extractText(responseText);
        res.json({ code: 0, answer });

    } catch (error) {
        console.error("调用AI问答API时出错:", error);
        res.status(500).json({ code: 500, msg: "AI服务异常" });
    }
});

app.post('/ai/tts', (req, res) => {
    // 真实的TTS服务需要调用云服务接口，这里仅为模拟
    res.json({ code: 0, audioUrl: "https://example.com/audio/generated.mp3" });
});

// 根路由，用于健康检查或基本信息
app.get('/', (req, res) => {
    res.send('Backend server is running.');
});

// 启动服务器 (本地开发时使用)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// 导出 Express 应用，供 Vercel 调用
module.exports = app; 
