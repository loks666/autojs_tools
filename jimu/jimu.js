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
// 空动态插画 ID
const EMPTY_ID   = "com.fenzotech.jimu:id/userEmptyLayout";

// 滑动速度与等待配置（越小越快，但过小可能触发回弹）
const SCROLL_GESTURE_MS    = 180; // 手势时长（ms）
const POST_SCROLL_WAIT_MS  = 150; // 滑动后稳定等待（ms）

/************* 工具函数 *************/
function tapCenterOfRect(r){
    const cx = ((r.x1 + r.x2) / 2) | 0;
    const cy = ((r.y1 + r.y2) / 2) | 0;
    click(cx, cy); sleep(300);
    return {cx, cy};
}
function clickRect(r, label){
    const p = tapCenterOfRect(r);
    log("【点击】『" + label + "』（坐标：" + p.cx + "," + p.cy + "）");
}
function inDetailStrict(){
    // 详情页特征：发现页卡片消失 + 出现“打招呼/发消息”
    const hasDetailAction   = textMatches(/打招呼|发消息/).exists();
    const discoverCardsGone = !id("card_user_info").exists();
    return hasDetailAction && discoverCardsGone;
}
function goDiscover(){
    let tab = textContains("发现").findOne(2000);
    if (!tab) { log("【错误】未找到『发现』入口"); exit(); }
    if (!tab.click()) { let b = tab.bounds(); click(b.centerX(), b.centerY()); }
    sleep(300);
    log("【步骤】点击『发现』并进入『发现』页面");
}
// 仅一次尝试：点击详情箭头
function enterDetail(){
    log("【进入详情】尝试：点击『详情箭头』");
    const p = tapCenterOfRect(ENTER_AREA);
    log("【点击】『详情箭头』（坐标：" + p.cx + "," + p.cy + "）");
    sleep(300);
    if (inDetailStrict()){ log("【进入详情】已进入详情页（通过详情箭头）"); return true; }
    log("【进入详情】未进入详情页（本轮不重试）");
    return false;
}

/**
 * 只滑动一次且尽量不回弹：
 * 1) 优先 scrollForward()（无惯性）；
 * 2) 否则用 gestures 快速滑动（一次手势，使用可调时长 SCROLL_GESTURE_MS）。
 */
function scrollOnePageNoBounce(){
    // 1) 无障碍容器滚动（无惯性，最稳）
    let sc = scrollable(true).findOne(500);
    if (sc && sc.scrollForward()){
        log("【滚动】scrollForward() 下滑一屏（无惯性、无回弹）");
        return;
    }

    // 2) 快速滑动（一次手势，减少时间提高速度）
    const x    = Math.floor(device.width  * 0.5);
    const yS   = Math.floor(device.height * 0.85); // 起点更靠下，增大滑动距离
    const yE   = Math.floor(device.height * 0.15); // 终点更靠上，增大滑动距离
    gestures([SCROLL_GESTURE_MS, [x, yS], [x, yE]]);
    log("【滚动】手势快速下滑一屏（时长 " + SCROLL_GESTURE_MS + "ms）");
}

/************* 主流程：每一轮都点击『发现』 *************/
let round = 0;
while (Date.now() < __DEADLINE) {
    round++;
    log("——— 第 "+round+" 轮开始（已用 "+fmt(Date.now()-__START_TS)+"，剩余 "+fmt(__DEADLINE-Date.now())+"）———");

    // 1) 每一轮：先点击『发现』
    goDiscover();

    // 2) 进入详情（只尝试一次）
    if (!enterDetail()) { log("【错误】进入详情失败，本轮跳过"); sleep(300); continue; }
    log("【步骤】确认处于『详情页』");

    // 3) 详情页：检测是否包含真实头像，但统一在滑动后处理
    const hasRealAvatar = textContains("真实头像").exists();
    if (hasRealAvatar) {
        log("【判断-详情】检测到『真实头像』，将在滑动后统一处理");
    } else {
        log("【判断-详情】未检测到『真实头像』，将在滑动后统一判断是否为真人");
    }

    // 滑动屏幕
    log("【操作】下滑一屏（只一次）+ 等 " + POST_SCROLL_WAIT_MS + "ms，再统一判断");
    scrollOnePageNoBounce();
    sleep(POST_SCROLL_WAIT_MS);

    // 统一判断：优先处理真实头像，再判断是否为机器人
    if (hasRealAvatar) {
        log("【判定】真实头像 → 点击『小心心』");
        clickRect(HEART_BTN, "小心心");
    } else {
        // 检测月字（命中则判为真人）
        const hasMonth = textContains("月").exists();
        
        if (hasMonth){
            log("【判定】真人：检测到『月』时间线索 → 点击『小心心』");
            clickRect(HEART_BTN, "小心心");
        } else {
            // 再看：空插画（命中则判机器人）
            const hasEmptyIllustration = id(EMPTY_ID).exists();
            if (hasEmptyIllustration){
                log("【判定】机器人：检测到『用户空动态插画』 → 点击『叉号』");
                clickRect(CLOSE_BTN, "叉号");
            } else {
                // 都没有：当真人处理
                log("【判定】默认真人：未发现『月』时间线索，且未检测到空插画 → 点击『小心心』");
                clickRect(HEART_BTN, "小心心");
            }
        }
    }

    // 4) 返回上一层，为下一轮做准备（下一轮会再次点击『发现』）
    back(); sleep(300);
    log("【步骤】已返回列表页");

    if (Date.now() >= __DEADLINE) break;
    sleep(100); // 缩短轮间隔时间从300ms到100ms，提高运行效率
}

log("【结束】脚本已运行 "+fmt(Date.now()-__START_TS)+"（目标 "+RUN_MINUTES+" 分钟）");
