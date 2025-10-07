/************* 运行时长控制 *************/
const RUN_MINUTES = 60;                 // ← 想跑多久（分钟）就改这里
const __START_TS = Date.now();
const __DEADLINE = __START_TS + RUN_MINUTES * 60 * 1000;
function fmt(ms){
    let s = Math.max(0, Math.floor(ms/1000));
    let m = Math.floor(s/60);
    let r = s%60;
    return (m+"分"+(r<10?"0":"")+r+"秒");
}

/************* 启动与就绪 *************/
auto.waitFor();
app.launchPackage("com.fenzotech.jimu"); sleep(300);
waitForPackage("com.fenzotech.jimu");    sleep(300);
log("【启动】积目App已启动(目标运行 "+RUN_MINUTES+" 分钟)");

/************* 坐标配置（你确认过的） *************/
// 发现页 → 详情页 的右下角触发区（“详情箭头”）
const ENTER_AREA = {x1:906, y1:1834, x2:993, y2:1921};
// 详情页底部按钮：小心心 & 叉号
const HEART_BTN  = {x1:226, y1:2187, x2:336, y2:2297};
const CLOSE_BTN  = {x1: 43, y1:2187, x2:153, y2:2297};
// 空动态插画 ID（如需）
const EMPTY_ID   = "com.fenzotech.jimu:id/userEmptyLayout";

/************* 滑动与等待配置 *************/
const SCROLL_GESTURE_MS    = 180;   // 单次手势时长（ms）
const POST_SCROLL_WAIT_MS  = 300;   // scrollForward 后的静态等待（ms）
const INERTIA_TIMEOUT_MS   = 1600;  // 惯性停止的最大等待时长（ms）
const STABLE_REPEATS       = 3;     // 连续多少次签名一致视为“稳定”

/************* 工具函数 *************/
function tapCenterOfRect(r){
    const cx = ((r.x1 + r.x2) / 2) | 0;
    const cy = ((r.y1 + r.y2) / 2) | 0;
    click(cx, cy); sleep(300);
    return {cx, cy};
}
function clickRect(r, label){
    tapCenterOfRect(r);
    log("[点击] " + label);
}
function inDetailStrict(){
    // 详情页特征：发现页卡片消失
    const discoverCardsGone = !id("card_user_info").exists();
    return discoverCardsGone;
}
function goDiscover(){
    let tab = textContains("发现").findOne(2000);
    if (!tab) { log("【错误】未找到『发现』入口"); exit(); }
    if (!tab.click()) { let b = tab.bounds(); click(b.centerX(), b.centerY()); }
    sleep(300);
    log("【步骤】点击『发现』并进入『发现』页面");
}
function enterDetail(){
    log("【进入详情】尝试：点击『详情箭头』");
    const p = tapCenterOfRect(ENTER_AREA);
    log("【点击】『详情箭头』（坐标：" + p.cx + "," + p.cy + "）");
    sleep(300);
    if (inDetailStrict()){ log("【进入详情】已进入详情页（通过详情箭头）"); return true; }
    log("【进入详情】未进入详情页（本轮不重试）");
    return false;
}

/************* 视图稳定性签名，用于等待“惯性停止” *************/
function getViewportSignature(){
    // 取全屏文本/desc + 大致位置，构造轻量指纹
    const nodes = classNameMatches(/.*/).find();
    let items = [];
    for (let i = 0; i < nodes.length; i++) {
        const b = nodes[i].bounds();
        if (!b) continue;
        const t = (nodes[i].text() || "");
        const d = (nodes[i].desc() || "");
        if (t || d) items.push((t + "|" + d + "|" + b.top + "," + b.bottom));
    }
    items.sort();
    // 截取末尾若干项，避免过长
    return items.slice(-20).join("§");
}
function waitViewportStable(timeoutMs, stableRepeats){
    const end = Date.now() + timeoutMs;
    let last = null;
    let stable = 0;
    while (Date.now() < end) {
        const sig = getViewportSignature();
        if (sig === last) {
            stable++;
            if (stable >= stableRepeats) {
                log("[稳定] 视图签名连续一致，惯性停止");
                return true;
            }
        } else {
            stable = 0;
            last = sig;
        }
        sleep(120);
    }
    log("[稳定] 达到最大等待时长，继续后续判定");
    return false;
}

/************* “滑一屏并等待惯性停止” *************/
function scrollOneScreenAndWait(){
    // 优先 scrollForward（无惯性），否则手势（有惯性则等停）
    let sc = scrollable(true).findOne(300);
    if (sc && sc.scrollForward()){
        log("[滑动] scrollForward() 下滑一屏（无惯性）");
        sleep(POST_SCROLL_WAIT_MS);
        return;
    }
    const centerX = Math.floor(device.width * 0.5);
    const startY  = Math.floor(device.height * 0.9);
    const endY    = Math.floor(device.height * 0.1);
    gestures([SCROLL_GESTURE_MS, [centerX, startY], [centerX, endY]]);
    log("[滑动] 手势上滑一屏（可能有惯性），等待稳定 …");
    waitViewportStable(INERTIA_TIMEOUT_MS, STABLE_REPEATS);
}

/************* 真实/实名：只判断两个关键词（无抖动/无OCR/无regex花样） *************/
const DETECT_TIMEOUT_MS = 2000; // 挂载等待

function hasRealBadgeSimple(){
    // 只看“真实头像”或“实名”四/两字（text 或 contentDescription）
    if (textContains("真实头像").exists()) return true;
    if (descContains("真实头像").exists()) return true;
    if (textContains("实名").exists()) return true;
    if (descContains("实名").exists()) return true;
    return false;
}
function waitRealBadge(timeoutMs){
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
        if (hasRealBadgeSimple()) return true;
        sleep(120);
    }
    return false;
}

/************* 一屏后的文本判定（仅“空插画 / X月”） *************/
function isRobotByEmptyIllustration(){
    return (EMPTY_ID && id(EMPTY_ID).exists());
}
function hasMonthMark(){
    // 只看“1~12月”
    return textMatches(/(^|[^0-9])(0?[1-9]|1[0-2])月([^0-9]|$)/).exists();
}

/************* 主流程：每一轮都点击『发现』 *************/
let round = 0;
while (Date.now() < __DEADLINE) {
    round++;
    log("第"+round+"轮（已用"+fmt(Date.now()-__START_TS)+"，剩余"+fmt(__DEADLINE-Date.now())+"）");

    // 进入详情页
    goDiscover();
    if (!enterDetail()) { log("[错误] 进入详情失败，跳过"); sleep(300); continue; }

    // —— Step1: 先判“真实头像/实名”（只这两个词） ——
    sleep(600); // 渲染缓冲
    const hasRealBadge = waitRealBadge(DETECT_TIMEOUT_MS);
    log("[检测] 真实头像/实名: " + (hasRealBadge ? "是" : "否"));

    if (hasRealBadge) {
        log("[真人] 命中『真实头像/实名』 → 点赞");
        clickRect(HEART_BTN, "小心心");
    } else {
        // —— Step2: 只滑“一屏”，等惯性停稳后再做文本判断（不再滑到底）——
        scrollOneScreenAndWait();

        if (isRobotByEmptyIllustration()) {
            log("[一屏裁决] 空动态插画 → 机器人 → 关闭");
            clickRect(CLOSE_BTN, "叉号");
        } else if (hasMonthMark()) {
            log("[一屏裁决] 出现‘X月’ → 真人 → 点赞");
            clickRect(HEART_BTN, "小心心");
        } else {
            log("[一屏裁决] 无空插画且无‘X月’ → 机器人 → 关闭");
            clickRect(CLOSE_BTN, "叉号");
        }
    }

    // 返回列表页
    back(); sleep(300);

    if (Date.now() >= __DEADLINE) break;
    sleep(120); // 轮间隔
}

log("【结束】脚本已运行 "+fmt(Date.now()-__START_TS)+"（目标 "+RUN_MINUTES+" 分钟）");
