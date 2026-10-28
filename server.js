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

  // Crear la base de datos y las tablas automáticamente al arrancar
  db.query('CREATE DATABASE IF NOT EXISTS geotracker_db;', (err) => {
    if (err) throw err;
    db.query('USE geotracker_db;', (err) => {
      if (err) throw err;

      // 1. Tabla de usuarios
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL
        );
      `;
      db.query(createUsersTable, (err) => {
        if (err) throw err;
        
        // Insertar los dos usuarios requeridos por la rúbrica
        const seedUser1 = "INSERT IGNORE INTO users (email, password) VALUES ('admin@geotracker.com', '123456');";
        const seedUser2 = "INSERT IGNORE INTO users (email, password) VALUES ('profe@geotracker.com', '123456');";
        
        db.query(seedUser1, () => {});
        db.query(seedUser2, () => console.log('Usuarios por defecto (Admin y Profe) verificados/creados.'));
      });

      // 2. Tabla de ubicaciones (relacionada con el usuario)
      const createLocationsTable = `
        CREATE TABLE IF NOT EXISTS locations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            name VARCHAR(255),
            description TEXT,
            latitude DOUBLE NOT NULL,
            longitude DOUBLE NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      db.query(createLocationsTable, (err) => {
        if (err) throw err;
        console.log('Tablas listas en AWS RDS.');
      });
    });
  });
});

// Middleware para validar el token que envía Retrofit en el Header
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token faltante' });
  }
  const token = authHeader.replace('Bearer ', '');
  if (!token || !token.startsWith('token-user-')) {
    return res.status(403).json({ error: 'Token inválido' });
  }
  req.userId = token.replace('token-user-', '');
  next();
};

// 1. Endpoint exacto para el login: POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length > 0) {
      const user = results[0];
      const simulatedToken = `token-user-${user.id}`;
      // Retorna exactamente la estructura que LoginResponse espera
      res.json({ 
        token: simulatedToken,
        message: 'Login exitoso'
      });
    } else {
      res.status(401).json({ error: 'Credenciales incorrectas' });
    }
  });
});

// 2. Endpoint exacto para guardar ubicación: POST /api/locations
app.post('/api/locations', verifyToken, (req, res) => {
  const { name, description, latitude, longitude } = req.body;
  const userId = req.userId;

  const query = 'INSERT INTO locations (user_id, name, description, latitude, longitude) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [userId, name, description, latitude, longitude], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ message: 'Ubicación guardada con éxito', id: result.insertId });
  });
});

// 3. Endpoint exacto para listar ubicaciones del usuario: GET /api/locations
app.get('/api/locations', verifyToken, (req, res) => {
  const userId = req.userId;
  const query = 'SELECT id, name, description, latitude, longitude, timestamp FROM locations WHERE user_id = ? ORDER BY timestamp DESC';
  
  db.query(query, [userId], (err, results) => {
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