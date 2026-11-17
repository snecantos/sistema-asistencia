const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: 5432,
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'asistencia123',
    database: process.env.DB_NAME || 'asistencia'
});

function escapar(texto) {
    return String(texto).replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function plantilla(contenido, titulo = 'Sistema de Asistencia') {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo}</title>
<style>
* { box-sizing: border-box; }

body {
    margin: 0;
    font-family: Arial, sans-serif;
    background: #f1f5f9;
    color: #1e293b;
}

header {
    background: #172554;
    color: white;
    padding: 25px 20px;
}

.header-content {
    max-width: 900px;
    margin: auto;
}

header h1 { margin: 0; font-size: 27px; }
header p { margin: 8px 0 0; color: #cbd5e1; }

main {
    max-width: 900px;
    margin: 40px auto;
    padding: 0 18px;
}

.card {
    background: white;
    padding: 30px;
    border-radius: 14px;
    box-shadow: 0 4px 15px rgba(0,0,0,.06);
    margin-bottom: 25px;
}

h2 { margin-top: 0; color: #172554; }

label {
    display: block;
    margin-bottom: 9px;
    font-weight: bold;
}

input {
    width: 100%;
    padding: 13px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-size: 16px;
    margin-bottom: 18px;
}

button, .btn {
    display: inline-block;
    background: #2563eb;
    color: white;
    border: 0;
    padding: 13px 20px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: bold;
    text-decoration: none;
    cursor: pointer;
}

button:hover, .btn:hover { background: #1d4ed8; }

.btn-secondary {
    background: #e2e8f0;
    color: #1e293b;
}

.btn-secondary:hover { background: #cbd5e1; }

.table-container { overflow-x: auto; }

table {
    width: 100%;
    border-collapse: collapse;
    min-width: 450px;
}

th, td {
    text-align: left;
    padding: 14px;
    border-bottom: 1px solid #e2e8f0;
}

th { background: #eff6ff; color: #1e3a8a; }

tr:hover td { background: #f8fafc; }

.empty {
    padding: 25px;
    text-align: center;
    color: #64748b;
}

.success {
    background: #dcfce7;
    color: #166534;
    padding: 20px;
    border-radius: 10px;
}

footer {
    text-align: center;
    color: #64748b;
    padding: 25px;
    font-size: 13px;
}

@media (max-width: 600px) {
    main { margin: 22px auto; }
    .card { padding: 21px; }
    header h1 { font-size: 23px; }
}
</style>
</head>
<body>
<header>
    <div class="header-content">
        <h1>📚 Sistema de Asistencia</h1>
        <p>Registro y consulta de asistencia estudiantil</p>
    </div>
</header>
<main>${contenido}</main>
<footer>Sistema de Asistencia · Proyecto académico</footer>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (req.method === 'GET' && req.url === '/') {
        res.end(plantilla(`
            <section class="card">
                <h2>Registrar asistencia</h2>
                <p>Ingresa el nombre del estudiante para registrar su asistencia.</p>
                <form action="/registrar" method="POST">
                    <label for="nombre">Nombre del estudiante</label>
                    <input id="nombre" type="text" name="nombre"
                        placeholder="Ej. Juan Pérez" maxlength="100" required>
                    <button type="submit">Registrar asistencia</button>
                </form>
            </section>
            <section class="card">
                <h2>Consultar registros</h2>
                <p>Revisa las asistencias que han sido registradas.</p>
                <a class="btn btn-secondary" href="/asistencias">
                    Ver asistencias
                </a>
            </section>
        `));
    }

    else if (req.method === 'POST' && req.url === '/registrar') {
        let datos = '';
        req.on('data', parte => datos += parte);

        req.on('end', async () => {
            try {
                const parametros = new URLSearchParams(datos);
                const nombre = (parametros.get('nombre') || '').trim();

                if (!nombre || nombre.length > 100) {
                    res.statusCode = 400;
                    return res.end(plantilla(`
                        <section class="card">
                            <h2>Nombre no válido</h2>
                            <a class="btn" href="/">Volver</a>
                        </section>
                    `));
                }

                await pool.query(
                    'INSERT INTO asistencias (nombre) VALUES ($1)',
                    [nombre]
                );

                res.end(plantilla(`
                    <section class="card">
                        <div class="success">
                            <h2>¡Asistencia registrada correctamente!</h2>
                            <p>El registro de ${escapar(nombre)} se guardó en la base de datos.</p>
                        </div>
                        <br>
                        <a class="btn" href="/">Registrar otra</a>
                        <a class="btn btn-secondary" href="/asistencias">Consultar registros</a>
                    </section>
                `));
            } catch (error) {
                console.error(error);
                res.statusCode = 500;
                res.end('Error al registrar la asistencia');
            }
        });
    }

    else if (req.method === 'GET' && req.url === '/asistencias') {
        try {
            const resultado = await pool.query(
                'SELECT * FROM asistencias ORDER BY id DESC'
            );

            const filas = resultado.rows.map(registro => `
                <tr>
                    <td>${registro.id}</td>
                    <td>${escapar(registro.nombre)}</td>
                    <td>${escapar(new Date(registro.fecha).toLocaleString('es-EC', {
                        timeZone: 'America/Guayaquil'
                    }))}</td>
                </tr>
            `).join('');

            res.end(plantilla(`
                <section class="card">
                    <h2>Lista de asistencias</h2>
                    <p>Total de registros: <strong>${resultado.rows.length}</strong></p>
                    ${resultado.rows.length ? `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre</th>
                                    <th>Fecha y hora</th>
                                </tr>
                            </thead>
                            <tbody>${filas}</tbody>
                        </table>
                    </div>` : '<div class="empty">Todavía no hay asistencias registradas.</div>'}
                    <br>
                    <a class="btn" href="/">Volver al inicio</a>
                </section>
            `, 'Lista de asistencias'));
        } catch (error) {
            console.error(error);
            res.statusCode = 500;
            res.end('Error al consultar las asistencias');
        }
    }

    else {
        res.statusCode = 404;
        res.end(plantilla('<section class="card"><h2>Página no encontrada</h2><a class="btn" href="/">Volver</a></section>'));
    }
});

server.listen(5000, '0.0.0.0', () => {
    console.log('Sistema de asistencia ejecutándose en el puerto 5000');
});
