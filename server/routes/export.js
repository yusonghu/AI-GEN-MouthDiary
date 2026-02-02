const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const { getDatabase } = require('../database');
const path = require('path');
const fs = require('fs');

// Helper function to encode filename for Content-Disposition header
function encodeFilename(filename) {
  // Use RFC 5987 encoding for non-ASCII characters
  const encoded = encodeURIComponent(filename);
  return `filename="${filename.replace(/"/g, '"')}"; filename*=UTF-8''${encoded}`;
}

// Helper function to get Chinese font path
function getChineseFontPath() {
  // Check multiple possible font locations
  const possiblePaths = [
    // Project local fonts
    path.join(__dirname, '..', 'fonts', 'NotoSansCJKsc-Regular.otf'),
    path.join(__dirname, '..', 'fonts', 'NotoSansCJKsc-Regular.ttf'),
    path.join(__dirname, '..', 'fonts', 'simhei.ttf'),
    path.join(__dirname, '..', 'fonts', 'simsun.ttc'),
    path.join(__dirname, '..', 'fonts', 'msyh.ttc'),
    // Windows system fonts
    'C:\\Windows\\Fonts\\simhei.ttf',
    'C:\\Windows\\Fonts\\simsun.ttc',
    'C:\\Windows\\Fonts\\msyh.ttc',
    'C:\\Windows\\Fonts\\msyhbd.ttc',
    // Linux system fonts
    '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
    '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    // macOS system fonts
    '/System/Library/Fonts/PingFang.ttc',
    '/System/Library/Fonts/STHeiti Light.ttc',
    '/Library/Fonts/Arial Unicode.ttf',
  ];

  for (const fontPath of possiblePaths) {
    if (fs.existsSync(fontPath)) {
      console.log('Found Chinese font:', fontPath);
      return fontPath;
    }
  }

  console.warn('No Chinese font found. PDF may display garbled text.');
  console.warn('Please add a Chinese font file to server/fonts/ directory.');
  return null;
}

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

  console.log('Excel export query:', query);
  console.log('Query params:', params);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`Found ${rows.length} records for Excel export`);

    if (rows.length === 0) {
      console.warn('No data found for the given criteria');
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
    res.setHeader('Content-Disposition', `attachment; ${encodeFilename(filename)}`);
    
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

  console.log('PDF export query:', query);
  console.log('Query params:', params);

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`Found ${rows.length} records for PDF export`);

    // Get Chinese font path
    const fontPath = getChineseFontPath();
    
    // Create PDF document
    const doc = new PDFDocument();
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `实验记录_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; ${encodeFilename(filename)}`);
    
    doc.pipe(res);

    // Register Chinese font if available
    if (fontPath) {
      doc.registerFont('ChineseFont', fontPath);
    }

    // Helper function to set font with Chinese support
    const setFont = (size) => {
      if (fontPath) {
        doc.font('ChineseFont').fontSize(size);
      } else {
        doc.fontSize(size);
      }
    };

    // Title
    setFont(20);
    doc.text('小鼠实验记录报告', { align: 'center' });
    doc.moveDown();
    setFont(12);
    doc.text(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    setFont(14);
    doc.text('数据概览', { underline: true });
    setFont(11);
    doc.text(`总记录数: ${rows.length} 条`);
    doc.moveDown();

    if (rows.length === 0) {
      setFont(11);
      doc.text('未找到符合条件的实验记录。');
    } else {
      // Records
      setFont(14);
      doc.text('实验记录详情', { underline: true });
      doc.moveDown();

      rows.forEach((record, index) => {
        if (index > 0) {
          doc.moveDown(0.5);
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
          doc.moveDown(0.5);
        }

        setFont(11);
        doc.text(`${record.experiment_date || 'N/A'} - ${record.mouse_code || 'N/A'} (${record.strain || 'N/A'})`);
        setFont(10);
        doc.text(`实验类型: ${record.experiment_type || 'N/A'}`, { indent: 20 });
        
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
    }

    doc.end();
  });
});

module.exports = router;
