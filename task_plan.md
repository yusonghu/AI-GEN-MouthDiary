# 实验记录页和添加编辑实验记录页实现计划

## 目标
根据原型图描述实现实验记录页和添加编辑实验记录页

## 原型图分析

### 实验记录页 (Experiment Records Page)
- **页面标题**: "Experiment Records" + 副标题
- **操作按钮**: Bulk Delete (红色), New Experiment (蓝色)
- **筛选区**: 
  - 日期范围选择（Start Date / End Date）
  - 搜索框（Search Mouse ID or Operator）
  - 类型筛选按钮（All Types / Weighing / Medications / Behavioral）
- **数据表格**:
  - 列：Date & Time, Mouse ID, Experiment Type, Weight (g), Operator, Actions
  - 实验类型标签：WEIGHING(蓝色), MEDICATIONS(红色), BEHAVIORAL(绿色)
  - 每行有复选框
  - 操作列有编辑图标
- **分页**: Show 25 rows, 分页导航
- **底部区域**:
  - 左侧：Experiment Schedule 日历组件
  - 右侧：Activity Insights 信息卡片

### 添加编辑实验记录页 (Add/Edit Experiment Record Page)
- **面包屑**: Experiments / Log New Record
- **页面标题**: "Log New Experiment Record" + 副标题
- **表单分区**:
  1. **General Information**:
     - Mouse ID / Genotype (下拉搜索)
     - Experiment Date (日期选择)
     - Experiment Type (下拉)
     - Time of Record (时间选择)
  2. **Vital Signs**:
     - Weight (带单位 g)
     - Core Temperature (带单位 °C)
  3. **Medication & Treatments**:
     - 可添加多个药物
     - 字段：Drug Name, Dosage, Route
     - "+ Add Drug" 按钮
  4. **Observations & Notes**:
     - Detailed Notes (多行文本)
- **底部按钮**: Cancel, Save and Add Another, Save Record

## 实现步骤

### Phase 1: 更新现有 HTML 结构 ✅
- [x] 更新实验记录页 HTML 结构（page-experiments）
- [x] 更新添加实验记录页 HTML 结构（page-experiment-form）

### Phase 2: 更新 CSS 样式 ✅
- [x] 添加实验类型标签样式
- [x] 添加日历组件样式
- [x] 添加 Activity Insights 卡片样式
- [x] 更新表单分区样式
- [x] 添加药物添加区域样式

### Phase 3: 更新 JavaScript 功能 ✅
- [x] 更新实验记录页数据加载
- [x] 添加类型筛选功能
- [x] 添加日历组件功能
- [x] 更新添加实验记录表单
- [x] 添加动态药物添加功能

## 文件清单
- public/index.html - 更新实验记录页和添加实验记录页 HTML ✅
- public/css/style.css - 添加新样式 ✅
- public/js/app.js - 更新功能逻辑 ✅

## 当前状态
Iteration: 10
Status: ✅ 已完成实验记录页和添加编辑实验记录页的实现
