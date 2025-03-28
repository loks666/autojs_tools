# Auto.js Pro 工具包

这是一个基于 [Auto.js Pro 9.x](https://pro.autojs.org/) 的自动化脚本工具包，适用于安卓设备上的各种自动化任务开发。

本项目聚合了作者在 Auto.js Pro 脚本开发过程中积累的各类通用工具、打卡逻辑、日期判断、设备控制等模块，旨在提升脚本复用性和开发效率。

---

## ✨ 特性功能

- ✅ 工作日判断（接入法定节假日 API）
- ✅ 飞书/钉钉等 App 自动跳转、打卡脚本
- ✅ 通用时间段控制逻辑（早晚执行）
- ✅ 支持日志输出、异常提示、接口容错
- ✅ 脚本结构清晰，适合二次开发

---

## 📦 使用方式

### 安装 Auto.js Pro

前往 [Auto.js Pro 官网](https://pro.autojs.org/) 下载并安装 APK。

> 本项目脚本基于 **Auto.js Pro 9.x** 编写，不兼容开源版 Auto.js。

### 运行脚本

将 `.js` 文件放入手机 `/sdcard/脚本/` 目录或 Auto.js Pro 的默认目录，打开后运行即可。

### 示例脚本：飞书打卡

```js
if (isTodayWorkday()) {
  app.startActivity({
    action: "android.intent.action.VIEW",
    data: "https://applink.feishu.cn/xxxx"
  });
}
```

---

## 🔧 推荐配套工具

- 🕒 Tasker / AutoStart（用于定时触发脚本）
- 📱 Shizuku / 无障碍服务保持器
- 📄 日志查看工具（如存储到文件 / 微信推送）

---

## 📁 目录说明

```
utils/               # 工具方法（如日期判断、日志输出）
scripts/             # 各类具体功能脚本
screenshots/         # 打卡或操作截图目录（可选）
logs/                # 自动运行日志（可选）
README.md            # 项目说明文件
.gitignore           # Git 忽略配置
```

---

## 📜 许可证

本项目以 MIT License 许可，欢迎学习使用，禁止用于违反法律法规的用途。

---

如需定制脚本、批量控制设备、进阶应用（如自动截图上传、操作监控等），欢迎联系作者。

