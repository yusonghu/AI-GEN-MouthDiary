const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { getDatabase } = require('../database');

// Export experiments to Excel
router.post('/excel', (req, res) => {
  const db = getDatabase();
  const { start_date, end_date, mouse_ids = [], experiment_types = [] } = req.body;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (start_date) {
    whereClause += ' AND e.experiment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    whereClause += ' AND e.experiment_date <= ?';
    params.push(end_date);
  }

  if (mouse_ids.length > 0) {
    whereClause += ` AND e.mouse_id IN (${mouse_ids.map(() => '?').join(',')})`;
    params.push(...mouse_ids);
  }

  if (experiment_types.length > 0) {
    whereClause += ` AND e.experiment_type IN (${experiment_types.map(() => '?').join(',')})`;
    params.push(...experiment_types);
  }

  const query = `
    SELECT 
      e.experiment_date as '日期',
      m.mouse_code as '小鼠编号',
      m.strain as '品系',
      e.experiment_type as '实验类型',
      e.weight as '体重(g)',
      e.temperature as '体温(°C)',
      e.medication as '用药',
      e.dosage as '剂量',
      e.route as '给药途径',
      e.behavior_notes as '行为观察',
      e.results as '实验结果',
      e.abnormalities as '异常情况',
      e.operator as '操作人'
    FROM experiments e
    LEFT JOIN mice m ON e.mouse_id = m.id
    ${whereClause}
    ORDER BY e.experiment_date DESC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Set column widths
    const colWidths = [
      { wch: 12 },  // 日期
      { wch: 12 },  // 小鼠编号
      { wch: 15 },  // 品系
      { wch: 12 },  // 实验类型
      { wch: 10 },  // 体重
      { wch: 10 },  // 体温
      { wch: 15 },  // 用药
      { wch: 10 },  // 剂量
      { wch: 12 },  // 给药途径
      { wch: 30 },  // 行为观察
      { wch: 30 },  // 实验结果
      { wch: 20 },  // 异常情况
      { wch: 12 }   // 操作人
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, '实验记录');
    
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `实验记录_${timestamp}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  });
});

// Export to PDF
router.post('/pdf', (req, res) => {
  const db = getDatabase();
  const { start_date, end_date, mouse_ids = [], experiment_types = [] } = req.body;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (start_date) {
    whereClause += ' AND e.experiment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    whereClause += ' AND e.experiment_date <= ?';
    params.push(end_date);
  }

  if (mouse_ids.length > 0) {
    whereClause += ` AND e.mouse_id IN (${mouse_ids.map(() => '?').join(',')})`;
    params.push(...mouse_ids);
  }

  if (experiment_types.length > 0) {
    whereClause += ` AND e.experiment_type IN (${experiment_types.map(() => '?').join(',')})`;
    params.push(...experiment_types);
  }

  const query = `
    SELECT 
      e.*,
      m.mouse_code,
      m.strain,
      m.gender
    FROM experiments e
    LEFT JOIN mice m ON e.mouse_id = m.id
    ${whereClause}
    ORDER BY e.experiment_date DESC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const doc = new PDFDocument();
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `实验记录_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    doc.pipe(res);

    // Title
    doc.fontSize(20).text('小鼠实验记录报告', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('数据概览', { underline: true });
    doc.fontSize(11).text(`总记录数: ${rows.length} 条`);
    doc.moveDown();

    // Records
    doc.fontSize(14).text('实验记录详情', { underline: true });
    doc.moveDown();

    rows.forEach((record, index) => {
      if (index > 0) {
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);
      }

      doc.fontSize(11).text(`${record.experiment_date} - ${record.mouse_code} (${record.strain})`);
      doc.fontSize(10).text(`实验类型: ${record.experiment_type}`, { indent: 20 });
      
      if (record.weight) {
        doc.text(`体重: ${record.weight}g`, { indent: 20 });
      }
      if (record.temperature) {
        doc.text(`体温: ${record.temperature}°C`, { indent: 20 });
      }
      if (record.medication) {
        doc.text(`用药: ${record.medication} ${record.dosage || ''}`, { indent: 20 });
      }
      if (record.behavior_notes) {
        doc.text(`行为观察: ${record.behavior_notes}`, { indent: 20 });
      }
      if (record.results) {
        doc.text(`实验结果: ${record.results}`, { indent: 20 });
      }
      if (record.operator) {
        doc.text(`操作人: ${record.operator}`, { indent: 20 });
      }

      // Add new page if needed
      if (doc.y > 700 && index < rows.length - 1) {
        doc.addPage();
      }
    });

    doc.end();
  });
});

module.exports = router;
