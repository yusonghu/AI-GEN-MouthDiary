# 中文字体配置说明

## 问题
PDF 导出功能需要中文字体才能正确显示中文内容。如果不配置中文字体，PDF 中的中文将显示为乱码或空白方块。

## 解决方案

### 方法 1：下载并放置字体文件（推荐）

1. 下载中文字体文件（推荐 Noto Sans CJK SC）：
   - 访问：https://github.com/notofonts/noto-cjk/releases
   - 下载 `NotoSansCJKsc-Regular.otf` 或其他中文字体

2. 将字体文件放置到项目目录：
   ```
   server/fonts/NotoSansCJKsc-Regular.otf
   ```

3. 支持的字体格式：
   - .otf (OpenType)
   - .ttf (TrueType)
   - .ttc (TrueType Collection)

### 方法 2：使用系统字体

程序会自动检测以下位置的系统字体：

**Windows:**
- `C:\Windows\Fonts\simhei.ttf` (黑体)
- `C:\Windows\Fonts\simsun.ttc` (宋体)
- `C:\Windows\Fonts\msyh.ttc` (微软雅黑)

**Linux:**
- `/usr/share/fonts/truetype/wqy/wqy-microhei.ttc`
- `/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc`

**macOS:**
- `/System/Library/Fonts/PingFang.ttc` (苹方)
- `/System/Library/Fonts/STHeiti Light.ttc` (华文黑体)
- `/Library/Fonts/Arial Unicode.ttf`

## 验证

启动服务器后，查看控制台输出：
- 如果显示 `Found Chinese font: [路径]`，说明字体加载成功
- 如果显示警告信息，说明需要手动添加字体文件

## 推荐的免费中文字体

1. **Noto Sans CJK SC** (思源黑体) - 推荐
   - 开源、免费
   - 支持简体中文、繁体中文、日文、韩文
   - 下载：https://github.com/notofonts/noto-cjk/releases

2. **文泉驿微米黑 (WenQuanYi Micro Hei)**
   - 开源、免费
   - Linux 系统通常自带

3. **系统自带字体**
   - Windows：微软雅黑、宋体、黑体
   - macOS：苹方、华文黑体
