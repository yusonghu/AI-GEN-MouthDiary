const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// Get all mice with pagination, search and filter
router.get('/', (req, res) => {
  const db = getDatabase();
  const { page = 1, limit = 20, search = '', status = '', gender = '', strain = '' } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (mouse_code LIKE ? OR strain LIKE ? OR cage_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  if (gender) {
    whereClause += ' AND gender = ?';
    params.push(gender);
  }

  if (strain) {
    whereClause += ' AND strain = ?';
    params.push(strain);
  }

  // Get total count
  db.get(`SELECT COUNT(*) as total FROM mice ${whereClause}`, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get mice data
    const query = `
      SELECT *, 
        CASE 
          WHEN status = '存活' THEN '🟢'
          WHEN status = '死亡' THEN '🔴'
          WHEN status = '淘汰' THEN '🟡'
          ELSE '⚪'
        END as status_icon,
        (julianday('now') - julianday(birth_date)) / 30 as age_months
      FROM mice 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.all(query, [...params, parseInt(limit), parseInt(offset)], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countRow.total,
          totalPages: Math.ceil(countRow.total / limit)
        }
      });
    });
  });
});

// Get single mouse by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.get('SELECT * FROM mice WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Mouse not found' });
    }
    res.json(row);
  });
});

// Create new mouse
router.post('/', (req, res) => {
  const db = getDatabase();
  const { mouse_code, strain, gender, birth_date, source, cage_number, status = '存活', notes } = req.body;

  if (!mouse_code || !strain || !gender || !birth_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO mice (mouse_code, strain, gender, birth_date, source, cage_number, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [mouse_code, strain, gender, birth_date, source, cage_number, status, notes], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Mouse code already exists' });
      }
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      id: this.lastID,
      message: 'Mouse created successfully'
    });
  });
});

// Update mouse
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { mouse_code, strain, gender, birth_date, source, cage_number, status, notes } = req.body;

  const query = `
    UPDATE mice 
    SET mouse_code = ?, strain = ?, gender = ?, birth_date = ?, 
        source = ?, cage_number = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [mouse_code, strain, gender, birth_date, source, cage_number, status, notes, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Mouse not found' });
    }

    res.json({ message: 'Mouse updated successfully' });
  });
});

// Delete mouse
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.run('DELETE FROM mice WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Mouse not found' });
    }

    res.json({ message: 'Mouse deleted successfully' });
  });
});

// Get mouse experiments
router.get('/:id/experiments', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.all(
    'SELECT * FROM experiments WHERE mouse_id = ? ORDER BY experiment_date DESC',
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

module.exports = router;
