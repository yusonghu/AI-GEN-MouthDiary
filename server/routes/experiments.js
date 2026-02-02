const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// Get all experiments with pagination and filters
router.get('/', (req, res) => {
  const db = getDatabase();
  const { 
    page = 1, 
    limit = 20, 
    search = '', 
    experiment_type = '', 
    mouse_id = '',
    start_date = '',
    end_date = ''
  } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (m.mouse_code LIKE ? OR e.operator LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (experiment_type) {
    whereClause += ' AND e.experiment_type = ?';
    params.push(experiment_type);
  }

  if (mouse_id) {
    whereClause += ' AND e.mouse_id = ?';
    params.push(mouse_id);
  }

  if (start_date) {
    whereClause += ' AND e.experiment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    whereClause += ' AND e.experiment_date <= ?';
    params.push(end_date);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM experiments e
    LEFT JOIN mice m ON e.mouse_id = m.id
    ${whereClause}
  `;

  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get experiments data with mouse info
    const query = `
      SELECT 
        e.*,
        m.mouse_code,
        m.strain,
        CASE 
          WHEN e.experiment_type = '日常称重' THEN '#2196F3'
          WHEN e.experiment_type = '给药' THEN '#F44336'
          WHEN e.experiment_type = '行为测试' THEN '#4CAF50'
          WHEN e.experiment_type = '采血' THEN '#FF9800'
          WHEN e.experiment_type = '解剖' THEN '#9C27B0'
          ELSE '#757575'
        END as type_color
      FROM experiments e
      LEFT JOIN mice m ON e.mouse_id = m.id
      ${whereClause}
      ORDER BY e.experiment_date DESC, e.created_at DESC
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

// Get single experiment
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  const query = `
    SELECT e.*, m.mouse_code, m.strain
    FROM experiments e
    LEFT JOIN mice m ON e.mouse_id = m.id
    WHERE e.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    res.json(row);
  });
});

// Create new experiment
router.post('/', (req, res) => {
  const db = getDatabase();
  const {
    mouse_id,
    experiment_date,
    experiment_type,
    weight,
    temperature,
    behavior_notes,
    medication,
    dosage,
    route,
    results,
    abnormalities,
    operator
  } = req.body;

  if (!mouse_id || !experiment_date || !experiment_type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO experiments (
      mouse_id, experiment_date, experiment_type, weight, temperature,
      behavior_notes, medication, dosage, route, results, abnormalities, operator
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [
    mouse_id, experiment_date, experiment_type, weight, temperature,
    behavior_notes, medication, dosage, route, results, abnormalities, operator
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.status(201).json({
      id: this.lastID,
      message: 'Experiment created successfully'
    });
  });
});

// Update experiment
router.put('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const {
    mouse_id,
    experiment_date,
    experiment_type,
    weight,
    temperature,
    behavior_notes,
    medication,
    dosage,
    route,
    results,
    abnormalities,
    operator
  } = req.body;

  const query = `
    UPDATE experiments 
    SET mouse_id = ?, experiment_date = ?, experiment_type = ?, weight = ?,
        temperature = ?, behavior_notes = ?, medication = ?, dosage = ?,
        route = ?, results = ?, abnormalities = ?, operator = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [
    mouse_id, experiment_date, experiment_type, weight, temperature,
    behavior_notes, medication, dosage, route, results, abnormalities, operator, id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({ message: 'Experiment updated successfully' });
  });
});

// Delete experiment
router.delete('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.run('DELETE FROM experiments WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({ message: 'Experiment deleted successfully' });
  });
});

// Batch delete experiments
router.post('/batch-delete', (req, res) => {
  const db = getDatabase();
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided' });
  }

  const placeholders = ids.map(() => '?').join(',');
  const query = `DELETE FROM experiments WHERE id IN (${placeholders})`;

  db.run(query, ids, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({ 
      message: 'Experiments deleted successfully',
      deletedCount: this.changes
    });
  });
});

module.exports = router;
