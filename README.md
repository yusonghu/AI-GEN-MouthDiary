# 小鼠日记本 (Mouse Diary)

一个简洁、专业的实验室小鼠实验记录管理系统。

## 功能特性

### 核心功能
- 🐭 **小鼠管理**：添加、编辑、删除小鼠信息，支持搜索和筛选
- 📝 **实验记录**：记录日常称重、给药、行为测试、采血、解剖等实验数据
- 📊 **数据统计**：可视化展示品系分布、性别比例、实验类型统计等
- 📤 **数据导出**：支持导出Excel表格和PDF报告

### 页面模块
1. **首页/仪表盘**：快速统计概览、最近实验记录、快捷操作入口
2. **小鼠管理**：小鼠列表、搜索筛选、批量操作、分页展示
3. **小鼠详情**：基本信息、体重变化图表、实验记录时间轴
4. **实验记录**：实验列表、日期筛选、批量删除
5. **数据统计**：多种图表展示数据分布和趋势
6. **数据导出**：条件筛选导出、导出历史记录

## 技术栈

- **前端**：HTML5 + CSS3 + Vanilla JavaScript
- **后端**：Node.js + Express
- **数据库**：SQLite3
- **图表**：Chart.js
- **导出**：xlsx (Excel) + pdfkit (PDF)

## 项目结构

```
mouse-diary/
├── public/              # 前端静态资源
│   ├── css/
│   │   └── style.css    # 主样式文件
│   ├── js/
│   │   └── app.js       # 主应用逻辑
│   └── index.html       # 主页面
├── server/              # 后端代码
│   ├── database.js      # 数据库连接和初始化
│   ├── app.js           # Express应用主文件
│   └── routes/
│       ├── mice.js      # 小鼠API路由
│       ├── experiments.js # 实验记录API路由
│       ├── stats.js     # 统计API路由
│       └── export.js    # 导出功能API路由
├── data/                # 数据库文件目录
│   └── mouse_diary.db   # SQLite数据库
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## 安装和运行

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run init-db
```

### 3. 启动服务器

```bash
# 开发模式（带热重载）
npm run dev

# 生产模式
npm start
```

### 4. 访问应用

打开浏览器访问 http://localhost:3000

## API接口

### 小鼠管理
- `GET /api/mice` - 获取小鼠列表（支持分页、搜索、筛选）
- `GET /api/mice/:id` - 获取单只小鼠详情
- `POST /api/mice` - 添加小鼠
- `PUT /api/mice/:id` - 更新小鼠信息
- `DELETE /api/mice/:id` - 删除小鼠
- `GET /api/mice/:id/experiments` - 获取小鼠的实验记录

### 实验记录
- `GET /api/experiments` - 获取实验记录列表
- `GET /api/experiments/:id` - 获取单条实验记录
- `POST /api/experiments` - 添加实验记录
- `PUT /api/experiments/:id` - 更新实验记录
- `DELETE /api/experiments/:id` - 删除实验记录
- `POST /api/experiments/batch-delete` - 批量删除

### 数据统计
- `GET /api/stats/overview` - 概览统计
- `GET /api/stats/strain-distribution` - 品系分布
- `GET /api/stats/gender-distribution` - 性别比例
- `GET /api/stats/experiment-types` - 实验类型分布
- `GET /api/stats/monthly-trend` - 月度趋势
- `GET /api/stats/mouse-weight/:mouseId` - 小鼠体重历史

### 数据导出
- `POST /api/export/excel` - 导出Excel
- `POST /api/export/pdf` - 导出PDF

## 界面设计规范

### 颜色方案
- 主色：#2196F3（蓝色）
- 成功：#4CAF50（绿色）
- 警告：#FF9800（橙色）
- 危险：#F44336（红色）
- 背景：#F5F5F5（浅灰）

### 布局规范
- 导航栏高度：60px
- 最大内容宽度：1200px
- 卡片圆角：8px
- 按钮圆角：4px
- 页面内边距：20px

## 开发计划

- [x] 基础框架搭建
- [x] 数据库设计
- [x] API接口实现
- [x] 前端页面开发
- [x] 图表功能集成
- [x] 数据导出功能
- [x] 响应式适配
- [ ] 用户认证（可选）
- [ ] 数据备份功能（可选）

## 贡献指南

欢迎提交Issue和Pull Request！

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎联系开发团队。

---

**版本**: v1.0.0  
**更新日期**: 2026-01-30
