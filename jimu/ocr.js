// === Auto.js Pro 9 · Node 引擎 · 最小 OCR 测试 ===
(async function () {
    try {
        const plugins = require('plugins');
        const images  = require('images');

        console.log('Engine =', (global.process && process.versions) ? 'Node' : 'Rhino');

        // 查看已安装插件，确认包名
        const list = await plugins.list().catch(() => []);
        console.log('[plugins.list] 已安装：', list);

        // 申请截屏 & 截一张图
        await images.requestScreenCapture();
        await new Promise(r => setTimeout(r, 150));
        const img = await images.captureScreen();
        if (!img) { console.error('❌ 截屏失败'); return; }

        // 加载 OCR 引擎：优先 MLKit，失败再 Paddle
        let Ctor, using = '';
        try {
            Ctor = await plugins.load('org.autojs.autojspro.plugin.mlkit.ocr');
            using = 'mlkit';
        } catch (e) {
            console.warn('MLKit 加载失败，改用 Paddle：', e && e.message);
            Ctor = await plugins.load('org.autojs.autojspro.plugin.paddle.ocr');
            using = 'paddle';
        }
        const ocr = new Ctor({ language: 'zh', lang: 'ch' });

        const t0 = Date.now();
        const res = await ocr.detect(img);
        console.log(`✅ ${using} 识别完成，用时 ${Date.now()-t0}ms`);
        console.log(JSON.stringify(res, null, 2));

        // 展示提取的纯文本
        const text = (res || []).map(it => it.text).join(' | ');
        console.log('TEXT =>', text);

        img.recycle && img.recycle();
    } catch (err) {
        console.error('❌ OCR 测试异常：', err && (err.stack || err.message || err));
    }
})();
