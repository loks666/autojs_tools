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
const POST_SCROLL_WAIT_MS  = 300;   // 单次滑动后等待（ms）
const MAX_SCROLL_STEPS     = 12;    // 最多向下翻页次数，避免死循环
const END_STABLE_REPEATS   = 2;     // 连续多少次“滑不动”视为到底

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

/************* 滑动相关 *************/
function scrollOnePageNoBounce(){
    // 1) 无障碍容器滚动（无惯性，最稳）
    let sc = scrollable(true).findOne(300);
    if (sc && sc.scrollForward()){
        sleep(POST_SCROLL_WAIT_MS);
        return true; // 成功滑动
    }
    // 2) 手势滑动
    const centerX = Math.floor(device.width * 0.5);
    const startY  = Math.floor(device.height * 0.9);
    const endY    = Math.floor(device.height * 0.1);
    const before = getBottomSignature();
    gestures([SCROLL_GESTURE_MS, [centerX, startY], [centerX, endY]]);
    sleep(POST_SCROLL_WAIT_MS);
    const after = getBottomSignature();
    return before !== after; // “签名”不同视为滑动成功
}

function getBottomSignature(){
    const nodes = classNameMatches(/.*/).find();
    let items = [];
    for (let i = 0; i < nodes.length; i++) {
        const b = nodes[i].bounds();
        // 取屏幕底部40%区域的可见文本/desc
        if (b && b.top > device.height * 0.6) {
            const t = (nodes[i].text() || "");
            const d = (nodes[i].desc() || "");
            if (t || d) items.push((t + "|" + d + "|" + b.top + "," + b.bottom));
        }
    }
    items.sort();
    return items.slice(-10).join("§");
}

function scrollToBottom(){
    log("[滚动] 开始滑到底部 …");
    let noMoveCount = 0;
    for (let i = 0; i < MAX_SCROLL_STEPS; i++){
        const moved = scrollOnePageNoBounce();
        if (moved) {
            noMoveCount = 0;
        } else {
            noMoveCount++;
            if (noMoveCount >= END_STABLE_REPEATS){
                log("[滚动] 触发“滑不动”稳定状态，已到最底");
                break;
            }
        }
    }
    sleep(260);
    log("[滚动] 滑到底部完成");
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

/************* 底部二次判真（仅“空插画”与“X月”） *************/
function isRobotByEmptyIllustration(){
    return (EMPTY_ID && id(EMPTY_ID).exists());
}
function hasMonthMark(){
    // 只看“1~12月”，避免把“10月20日”之外的数字搅进来，这里不做更复杂过滤
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
    sleep(300); // 渲染缓冲
    const hasRealBadge = waitRealBadge(DETECT_TIMEOUT_MS);
    log("[检测] 真实头像/实名: " + (hasRealBadge ? "是" : "否"));

    if (hasRealBadge) {
        log("[真人] 命中『真实头像/实名』 → 点赞");
        clickRect(HEART_BTN, "小心心");
    } else {
        // —— Step2: 无真实/实名 → 滑到底，然后仅看“空插画 / X月” ——
        scrollToBottom();

        if (isRobotByEmptyIllustration()) {
            log("[底部裁决] 空动态插画 → 机器人 → 关闭");
            clickRect(CLOSE_BTN, "叉号");
        } else if (hasMonthMark()) {
            log("[底部裁决] 出现‘X月’ → 真人 → 右滑");
            clickRect(HEART_BTN, "小心心");
        } else {
            log("[底部裁决] 无空插画且无‘X月’ → 机器人 → 关闭");
            clickRect(CLOSE_BTN, "叉号");
        }
    }

    // 返回列表页
    back(); sleep(300);

    if (Date.now() >= __DEADLINE) break;
    sleep(120); // 轮间隔
}

log("【结束】脚本已运行 "+fmt(Date.now()-__START_TS)+"（目标 "+RUN_MINUTES+" 分钟）");
