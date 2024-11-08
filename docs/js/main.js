const searchInput = document.getElementById('searchInput');
const resultsDiv = document.getElementById('results');
let timeoutId;

// Actualizar el placeholder del input
searchInput.placeholder = 'Buscar por nombre o ID FIDE...';

// Opcional: Añadir un mensaje de ayuda
const helpText = document.createElement('small');
helpText.textContent = 'Puedes buscar por nombre (ej: "Carlsen") o por ID FIDE (ej: "1503014")';
helpText.style.color = '#666';
searchInput.parentNode.insertBefore(helpText, searchInput.nextSibling);

searchInput.addEventListener('input', () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(searchPlayers, 300);
});

async function searchPlayers() {
    const query = searchInput.value.trim();
    if (query.length < 3) {
        resultsDiv.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
        const players = await response.json();

        if (players.length === 0) {
            resultsDiv.innerHTML = '<p>No se encontraron jugadores</p>';
        } else if (players.length === 1) {
            showPlayerCard(players[0]);
        } else {
            showPlayerList(players);
        }
    } catch (error) {
        console.error('Error:', error);
        resultsDiv.innerHTML = '<p>Error al buscar jugadores</p>';
    }
}

function showPlayerList(players) {
    const html = players.map(player => `
        <div class="player-list" onclick="showPlayerDetails('${player.id}')">
            ${player.name} (${player.federation}) - ID: ${player.id}
        </div>
    `).join('');
    resultsDiv.innerHTML = html;
}

async function showPlayerDetails(id) {
    try {
        const response = await fetch(`/api/players/${id}`);
        const player = await response.json();
        
        const html = `
            <div class="player-card">
                <h2>${player.name}</h2>
                <div class="player-header">
                    <p>ID FIDE: ${player.id}</p>
                    <p>Federación: ${player.federation}</p>
                    <p>Título: ${player.title || 'Sin título'}</p>
                </div>
                
                <div class="ratings-container">
                    <div class="rating-box">
                        <strong>Clásico</strong><br>
                        Rating: ${player.standardRating.rating || 'Sin rating'}<br>
                        Partidas: ${player.standardRating.games}<br>
                        Factor K: ${player.standardRating.kFactor}
                    </div>
                    
                    <div class="rating-box">
                        <strong>Rápido</strong><br>
                        Rating: ${player.rapidRating.rating || 'Sin rating'}<br>
                        Partidas: ${player.rapidRating.games}<br>
                        Factor K: ${player.rapidRating.kFactor}
                    </div>
                    
                    <div class="rating-box">
                        <strong>Blitz</strong><br>
                        Rating: ${player.blitzRating.rating || 'Sin rating'}<br>
                        Partidas: ${player.blitzRating.games}<br>
                        Factor K: ${player.blitzRating.kFactor}
                    </div>
                </div>
                
                <p>Año de nacimiento: ${player.birthYear || 'No disponible'}</p>
            </div>
        `;
        
        resultsDiv.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar detalles del jugador:', error);
        resultsDiv.innerHTML = '<p>Error al cargar los detalles del jugador</p>';
    }
}

function showPlayerCard(player) {
    const html = `
        <div class="player-card">
            <h2>${player.name}</h2>
            <p>ID FIDE: ${player.id}</p>
            <p>Federación: ${player.federation}</p>
            <p>Título: ${player.title || 'Sin título'}</p>
            
            <div class="rating-box">
                <strong>Clásico</strong><br>
                Rating: ${player.standardRating.rating || 'Sin rating'}<br>
                Partidas: ${player.standardRating.games}<br>
                Factor K: ${player.standardRating.kFactor}
            </div>
            
            <div class="rating-box">
                <strong>Rápido</strong><br>
                Rating: ${player.rapidRating.rating || 'Sin rating'}<br>
                Partidas: ${player.rapidRating.games}<br>
                Factor K: ${player.rapidRating.kFactor}
            </div>
            
            <div class="rating-box">
                <strong>Blitz</strong><br>
                Rating: ${player.blitzRating.rating || 'Sin rating'}<br>
                Partidas: ${player.blitzRating.games}<br>
                Factor K: ${player.blitzRating.kFactor}
            </div>
            
            <p>Año de nacimiento: ${player.birthYear || 'No disponible'}</p>
        </div>
    `;
    resultsDiv.innerHTML = html;
}

function formatTitles(title, wTitle, oTitle) {
    const titles = [];
    if (title) titles.push(formatTitle(title));
    if (wTitle) titles.push(formatWomenTitle(wTitle));
    if (oTitle) titles.push(formatOtherTitle(oTitle));
    return titles.length > 0 ? titles.join(', ') : 'Sin títulos';
}

function formatTitle(title) {
    const titles = {
        'g': 'GM (Gran Maestro)',
        'm': 'IM (Maestro Internacional)',
        'f': 'FM (Maestro FIDE)',
        'c': 'CM (Maestro Candidato)'
    };
    return titles[title.toLowerCase()] || title;
}

function formatWomenTitle(title) {
    const titles = {
        'wg': 'WGM (Gran Maestra)',
        'wm': 'WIM (Maestra Internacional)',
        'wf': 'WFM (Maestra FIDE)'
    };
    return titles[title.toLowerCase()] || title;
}

function formatOtherTitle(title) {
    const titles = {
        '': 'Sin título',
        'wg': 'WGM (Gran Maestra)',
        'wm': 'WIM (Maestra Internacional)',
        'wf': 'WFM (Maestra FIDE)'
    };
    return titles[title.toLowerCase()] || title;
}

function formatFlag(flag) {
    const flags = {
        'i': 'Inactivo',
        'I': 'Inactivo',
        'wi': 'Mujer Inactiva',
        'WI': 'Mujer Inactiva',
        'w': 'Mujer',
        '': 'Activo'
    };
    return flags[flag] || flag;
}

function showSearchResults(players) {
    if (!players || players.length === 0) {
        resultsDiv.innerHTML = '<p>No se encontraron jugadores</p>';
        return;
    }

    const html = players.map(player => `
        <div class="player-result" onclick="showPlayerDetails('${player.id}')">
            <div class="player-header">
                <strong>${player.name}</strong>
                <span class="federation">${player.federation || ''}</span>
                ${player.title ? `<span class="title">${player.title}</span>` : ''}
            </div>
            <div class="ratings">
                ${player.standardRating.rating ? `
                    <span class="rating">
                        Clásico: ${player.standardRating.rating}
                    </span>
                ` : ''}
                ${player.rapidRating.rating ? `
                    <span class="rating">
                        Rápido: ${player.rapidRating.rating}
                    </span>
                ` : ''}
                ${player.blitzRating.rating ? `
                    <span class="rating">
                        Blitz: ${player.blitzRating.rating}
                    </span>
                ` : ''}
            </div>
            <small>ID: ${player.id}</small>
        </div>
    `).join('');

    resultsDiv.innerHTML = html;
} 