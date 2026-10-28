const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Conexión a tu AWS RDS
const db = mysql.createConnection({
  host: 'geotracker-db.csjkk0kgaoja.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'AWS_marvin',
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error('Error al conectar a AWS RDS:', err);
    return;
  }
  console.log('¡Conectado a AWS RDS exitosamente!');

  // Crear la base de datos y la tabla automáticamente al arrancar
  db.query('CREATE DATABASE IF NOT EXISTS geotracker_db;', (err) => {
    if (err) throw err;
    db.query('USE geotracker_db;', (err) => {
      if (err) throw err;
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS locations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            latitude DOUBLE NOT NULL,
            longitude DOUBLE NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      db.query(createTableQuery, (err) => {
        if (err) throw err;
        console.log('Base de datos "geotracker_db" y tabla "locations" listas.');
      });
    });
  });
});

// Endpoint para RECIBIR y guardar la ubicación desde Android (POST)
app.post('/locations', (req, res) => {
  const { latitude, longitude } = req.body;
  const query = 'INSERT INTO locations (latitude, longitude) VALUES (?, ?)';
  
  db.query(query, [latitude, longitude], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Ubicación guardada con éxito', id: result.insertId });
  });
});

// Endpoint para CONSULTAR las ubicaciones guardadas (GET)
app.get('/locations', (req, res) => {
  db.query('SELECT * FROM locations ORDER BY timestamp DESC', (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});