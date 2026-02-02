const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');

// Get overview statistics
router.get('/overview', (req, res) => {
  const db = getDatabase();
  
  const queries = {
    totalMice: `SELECT COUNT(*) as count FROM mice`,
    aliveMice: `SELECT COUNT(*) as count FROM mice WHERE status = '存活'`,
    deadMice: `SELECT COUNT(*) as count FROM mice WHERE status = '死亡'`,
    todayExperiments: `SELECT COUNT(*) as count FROM experiments WHERE experiment_date = date('now')`,
    weekExperiments: `SELECT COUNT(*) as count FROM experiments WHERE experiment_date >= date('now', '-7 days')`,
    monthExperiments: `SELECT COUNT(*) as count FROM experiments WHERE experiment_date >= date('now', '-30 days')`,
    monthNewMice: `SELECT COUNT(*) as count FROM mice WHERE created_at >= date('now', '-30 days')`
  };

  const results = {};
  let completed = 0;
  const total = Object.keys(queries).length;

  Object.entries(queries).forEach(([key, query]) => {
    db.get(query, [], (err, row) => {
      if (err) {
        results[key] = 0;
      } else {
        results[key] = row.count;
      }
      completed++;
      if (completed === total) {
        res.json(results);
      }
    });
  });
});

// Get strain distribution
router.get('/strain-distribution', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT strain, COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM mice), 1) as percentage
    FROM mice
    GROUP BY strain
    ORDER BY count DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get gender distribution
router.get('/gender-distribution', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT gender, COUNT(*) as count,
      ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM mice), 1) as percentage
    FROM mice
    GROUP BY gender
    ORDER BY count DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get experiment type distribution
router.get('/experiment-types', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT experiment_type as type, COUNT(*) as count
    FROM experiments
    GROUP BY experiment_type
    ORDER BY count DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get monthly experiment trend
router.get('/monthly-trend', (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT 
      strftime('%Y-%m', experiment_date) as month,
      COUNT(*) as count
    FROM experiments
    WHERE experiment_date >= date('now', '-6 months')
    GROUP BY month
    ORDER BY month
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get mouse weight history for chart
router.get('/mouse-weight/:mouseId', (req, res) => {
  const db = getDatabase();
  const { mouseId } = req.params;
  
  const query = `
    SELECT 
      experiment_date as date,
      weight
    FROM experiments
    WHERE mouse_id = ? AND weight IS NOT NULL
    ORDER BY experiment_date ASC
  `;

  db.all(query, [mouseId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;
