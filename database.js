const fs = require('fs');
const path = require('path');

const dbFile = path.join(__dirname, 'bot_database.json');

// Initialize database file if not present
function initDb() {
    const def = { points: [], tickets: [], warns: [] };
    if (!fs.existsSync(dbFile)) {
        fs.writeFileSync(dbFile, JSON.stringify(def, null, 2));
        return def;
    }
    const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    // Migrate: add warns table if missing
    if (!data.warns) { data.warns = []; writeDb(data); }
    return data;
}

function readDb() { return JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
function writeDb(data) { fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); }

initDb();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPoints(userId) {
    return readDb().points.find(p => p.userId === userId);
}
function getAllPoints() {
    return [...readDb().points].sort((a, b) => b.points - a.points);
}
function setPoints(userId, delta, absolute = false) {
    const data = readDb();
    const p = data.points.find(p => p.userId === userId);
    if (!p) {
        data.points.push({ userId, points: absolute ? delta : Math.max(0, delta) });
    } else {
        p.points = absolute ? delta : Math.max(0, p.points + delta);
    }
    writeDb(data);
}

function getTicket(channelId) { return readDb().tickets.find(t => t.channelId === channelId); }
function getUserTicket(userId) { return readDb().tickets.find(t => t.userId === userId && t.status === 'open'); }
function addTicket(channelId, userId) {
    const data = readDb();
    data.tickets.push({ channelId, userId, status: 'open' });
    writeDb(data);
}
function removeTicket(channelId) {
    const data = readDb();
    data.tickets = data.tickets.filter(t => t.channelId !== channelId);
    writeDb(data);
}

function getWarns(userId) { return readDb().warns.filter(w => w.userId === userId); }
function addWarn(userId, reason, moderatorId) {
    const data = readDb();
    data.warns.push({ userId, reason, moderatorId, date: new Date().toISOString() });
    writeDb(data);
    return data.warns.filter(w => w.userId === userId).length;
}
function clearWarns(userId) {
    const data = readDb();
    const had = data.warns.some(w => w.userId === userId);
    data.warns = data.warns.filter(w => w.userId !== userId);
    writeDb(data);
    return had;
}

// ─── Backwards-compatible db.prepare() shim ──────────────────────────────────
const db = {
    prepare: (sql) => ({
        get: (...args) => {
            if (sql.includes('SELECT * FROM tickets WHERE userId = ? AND status = ?')) return getUserTicket(args[0]);
            if (sql.includes('SELECT * FROM tickets WHERE channelId = ?'))            return getTicket(args[0]);
            if (sql.includes('SELECT points FROM points WHERE userId = ?'))            return getPoints(args[0]);
            return undefined;
        },
        run: (...args) => {
            if (sql.includes('CREATE TABLE')) return;
            if (sql.includes('INSERT INTO tickets'))              addTicket(args[0], args[1]);
            else if (sql.includes('DELETE FROM tickets'))          removeTicket(args[0]);
            else if (sql.includes('UPDATE points SET points = points + ?'))  setPoints(args[1], args[0]);
            else if (sql.includes('UPDATE points SET points = points - ?'))  setPoints(args[1], -args[0]);
            else if (sql.includes('INSERT INTO points'))           setPoints(args[0], args[1], true);
            return { changes: 1 };
        },
        all: (...args) => {
            if (sql.includes('SELECT * FROM points ORDER BY points DESC'))  return getAllPoints().slice(0, 10);
            if (sql.includes('SELECT * FROM points ORDER BY points DESC'))  return getAllPoints();
            return [];
        }
    }),
    // Direct helpers for warn system
    warns: { get: getWarns, add: addWarn, clear: clearWarns },
};

// Ensure shim works with existing code
db.prepare('CREATE TABLE IF NOT EXISTS points').run();
db.prepare('CREATE TABLE IF NOT EXISTS tickets').run();

module.exports = db;
