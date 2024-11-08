const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const JSZip = require('jszip');
const fs = require('fs');
const fsPromises = require('fs/promises');
const readline = require('readline');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let playersData = [];

const FIDE_URL = 'https://ratings.fide.com/download/players_list.zip';

const FEDERATION_CODES = {
    'ESP': 'Spain',
    'ES': 'Spain',
    'SP': 'Spain',
    'NOR': 'Norway',
    'NO': 'Norway',
    'USA': 'United States',
    'US': 'United States',
    'RUS': 'Russia',
    'RU': 'Russia',
    'GER': 'Germany',
    'DE': 'Germany',
    'FRA': 'France',
    'FR': 'France',
    'ENG': 'England',
    'EN': 'England',
    'CHN': 'China',
    'CN': 'China',
    'IND': 'India',
    'IN': 'India',
    // Añadir más según necesites
};

async function downloadAndExtractFile() {
    const dataDir = path.join(__dirname, 'data');
    const txtPath = path.join(dataDir, 'players_list.txt');
    
    try {
        // Crear directorio data si no existe
        await fsPromises.mkdir(dataDir, { recursive: true });
        
        // Verificar si el archivo ya existe
        try {
            await fsPromises.access(txtPath);
            console.log('El archivo ya existe en /data');
            return;
        } catch {
            console.log('Descargando archivo ZIP de FIDE...');
            const response = await axios({
                method: 'get',
                url: FIDE_URL,
                responseType: 'arraybuffer'
            });

            console.log('Extrayendo archivo TXT del ZIP...');
            const zip = await JSZip.loadAsync(response.data);
            
            // Listar todos los archivos en el ZIP
            const files = Object.keys(zip.files);
            console.log('Archivos en el ZIP:', files);

            // Buscar el primer archivo .txt
            const txtFile = files.find(file => file.toLowerCase().endsWith('.txt'));
            
            if (!txtFile) {
                throw new Error('No se encontró archivo TXT en el ZIP');
            }

            console.log(`Encontrado archivo: ${txtFile}`);
            const txtContent = await zip.file(txtFile).async("string");
            
            console.log('Guardando archivo TXT...');
            await fsPromises.writeFile(txtPath, txtContent);
            console.log('Archivo guardado exitosamente en /data/players_list.txt');
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function parsePlayersFile() {
    const txtPath = path.join(__dirname, 'data', 'players_list.txt');
    const players = [];
    
    const fileStream = fs.createReadStream(txtPath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let isFirstLine = true;

    for await (const line of rl) {
        if (isFirstLine) {
            isFirstLine = false;
            continue;
        }

        // Dividir la línea en campos y limpiar espacios en blanco
        const fields = line.split(/\s+/).filter(f => f.length > 0);
        
        // Encontrar el primer rating (número de 4 dígitos después de GM/IM/FM)
        const ratingIndex = fields.findIndex((f, i) => {
            return /^\d{4}$/.test(f) && i > 3;  // Buscar después de los campos iniciales
        });

        if (ratingIndex !== -1) {
            // Buscar título solo si es uno válido
            const validTitles = ['GM', 'IM', 'FM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM'];
            const titleIndex = fields.findIndex(f => validTitles.includes(f));
            
            const player = {
                id: fields[0],
                name: line.substring(15, 75).trim(),
                federation: fields[fields.length > 3 ? 3 : 0],  // Normalmente en posición 3
                sex: fields[fields.length > 4 ? 4 : 0],        // M/F después de federation
                title: titleIndex !== -1 ? fields[titleIndex] : '', // Solo títulos válidos
                
                standardRating: {
                    rating: parseInt(fields[ratingIndex]) || 0,
                    games: parseInt(fields[ratingIndex + 1]) || 0,
                    kFactor: parseInt(fields[ratingIndex + 2]) || 0
                },
                
                rapidRating: {
                    rating: parseInt(fields[ratingIndex + 3]) || 0,
                    games: parseInt(fields[ratingIndex + 4]) || 0,
                    kFactor: parseInt(fields[ratingIndex + 5]) || 0
                },
                
                blitzRating: {
                    rating: parseInt(fields[ratingIndex + 6]) || 0,
                    games: parseInt(fields[ratingIndex + 7]) || 0,
                    kFactor: parseInt(fields[ratingIndex + 8]) || 0
                },
                
                birthYear: fields[fields.length - 1]  // Último campo
            };

            // Debug para Magnus
            if (player.name.toLowerCase().includes('carlsen, magnus')) {
                console.log('Línea original:', line);
                console.log('Campos parseados:', fields);
                console.log('Índice rating:', ratingIndex);
                console.log('Jugador:', player);
            }

            players.push(player);
        }
    }

    return players;
}

// Función de ejemplo para usar los datos
async function main() {
    try {
        const players = await parsePlayersFile();
        
        // Ejemplo: mostrar algunos jugadores con rating alto
        const topPlayers = players
            .filter(p => p.standardRating.rating > 2700)
            .sort((a, b) => b.standardRating.rating - a.standardRating.rating)
            .slice(0, 5);

        console.log('\nAlgunos jugadores top:');
        console.log(JSON.stringify(topPlayers, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

// Ejecutar la función
downloadAndExtractFile().catch(console.error);

// Ejecutar el parsing
main().catch(console.error);

// Cargar datos al iniciar el servidor
async function initializeData() {
    playersData = await parsePlayersFile();
    console.log('Datos cargados en memoria');
}

// Endpoint para buscar jugadores
app.get('/api/players/search', (req, res) => {
    const query = req.query.q.toLowerCase().trim();
    
    // Debug: Buscar a Magnus antes del filtro
    const magnusCheck = playersData.find(p => p.name.toLowerCase().includes('carlsen, magnus'));
    if (magnusCheck) {
        console.log('Magnus está en los datos:', magnusCheck);
    } else {
        console.log('Magnus no se encuentra en los datos');
    }

    const results = playersData.filter(player => {
        // Buscar por ID exacto
        if (query.match(/^\d+$/)) {
            return player.id.includes(query);
        }
        
        // Buscar por nombre
        const fullName = player.name.toLowerCase();
        const searchTerms = query.split(' ');
        
        // Si todos los términos de búsqueda están en el nombre
        const matchesAllTerms = searchTerms.every(term => fullName.includes(term));
        
        // Debug para Magnus
        if (fullName.includes('carlsen')) {
            console.log('Encontrado jugador con Carlsen:', {
                name: player.name,
                matches: matchesAllTerms,
                searchTerms,
                fullName
            });
        }
        
        return matchesAllTerms;
    })
    .sort((a, b) => {
        // Priorizar a Magnus Carlsen
        const aIsMagnus = a.name.toLowerCase() === 'carlsen, magnus';
        const bIsMagnus = b.name.toLowerCase() === 'carlsen, magnus';
        
        if (aIsMagnus && !bIsMagnus) return -1;
        if (!aIsMagnus && bIsMagnus) return 1;
        
        // Priorizar jugadores titulados
        if (a.title && !b.title) return -1;
        if (!a.title && b.title) return 1;
        
        // Ordenar por rating estándar
        return (b.standardRating.rating || 0) - (a.standardRating.rating || 0);
    })
    .slice(0, 10);

    console.log(`Búsqueda de "${query}" encontró ${results.length} resultados`);
    if (results.length > 0) {
        console.log('Primer resultado:', results[0]);
    }

    res.json(results);
});

// Endpoint para obtener un jugador específico
app.get('/api/players/:id', (req, res) => {
    const player = playersData.find(p => p.id === req.params.id);
    if (player) {
        res.json(player);
    } else {
        res.status(404).json({ error: 'Jugador no encontrado' });
    }
});

// Inicializar servidor
const PORT = 3000;
initializeData().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
});
