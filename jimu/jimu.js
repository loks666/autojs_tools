app.launchPackage("com.fenzotech.jimu");

// 1. 进入页面，先点击“发送消息”按钮坐标一次
// click(659, 1692); // “自动发送消息”按钮

// 2. 点击“发现”
var btn = textContains("发现").findOne();
if (btn) {
    var b = btn.bounds();
    click(b.centerX(), b.centerY());
}

// =====设置分钟数=====
var minutes = 30; // 你自己改
// ====================
var endTime = Date.now() + minutes * 60 * 1000;

// 小心心坐标
var heartX = 694, heartY = 2048;

while (Date.now() < endTime) {
    // 先点小心心
    click(heartX, heartY);

    // // 判断页面是否有“稍后再聊”
    var btnLater = text("稍后再聊").findOnce();
    if (btnLater) {
        click(659, 1692); // 再点一次“自动发送消息”
    }
}
